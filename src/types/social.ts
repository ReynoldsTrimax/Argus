/**
 * Social domain types — friendships and friend-visible library reads.
 *
 * These mirror migration 005. `friendships` is absent from the generated
 * `types/database.ts`, so queries go through the untyped `table()` helper and
 * these hand-written types are the source of truth for app code.
 */

import type { LibraryEntry, RatingScale, WatchStatus } from "./library";

export type FriendshipStatus = "pending" | "accepted" | "declined";

/** Who may read a user's library. */
export type LibraryVisibility = "private" | "friends" | "public";

export const LIBRARY_VISIBILITY_LABELS: Record<LibraryVisibility, string> = {
  private: "Only me",
  friends: "Friends",
  public: "Anyone signed in",
};

export interface Friendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: FriendshipStatus;
  created_at: string;
  responded_at: string | null;
}

/** A user as seen by someone else — never includes settings or private notes. */
export interface PublicProfile {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  library_visibility: LibraryVisibility;
}

/**
 * How the viewer relates to a given profile.
 *
 * `incoming_pending` and `outgoing_pending` are separate states because the
 * available action differs entirely: one is answered, the other is cancelled.
 */
export type RelationshipState =
  "self" | "none" | "friends" | "incoming_pending" | "outgoing_pending" | "declined";

/** A profile plus the viewer's relationship to it, for search results. */
export interface ProfileWithRelationship {
  profile: PublicProfile;
  relationship: RelationshipState;
  /** Present whenever a friendship row exists, so actions can target it. */
  friendshipId: string | null;
}

/** A pending request shown on the friends page. */
export interface FriendRequest {
  friendshipId: string;
  profile: PublicProfile;
  createdAt: string;
}

/** A friend and a glance at what they are watching. */
export interface FriendSummary {
  profile: PublicProfile;
  friendshipId: string;
  friendsSince: string;
  /** Empty when the friend's visibility hides their library. */
  watchingNow: FriendActivityItem[];
  recentlyWatched: FriendActivityItem[];
  /** False when the friend has set their library to private. */
  libraryVisible: boolean;
}

/** One title in a friend's activity rail. */
export interface FriendActivityItem {
  entryId: string;
  title: string;
  mediaType: "movie" | "tv";
  externalId: string;
  posterPath: string | null;
  status: WatchStatus;
  progressPercent: number;
  currentSeason: number | null;
  currentEpisode: number | null;
  lastWatchedAt: string | null;
  userRating: number | null;
  /**
   * Scale the rating was entered on. Carried alongside the value because each
   * user picks their own — a bare `4` cannot be rendered without it.
   */
  ratingScale: RatingScale | null;
}

/** A friend's full library page payload. */
export interface FriendLibrary {
  profile: PublicProfile;
  entries: LibraryEntry[];
  visible: boolean;
}
