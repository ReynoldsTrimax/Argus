"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/services/user-service";
import { createClient } from "@/lib/supabase/server";
import { table } from "@/lib/library/supabase-table";
import {
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  removeFriendship,
} from "@/lib/social/friends";
import { searchProfiles } from "@/lib/social/profiles";
import {
  friendSearchSchema,
  friendshipIdSchema,
  libraryVisibilitySchema,
  userIdSchema,
} from "@/lib/validations/social";
import { ROUTES } from "@/constants/routes";
import type { ActionResult } from "@/types";
import type { LibraryVisibility, ProfileWithRelationship } from "@/types/social";

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("You must be signed in.");
  return user;
}

function revalidateSocial() {
  revalidatePath(ROUTES.friends);
  revalidatePath(ROUTES.profile);
  revalidatePath(ROUTES.dashboard);
}

/** Searches people by username or display name. */
export async function actionSearchProfiles(
  query: string,
): Promise<ActionResult<ProfileWithRelationship[]>> {
  try {
    const user = await requireUser();
    const parsed = friendSearchSchema.safeParse({ q: query });
    if (!parsed.success) {
      // Too short is a normal keystroke, not a failure worth shouting about.
      return { success: true, data: [] };
    }
    const results = await searchProfiles(user.id, parsed.data.q);
    return { success: true, data: results };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Search failed" };
  }
}

export async function actionSendFriendRequest(
  targetUserId: string,
): Promise<ActionResult<{ message: string }>> {
  try {
    const user = await requireUser();
    const id = userIdSchema.parse(targetUserId);
    const result = await sendFriendRequest(user.id, id);
    revalidateSocial();

    const message =
      result.status === "sent"
        ? "Friend request sent"
        : result.status === "accepted_incoming"
          ? "You're now friends"
          : result.status === "already_friends"
            ? "You're already friends"
            : "Request already pending";

    return { success: true, data: { message } };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function actionAcceptFriendRequest(
  friendshipId: string,
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await acceptFriendRequest(user.id, friendshipIdSchema.parse(friendshipId));
    revalidateSocial();
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function actionDeclineFriendRequest(
  friendshipId: string,
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await declineFriendRequest(user.id, friendshipIdSchema.parse(friendshipId));
    revalidateSocial();
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed" };
  }
}

/** Removes a friend, or cancels a request you sent. */
export async function actionRemoveFriend(
  friendshipId: string,
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await removeFriendship(user.id, friendshipIdSchema.parse(friendshipId));
    revalidateSocial();
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed" };
  }
}

/** Sets who may read the current user's library. */
export async function actionSetLibraryVisibility(
  visibility: LibraryVisibility,
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const value = libraryVisibilitySchema.parse(visibility);
    const supabase = await createClient();
    const { error } = await table(supabase, "profiles")
      .update({ library_visibility: value })
      .eq("id", user.id);

    if (error) throw new Error(error.message);
    revalidateSocial();
    revalidatePath(ROUTES.settings);
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed" };
  }
}
