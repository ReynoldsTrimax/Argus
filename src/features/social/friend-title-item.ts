/**
 * View model for a friend's tracked title.
 *
 * The two social surfaces read from different shapes — the profile page gets
 * full `LibraryEntry` rows, the friends page gets the trimmed
 * `FriendActivityItem` — but both render the same card. Normalizing here keeps
 * one card component instead of two that drift apart.
 *
 * Pure: no React, no I/O.
 */

import type { LibraryEntry, RatingScale, WatchStatus } from "@/types/library";
import type { FriendActivityItem } from "@/types/social";

export interface FriendTitleItem {
  /** Stable React key. */
  key: string;
  title: string;
  mediaType: "movie" | "tv";
  externalId: string;
  posterPath: string | null;
  status: WatchStatus;
  progressPercent: number;
  currentSeason: number | null;
  currentEpisode: number | null;
  userRating: number | null;
  /**
   * The scale the rating was entered on. Without it a stored `4` is
   * unreadable — it could be 4/5 or 4/10 — so the card refuses to show a
   * rating it cannot interpret.
   */
  ratingScale: RatingScale | null;
  releaseDate: string | null;
  isFavorite: boolean;
  rewatchCount: number;
  episodesWatched: number | null;
  totalEpisodes: number | null;
}

export function fromLibraryEntry(entry: LibraryEntry): FriendTitleItem {
  return {
    key: entry.id,
    title: entry.title,
    mediaType: entry.media_type,
    externalId: entry.external_id,
    posterPath: entry.poster_path,
    status: entry.status,
    progressPercent: entry.progress_percent,
    currentSeason: entry.current_season,
    currentEpisode: entry.current_episode,
    userRating: entry.user_rating,
    ratingScale: entry.rating_scale,
    releaseDate: entry.release_date,
    isFavorite: entry.is_favorite,
    rewatchCount: entry.rewatch_count,
    episodesWatched: entry.episodes_watched,
    totalEpisodes: entry.total_episodes,
  };
}

export function fromActivityItem(item: FriendActivityItem): FriendTitleItem {
  return {
    key: item.entryId,
    title: item.title,
    mediaType: item.mediaType,
    externalId: item.externalId,
    posterPath: item.posterPath,
    status: item.status,
    progressPercent: item.progressPercent,
    currentSeason: item.currentSeason,
    currentEpisode: item.currentEpisode,
    userRating: item.userRating,
    ratingScale: item.ratingScale,
    releaseDate: null,
    isFavorite: false,
    rewatchCount: 0,
    episodesWatched: null,
    totalEpisodes: null,
  };
}

const SCALE_MAX: Record<RatingScale, number> = { five: 5, ten: 10, hundred: 100 };

/**
 * A friend's rating as a 10-point display value, or `null`.
 *
 * Argus lets each user pick their own scale, so the same enthusiasm is stored
 * as 4, 8 or 80. Showing the raw number next to someone else's would compare
 * two different units, so everything is converted to /10 for display.
 */
export function displayRating(item: FriendTitleItem): string | null {
  if (item.userRating == null || !Number.isFinite(item.userRating)) return null;
  const max = SCALE_MAX[item.ratingScale ?? "ten"];
  if (!max) return null;
  const tenPoint = Math.min(10, Math.max(0, (item.userRating / max) * 10));
  // Whole numbers read cleaner without a trailing .0
  return Number.isInteger(tenPoint) ? String(tenPoint) : tenPoint.toFixed(1);
}

/** Episode position for a series, e.g. `S2E7`. Null for movies or no progress. */
export function episodeLabel(item: FriendTitleItem): string | null {
  if (item.mediaType !== "tv") return null;
  if (item.currentSeason == null) return null;
  return `S${item.currentSeason}E${item.currentEpisode ?? "—"}`;
}

/**
 * Progress worth drawing a bar for.
 *
 * A finished title is at 100% by definition, and a bar that is always full on
 * every completed poster is noise rather than information.
 */
export function partialProgress(item: FriendTitleItem): number | null {
  if (item.status === "completed") return null;
  const percent = Math.round(item.progressPercent);
  if (percent <= 0 || percent >= 100) return null;
  return percent;
}

/** Display order for status shelves — in progress first, abandoned last. */
export const STATUS_ORDER: WatchStatus[] = [
  "watching",
  "rewatching",
  "completed",
  "plan_to_watch",
  "wishlist",
  "paused",
  "dropped",
  "archived",
];

export function sortByStatus(a: WatchStatus, b: WatchStatus): number {
  const ai = STATUS_ORDER.indexOf(a);
  const bi = STATUS_ORDER.indexOf(b);
  return (ai === -1 ? STATUS_ORDER.length : ai) - (bi === -1 ? STATUS_ORDER.length : bi);
}
