/**
 * Phase 3 — Personal library domain types.
 * Maps 1:1 to migration 003 tables (provider-agnostic application layer).
 */

export type MediaKind = "movie" | "tv";

export type WatchStatus =
  | "watching"
  | "completed"
  | "paused"
  | "dropped"
  | "wishlist"
  | "plan_to_watch"
  | "rewatching"
  | "archived";

export type RatingScale = "five" | "ten" | "hundred";
export type ReviewVisibility = "private" | "friends" | "public";

export type ActivityType =
  | "library_added"
  | "status_changed"
  | "started_watching"
  | "finished"
  | "episode_watched"
  | "season_completed"
  | "rated"
  | "reviewed"
  | "note_added"
  | "favorited"
  | "unfavorited"
  | "collection_created"
  | "collection_item_added"
  | "tag_added"
  | "session_logged";

export const WATCH_STATUS_LABELS: Record<WatchStatus, string> = {
  watching: "Watching",
  completed: "Completed",
  paused: "Paused",
  dropped: "Dropped",
  wishlist: "Wishlist",
  plan_to_watch: "Plan to Watch",
  rewatching: "Rewatching",
  archived: "Archived",
};

export const WATCH_STATUSES: WatchStatus[] = [
  "watching",
  "completed",
  "paused",
  "dropped",
  "wishlist",
  "plan_to_watch",
  "rewatching",
  "archived",
];

/** Snapshot used to upsert a library entry from catalog details. */
export interface MediaIdentity {
  provider?: string;
  mediaType: MediaKind;
  externalId: string;
  title: string;
  originalTitle?: string | null;
  posterPath?: string | null;
  backdropPath?: string | null;
  releaseDate?: string | null;
  overview?: string | null;
  runtimeMinutes?: number | null;
  totalEpisodes?: number | null;
  /** Genre names for stats engine (stored in metadata.genres). */
  genres?: string[];
  originalLanguage?: string | null;
}

export interface LibraryEntry {
  id: string;
  user_id: string;
  provider: string;
  media_type: MediaKind;
  external_id: string;
  title: string;
  original_title: string | null;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string | null;
  overview: string | null;
  runtime_minutes: number | null;
  status: WatchStatus;
  is_favorite: boolean;
  is_hidden: boolean;
  is_pinned: boolean;
  is_archived: boolean;
  progress_percent: number;
  movie_progress_minutes: number | null;
  current_season: number | null;
  current_episode: number | null;
  episodes_watched: number;
  total_episodes: number | null;
  started_at: string | null;
  completed_at: string | null;
  last_watched_at: string | null;
  rewatch_count: number;
  user_rating: number | null;
  rating_scale: RatingScale | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Review {
  id: string;
  entry_id: string;
  user_id: string;
  body: string;
  body_format: string;
  contains_spoilers: boolean;
  visibility: ReviewVisibility;
  word_count: number;
  created_at: string;
  updated_at: string;
}

export interface Note {
  id: string;
  entry_id: string;
  user_id: string;
  body: string;
  body_format: string;
  created_at: string;
  updated_at: string;
}

export interface Tag {
  id: string;
  user_id: string;
  name: string;
  color: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface Collection {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  cover_path: string | null;
  is_pinned: boolean;
  sort_order: number;
  item_count: number;
  created_at: string;
  updated_at: string;
}

export interface CollectionItem {
  id: string;
  collection_id: string;
  entry_id: string;
  user_id: string;
  position: number;
  note: string | null;
  created_at: string;
  library_entries?: LibraryEntry;
}

export interface WatchSession {
  id: string;
  entry_id: string;
  user_id: string;
  session_date: string;
  started_at: string | null;
  ended_at: string | null;
  duration_minutes: number | null;
  is_rewatch: boolean;
  season_number: number | null;
  episode_number: number | null;
  device: string | null;
  location: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface EpisodeProgress {
  id: string;
  entry_id: string;
  user_id: string;
  season_number: number;
  episode_number: number;
  episode_id: string | null;
  episode_name: string | null;
  still_path: string | null;
  is_watched: boolean;
  watched_at: string | null;
  runtime_minutes: number | null;
  created_at: string;
  updated_at: string;
}

export interface ActivityLogItem {
  id: string;
  user_id: string;
  activity_type: ActivityType;
  entry_id: string | null;
  collection_id: string | null;
  title: string | null;
  summary: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface RecentlyViewed {
  id: string;
  user_id: string;
  provider: string;
  media_type: MediaKind;
  external_id: string;
  title: string;
  poster_path: string | null;
  viewed_at: string;
}

/** Aggregated personal state for a catalog title (detail pages). */
export interface PersonalMediaState {
  entry: LibraryEntry | null;
  review: Review | null;
  notes: Note[];
  tags: Tag[];
  collections: Collection[];
  recentSessions: WatchSession[];
  ratingHistory: { id: string; value: number; scale: RatingScale; created_at: string }[];
  /**
   * Per-episode watch rows for TV titles, used to render the season checklist.
   * Empty for movies and for titles with no library entry yet.
   */
  episodeProgress: EpisodeProgress[];
}

export interface LibraryListFilters {
  status?: WatchStatus | "all" | "favorites" | "pinned";
  mediaType?: MediaKind | "all";
  q?: string;
  sort?:
    | "last_watched"
    | "title"
    | "rating"
    | "added"
    | "release"
    | "progress"
    | "updated";
  page?: number;
  pageSize?: number;
}

export interface LibraryListResult {
  items: LibraryEntry[];
  total: number;
  page: number;
  pageSize: number;
}
