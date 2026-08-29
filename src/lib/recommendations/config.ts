/**
 * Every tunable number in the recommendation engine.
 *
 * Nothing in this subsystem may hard-code a weight, threshold or cap. Tuning a
 * recommender means changing numbers repeatedly, and numbers scattered across
 * ten modules cannot be reasoned about as a whole — so they all live here and
 * the tests assert behaviour, not constants.
 */

import type { RecommendationTier, ScoreFactorKey } from "@/types/recommendations";
import type { WatchStatus } from "@/types/library";

/* -------------------------------------------------------------------------- */
/* Status signals                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Base behavioural weight per status, before rating / engagement modifiers.
 *
 * Signs are the important part:
 *   completed / rewatching  strong positive — the user chose to finish it
 *   watching                positive but provisional — outcome still unknown
 *   plan_to_watch/wishlist  intent, not experience; weak positive
 *   paused                  mild negative — interest stalled
 *   dropped                 negative — the clearest avoidance signal available
 *   archived                neutral; users archive for bookkeeping reasons
 */
export const STATUS_WEIGHT: Record<WatchStatus, number> = {
  completed: 1,
  rewatching: 1.25,
  watching: 0.55,
  plan_to_watch: 0.22,
  wishlist: 0.22,
  paused: -0.15,
  dropped: -0.7,
  archived: 0,
};

/** Extra weight for explicit curation actions. */
export const ENGAGEMENT_WEIGHT = {
  /** Heart on the entry. */
  favorite: 0.6,
  /** Per rewatch, capped by `maxRewatchBonus`. */
  perRewatch: 0.35,
  maxRewatchBonus: 1.05,
  /** Wrote a review — effort implies the title mattered. */
  review: 0.3,
  /** Per note, capped. */
  perNote: 0.08,
  maxNoteBonus: 0.24,
  /** Per tag assignment, capped. */
  perTag: 0.06,
  maxTagBonus: 0.18,
  /** Placed in a hand-built collection, per collection, capped. */
  perCollection: 0.12,
  maxCollectionBonus: 0.24,
  /** Per logged watch session beyond the first, capped. */
  perSession: 0.05,
  maxSessionBonus: 0.2,
  /** Viewed the detail page recently without adding it — weak curiosity. */
  recentlyViewed: 0.1,
  /** Pinned to the top of the library. */
  pinned: 0.2,
} as const;

/**
 * Rating modifier. A normalized rating is centred on the user's own mean, so a
 * generous rater's 0.7 is not read as enthusiasm, then scaled — this is added
 * to the status weight rather than multiplied, so a bad rating can flip the
 * sign of a completed title (finished it, hated it) without erasing the fact
 * that they watched it.
 */
export const RATING_WEIGHT = {
  /** Multiplier on (normalized − userMean). */
  centeredScale: 2.2,
  /**
   * Applied when the user has too few ratings for a meaningful mean; the
   * global midpoint (0.6 ≈ 6/10) is used as the reference instead.
   */
  fallbackMean: 0.6,
  minRatingsForPersonalMean: 4,
  /** Narrow raters get their deltas amplified so small gaps still separate. */
  narrowRaterSpreadThreshold: 0.12,
  narrowRaterBoost: 1.6,
  /** Cap on the absolute rating contribution. */
  maxAbsolute: 1.6,
} as const;

/** Recency decay applied to the positive part of a title's weight. */
export const RECENCY = {
  /** Weight retained at `halfLifeDays` since last activity. */
  halfLifeDays: 540,
  /** Never decay below this share — old favourites still say something. */
  floor: 0.55,
} as const;

/* -------------------------------------------------------------------------- */
/* Profile shaping                                                            */
/* -------------------------------------------------------------------------- */

