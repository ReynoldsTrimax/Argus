/**
 * Phase 4 — Intelligence layer domain types.
 */

import type { LibraryEntry } from "@/types/library";
import type { MediaSummary } from "@/types/media";

export interface NamedCount {
  name: string;
  count: number;
  id?: string;
}

export interface RatingBucket {
  label: string;
  min: number;
  max: number;
  count: number;
}

export interface TimeSeriesPoint {
  key: string;
  label: string;
  value: number;
}

export interface StreakInfo {
  current: number;
  longest: number;
  lastActiveDate: string | null;
}

export interface UserStats {
  /** Snapshot timestamp */
  computedAt: string;
  totals: {
    moviesWatched: number;
    showsCompleted: number;
    /** Actively watching / rewatching / paused series. */
    showsWatching: number;
    /** Dropped series count. */
    showsDropped: number;
    /**
     * Series with real activity (completed + watching + paused + dropped +
     * rewatching + any status with logged episode progress).
     */
    showsTracked: number;
    episodesWatched: number;
    totalWatchMinutes: number;
    averageRuntime: number | null;
    averageRating: number | null;
    ratingsCount: number;
    rewatchCount: number;
    wishlistSize: number;
    collectionCount: number;
    reviewCount: number;
    noteCount: number;
    tagCount: number;
    librarySize: number;
    favoritesCount: number;
    pausedCount: number;
    droppedCount: number;
    watchingCount: number;
  };
  rates: {
    completionRate: number;
    droppedSeriesPercent: number;
    moviesPerMonth: number;
    episodesPerWeek: number;
  };
  streaks: StreakInfo;
  distributions: {
    byStatus: NamedCount[];
    byMediaType: NamedCount[];
    ratings: RatingBucket[];
    genres: NamedCount[];
    decades: NamedCount[];
    years: NamedCount[];
    languages: NamedCount[];
    months: TimeSeriesPoint[];
    weekdays: TimeSeriesPoint[];
    runtimes: NamedCount[];
  };
  favorites: {
    genres: NamedCount[];
    highRated: LibraryEntry[];
    mostRewatched: LibraryEntry[];
  };
  mostActiveMonth: string | null;
  mostActiveYear: string | null;
}

export interface Insight {
  id: string;
  title: string;
  body: string;
  severity: "info" | "positive" | "neutral" | "warning";
  category: "habits" | "taste" | "completion" | "time" | "streak";
}

export interface DecisionReason {
  label: string;
  positive: boolean;
  weight: number;
}

export interface DecisionScore {
  score: number;
  max: 100;
  reasons: DecisionReason[];
  summary: string;
}

export interface RecommendationItem extends MediaSummary {
  reason: string;
  score: number;
}

export interface CalendarDay {
  date: string;
  count: number;
  movies: number;
  episodes: number;
  ratings: number;
  reviews: number;
  notes: number;
}

export interface WrappedReport {
  year: number;
  moviesWatched: number;
  showsCompleted: number;
  episodesWatched: number;
  hoursWatched: number;
  favoriteMovie: LibraryEntry | null;
  favoriteShow: LibraryEntry | null;
  topGenres: NamedCount[];
  highestRated: LibraryEntry[];
  mostRewatched: LibraryEntry[];
  biggestMonth: string | null;
  longestStreak: number;
  heatmap: CalendarDay[];
  topTags: NamedCount[];
  reviewCount: number;
  noteCount: number;
}

export interface MonthlyRecap {
  year: number;
  month: number;
  label: string;
  hoursWatched: number;
  movies: number;
  episodes: number;
  genres: NamedCount[];
  highestRated: LibraryEntry[];
  mostActiveDay: string | null;
  reviewsWritten: number;
  streakDays: number;
}

export interface DashboardPayload {
  stats: UserStats;
  insights: Insight[];
  continueWatching: LibraryEntry[];
  /** Completed titles only, newest first, capped. */
  recentlyWatched: LibraryEntry[];
  /** Plan-to-watch queue. */
  planToWatch: LibraryEntry[];
  /** Dropped titles. */
  dropped: LibraryEntry[];
  watchlist: LibraryEntry[];
  recentlyRated: LibraryEntry[];
  recentlyReviewed: { entry: LibraryEntry; reviewPreview: string }[];
  pinnedCollections: { id: string; name: string; item_count: number }[];
  recommendations: RecommendationItem[];
  activity: { id: string; summary: string; created_at: string; activity_type: string }[];
  trending: MediaSummary[];
  newReleases: MediaSummary[];
  upcoming: MediaSummary[];
}
