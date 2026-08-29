/**
 * Recommendation scoring.
 *
 * An additive weighted model over factors that are all recorded on the result.
 * Additive (not multiplicative) because one missing attribute must not zero a
 * candidate: most candidates arrive as catalog summaries with genres, a date, a
 * language and vote data, and nothing else. A product would make "unknown"
 * indistinguishable from "bad".
 *
 * Every factor carries the evidence it was computed from. The explanation layer
 * may only cite factors that actually scored, which is what keeps reasons
 * truthful rather than plausible-sounding.
 */

import type {
  Candidate,
  RecommendationTier,
  ScoreFactor,
  ScoreFactorKey,
  ScoredCandidate,
  TasteProfile,
} from "@/types/recommendations";

import { CANDIDATES, SCORE_WEIGHT, SCORING, TIER_THRESHOLD } from "./config";
import { clamp, clamp01, round } from "./rating";
import { affinityOf, affinityScore } from "./taste-profile";

/* -------------------------------------------------------------------------- */
/* Text helpers                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Words too common to be evidence of anything. Kept small and English-only on
 * purpose — this is a weak lexical signal used only to *confirm* a theme the
 * profile already established, never to discover one.
 */
const STOPWORDS = new Set([
  "about",
  "after",
  "against",
  "before",
  "being",
  "between",
  "could",
  "during",
  "every",
  "first",
  "found",
  "their",
  "there",
  "these",
  "thing",
  "those",
  "through",
  "while",
  "where",
  "which",
  "world",
  "would",
  "young",
  "story",
  "years",
  "still",
  "other",
  "another",
  "himself",
  "herself",
  "themselves",
  "becomes",
  "begins",
  "must",
  "into",
  "when",
  "from",
  "that",
  "this",
  "with",
  "have",
  "will",
  "they",
  "them",
  "then",
  "than",
  "life",
  "back",
  "take",
  "make",
  "only",
  "over",
  "also",
  "more",
  "most",
  "some",
  "what",
  "does",
]);

