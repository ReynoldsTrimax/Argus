import { createClient } from "@/lib/supabase/server";
import { table } from "@/lib/library/supabase-table";
import type {
  FriendRequest,
  Friendship,
  PublicProfile,
  RelationshipState,
} from "@/types/social";

/** Columns safe to expose about another user. Never select settings or email. */
const PROFILE_COLUMNS = "id, username, display_name, avatar_url, bio, library_visibility";

/**
 * Friendship graph access.
 *
 * Every function here relies on migration 005's RLS rather than filtering
 * defensively in SQL alone: `friendships` is only selectable by its two
 * parties, only insertable with yourself as requester, and only updatable by
 * the addressee. The `user_id` filters below are for correctness and clarity,
 * not for authorization.
 */

/** The friendship row connecting two users, whichever direction it was sent. */
export async function getFriendship(
  userId: string,
  otherUserId: string,
): Promise<Friendship | null> {
  const supabase = await createClient();
  const { data } = await table(supabase, "friendships")
    .select("*")
    .or(
      `and(requester_id.eq.${userId},addressee_id.eq.${otherUserId}),` +
        `and(requester_id.eq.${otherUserId},addressee_id.eq.${userId})`,
    )
    .maybeSingle();

  return (data as Friendship | null) ?? null;
}

/** Translates a friendship row into the viewer's perspective. */
export function relationshipFrom(
  viewerId: string,
  targetId: string,
  friendship: Friendship | null,
): RelationshipState {
  if (viewerId === targetId) return "self";
  if (!friendship) return "none";
  if (friendship.status === "accepted") return "friends";
  if (friendship.status === "declined") return "declined";
  return friendship.requester_id === viewerId ? "outgoing_pending" : "incoming_pending";
}

/**
 * Sends a friend request.
 *
 * Reuses an existing row where one already exists, because the unique pair
 * index means a second insert for the same two people fails. That turns three
 * distinct situations — already friends, already asked, and previously
 * declined — into one readable outcome each instead of a constraint violation.
 */
export async function sendFriendRequest(
  userId: string,
  targetUserId: string,
): Promise<{ status: "sent" | "already_friends" | "already_pending" | "accepted_incoming" }> {
  if (userId === targetUserId) {
    throw new Error("You can't add yourself as a friend.");
  }

  const supabase = await createClient();
  const existing = await getFriendship(userId, targetUserId);

  if (existing) {
    if (existing.status === "accepted") return { status: "already_friends" };

    // They already asked us — sending back is the same intent as accepting.
    if (existing.addressee_id === userId) {
      const { error } = await table(supabase, "friendships")
        .update({ status: "accepted", responded_at: new Date().toISOString() })
        .eq("id", existing.id);
      if (error) throw new Error(error.message);
      return { status: "accepted_incoming" };
    }

    return { status: "already_pending" };
  }

  const { error } = await table(supabase, "friendships").insert({
    requester_id: userId,
    addressee_id: targetUserId,
    status: "pending",
  });

  if (error) throw new Error(error.message);
  return { status: "sent" };
}

/**
 * Accepts a pending request.
 *
 * Scoped to `addressee_id = userId` so the requester cannot accept their own
 * request even if they reach this function with someone else's friendship id.
 * RLS enforces the same rule; this makes the intent legible at the call site.
 */
export async function acceptFriendRequest(
  userId: string,
  friendshipId: string,
): Promise<void> {
  const supabase = await createClient();
  const { error } = await table(supabase, "friendships")
    .update({ status: "accepted", responded_at: new Date().toISOString() })
    .eq("id", friendshipId)
    .eq("addressee_id", userId)
    .eq("status", "pending");

  if (error) throw new Error(error.message);
}

/** Declines a pending request, keeping the row so it cannot simply be re-sent. */
export async function declineFriendRequest(
  userId: string,
  friendshipId: string,
): Promise<void> {
  const supabase = await createClient();
  const { error } = await table(supabase, "friendships")
    .update({ status: "declined", responded_at: new Date().toISOString() })
    .eq("id", friendshipId)
    .eq("addressee_id", userId);

  if (error) throw new Error(error.message);
}

/**
 * Removes a friendship, or cancels a request.
 *
 * Deletes rather than marking removed, so the pair is free to connect again
 * later — a lingering row would block any future request via the unique index.
 */
export async function removeFriendship(
  userId: string,
  friendshipId: string,
): Promise<void> {
  const supabase = await createClient();
  const { error } = await table(supabase, "friendships")
    .delete()
    .eq("id", friendshipId)
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

  if (error) throw new Error(error.message);
}

interface FriendshipWithProfiles extends Friendship {
  requester: PublicProfile | null;
  addressee: PublicProfile | null;
}

/**
 * Loads friendships with both profiles joined.
 *
 * Both sides are fetched in one query because the caller does not know in
 * advance which side is the other person — that depends on who sent the
 * request, and resolving it per row afterwards would mean an N+1.
 */
async function listFriendshipsWithProfiles(
  userId: string,
  status: Friendship["status"],
): Promise<FriendshipWithProfiles[]> {
  const supabase = await createClient();
  const { data, error } = await table(supabase, "friendships")
    .select(
      `*,
       requester:profiles!friendships_requester_id_fkey(${PROFILE_COLUMNS}),
       addressee:profiles!friendships_addressee_id_fkey(${PROFILE_COLUMNS})`,
    )
    .eq("status", status)
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[social] listFriendships:", error.message);
    return [];
  }

  return (data ?? []) as FriendshipWithProfiles[];
}

/** The other party's profile in a friendship row. */
function counterpart(userId: string, row: FriendshipWithProfiles): PublicProfile | null {
  return row.requester_id === userId ? row.addressee : row.requester;
}

/** Accepted friends, most recently connected first. */
export async function listFriends(
  userId: string,
): Promise<{ friendshipId: string; friendsSince: string; profile: PublicProfile }[]> {
  const rows = await listFriendshipsWithProfiles(userId, "accepted");

  return rows.flatMap((row) => {
    const profile = counterpart(userId, row);
    if (!profile) return [];
    return [
      {
        friendshipId: row.id,
        friendsSince: row.responded_at ?? row.created_at,
        profile,
      },
    ];
  });
}

/** Requests awaiting this user's answer. */
export async function listIncomingRequests(userId: string): Promise<FriendRequest[]> {
  const rows = await listFriendshipsWithProfiles(userId, "pending");

  return rows.flatMap((row) => {
    if (row.addressee_id !== userId) return [];
    if (!row.requester) return [];
    return [
      {
        friendshipId: row.id,
        profile: row.requester,
        createdAt: row.created_at,
      },
    ];
  });
}

/** Requests this user has sent that are still unanswered. */
export async function listOutgoingRequests(userId: string): Promise<FriendRequest[]> {
  const rows = await listFriendshipsWithProfiles(userId, "pending");

  return rows.flatMap((row) => {
    if (row.requester_id !== userId) return [];
    if (!row.addressee) return [];
    return [
      {
        friendshipId: row.id,
        profile: row.addressee,
        createdAt: row.created_at,
      },
    ];
  });
}
