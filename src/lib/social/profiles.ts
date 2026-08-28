import { createClient } from "@/lib/supabase/server";
import { table } from "@/lib/library/supabase-table";
import { getFriendship, relationshipFrom } from "@/lib/social/friends";
import type {
  FriendActivityItem,
  FriendLibrary,
  ProfileWithRelationship,
  PublicProfile,
} from "@/types/social";
import type { LibraryEntry } from "@/types/library";

const PROFILE_COLUMNS = "id, username, display_name, avatar_url, bio, library_visibility";

/**
 * Profile discovery and friend-library reads.
 *
 * Reads here return empty rather than throwing when RLS hides a row: a friend
 * who has set their library to private is a normal state to render, not an
 * error to report.
 */

/** Looks up one profile by username. Case-insensitive — `username` is CITEXT. */
export async function getProfileByUsername(
  username: string,
): Promise<PublicProfile | null> {
  const supabase = await createClient();
  const { data } = await table(supabase, "profiles")
    .select(PROFILE_COLUMNS)
    .eq("username", username)
    .maybeSingle();

  return (data as PublicProfile | null) ?? null;
}

/**
 * Searches profiles by username or display name.
 *
 * Self is filtered out in SQL rather than in the result set, so a search that
 * matches only the current user doesn't silently return a full page of nothing.
 * Escaping matters: `%` and `_` are wildcards to `ilike`, and a raw `,` would
 * terminate the `or()` filter expression and change its meaning.
 */
export async function searchProfiles(
  viewerId: string,
  query: string,
  limit = 12,
): Promise<ProfileWithRelationship[]> {
  const term = query.trim();
  if (term.length < 2) return [];

  const safe = term.replace(/[%_,()\\]/g, "");
  if (!safe) return [];

  const supabase = await createClient();
  const { data, error } = await table(supabase, "profiles")
    .select(PROFILE_COLUMNS)
    .neq("id", viewerId)
    .or(`username.ilike.%${safe}%,display_name.ilike.%${safe}%`)
    .limit(limit);

  if (error) {
    console.error("[social] searchProfiles:", error.message);
    return [];
  }

  const profiles = (data ?? []) as PublicProfile[];

  // One friendship lookup per result would be an N+1; fetch the viewer's whole
  // graph once and match locally instead.
  const { data: edges } = await table(supabase, "friendships")
    .select("*")
    .or(`requester_id.eq.${viewerId},addressee_id.eq.${viewerId}`);

  const byOther = new Map<
    string,
    { id: string; status: string; requester_id: string; addressee_id: string }
  >();
  for (const edge of (edges ?? []) as {
    id: string;
    status: string;
    requester_id: string;
    addressee_id: string;
  }[]) {
    const other = edge.requester_id === viewerId ? edge.addressee_id : edge.requester_id;
    byOther.set(other, edge);
  }

  return profiles.map((profile) => {
    const edge = byOther.get(profile.id) ?? null;
    return {
      profile,
      relationship: relationshipFrom(
        viewerId,
        profile.id,
        edge
          ? {
              id: edge.id,
              requester_id: edge.requester_id,
              addressee_id: edge.addressee_id,
              status: edge.status as "pending" | "accepted" | "declined",
              created_at: "",
              responded_at: null,
            }
          : null,
      ),
      friendshipId: edge?.id ?? null,
    };
  });
}

/** A profile plus the viewer's relationship to it, for a profile page. */
export async function getProfileWithRelationship(
  viewerId: string,
  username: string,
): Promise<ProfileWithRelationship | null> {
  const profile = await getProfileByUsername(username);
  if (!profile) return null;

  const friendship = await getFriendship(viewerId, profile.id);
  return {
    profile,
    relationship: relationshipFrom(viewerId, profile.id, friendship),
    friendshipId: friendship?.id ?? null,
  };
}

function toActivityItem(entry: LibraryEntry): FriendActivityItem {
  return {
    entryId: entry.id,
    title: entry.title,
    mediaType: entry.media_type as "movie" | "tv",
    externalId: entry.external_id,
    posterPath: entry.poster_path,
    status: entry.status,
    progressPercent: entry.progress_percent,
    currentSeason: entry.current_season,
    currentEpisode: entry.current_episode,
    lastWatchedAt: entry.last_watched_at,
    userRating: entry.user_rating,
  };
}

/**
 * What a friend is watching now and what they finished recently.
 *
 * Returns empty arrays when RLS hides the rows, which is exactly what a
 * `private` library looks like from the outside — the caller renders "library
 * hidden" from `libraryVisible` rather than inferring it from emptiness, since
 * a genuinely empty library is a different thing.
 */
export async function getFriendActivity(
  ownerId: string,
  limit = 6,
): Promise<{ watchingNow: FriendActivityItem[]; recentlyWatched: FriendActivityItem[] }> {
  const supabase = await createClient();

  const [watching, recent] = await Promise.all([
    table(supabase, "library_entries")
      .select("*")
      .eq("user_id", ownerId)
      .in("status", ["watching", "rewatching"])
      .order("last_watched_at", { ascending: false, nullsFirst: false })
      .limit(limit),
    table(supabase, "library_entries")
      .select("*")
      .eq("user_id", ownerId)
      .eq("status", "completed")
      .order("completed_at", { ascending: false, nullsFirst: false })
      .limit(limit),
  ]);

  return {
    watchingNow: ((watching.data ?? []) as LibraryEntry[]).map(toActivityItem),
    recentlyWatched: ((recent.data ?? []) as LibraryEntry[]).map(toActivityItem),
  };
}

/**
 * Full library for a friend's profile page.
 *
 * `visible` is derived from the owner's setting and the friendship, not from
 * whether rows came back, so "hidden" and "empty" stay distinguishable.
 */
export async function getFriendLibrary(
  viewerId: string,
  username: string,
  limit = 120,
): Promise<FriendLibrary | null> {
  const profile = await getProfileByUsername(username);
  if (!profile) return null;

  const isSelf = profile.id === viewerId;
  const friendship = isSelf ? null : await getFriendship(viewerId, profile.id);
  const areFriends = friendship?.status === "accepted";

  const visible =
    isSelf ||
    profile.library_visibility === "public" ||
    (profile.library_visibility === "friends" && areFriends);

  if (!visible) {
    return { profile, entries: [], visible: false };
  }

  const supabase = await createClient();
  const { data, error } = await table(supabase, "library_entries")
    .select("*")
    .eq("user_id", profile.id)
    .order("last_watched_at", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error) {
    console.error("[social] getFriendLibrary:", error.message);
    return { profile, entries: [], visible: true };
  }

  return { profile, entries: (data ?? []) as LibraryEntry[], visible: true };
}
