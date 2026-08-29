/**
 * Personalized recommendation engine — domain types.
 *
 * Deliberately separate from `@/types/intelligence`:
 *
 *   Decision Score  — "how well does THIS title fit what I know about you?"
 *   Recommendation  — "out of thousands of titles, which should you see next?"
 *
 * The first is a per-title verdict rendered on a detail page. The second is a
 * ranking problem over a generated candidate pool, and needs provenance,
 * diversification bookkeeping and per-section grouping that the Decision Score
 * has no reason to carry. Nothing here replaces or re-exports those types.
 */

import type { MediaKind, WatchStatus } from "@/types/library";
import type { MediaSummary } from "@/types/media";

/* -------------------------------------------------------------------------- */
/* Taste profile                                                              */
/* -------------------------------------------------------------------------- */

/**
 * How much evidence the profile is built on. Drives copy on the page: the
 * engine must never claim to know a taste it has not observed.
 */
export type SignalStrength = "empty" | "sparse" | "moderate" | "rich";

/** A weighted preference for one attribute value, with the evidence behind it. */
export interface Affinity {
  /** Attribute value — genre name, language code, decade label, person name. */
  key: string;
  /** Optional provider id (genre id, person id) for candidate generation. */
  id?: string;
  /**
   * Preference in −1…1. Positive means "seeks out", negative means "avoids".
   * Magnitude already accounts for support, so a single 5★ rating cannot
   * produce a 1.0.
   */
  score: number;
  /** Sum of absolute behavioural weight behind `score`. Higher = more certain. */
  support: number;
  /** Number of distinct library titles contributing. */
  titles: number;
  /** Positive-weight share of support (0…1) — used for negative detection. */
  positiveShare: number;
}

/** A library title strong enough to anchor "because you watched X" clusters. */
export interface AnchorTitle {
  entryId: string;
  externalId: string;
  provider: string;
  mediaType: MediaKind;
  title: string;
  posterPath: string | null;
  releaseDate: string | null;
  status: WatchStatus;
  /** Normalized 0…1 rating when the user rated it. */
  rating: number | null;
  /** Behavioural weight (positive only for anchors). */
  weight: number;
  /** Why this title anchors — drives truthful cluster headings. */
  basis: AnchorBasis;
}

export type AnchorBasis =
  "rated_high" | "favorite" | "rewatched" | "completed" | "deeply_engaged";

/** Ranges the user actually watches, used to shape candidate queries. */
export interface RuntimePreference {
  /** Mean runtime of positively-weighted movies, minutes. */
  meanMinutes: number | null;
  /** Query window derived from the observed spread. */
  minMinutes: number | null;
  maxMinutes: number | null;
  /** Titles behind the window. */
  support: number;
}

export interface RatingBehaviour {
  count: number;
  /** Mean of normalized 0…1 ratings. */
  mean: number | null;
  /** Population standard deviation of normalized ratings. */
  spread: number;
  /**
   * `true` when the user rates in a narrow band — then rating deltas mean
   * more per point and genre affinity is scaled accordingly.
   */
  isNarrowRater: boolean;
  /** Scales used, for transparency (a user may mix 5★ and 10-point). */
  scalesUsed: string[];
}

export interface CompletionBehaviour {
  /** Completed ÷ (completed + dropped) across all media, 0…1. */
  completionRate: number;
  droppedCount: number;
  completedCount: number;
  /** Mean total_episodes of dropped series, when known. */
  droppedSeriesMeanEpisodes: number | null;
  /** Mean total_episodes of completed series, when known. */
  completedSeriesMeanEpisodes: number | null;
  /**
   * `true` when long-running series are dropped materially more often than
   * short ones. Penalizes very long shows instead of banning them.
   */
  avoidsLongSeries: boolean;
}

/** Everything the ranking stage knows about the user. Pure data — no I/O. */
export interface TasteProfile {
  generatedAt: string;
  signalStrength: SignalStrength;
  /** 0…1 — how much the ranking should trust personalization over quality. */
  confidence: number;
  librarySize: number;
  /** Titles that carried any non-zero behavioural weight. */
  signalTitles: number;

  genres: Affinity[];
  languages: Affinity[];
  decades: Affinity[];
  /** Directors and creators, from enriched anchor credits. */
  creators: Affinity[];
  /** Top-billed cast, from enriched anchor credits. */
  cast: Affinity[];
  /** TMDB keywords observed on positively-weighted titles. */
  themes: Affinity[];

  runtime: RuntimePreference;
  ratings: RatingBehaviour;
  completion: CompletionBehaviour;

  /** Share of positive weight going to movies vs TV (sums to 1 when non-zero). */
  mediaTypeBias: { movie: number; tv: number };
  /**
   * Mean TMDB popularity of positively-weighted titles, or null when unknown.
   * Used to tell a mainstream watcher from a deep-catalogue watcher.
   */
  popularityComfort: number | null;

  anchors: AnchorTitle[];
  /** Genres with clear avoidance evidence. Reduces rank; never hard-filters. */
  avoidedGenres: Affinity[];