export const PROFILE = {
  /** Library-size thresholds for `signalStrength`. */
  sparseLibraryMax: 4,
  moderateLibraryMax: 14,
  /** Support needed before an affinity is considered trustworthy. */
  minSupportForAffinity: 0.5,
  /**
   * Shrinkage constant. An affinity's direction is multiplied by
   * `support / (support + this)`, so one enthusiastic rating lands near 0.4
   * rather than 1.0 and cannot outvote a genre with ten titles behind it.
   */
  affinitySupportHalf: 2,
  /** Distinct titles needed before a genre may be called "avoided". */
  minTitlesForAvoidance: 2,
  /** Negative share of support above which a genre is treated as avoided. */
  avoidanceNegativeShare: 0.6,
  /** Affinity list caps. */
  maxGenres: 14,
  maxLanguages: 6,
  maxDecades: 8,
  maxCreators: 12,
  maxCast: 16,
  maxThemes: 24,
  /** Anchors used for similarity expansion and "because you watched" clusters. */
  maxAnchors: 8,
  /** Minimum behavioural weight to qualify as an anchor. */
  minAnchorWeight: 0.9,
  /** Runtime window = mean ± max(spread, this), in minutes. */
  runtimeWindowMinSpread: 25,
  runtimeWindowMaxSpread: 55,
  /** Series length above which "avoids long series" can be inferred. */
  longSeriesEpisodes: 40,
  /**
   * Signal titles needed for full confidence. A dozen titles the user has
   * actually reacted to is real evidence; requiring a large library before
   * trusting it would leave engaged new users ranked by popularity.
   */
  confidenceSaturationTitles: 12,
} as const;

/* -------------------------------------------------------------------------- */
/* Candidate generation                                                       */
/* -------------------------------------------------------------------------- */

export const CANDIDATES = {
  /** Anchors enriched with a full detail call (genres, keywords, credits). */
  maxEnrichedAnchors: 8,
  /**
   * Strongest *negative* titles also enriched. Without these, people and theme
   * affinity could only ever be positive, and the engine could not learn that a
   * particular director or subject is reliably abandoned.
   */
  maxEnrichedDetractors: 3,
  /** Minimum negative magnitude before a title is worth a detractor call. */
  minDetractorWeight: 0.6,
  /** People resolved to credit lists for people-driven candidates. */
  maxPeopleLookups: 4,
  /** Minimum affinity support before a person is worth an API call. */
  minPersonSupport: 1.4,
  /** Genres used to drive discover queries. */
  maxDiscoveryGenres: 4,
  /** Items taken from each source list. */
  perAnchorSimilar: 12,
  perAnchorRecommended: 12,
  perCollection: 6,
  perGenreDiscovery: 20,
  perPersonCredit: 10,
  perTrending: 20,
  perAcclaimed: 20,
  perPopular: 20,
  perFresh: 20,
  perWildcard: 12,
  /** Pool ceiling — protects scoring cost and memory. */
  maxPoolSize: 900,
  /** Vote floor for discover-driven queries. */
  discoveryVoteFloor: 6.2,
  /** Vote floor for the acclaimed / hidden-gem lane. */
  acclaimedVoteFloor: 7.2,
  /** A candidate needs this many votes before its rating is trusted. */
  minVoteCount: 60,
  /** Titles with fewer votes than this are treated as unverifiable. */
  minVoteCountHardFloor: 12,
  /** Era window (± years around the preferred decade midpoints). */
  eraWindowYears: 12,
} as const;

/* -------------------------------------------------------------------------- */
/* Scoring                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Additive factor weights. Positive terms are what the user is likely to enjoy;
 * negative terms are risks. The genre term dominates because genre is the only
 * attribute available for *every* candidate without an extra API call, and it
 * is the attribute the library actually records.
 */
export const SCORE_WEIGHT: Record<ScoreFactorKey, number> = {
  genre_affinity: 26,
  anchor_similarity: 22,
  people_affinity: 14,
  theme_overlap: 9,
  era_fit: 7,
  language_fit: 5,
  // Not confidence-scaled, so this is what a thin profile falls back on. Kept
  // below the genre and anchor terms on purpose: quality should break ties
  // between titles that fit, not decide the ranking for a user who has taste.
  quality: 10,
  media_type_fit: 5,
  franchise_continuation: 6,
  discovery: 8,
  freshness: 4,
  // Penalties — the value passed in is positive, the weight is negative.
  avoided_genre: -18,
  long_series_risk: -8,
  obscurity_risk: -7,
  low_quality: -14,
};

