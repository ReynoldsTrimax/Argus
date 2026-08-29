/**
 * Behavioural signal extraction — turns library rows into signed weights.
 *
 * This is the only place that decides "how much does this title tell me, and in
 * which direction". Everything above it (affinities, scoring, sections) works on
 * `EntrySignal` and never re-reads a status or a raw rating.
 *
 * Pure: no I/O, no clock reads except the `now` passed in, so tests are exact.
 */

import type { LibraryEntry, MediaKind, WatchStatus } from "@/types/library";
import type { AnchorBasis } from "@/types/recommendations";

import {
  ENGAGEMENT_WEIGHT,
  PROFILE,
  RATING_WEIGHT,
  RECENCY,
  STATUS_WEIGHT,
} from "./config";
import { clamp, mean, normalizeRating, round, stdDev } from "./rating";

/* -------------------------------------------------------------------------- */
/* Input                                                                      */
/* -------------------------------------------------------------------------- */

export interface StatusHistoryRow {
  entry_id: string;
  from_status: WatchStatus | null;
  to_status: WatchStatus;
  created_at: string;
}

export interface RecentlyViewedRow {
  provider: string;
  media_type: MediaKind;
  external_id: string;
  viewed_at: string;
}

/**
 * Everything the pure engine needs about one user.
 *
 * Shaped as the raw rows the database returns rather than pre-aggregated
 * counters, so the loader stays a thin query and all interpretation is testable
 * in one place.
 */
export interface RecommendationSignalData {
  entries: LibraryEntry[];
  /**
   * Titles the user hid from their library views.
   *
   * Separate from `entries` because the shared loader filters
   * `is_hidden = false`, and because a hidden title should not contribute
   * behavioural weight — but the user has still seen it, so it must not be
   * recommended back. Identity only; no status, rating or dates.
   */
  hiddenTitles: { media_type: MediaKind; external_id: string }[];
  /** `watch_sessions` rows, entry ids only. */
  sessions: { entry_id: string; is_rewatch: boolean }[];
  reviews: { entry_id: string }[];
  notes: { entry_id: string }[];
  tagAssignments: { entry_id: string }[];
  collectionItems: { entry_id: string }[];
  statusHistory: StatusHistoryRow[];
  recentlyViewed: RecentlyViewedRow[];
  /** Watched `episode_progress` rows, entry ids only. */
  episodeProgress: { entry_id: string }[];
}

export const EMPTY_SIGNAL_DATA: RecommendationSignalData = {
  entries: [],
  hiddenTitles: [],
  sessions: [],
  reviews: [],
  notes: [],
  tagAssignments: [],
  collectionItems: [],
  statusHistory: [],
  recentlyViewed: [],
  episodeProgress: [],
};

/* -------------------------------------------------------------------------- */
/* Output                                                                     */
/* -------------------------------------------------------------------------- */

export interface EntrySignal {
  entry: LibraryEntry;
  /** `provider:mediaType:externalId` — matches candidate exclusion keys. */
  key: string;
  /** Signed behavioural weight. Positive = seek out, negative = avoid. */
  weight: number;
  /** Normalized 0…1 rating, or null when unrated. */
  rating: number | null;
  genres: string[];
  language: string | null;
  /** e.g. `"1990s"`. */
  decade: string | null;
  releaseYear: number | null;
  /** Why this could anchor a cluster, or null when it is not anchor-worthy. */
  basis: AnchorBasis | null;
  /** Status is `dropped`, or the entry was dropped at least once historically. */
  everDropped: boolean;
  /** ISO timestamp of the most recent meaningful activity. */
  lastActivityAt: string | null;
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function entryKey(entry: {
  provider: string;
  media_type: MediaKind;
  external_id: string;
}): string {
  return `${entry.provider}:${entry.media_type}:${entry.external_id}`;
}

/** Candidate-side key. Candidates are always TMDB, so provider is fixed. */
export function candidateKey(mediaType: MediaKind, externalId: string): string {
  return `${mediaType}:${externalId}`;
}

export function entryGenres(entry: LibraryEntry): string[] {
  const raw = entry.metadata?.genres;
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of raw) {
    if (typeof value !== "string") continue;
    const name = value.trim();
    if (!name || seen.has(name)) continue;
    seen.add(name);
    out.push(name);
  }
  return out;
}

export function entryLanguage(entry: LibraryEntry): string | null {
  const lang = entry.metadata?.originalLanguage;
  return typeof lang === "string" && lang.length > 0 ? lang : null;
}