  /**
   * `mediaType:externalId` for everything already in the library — same shape
   * as `Candidate.key`, so exclusion is a set lookup with no key translation.
   */
  excludedKeys: string[];
  /** Subset of `excludedKeys` the user dropped — excluded and explained. */
  droppedKeys: string[];
}

/* -------------------------------------------------------------------------- */
/* Candidates                                                                 */
/* -------------------------------------------------------------------------- */

/** Where a candidate came from. Provenance is what makes explanations honest. */
export type CandidateSource =
  | "anchor_similar"
  | "anchor_recommended"
  | "anchor_collection"
  | "genre_discovery"
  | "person_credit"
  | "trending"
  | "acclaimed"
  | "popular"
  | "fresh_release"
  | "wildcard_genre";

export interface CandidateProvenance {
  source: CandidateSource;
  /** Anchor library title that produced this candidate, when applicable. */
  anchorTitle?: string;
  anchorExternalId?: string;
  /** Person that produced this candidate, when applicable. */
  personName?: string;
  personId?: string;
  /**
   * Which affinity list the person came from. `creator` covers directors, TV
   * creators and writers — everything aggregated into `TasteProfile.creators`.
   */
  personRole?: "creator" | "cast";
  /** Genre name that produced this candidate, when applicable. */
  genreName?: string;
  /** Ordinal within the source list — earlier means the provider ranked it higher. */
  rank: number;
}

/** A scoreable candidate: a catalog summary plus every provenance that found it. */
export interface Candidate {
  /** `mediaType:externalId` — stable dedupe and feedback key. */
  key: string;
  media: MediaSummary;
  provenance: CandidateProvenance[];
  /** Genre names resolved from `media.genreIds` via the provider genre map. */
  genreNames: string[];
  /** TMDB collection id when the candidate is known to belong to a franchise. */
  collectionId?: string;
}

/* -------------------------------------------------------------------------- */
/* Scoring                                                                    */
/* -------------------------------------------------------------------------- */

export type ScoreFactorKey =
  | "genre_affinity"
  | "anchor_similarity"
  | "people_affinity"
  | "theme_overlap"
  | "era_fit"
  | "language_fit"
  | "quality"
  | "media_type_fit"
  | "franchise_continuation"
  | "discovery"
  | "freshness"
  | "avoided_genre"
  | "long_series_risk"
  | "obscurity_risk"
  | "low_quality";

/**
 * One additive term of a score. `contribution` is already weighted and signed,
 * so the debug panel and the explanation layer read the same numbers the
 * ranking used — an explanation can never cite a factor that scored 0.
 */
export interface ScoreFactor {
  key: ScoreFactorKey;
  /** Short human label. Safe to render. */
  label: string;
  /** Raw factor value before weighting, −1…1. */
  value: number;
  weight: number;
  /** `value * weight`, rounded to 2dp. Negative for penalties. */
  contribution: number;
  /**
   * Concrete evidence — genre names, anchor titles, matched keywords.
   * Explanations may only mention values that appear here.
   */
  evidence: string[];
}

/** Confidence tier, also used to place a candidate into a page section. */
export type RecommendationTier = "safe" | "adjacent" | "discovery" | "wildcard";

export interface ScoredCandidate {
  candidate: Candidate;
  /** 0…100. */
  score: number;
  factors: ScoreFactor[];
  tier: RecommendationTier;
  /** 0…1 — how much evidence supports this specific candidate. */
  confidence: number;
}

/* -------------------------------------------------------------------------- */
/* Output                                                                     */
/* -------------------------------------------------------------------------- */

export interface RecommendationExplanation {
  /** Primary reason, rendered on the card. */
  headline: string;
  /** Supporting reasons, revealed on hover / focus. */
  details: string[];
}

export interface Recommendation {
  /** `mediaType:externalId`. Stable across runs — future feedback key. */
  key: string;
  media: MediaSummary;
  score: number;
  tier: RecommendationTier;
  confidence: number;
  explanation: RecommendationExplanation;
  /** Section this item was placed in. */
  sectionId: string;
  /** 1-based rank within its section. */
  rank: number;
  /** Full factor breakdown. Only sent to the client in debug mode. */
  factors?: ScoreFactor[];
}

export type RecommendationSectionKind =
  | "top_picks"
  | "because_you_watched"
  | "matches_taste"
  | "discover_different"
  | "hidden_gems"
  | "movies"
  | "shows"
  | "cold_start";

export interface RecommendationSection {
  id: string;
  kind: RecommendationSectionKind;
  title: string;
  /** Truthful subtitle derived from the signals that built the section. */
  reason: string;
  items: Recommendation[];
}

export type RecommendationMode = "personalized" | "cold_start" | "unavailable";

export interface RecommendationRun {
  mode: RecommendationMode;
  generatedAt: string;
  /**
   * Stable digest of the inputs. Same library + same catalog ⇒ same value,
   * which is what makes cache invalidation and the tests deterministic.
   */
  fingerprint: string;
  profile: TasteProfile;
  sections: RecommendationSection[];
  /** Candidate pool size before scoring — surfaced in debug only. */
  candidateCount: number;
  /** Set when the catalog provider is unconfigured or failed. */
  notice?: string;
}