export const SCORING = {
  /** Baseline every candidate starts from, so scores land in a readable range. */
  base: 34,
  /** Highest possible displayed score. */
  max: 100,
  min: 0,
  /**
   * Personalization factors are scaled by profile confidence; quality and
   * freshness are not, so a thin profile degrades to a quality ranking rather
   * than to noise.
   */
  confidenceScaledFactors: [
    "genre_affinity",
    "anchor_similarity",
    "people_affinity",
    "theme_overlap",
    "era_fit",
    "language_fit",
    "media_type_fit",
    "avoided_genre",
  ] as ScoreFactorKey[],
  /**
   * Share of a personalization factor that survives at zero confidence. Not 0:
   * a user with three rated titles still has a preference, and discarding it
   * entirely would make two very different libraries produce the same feed.
   */
  personalizationFloor: 0.45,
  /** Quality curve: vote average mapped from this range onto 0…1. */
  qualityVoteFloor: 5,
  qualityVoteCeiling: 8.5,
  /** Below this vote average a candidate takes the low-quality penalty. */
  lowQualityVoteThreshold: 5.6,
  /** Popularity below this is "obscure"; only penalized for mainstream users. */
  obscurePopularity: 6,
  /** Popularity above this is "mainstream" for hidden-gem selection. */
  mainstreamPopularity: 60,
  /** Days since release counted as fresh. */
  freshnessDays: 400,
  /** Theme overlap needs this many matched keywords to count at all. */
  minThemeMatches: 2,
  /** Matched keywords beyond this add nothing. */
  themeMatchSaturation: 5,
  /** Series with more episodes than this trigger the long-series risk factor. */
  longSeriesRiskEpisodes: 60,
} as const;

/** Score thresholds separating confidence tiers. */
export const TIER_THRESHOLD: Record<Exclude<RecommendationTier, "wildcard">, number> = {
  safe: 74,
  adjacent: 60,
  discovery: 44,
};

/* -------------------------------------------------------------------------- */
/* Diversification                                                            */
/* -------------------------------------------------------------------------- */

export const DIVERSITY = {
  /**
   * Relevance vs novelty in the greedy selector. 1 = pure score order,
   * 0 = pure novelty. 0.72 keeps ranking honest while breaking up clusters.
   */
  relevanceWeight: 0.72,
  /** Redundancy penalty applied per already-selected sibling. */
  sharedGenrePenalty: 0.3,
  sharedAnchorPenalty: 0.45,
  sharedDecadePenalty: 0.12,
  sharedLanguagePenalty: 0.1,
  sameMediaTypeRunPenalty: 0.14,
  /** Hard caps within a single section. */
  maxPerGenre: 4,
  maxPerAnchor: 3,
  maxPerFranchise: 2,
  maxPerDecade: 5,
  /** Consecutive items of the same media type before the run is penalized. */
  mediaTypeRunLength: 4,
} as const;

/* -------------------------------------------------------------------------- */
/* Sections                                                                   */
/* -------------------------------------------------------------------------- */

export const SECTIONS = {
  topPicks: 18,
  perAnchorCluster: 8,
  maxAnchorClusters: 3,
  /** An anchor cluster is dropped below this many items rather than padded. */
  minAnchorCluster: 4,
  matchesTaste: 18,
  discoverDifferent: 14,
  hiddenGems: 14,
  perMediaType: 16,
  /** A media-type section only appears when both types have this many items. */
  minMediaTypeSection: 8,
  coldStart: 20,
} as const;

/* -------------------------------------------------------------------------- */
/* Caching                                                                    */
/* -------------------------------------------------------------------------- */

export const CACHE_TTL_MS = {
  /** Genre id → name maps. Effectively static. */
  genres: 24 * 60 * 60 * 1000,
  /** Title details (credits, keywords, similar). Changes slowly. */
  details: 12 * 60 * 60 * 1000,
  /** Discover / list pages. */
  discover: 6 * 60 * 60 * 1000,
  /** Trending. */
  trending: 60 * 60 * 1000,
  /** Person credit lists. */
  person: 24 * 60 * 60 * 1000,
  /** A user's assembled run. Invalidated early by the library fingerprint. */
  run: 20 * 60 * 1000,
} as const;

/** Entries held in the shared catalog cache before the oldest are evicted. */
export const CATALOG_CACHE_MAX_ENTRIES = 600;
/** Users held in the run cache. */
export const RUN_CACHE_MAX_USERS = 200;
