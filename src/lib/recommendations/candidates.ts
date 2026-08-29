/**
 * Candidate generation.
 *
 * Builds a pool of a few hundred titles from lanes that each answer a different
 * question, then dedupes them while *keeping every provenance*. Provenance is
 * the point: a title found by three different anchors and one director lane is
 * both a stronger candidate and an explainable one, and the scorer reads those
 * records rather than re-deriving why the title is here.
 *
 * Cost is bounded by construction — the lanes are fixed in number, the anchor
 * detail calls are capped by `CANDIDATES.maxEnrichedAnchors`, and every request
 * goes through the catalog cache. Nothing here scales with the number of cards
 * rendered.
 */

import type { MediaKind } from "@/types/library";
import type { Genre, MediaSummary } from "@/types/media";
import type {
  Affinity,
  Candidate,
  CandidateProvenance,
  CandidateSource,
  TasteProfile,
} from "@/types/recommendations";

import type { CatalogPort, TitleFacts } from "./catalog-port";
import { CANDIDATES } from "./config";
import { candidateKey } from "./signals";

/* -------------------------------------------------------------------------- */
/* Pool                                                                       */
/* -------------------------------------------------------------------------- */

class CandidatePool {
  private readonly items = new Map<string, Candidate>();

  constructor(
    private readonly genreMap: Map<string, Genre>,
    private readonly excluded: Set<string>,
  ) {}

  add(media: MediaSummary, provenance: CandidateProvenance): void {
    if (!media.id || !media.title) return;
    const key = candidateKey(media.mediaType, media.id);

    // Already in the library — watched, dropped, planned or wishlisted. The
    // watchlist is excluded too: the user has already decided about it, and
    // recommending it back adds nothing.
    if (this.excluded.has(key)) return;
    // Titles with no poster cannot be rendered in a rail without looking broken.
    if (!media.posterPath) return;
    if (media.adult) return;

    const existing = this.items.get(key);
    if (existing) {
      const duplicate = existing.provenance.some(
        (p) =>
          p.source === provenance.source &&
          p.anchorExternalId === provenance.anchorExternalId &&
          p.personId === provenance.personId &&
          p.genreName === provenance.genreName,
      );
      if (!duplicate) existing.provenance.push(provenance);
      return;
    }

    if (this.items.size >= CANDIDATES.maxPoolSize) return;

    this.items.set(key, {
      key,
      media,
      provenance: [provenance],
      genreNames: (media.genreIds ?? [])
        .map((id) => this.genreMap.get(id)?.name)
        .filter((name): name is string => Boolean(name)),
    });
  }

  /** Attach franchise ids discovered while walking anchor collections. */
  tagCollection(key: string, collectionId: string): void {
    const item = this.items.get(key);
    if (item && !item.collectionId) item.collectionId = collectionId;
  }

  /** Deterministic order — key-sorted, so scoring input never varies by timing. */
  toArray(): Candidate[] {
    return [...this.items.values()].sort((a, b) => a.key.localeCompare(b.key));
  }
}

function addList(
  pool: CandidatePool,
  items: MediaSummary[],
  take: number,
  base: Omit<CandidateProvenance, "rank">,
): void {
  items.slice(0, take).forEach((media, index) => {
    pool.add(media, { ...base, rank: index });
  });
}

/* -------------------------------------------------------------------------- */
/* Lane inputs                                                                */
/* -------------------------------------------------------------------------- */

/** Decade label → year window, widened by the configured tolerance. */
function decadeWindow(label: string): { gte: number; lte: number } | null {
  const start = Number(label.replace(/\D/g, ""));
  if (!Number.isFinite(start) || start < 1870) return null;
  return {
    gte: start - Math.round(CANDIDATES.eraWindowYears / 2),
    lte: start + 9 + Math.round(CANDIDATES.eraWindowYears / 2),
  };
}