function textTokens(text: string | null | undefined): Set<string> {
  if (!text) return new Set();
  const out = new Set<string>();
  for (const raw of text.toLowerCase().split(/[^a-z0-9']+/)) {
    if (raw.length < 4) continue;
    if (STOPWORDS.has(raw)) continue;
    out.add(raw);
  }
  return out;
}

/**
 * Themes from the profile that appear in the candidate's own overview.
 *
 * TMDB keywords are only available for titles we spent a detail call on, and
 * candidates never get one. Matching the user's observed keywords against the
 * candidate's overview text is the honest approximation: when it fires we can
 * name the exact words that matched, and when it does not, the factor is 0.
 */
function matchedThemes(profile: TasteProfile, candidate: Candidate): string[] {
  if (profile.themes.length === 0) return [];
  const tokens = textTokens(candidate.media.overview);
  if (tokens.size === 0) return [];

  const matches: string[] = [];
  for (const theme of profile.themes) {
    if (theme.score <= 0) continue;
    const words = theme.key
      .toLowerCase()
      .split(/[^a-z0-9']+/)
      .filter((w) => w.length >= 4);
    if (words.length === 0) continue;
    if (words.every((word) => tokens.has(word))) matches.push(theme.key);
  }
  return matches;
}

/* -------------------------------------------------------------------------- */
/* Factor helpers                                                             */
/* -------------------------------------------------------------------------- */

function factor(
  key: ScoreFactorKey,
  label: string,
  value: number,
  evidence: string[],
): ScoreFactor {
  const weight = SCORE_WEIGHT[key];
  return {
    key,
    label,
    value: round(value, 3),
    weight,
    contribution: round(value * weight, 2),
    evidence,
  };
}

/** Mean of the strongest `take` values, so one hit does not carry a whole list. */
function topMean(values: number[], take: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => b - a).slice(0, take);
  return sorted.reduce((a, b) => a + b, 0) / sorted.length;
}

/**
 * Deterministic 0…1 value derived from a string.
 *
 * The wildcard lane needs variety without randomness — ranking has to be
 * reproducible for the same library and catalog, or the tests are meaningless
 * and the cache would serve a different order than it computed.
 */
export function stableJitter(key: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    hash = Math.imul(hash ^ key.charCodeAt(i), 0x01000193) >>> 0;
  }
  return (hash % 1000) / 1000;
}

/* -------------------------------------------------------------------------- */
/* Individual factors                                                         */
/* -------------------------------------------------------------------------- */

function genreFactor(profile: TasteProfile, candidate: Candidate): ScoreFactor | null {
  if (candidate.genreNames.length === 0 || profile.genres.length === 0) return null;

  const scored: { name: string; score: number }[] = [];
  for (const name of candidate.genreNames) {
    const affinity = affinityOf(profile.genres, name);
    if (affinity) scored.push({ name, score: affinity.score });
  }
  if (scored.length === 0) return null;

  const positives = scored.filter((s) => s.score > 0);
  // Best two genres decide the value: a thriller/drama match should not be
  // diluted by an incidental third genre the user has no opinion about.
  const value = clamp(
    topMean(
      positives.length > 0 ? positives.map((s) => s.score) : scored.map((s) => s.score),
      2,
    ),
    -1,
    1,
  );

  const evidence = (positives.length > 0 ? positives : scored)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((s) => s.name);

  return factor("genre_affinity", "Genre match", value, evidence);
}

function avoidedGenreFactor(
  profile: TasteProfile,
  candidate: Candidate,
): ScoreFactor | null {
  if (profile.avoidedGenres.length === 0) return null;

  const hits = candidate.genreNames.filter((name) =>
    profile.avoidedGenres.some((g) => g.key.toLowerCase() === name.toLowerCase()),
  );
  if (hits.length === 0) return null;

  // Strength of the aversion, not the number of hits — one strongly avoided
  // genre is a bigger problem than two mildly avoided ones.
  const strength = topMean(
    hits.map((name) => Math.abs(affinityScore(profile.avoidedGenres, name))),
    2,
  );

  return factor("avoided_genre", "Genre you tend to abandon", clamp01(strength), hits);
}

function anchorFactor(candidate: Candidate): ScoreFactor | null {
  const anchored = candidate.provenance.filter(
    (p) =>
      p.source === "anchor_similar" ||
      p.source === "anchor_recommended" ||
      p.source === "anchor_collection",
  );
  if (anchored.length === 0) return null;

  // Position in the provider's similarity list is the only strength signal
  // available, so decay by rank; multiple anchors pointing at the same title is
  // stronger evidence than one, with diminishing returns.
  let value = 0;
  const evidence: string[] = [];
  for (const [index, provenance] of anchored.entries()) {
    const rankDecay = 1 / (1 + provenance.rank / 8);
    const sourceWeight = provenance.source === "anchor_recommended" ? 1 : 0.85;
    value += rankDecay * sourceWeight * (index === 0 ? 1 : 0.35);
    if (provenance.anchorTitle && !evidence.includes(provenance.anchorTitle)) {
      evidence.push(provenance.anchorTitle);
    }
  }

  return factor(
    "anchor_similarity",
    "Similar to your favourites",
    clamp01(value),
    evidence,
  );
}

function peopleFactor(profile: TasteProfile, candidate: Candidate): ScoreFactor | null {
  const credits = candidate.provenance.filter((p) => p.source === "person_credit");
  if (credits.length === 0) return null;

  let value = 0;
  const evidence: string[] = [];

  for (const provenance of credits) {
    if (!provenance.personName) continue;
    const list = provenance.personRole === "cast" ? profile.cast : profile.creators;
    const affinity = affinityOf(list, provenance.personName);
    if (!affinity) continue;

    // A director you rate highly predicts far more than a cast member.
    const roleWeight = provenance.personRole === "cast" ? 0.55 : 1;
    value += affinity.score * roleWeight * (evidence.length === 0 ? 1 : 0.4);
    if (!evidence.includes(provenance.personName)) evidence.push(provenance.personName);
  }

  if (evidence.length === 0) return null;
  return factor("people_affinity", "People you follow", clamp(value, -1, 1), evidence);
}

function themeFactor(profile: TasteProfile, candidate: Candidate): ScoreFactor | null {
  const matches = matchedThemes(profile, candidate);
  if (matches.length < SCORING.minThemeMatches) return null;

  const value = clamp01(
    (matches.length - SCORING.minThemeMatches + 1) /
      (SCORING.themeMatchSaturation - SCORING.minThemeMatches + 1),
  );
  return factor("theme_overlap", "Themes you gravitate to", value, matches.slice(0, 4));
}

function eraFactor(profile: TasteProfile, candidate: Candidate): ScoreFactor | null {
  const year = Number(candidate.media.releaseDate?.slice(0, 4));
  if (!Number.isFinite(year) || profile.decades.length === 0) return null;

  const decade = `${Math.floor(year / 10) * 10}s`;
  const exact = affinityOf(profile.decades, decade);
  if (exact && exact.score !== 0) {
    return factor("era_fit", `Your ${decade} era`, clamp(exact.score, -1, 1), [decade]);
  }

  // Adjacent decades count at half strength — taste in eras is a gradient, not
  // a set of buckets.
  const neighbours = [
    `${Math.floor(year / 10) * 10 - 10}s`,
    `${Math.floor(year / 10) * 10 + 10}s`,
  ];
  const scores = neighbours
    .map((label) => affinityOf(profile.decades, label)?.score ?? 0)
    .filter((s) => s > 0);
  if (scores.length === 0) return null;

  return factor(
    "era_fit",
    "Near your usual era",
    clamp(topMean(scores, 1) * 0.5, -1, 1),
    [decade],
  );
}

function languageFactor(profile: TasteProfile, candidate: Candidate): ScoreFactor | null {
  const language = candidate.media.originalLanguage;
  if (!language || profile.languages.length === 0) return null;
  const affinity = affinityOf(profile.languages, language);
  if (!affinity || affinity.score === 0) return null;
  return factor("language_fit", "Language you watch", clamp(affinity.score, -1, 1), [
    language,
  ]);
}

function qualityFactors(candidate: Candidate): ScoreFactor[] {
  const vote = candidate.media.voteAverage ?? null;
  const votes = candidate.media.voteCount ?? 0;
  if (vote == null || vote <= 0) return [];

  // An 8.9 from 20 voters is not evidence of quality; trust ramps with volume.
  const trust = clamp01(votes / CANDIDATES.minVoteCount);
  const out: ScoreFactor[] = [];

  const normalized = clamp01(
    (vote - SCORING.qualityVoteFloor) /
      (SCORING.qualityVoteCeiling - SCORING.qualityVoteFloor),
  );
  out.push(
    factor("quality", "Audience score", normalized * trust, [
      `${vote.toFixed(1)} from ${votes} votes`,
    ]),
  );

  if (vote < SCORING.lowQualityVoteThreshold && votes >= CANDIDATES.minVoteCount) {
    out.push(
      factor(
        "low_quality",
        "Rated poorly by audiences",
        clamp01(
          (SCORING.lowQualityVoteThreshold - vote) / SCORING.lowQualityVoteThreshold,
        ),
        [vote.toFixed(1)],
      ),
    );
  }

  return out;
}

function mediaTypeFactor(
  profile: TasteProfile,
  candidate: Candidate,
): ScoreFactor | null {
  const bias = profile.mediaTypeBias;
  if (bias.movie === 0 && bias.tv === 0) return null;
  const share = candidate.media.mediaType === "movie" ? bias.movie : bias.tv;
  // Centred on an even split so a balanced watcher gets no push either way.
  const value = clamp((share - 0.5) * 2, -1, 1);
  if (Math.abs(value) < 0.1) return null;
  return factor(
    "media_type_fit",
    candidate.media.mediaType === "movie"
      ? "You watch mostly films"
      : "You watch mostly series",
    value,
    [candidate.media.mediaType === "movie" ? "Movies" : "TV"],
  );
}

function franchiseFactor(candidate: Candidate): ScoreFactor | null {
  const collection = candidate.provenance.find((p) => p.source === "anchor_collection");
  if (!collection?.anchorTitle) return null;
  return factor("franchise_continuation", "Same series you watched", 1, [
    collection.anchorTitle,
  ]);
}

function discoveryFactor(
  profile: TasteProfile,
  candidate: Candidate,
): ScoreFactor | null {
  const wildcard = candidate.provenance.find((p) => p.source === "wildcard_genre");
  if (wildcard?.genreName) {
    // Deliberate step outside the profile — jitter keeps the wildcard lane from
    // showing the same handful of titles on every run, deterministically.
    const value = 0.6 + 0.4 * stableJitter(candidate.key);
    return factor("discovery", "Outside your usual picks", value, [wildcard.genreName]);
  }

  const popularity = candidate.media.popularity ?? null;
  if (popularity == null || profile.popularityComfort == null) return null;

  // Reward less-travelled titles only for users whose own library skews
  // mainstream; for a deep-catalogue watcher this is not a discovery at all.
  if (
    popularity < SCORING.obscurePopularity &&
    profile.popularityComfort > SCORING.mainstreamPopularity
  ) {
    return factor("discovery", "Lesser-known pick", 0.5, ["Low popularity"]);
  }
  return null;
}

function freshnessFactor(candidate: Candidate, now: number): ScoreFactor | null {
  const date = candidate.media.releaseDate;
  if (!date) return null;
  const released = Date.parse(date);
  if (!Number.isFinite(released)) return null;
  // Unreleased titles are not recommendations; they are announcements.
  if (released > now) return null;

  const days = (now - released) / 86_400_000;
  if (days > SCORING.freshnessDays) return null;

  return factor(
    "freshness",
    "Recently released",
    clamp01(1 - days / SCORING.freshnessDays),
    [date.slice(0, 4)],
  );
}

function longSeriesRiskFactor(
  profile: TasteProfile,
  candidate: Candidate,
): ScoreFactor | null {
  if (!profile.completion.avoidsLongSeries) return null;
  if (candidate.media.mediaType !== "tv") return null;
  // Episode counts are not on catalog summaries, so this fires on the observed
  // habit rather than on the specific candidate's length: a user who reliably
  // abandons long series gets a mild, explained tilt toward films and limited
  // series instead of a hard filter.
  return factor("long_series_risk", "You rarely finish long series", 0.5, [
    `${profile.completion.droppedSeriesMeanEpisodes ?? 0}+ episode series dropped`,
  ]);
}

function obscurityRiskFactor(candidate: Candidate): ScoreFactor | null {
  const votes = candidate.media.voteCount ?? 0;
  if (votes >= CANDIDATES.minVoteCountHardFloor) return null;
  // Almost no audience data at all: it may be great, but nothing here supports
  // recommending it, so it sinks rather than disappears.
  return factor("obscurity_risk", "Too little data to judge", 1, [`${votes} votes`]);
}

/* -------------------------------------------------------------------------- */
/* Scoring                                                                    */
/* -------------------------------------------------------------------------- */

function tierOf(score: number, candidate: Candidate): RecommendationTier {
  if (candidate.provenance.some((p) => p.source === "wildcard_genre")) return "wildcard";
  if (score >= TIER_THRESHOLD.safe) return "safe";
  if (score >= TIER_THRESHOLD.adjacent) return "adjacent";
  return "discovery";
}

/**
 * Per-candidate confidence — how much of the score came from evidence about
 * *this* user rather than from generic quality. Used for section placement and
 * for deciding whether a personalized claim may be made on the card.
 */
function confidenceOf(factors: ScoreFactor[], profile: TasteProfile): number {
  const personal = factors
    .filter((f) => SCORING.confidenceScaledFactors.includes(f.key))
    .reduce((sum, f) => sum + Math.max(f.contribution, 0), 0);
  const total = factors.reduce((sum, f) => sum + Math.abs(f.contribution), 0);
  if (total === 0) return 0;
  return round(clamp01((personal / total) * (0.35 + 0.65 * profile.confidence)), 2);
}

export interface ScoreOptions {
  now?: number;
}

export function scoreCandidate(
  candidate: Candidate,
  profile: TasteProfile,
  options: ScoreOptions = {},
): ScoredCandidate {
  const now = options.now ?? Date.now();

  const factors = [
    genreFactor(profile, candidate),
    anchorFactor(candidate),
    peopleFactor(profile, candidate),
    themeFactor(profile, candidate),
    eraFactor(profile, candidate),
    languageFactor(profile, candidate),
    mediaTypeFactor(profile, candidate),
    franchiseFactor(candidate),
    discoveryFactor(profile, candidate),
    freshnessFactor(candidate, now),
    avoidedGenreFactor(profile, candidate),
    longSeriesRiskFactor(profile, candidate),
    obscurityRiskFactor(candidate),
    ...qualityFactors(candidate),
  ].filter((f): f is ScoreFactor => f != null && f.contribution !== 0);

  // Personalization is trusted in proportion to how much has been observed, so
  // a two-title library degrades to a quality ranking rather than to noise.
  const personalizationScale =
    SCORING.personalizationFloor +
    (1 - SCORING.personalizationFloor) * profile.confidence;

  let total = SCORING.base;
  for (const f of factors) {
    const scaled = SCORING.confidenceScaledFactors.includes(f.key)
      ? f.contribution * personalizationScale
      : f.contribution;
    total += scaled;
  }

  const score = round(clamp(total, SCORING.min, SCORING.max), 2);

  return {
    candidate,
    score,
    factors: factors.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution)),
    tier: tierOf(score, candidate),
    confidence: confidenceOf(factors, profile),
  };
}

/**
 * Score a pool and return it in deterministic descending order.
 * Ties break on candidate key so the same pool always produces the same ranking.
 */
export function scorePool(
  candidates: Candidate[],
  profile: TasteProfile,
  options: ScoreOptions = {},
): ScoredCandidate[] {
  return candidates
    .map((candidate) => scoreCandidate(candidate, profile, options))
    .sort((a, b) => {
      const delta = b.score - a.score;
      if (Math.abs(delta) > 1e-9) return delta;
      return a.candidate.key.localeCompare(b.candidate.key);
    });
}
