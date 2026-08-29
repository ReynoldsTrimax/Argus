# Personalized recommendations

A deterministic, explainable recommendation engine that ranks catalog titles for
one authenticated user from that user's own library. No AI, no cross-user data,
no new database tables.

It lives **beside** the Phase 4 intelligence layer, not inside it.
`src/lib/intelligence/recommendations.ts` (the dashboard's genre/popularity rail)
and `decision-score.ts` are untouched and still power `/dashboard` and the detail
pages.

## Why it is separate from Decision Score

| | Decision Score | Recommendation engine |
| --- | --- | --- |
| Question | "How well does *this* title fit you?" | "Out of thousands, which should you see next?" |
| Input | one title + `UserStats` | whole library + a generated candidate pool |
| Output | 0–100 verdict + reasons | ranked, diversified, sectioned feed |
| Surface | movie / TV detail page | `/recommendations` |

Ranking needs candidate provenance, diversification bookkeeping and section
grouping that a per-title verdict has no reason to carry, so they are separate
subsystems rather than one shared scorer.

## Location

`src/lib/recommendations/` — a peer of `lib/library`, `lib/media`,
`lib/intelligence`. Not `lib/intelligence/recommendations/`, because a directory
of that name would sit next to the existing `recommendations.ts` file and
`@/lib/intelligence/recommendations` would silently resolve to the file.

There is **no `index.ts` barrel** on purpose: `service.ts` imports Supabase and
is server-only, and a barrel would drag it into any client import.

## Data flow

```
loadRecommendationSignals(userId)        ← Supabase, RLS-scoped
        ↓
buildEntrySignals                        ← status + rating + engagement → signed weight
        ↓
selectEnrichmentTargets                  ← ≤8 anchors + ≤3 detractors
        ↓
catalog.getTitleFacts (one call each)    ← genres, keywords, credits, similar, recommended
        ↓
buildTasteProfile                        ← affinities, runtime window, completion habits
        ↓
generateCandidates                       ← 7 lanes → deduped pool with provenance
        ↓
scorePool                                ← additive weighted factors, each with evidence
        ↓
diversify                                ← greedy MMR + hard caps
        ↓
assembleSections                         ← rails, each with a truthful reason
        ↓
explain                                  ← sentences derived only from scored factors
```

## Modules

| Module | Responsibility | Pure? |
| --- | --- | --- |
| `config.ts` | every weight, threshold, cap and TTL | ✅ |
| `rating.ts` | scale normalization + numeric helpers | ✅ |
| `signals.ts` | library rows → signed `EntrySignal[]` | ✅ |
| `taste-profile.ts` | signals + facts → `TasteProfile` | ✅ |
| `catalog-port.ts` | the catalog interface the engine needs | ✅ (types) |
| `candidates.ts` | candidate lanes + dedupe + exclusion | ✅ given a port |
| `scoring.ts` | `ScoredCandidate` with factor breakdown | ✅ |
| `diversify.ts` | greedy MMR selection + caps | ✅ |
| `explain.ts` | factors → truthful sentences | ✅ |
| `sections.ts` | ranked pool → page rails | ✅ |
| `engine.ts` | orchestration; takes a `CatalogPort` | ✅ given a port |
| `cache.ts` | process-level TTL cache w/ in-flight sharing | ✅ |
| `tmdb-catalog.ts` | `CatalogPort` over the TMDB provider | ❌ I/O |
| `load-signals.ts` | Supabase reads | ❌ I/O |
| `service.ts` | resolves the session user; per-user run cache | ❌ I/O |

Types: `src/types/recommendations.ts`.
Entry point: `getRecommendationsForCurrentUser()` in `service.ts`.

## How preferences are derived

### 1. Ratings are normalized first

`library_entries.user_rating` stores the raw number and `rating_scale` records
the scale, so 4/5, 8/10 and 80/100 are all persisted differently. `rating.ts`
maps them onto 0…1. A missing scale defaults to `"ten"` (the write path's
default) unless the magnitude rules it out.

Ratings are then **centred on the user's own mean** (`RATING_WEIGHT`), so a
generous rater's 0.7 is not read as enthusiasm. Below four ratings there is no
personal baseline and a fixed midpoint is used. Narrow raters get their deltas
amplified so small gaps still separate titles.

> The existing stats engine buckets `user_rating` as if it were always a
> 10-point value. That behaviour is intentionally **not** changed — only this
> engine reads the normalized form.

### 2. Status sets the base weight

`STATUS_WEIGHT` in `config.ts`:

```
rewatching  +1.25   plan_to_watch / wishlist  +0.22
completed   +1.00   archived                   0.00
watching    +0.55   paused                    -0.15
                    dropped                   -0.70
```

### 3. Engagement, split by what it actually proves

* **Curation** — favourite, rewatch count. An explicit statement of liking; may
  flip the sign of an otherwise negative weight.
* **Attention** — reviews, notes, tags, collections, sessions, pinning, recent
  views. Proves the title *mattered*, not that it was enjoyed, so it amplifies
  whichever polarity status and rating already established. A dropped show with
  three notes becomes a *stronger negative*.

Each historical `→ dropped` transition past the first deepens the negative.

### 4. Recency decays enthusiasm, not aversion

540-day half-life with a 0.55 floor, applied only to positive weights. Old
favourites still count; old dislikes do not fade.

### 5. Affinities

Per attribute value (genre, language, decade, creator, cast, keyword):

```
direction = (positive − negative) / (positive + negative)     // scale-free, −1…1
shrinkage = support / (support + PROFILE.affinitySupportHalf)
score     = direction × shrinkage
```

Direction being scale-free means watching ten dramas and one comedy makes comedy
*thin*, not negative. Shrinkage keeps one enthusiastic rating from producing a
1.0. Attributes below `minSupportForAffinity` are dropped rather than guessed at.

A genre is **avoided** when ≥2 titles carry it and ≥60% of its support is
negative. Avoided genres are ranked down, never filtered out.

### Derived habits

* **Runtime window** — mean ± clamped spread over positively-weighted *films*.
  Applied as a discover filter, not a score, because catalog summaries have no
  runtime field.
* **`avoidsLongSeries`** — requires ≥2 dropped series, a mean length ≥40
  episodes, *and* a contrast with what they do finish. Any one alone is noise.
* **Media-type bias**, **popularity comfort** (mainstream vs deep-catalogue),
  **completion rate**.

### Enrichment

Library rows only store `{ genres, originalLanguage }`, and only when the title
was added from a detail page — the poster card's quick actions omit genres. So
the engine spends **one detail call per anchor** (≤8) plus ≤3 of the strongest
*negative* titles. TMDB's detail endpoint already appends credits, keywords,
`similar` and `recommendations`, so that single call yields both the attribute
evidence and two candidate lists.

Enriching detractors is what allows people and theme affinity to be negative.

## Candidate generation

Seven lanes, all through `CatalogPort`:

| Lane | Source | Provenance |
| --- | --- | --- |
| 1 | anchor `similar` + `recommendations` | `anchor_similar`, `anchor_recommended` |
| 2 | franchise collections the user is inside | `anchor_collection` |
| 3 | discover by liked genre × era × runtime × vote floor | `genre_discovery` |
| 4 | acclaimed titles in liked genres (ignores era) | `acclaimed` |
| 5 | one genre the user has neither watched nor rejected | `wildcard_genre` |
| 6 | filmographies of high-affinity people | `person_credit` |
| 7 | trending / top-rated / now-playing backfill | `trending`, `acclaimed`, `fresh_release` |

Dedupe **keeps every provenance record**: a title found by three anchors and a
director lane is both a stronger candidate and an explainable one.

Rejected at insertion: anything in `excludedKeys` (the whole library, every
status — watchlisted titles have already been decided about, and hidden titles
are fetched separately since the shared loader filters them out), adult titles,
and titles with no poster.

The pool is capped at `CANDIDATES.maxPoolSize` (900).

### Why the director lane needs raw `tmdbFetch`

`MediaProvider.getPerson` returns *cast* credits only, so a director's own films
never appear. `tmdb-catalog.ts` therefore reads
`/person/{id}/combined_credits` directly via the provider package's exported
`tmdbFetch` and maps the `crew` array. That keeps `MediaProvider` and
`MediaDiscoverFilters` — files the whole catalog depends on — unchanged.

Lane 5's genre is chosen by a profile-derived index, not at random, so the
wildcard is stable for a given library but differs between users.

## Scoring

Additive, weighted, and **not** multiplicative: most candidates are catalog
summaries with genres, a date, a language and vote data and nothing else, so a
product would make "unknown" indistinguishable from "bad".

```
score = SCORING.base (34)
      + Σ  positive factors
      − Σ  penalties
      clamped to 0…100
```

| Factor | Weight | Fires when |
| --- | --- | --- |
| `genre_affinity` | +26 | candidate genres overlap the profile (best two decide) |
| `anchor_similarity` | +22 | reached from an anchor, decayed by list rank |
| `people_affinity` | +14 | from a person with measured affinity (cast ×0.55) |
| `quality` | +10 | vote average, ramped by vote count |
| `theme_overlap` | +9 | ≥2 profile keywords appear in the candidate's overview |
| `era_fit` | +7 | decade affinity (adjacent decades at half strength) |
| `franchise_continuation` | +6 | unwatched part of a franchise they're inside |
| `discovery` | +8 | wildcard lane, or obscure title for a mainstream watcher |
| `language_fit` | +5 | language affinity |
| `media_type_fit` | +5 | matches a lopsided movie/TV bias |
| `freshness` | +4 | released within 400 days |
| `avoided_genre` | −18 | genre with ≥60% negative support |
| `low_quality` | −14 | vote average below 5.6 with enough votes |
| `long_series_risk` | −8 | TV candidate for a user who abandons long series |
| `obscurity_risk` | −7 | fewer than 12 votes — nothing to judge on |

Personalization factors are scaled by
`personalizationFloor + (1 − floor) × profile.confidence`, so a thin profile
degrades toward a quality ranking rather than to noise, while never discarding
taste entirely (floor 0.45). `quality`, `freshness`, `discovery` and the
quality-based penalties are **not** scaled.

`confidence` saturates at 12 signal titles.

**Determinism.** No `Math.random()` anywhere. The wildcard lane's variety comes
from `stableJitter(candidateKey)`, a hash. Ties break on candidate key. The same
library plus the same catalog always produces the same ranking, which is what
makes the cache safe and the tests meaningful.

**Tiers**: `safe` ≥74, `adjacent` ≥60, `discovery` below, plus `wildcard` for the
deliberate-departure lane.

## Diversity

Greedy maximal-marginal-relevance in `diversify.ts`. At each step it picks the
best `relevanceWeight × normalizedScore − (1 − relevanceWeight) × redundancy`.

Soft redundancy accumulates per already-selected sibling sharing a genre
(0.30), an anchor (0.45), a decade (0.12) or a language (0.10), plus a penalty
for runs of one media type longer than four.

Hard caps per section — no score buys past these:

```
maxPerGenre 4 · maxPerAnchor 3 · maxPerFranchise 2 · maxPerDecade 5
```

When everything left is capped out the section **ends short** rather than
padding itself. Anchor clusters pass `ignoreCaps` — a cluster is one anchor's
neighbourhood by definition.

`describeDiversity()` returns a composition report used by the tests and the
debug panel.

## Sections

Carved from **one** scored pool with a shared used-key set, so no title appears
twice and every rail inherits the same scoring semantics.

| Section | Content | Omitted when |
| --- | --- | --- |
| Top picks for you | strongest items, diversified | pool empty |
| Because you *verb* X | ≤3 anchor clusters | fewer than 4 items |
| Matches your taste | genre / people / era / theme driven | no such items |
| Hidden gems | popularity < 60, ≥100 votes, vote ≥6.8 | no such items |
| Discover something different | wildcard + no-genre-overlap quality | no such items |
| Films to line up / Series to start | per media type | either side < 8 items |

Cold start (`assembleColdStartSections`) is a separate function: Trending now,
Widely acclaimed, New releases — each labelled *not personalized*. It still
applies `excludedKeys`, because an empty *profile* does not imply an empty
*library* (all-archived libraries produce no signal).

## Explanations

`explain.ts` may only produce a sentence from a `ScoreFactor` present on the
scored candidate, naming only values in that factor's `evidence`. There is no
fallback prose pool. When nothing scored, the headline says so
("Broadly matches your library").

Examples the engine actually emits:

* `Because you rated highly Blade Runner 2049`
* `From Denis Villeneuve, whose work you rate well`
* `Covers dystopia and time travel — themes that run through your library`
* `A change of pace — Documentary sits outside your usual genres`
* `Note: horror is a genre you often drop`

Penalties appear in the details, ahead of low-value positives. A recommender
that only says positive things is advertising, not explaining.

## Performance

The TMDB client talks to the API over `node:https` (it pins public DNS to work
around resolvers that black-hole `api.themoviedb.org`), so it never touches
`fetch` and **Next's Data Cache and `revalidate` do not apply to it**.
`features/marketing/showcase.ts` already worked around this for the landing
page; `cache.ts` generalizes that pattern.

Two caches:

1. **`catalogCache`** (`cache.ts`) — process-level, LRU-evicted, shares
   in-flight promises, never caches a rejection. TTLs: genres 24h, details 12h,
   discover 6h, person 24h, trending 1h. Public catalog data only, no user
   content, so it is safe across users and across instances.
2. **Per-user run cache** (`service.ts`) — keyed by user id **and validated
   against the library fingerprint**, so rating a film invalidates it
   immediately rather than waiting out the 20-minute TTL.

Cold-run API budget: ≤11 detail calls + ≤4 person lookups (×2 calls) + ~10
discover + 4 lists + 1 genre map ≈ 30 requests, each cached. Warm runs make
none. Nothing scales with the number of cards rendered.

Bounded work per request: `LIMITS` in `load-signals.ts` mirror the caps in
`load-profile.ts`, and the pool is capped at 900.

## Security and isolation

* `service.ts` is the only module that touches identity, and it takes the user
  from `getCurrentUser()` (the Supabase session). **There is no code path that
  accepts a user id from a caller.**
* No API route was added. The page is a Server Component calling the service
  directly, so there is no endpoint to probe.
* Every Supabase read is `.eq("user_id", userId)` on top of RLS.
* The run cache is keyed per user and its entries are never read across users.
* The shared catalog cache holds only public TMDB data.
* TMDB credentials stay server-side — the engine never runs in the browser.
* Debug output is gated twice: `?debug=1` **and** `NODE_ENV !== "production"`.
  Factor breakdowns are omitted from the payload entirely otherwise.

## Database

**No migration.** The engine derives everything from existing tables
(`library_entries`, `library_status_history`, `watch_sessions`,
`episode_progress`, `reviews`, `notes`, `tag_assignments`, `collection_items`,
`recently_viewed`). Persisting runs would add write paths and an invalidation
problem to solve a cost the two in-process caches already handle.

Revisit if recommendations move to a background job, need cross-request sharing
between server instances, or start recording feedback.

## Future extension points

* **Feedback loop.** Every `Recommendation` already carries a stable `key`, its
  `sectionId` and its `rank`, and the run carries a `fingerprint` — enough to
  log "user dismissed item K from section S at rank R of run F" without
  changing the engine. A future `recommendation_feedback` table plus a negative
  affinity term in `taste-profile.ts` is the natural shape.
* **Manual refresh.** Cache invalidation is fingerprint-driven, so an unchanged
  library legitimately returns the cached run. A "refresh" button would need an
  explicit eviction hook on `runCache` in `service.ts`.
* **Precomputation.** `runRecommendationEngine` is already decoupled from
  identity and I/O, so a cron job could call it and store the result.
* **Another provider.** Implement `CatalogPort`; nothing else changes.
* **Keyword-accurate themes.** Theme matching is currently lexical against the
  candidate's overview. Real keyword overlap would need a detail call per
  candidate, or a `with_keywords` discover filter on `MediaDiscoverFilters`.
* **Optional AI explanation layer.** Would sit *after* `explain.ts`, rephrasing
  existing factors. It must not enter the ranking path.

## Known limitations

* **Runtime and episode count are unavailable for candidates.** Catalog
  summaries do not include them, so runtime preference is applied as a discover
  filter and `long_series_risk` fires on the observed habit rather than on the
  specific candidate's length.
* **Theme overlap is lexical**, matching profile keywords against the
  candidate's overview text. It confirms themes; it cannot discover them. The
  stopword list is English-only.
* **Genre metadata gaps.** Titles added from a poster card store no genres.
  Enrichment covers anchors and detractors; other library rows contribute no
  genre signal until re-saved from a detail page.
* **Caches are process-local.** Multiple server instances each warm their own.
  Correct, just not maximally efficient.
* **Cold-start pools are identical for all new users** by design — there is
  nothing to personalize on, and the page says so.
* **`popularityComfort` depends on enrichment**, so it is `null` until at least
  one anchor has been enriched.

## Debugging

```
/recommendations?debug=1     # development builds only
```

Shows the candidate count per lane, which titles were enriched, the full
affinity tables, anchor weights with their basis, section sizes, and a signed
factor breakdown under every card.

## Tests

`npm test` — 86 tests across four files, all with fixed fixtures and an injected
clock:

| File | Covers |
| --- | --- |
| `taste-profile.test.ts` | scale normalization, rating baselines, status ordering, curation vs attention, repeat drops, recency asymmetry, genre affinity, avoidance thresholds, runtime window, long-series detection, enrichment-only attributes, exclusion (including hidden titles), anchors, fingerprinting |
| `scoring.test.ts` | each factor, vote-count trust, confidence scaling, score bounds, determinism, tie-breaking, jitter stability, diversity caps, MMR spread, explanation truthfulness |
| `engine.test.ts` | full pipeline on a fake catalog: already-watched and hidden-title exclusion, cross-section dedupe, two libraries diverging, per-user isolation, negative ranking, anchor clusters, discovery presence, top-section diversity, determinism, debug gating, API call budget, empty / one-title / no-catalog / all-owned / no-metadata edge cases |
| `cache.test.ts` | TTL reuse, in-flight sharing, expiry, failures not cached, LRU eviction |

The fake `CatalogPort` records every call, which is how the API budget is
asserted rather than assumed.