function genreIdsFor(names: string[], genreMap: Map<string, Genre>): string[] {
  const byName = new Map<string, string>();
  for (const genre of genreMap.values()) {
    byName.set(genre.name.toLowerCase(), genre.id);
  }
  return names
    .map((name) => byName.get(name.toLowerCase()))
    .filter((id): id is string => Boolean(id));
}

/**
 * A genre the user has barely touched but has not rejected.
 *
 * This is the wildcard lane's input, and the reason the feed can leave the
 * user's bubble at all: everything else in the pipeline is, by design, drawn
 * toward what they already watch.
 */
function wildcardGenres(profile: TasteProfile, genreMap: Map<string, Genre>): Genre[] {
  const known = new Set(profile.genres.map((g) => g.key.toLowerCase()));
  const avoided = new Set(profile.avoidedGenres.map((g) => g.key.toLowerCase()));

  // Genre ids are shared between movie and TV for the overlapping names, so
  // dedupe by name and keep a stable alphabetical order for determinism.
  const byName = new Map<string, Genre>();
  for (const genre of genreMap.values()) {
    const name = genre.name.toLowerCase();
    if (known.has(name) || avoided.has(name)) continue;
    if (!byName.has(name)) byName.set(name, genre);
  }

  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/** People worth an API call: strong affinity, enough support to justify it. */
function peopleToLookUp(profile: TasteProfile): {
  affinity: Affinity;
  role: "creator" | "cast";
}[] {
  const creators = profile.creators
    .filter((c) => c.id && c.score > 0.25 && c.support >= CANDIDATES.minPersonSupport)
    .map((affinity) => ({ affinity, role: "creator" as const }));

  const cast = profile.cast
    .filter((c) => c.id && c.score > 0.35 && c.support >= CANDIDATES.minPersonSupport)
    .map((affinity) => ({ affinity, role: "cast" as const }));

  return [...creators, ...cast]
    .sort((a, b) => {
      // Creators outrank cast at equal strength: authorship predicts better.
      const roleDelta = (a.role === "creator" ? 0 : 1) - (b.role === "creator" ? 0 : 1);
      if (roleDelta !== 0) return roleDelta;
      const delta = b.affinity.score - a.affinity.score;
      if (Math.abs(delta) > 1e-9) return delta;
      return a.affinity.key.localeCompare(b.affinity.key);
    })
    .slice(0, CANDIDATES.maxPeopleLookups);
}

/* -------------------------------------------------------------------------- */
/* Generation                                                                 */
/* -------------------------------------------------------------------------- */

export interface GenerateCandidatesResult {
  candidates: Candidate[];
  /** Lane → number of titles contributed. Debug only. */
  laneCounts: Record<string, number>;
}

export async function generateCandidates(
  profile: TasteProfile,
  facts: Map<string, TitleFacts>,
  catalog: CatalogPort,
): Promise<GenerateCandidatesResult> {
  const genreMap = await catalog.getGenreMap();
  const pool = new CandidatePool(genreMap, new Set(profile.excludedKeys));
  const laneCounts: Record<string, number> = {};

  const track = (source: CandidateSource, count: number) => {
    laneCounts[source] = (laneCounts[source] ?? 0) + count;
  };

  /* Lane 1 — the catalog's own neighbours of each anchor. ------------------ */
  for (const anchor of profile.anchors) {
    const fact = facts.get(candidateKey(anchor.mediaType, anchor.externalId));
    if (!fact) continue;

    const base = { anchorTitle: anchor.title, anchorExternalId: anchor.externalId };

    addList(pool, fact.similar, CANDIDATES.perAnchorSimilar, {
      source: "anchor_similar",
      ...base,
    });
    track("anchor_similar", Math.min(fact.similar.length, CANDIDATES.perAnchorSimilar));

    addList(pool, fact.recommended, CANDIDATES.perAnchorRecommended, {
      source: "anchor_recommended",
      ...base,
    });
    track(
      "anchor_recommended",
      Math.min(fact.recommended.length, CANDIDATES.perAnchorRecommended),
    );
  }

  /* Lane 2 — unwatched parts of franchises the user is already inside. ----- */
  const collectionIds = new Map<string, string>();
  for (const anchor of profile.anchors) {
    const fact = facts.get(candidateKey(anchor.mediaType, anchor.externalId));
    if (fact?.collectionId) collectionIds.set(fact.collectionId, anchor.title);
  }
  await Promise.all(
    [...collectionIds.entries()].map(async ([collectionId, anchorTitle]) => {
      const parts = await catalog.getCollectionParts(collectionId);
      addList(pool, parts, CANDIDATES.perCollection, {
        source: "anchor_collection",
        anchorTitle,
      });
      for (const part of parts) {
        pool.tagCollection(candidateKey(part.mediaType, part.id), collectionId);
      }
      track("anchor_collection", Math.min(parts.length, CANDIDATES.perCollection));
    }),
  );

  /* Lane 3 — discover inside the genres and eras the user actually watches. */
  const likedGenres = profile.genres
    .filter((g) => g.score > 0.1)
    .slice(0, CANDIDATES.maxDiscoveryGenres);
  const topDecade = profile.decades.find((d) => d.score > 0.1)?.key;
  const era = topDecade ? decadeWindow(topDecade) : null;

  const discoverJobs: Promise<void>[] = [];
  for (const genre of likedGenres) {
    for (const mediaType of ["movie", "tv"] as MediaKind[]) {
      const ids = genreIdsFor([genre.key], genreMap);
      if (ids.length === 0) continue;

      discoverJobs.push(
        (async () => {
          const results = await catalog.discover({
            mediaType,
            genreIds: ids,
            voteAverageGte: CANDIDATES.discoveryVoteFloor,
            // Runtime preference is applied here rather than in scoring: catalog
            // summaries have no runtime, so the only place it can act is on the
            // shape of the pool.
            runtimeGte:
              mediaType === "movie"
                ? (profile.runtime.minMinutes ?? undefined)
                : undefined,
            runtimeLte:
              mediaType === "movie"
                ? (profile.runtime.maxMinutes ?? undefined)
                : undefined,
            yearGte: era?.gte,
            yearLte: era?.lte,
            sortBy: "popularity.desc",
          });
          addList(pool, results, CANDIDATES.perGenreDiscovery, {
            source: "genre_discovery",
            genreName: genre.key,
          });
          track(
            "genre_discovery",
            Math.min(results.length, CANDIDATES.perGenreDiscovery),
          );
        })(),
      );
    }
  }

  /* Lane 4 — acclaimed titles in liked genres, ignoring era and popularity. */
  if (likedGenres.length > 0) {
    const ids = genreIdsFor(
      likedGenres.slice(0, 2).map((g) => g.key),
      genreMap,
    );
    if (ids.length > 0) {
      for (const mediaType of ["movie", "tv"] as MediaKind[]) {
        discoverJobs.push(
          (async () => {
            const results = await catalog.discover({
              mediaType,
              genreIds: ids,
              voteAverageGte: CANDIDATES.acclaimedVoteFloor,
              sortBy: "popularity.desc",
              page: 2,
            });
            addList(pool, results, CANDIDATES.perAcclaimed, {
              source: "acclaimed",
              genreName: likedGenres[0]!.key,
            });
            track("acclaimed", Math.min(results.length, CANDIDATES.perAcclaimed));
          })(),
        );
      }
    }
  }

  /* Lane 5 — a genre the user has neither watched nor rejected. ------------ */
  const wildcards = wildcardGenres(profile, genreMap);
  if (wildcards.length > 0) {
    // Chosen by profile fingerprint rather than at random, so the wildcard is
    // stable for a given library but differs between users and shifts as the
    // library grows.
    const index =
      profile.excludedKeys.length + profile.genres.length + profile.themes.length;
    const genre = wildcards[index % wildcards.length]!;
    discoverJobs.push(
      (async () => {
        const results = await catalog.discover({
          mediaType: "movie",
          genreIds: [genre.id],
          voteAverageGte: CANDIDATES.acclaimedVoteFloor,
          sortBy: "popularity.desc",
        });
        addList(pool, results, CANDIDATES.perWildcard, {
          source: "wildcard_genre",
          genreName: genre.name,
        });
        track("wildcard_genre", Math.min(results.length, CANDIDATES.perWildcard));
      })(),
    );
  }

  await Promise.all(discoverJobs);

  /* Lane 6 — filmographies of the people the user keeps rating well. ------- */
  const people = peopleToLookUp(profile);
  await Promise.all(
    people.map(async ({ affinity, role }) => {
      if (!affinity.id) return;
      const result = await catalog.getPersonCredits(affinity.id);
      if (!result) return;
      addList(pool, result.credits, CANDIDATES.perPersonCredit, {
        source: "person_credit",
        personId: affinity.id,
        personName: result.name,
        personRole: role,
      });
      track("person_credit", Math.min(result.credits.length, CANDIDATES.perPersonCredit));
    }),
  );

  /* Lane 7 — broad backfill so thin profiles still get a full page. -------- */
  const [trending, topMovies, topTv, nowPlaying] = await Promise.all([
    catalog.getList("trending"),
    catalog.getList("top_rated_movies"),
    catalog.getList("top_rated_tv"),
    catalog.getList("now_playing_movies"),
  ]);

  addList(pool, trending, CANDIDATES.perTrending, { source: "trending" });
  track("trending", Math.min(trending.length, CANDIDATES.perTrending));

  addList(pool, topMovies, CANDIDATES.perAcclaimed, { source: "acclaimed" });
  addList(pool, topTv, CANDIDATES.perAcclaimed, { source: "acclaimed" });
  track(
    "acclaimed",
    Math.min(topMovies.length + topTv.length, CANDIDATES.perAcclaimed * 2),
  );

  addList(pool, nowPlaying, CANDIDATES.perFresh, { source: "fresh_release" });
  track("fresh_release", Math.min(nowPlaying.length, CANDIDATES.perFresh));

  return { candidates: pool.toArray(), laneCounts };
}

/**
 * Pool for a user with no usable history.
 *
 * Separate function rather than a branch inside `generateCandidates`, because
 * the cold-start pool must not pretend to be personalized: it has no anchors, no
 * genre lanes and no people, and mixing the two paths is how a "we know your
 * taste" claim ends up on a page built entirely from trending.
 *
 * `excludedKeys` is still applied. An empty *profile* does not imply an empty
 * *library* — a user whose titles are all archived, or all wishlisted with no
 * ratings, produces no signal but has still seen things — and this function is
 * also the fallback when the personalized lanes come back empty.
 */
export async function generateColdStartCandidates(
  catalog: CatalogPort,
  excludedKeys: string[] = [],
): Promise<Candidate[]> {
  const genreMap = await catalog.getGenreMap();
  const pool = new CandidatePool(genreMap, new Set(excludedKeys));

  const [trending, topMovies, topTv, popularMovies, popularTv, nowPlaying] =
    await Promise.all([
      catalog.getList("trending"),
      catalog.getList("top_rated_movies"),
      catalog.getList("top_rated_tv"),
      catalog.getList("popular_movies"),
      catalog.getList("popular_tv"),
      catalog.getList("now_playing_movies"),
    ]);

  addList(pool, trending, CANDIDATES.perTrending, { source: "trending" });
  addList(pool, topMovies, CANDIDATES.perAcclaimed, { source: "acclaimed" });
  addList(pool, topTv, CANDIDATES.perAcclaimed, { source: "acclaimed" });
  addList(pool, popularMovies, CANDIDATES.perPopular, { source: "popular" });
  addList(pool, popularTv, CANDIDATES.perPopular, { source: "popular" });
  addList(pool, nowPlaying, CANDIDATES.perFresh, { source: "fresh_release" });

  return pool.toArray();
}