export function releaseYear(date: string | null | undefined): number | null {
  if (!date) return null;
  const year = Number(date.slice(0, 4));
  return Number.isFinite(year) && year > 1870 ? year : null;
}

export function decadeLabel(year: number | null): string | null {
  if (year == null) return null;
  return `${Math.floor(year / 10) * 10}s`;
}

function countBy<T>(rows: T[], pick: (row: T) => string): Map<string, number> {
  const map = new Map<string, number>();
  for (const row of rows) {
    const key = pick(row);
    if (!key) continue;
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return map;
}

function lastActivity(entry: LibraryEntry): string | null {
  return (
    entry.last_watched_at ??
    entry.completed_at ??
    entry.started_at ??
    entry.updated_at ??
    entry.created_at ??
    null
  );
}

/**
 * Exponential decay with a floor, so a title watched years ago still counts.
 * Returns 1 for anything with no usable timestamp — absence of a date is not
 * evidence of age.
 */
function recencyFactor(timestamp: string | null, now: number): number {
  if (!timestamp) return 1;
  const then = Date.parse(timestamp);
  if (!Number.isFinite(then)) return 1;
  const days = (now - then) / 86_400_000;
  if (days <= 0) return 1;
  const decayed = 0.5 ** (days / RECENCY.halfLifeDays);
  return Math.max(RECENCY.floor, decayed);
}

/* -------------------------------------------------------------------------- */
/* Rating behaviour                                                           */
/* -------------------------------------------------------------------------- */

export interface RatingContext {
  /** Reference point ratings are centred on. */
  referenceMean: number;
  /** Population spread of normalized ratings. */
  spread: number;
  /** Amplifier applied to centred ratings for narrow raters. */
  boost: number;
  count: number;
  scalesUsed: string[];
}

/**
 * Derive the user's own rating baseline.
 *
 * Centring on the user's mean is what stops a generous rater's "everything gets
 * an 8" from reading as universal enthusiasm, and stops a harsh rater's 6 from
 * reading as dislike. Below `minRatingsForPersonalMean` there is not enough data
 * for a personal baseline, so a fixed midpoint is used instead.
 */
export function buildRatingContext(entries: LibraryEntry[]): RatingContext {
  const normalized: number[] = [];
  const scales = new Set<string>();

  for (const entry of entries) {
    const value = normalizeRating(entry.user_rating, entry.rating_scale);
    if (value == null) continue;
    normalized.push(value);
    scales.add(entry.rating_scale ?? "ten");
  }

  const spread = stdDev(normalized);
  const personalMean = mean(normalized);
  const usePersonal =
    personalMean != null && normalized.length >= RATING_WEIGHT.minRatingsForPersonalMean;

  return {
    referenceMean: usePersonal ? personalMean : RATING_WEIGHT.fallbackMean,
    spread,
    boost:
      normalized.length >= RATING_WEIGHT.minRatingsForPersonalMean &&
      spread > 0 &&
      spread < RATING_WEIGHT.narrowRaterSpreadThreshold
        ? RATING_WEIGHT.narrowRaterBoost
        : 1,
    count: normalized.length,
    scalesUsed: [...scales].sort(),
  };
}

/** Signed rating contribution for one entry. */
export function ratingModifier(rating: number | null, context: RatingContext): number {
  if (rating == null) return 0;
  const centered = (rating - context.referenceMean) * RATING_WEIGHT.centeredScale;
  return clamp(
    centered * context.boost,
    -RATING_WEIGHT.maxAbsolute,
    RATING_WEIGHT.maxAbsolute,
  );
}

/* -------------------------------------------------------------------------- */
/* Signal extraction                                                          */
/* -------------------------------------------------------------------------- */

function anchorBasis(
  entry: LibraryEntry,
  rating: number | null,
  context: RatingContext,
  attention: number,
  weight: number,
): AnchorBasis | null {
  if (weight < PROFILE.minAnchorWeight) return null;

  const ratesHigh =
    rating != null && rating >= Math.max(0.7, context.referenceMean + 0.05);

  if (ratesHigh) return "rated_high";
  if (entry.rewatch_count > 0 || entry.status === "rewatching") return "rewatched";
  if (entry.is_favorite) return "favorite";
  if (attention >= ENGAGEMENT_WEIGHT.review) return "deeply_engaged";
  if (entry.status === "completed") return "completed";
  return null;
}

/**
 * Build one signal per library entry.
 *
 * Two families of engagement are treated differently on purpose:
 *
 *   *Curation* (favourite, rewatch) is an explicit statement of liking and may
 *   flip the sign of an otherwise negative weight.
 *
 *   *Attention* (reviews, notes, tags, collections, sessions, pinning) says the
 *   title mattered, not that it was enjoyed — so it amplifies whatever polarity
 *   the status and rating already established. A dropped show with three notes
 *   is a stronger negative signal, not an accidental positive one.
 */
export function buildEntrySignals(
  data: RecommendationSignalData,
  now: number = Date.now(),
): EntrySignal[] {
  const context = buildRatingContext(data.entries);

  const sessionCounts = countBy(data.sessions, (r) => r.entry_id);
  const reviewCounts = countBy(data.reviews, (r) => r.entry_id);
  const noteCounts = countBy(data.notes, (r) => r.entry_id);
  const tagCounts = countBy(data.tagAssignments, (r) => r.entry_id);
  const collectionCounts = countBy(data.collectionItems, (r) => r.entry_id);
  const dropCounts = countBy(
    data.statusHistory.filter((r) => r.to_status === "dropped"),
    (r) => r.entry_id,
  );

  const viewedKeys = new Set(
    data.recentlyViewed.map((row) =>
      entryKey({
        provider: row.provider,
        media_type: row.media_type,
        external_id: row.external_id,
      }),
    ),
  );

  return data.entries.map((entry) => {
    const key = entryKey(entry);
    const rating = normalizeRating(entry.user_rating, entry.rating_scale);

    const statusWeight = STATUS_WEIGHT[entry.status] ?? 0;
    const ratingWeight = ratingModifier(rating, context);

    // Curation — may change the sign.
    let curation = 0;
    if (entry.is_favorite) curation += ENGAGEMENT_WEIGHT.favorite;
    if (entry.rewatch_count > 0) {
      curation += Math.min(
        entry.rewatch_count * ENGAGEMENT_WEIGHT.perRewatch,
        ENGAGEMENT_WEIGHT.maxRewatchBonus,
      );
    }

    // Attention — amplifies the existing sign.
    let attention = 0;
    if ((reviewCounts.get(entry.id) ?? 0) > 0) attention += ENGAGEMENT_WEIGHT.review;
    attention += Math.min(
      (noteCounts.get(entry.id) ?? 0) * ENGAGEMENT_WEIGHT.perNote,
      ENGAGEMENT_WEIGHT.maxNoteBonus,
    );
    attention += Math.min(
      (tagCounts.get(entry.id) ?? 0) * ENGAGEMENT_WEIGHT.perTag,
      ENGAGEMENT_WEIGHT.maxTagBonus,
    );
    attention += Math.min(
      (collectionCounts.get(entry.id) ?? 0) * ENGAGEMENT_WEIGHT.perCollection,
      ENGAGEMENT_WEIGHT.maxCollectionBonus,
    );
    attention += Math.min(
      Math.max((sessionCounts.get(entry.id) ?? 0) - 1, 0) * ENGAGEMENT_WEIGHT.perSession,
      ENGAGEMENT_WEIGHT.maxSessionBonus,
    );
    if (entry.is_pinned) attention += ENGAGEMENT_WEIGHT.pinned;
    if (viewedKeys.has(key)) attention += ENGAGEMENT_WEIGHT.recentlyViewed;

    const core = statusWeight + ratingWeight + curation;
    const sign = core >= 0 ? 1 : -1;

    // Each historical drop past the first deepens the negative signal.
    const repeatDrops = Math.max((dropCounts.get(entry.id) ?? 0) - 1, 0);
    const repeatDropPenalty = repeatDrops * Math.abs(STATUS_WEIGHT.dropped) * 0.5;

    let weight = core + sign * attention - repeatDropPenalty;

    // Decay the positive side only: enthusiasm fades, aversion does not.
    if (weight > 0) {
      weight *= recencyFactor(lastActivity(entry), now);
    }

    const year = releaseYear(entry.release_date);

    return {
      entry,
      key,
      weight: round(weight, 3),
      rating,
      genres: entryGenres(entry),
      language: entryLanguage(entry),
      decade: decadeLabel(year),
      releaseYear: year,
      basis: anchorBasis(entry, rating, context, attention, weight),
      everDropped: entry.status === "dropped" || (dropCounts.get(entry.id) ?? 0) > 0,
      lastActivityAt: lastActivity(entry),
    };
  });
}
