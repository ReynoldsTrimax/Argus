"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/services/user-service";
import {
  ensureLibraryEntry,
  updateLibraryStatus,
  setFavorite,
  setPinned,
  setHidden,
  setMovieProgress,
} from "@/lib/library/entries";
import { setRating, upsertReview, createNote, updateNote, deleteNote } from "@/lib/library/ratings-reviews-notes";
import {
  createTag,
  assignTag,
  removeTagAssignment,
  createCollection,
  updateCollection,
  deleteCollection,
  addToCollection,
  removeFromCollection,
  reorderCollectionItems,
} from "@/lib/library/tags-collections";
import {
  markEpisodeWatched,
  unmarkEpisode,
  logWatchSession,
} from "@/lib/library/progress-sessions";
import {
  mediaIdentitySchema,
  statusSchema,
  ratingSchema,
  reviewSchema,
  noteSchema,
  tagSchema,
  collectionSchema,
  sessionSchema,
} from "@/lib/validations/library";
import type { ActionResult } from "@/types";
import type { MediaIdentity, RatingScale, WatchStatus } from "@/types/library";
import { ROUTES } from "@/constants/routes";

function revalidateLibrary(paths: string[] = []) {
  revalidatePath(ROUTES.library);
  revalidatePath(ROUTES.watchlist);
  revalidatePath(ROUTES.favorites);
  revalidatePath(ROUTES.history);
  revalidatePath(ROUTES.activity);
  revalidatePath(ROUTES.collections);
  revalidatePath(ROUTES.dashboard);
  revalidatePath(ROUTES.profile);
  paths.forEach((p) => revalidatePath(p));
}

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("You must be signed in.");
  return user;
}

export async function actionUpsertAndSetStatus(
  identityInput: MediaIdentity,
  status: WatchStatus,
): Promise<ActionResult<{ entryId: string }>> {
  try {
    const user = await requireUser();
    const identity = mediaIdentitySchema.parse(identityInput);
    const statusParsed = statusSchema.parse(status) as WatchStatus;
    const entry = await ensureLibraryEntry(user.id, identity, { status: statusParsed });
    const updated =
      entry.status === statusParsed
        ? entry
        : await updateLibraryStatus(user.id, entry.id, statusParsed);
    revalidateLibrary([
      identity.mediaType === "movie"
        ? ROUTES.movie(identity.externalId)
        : ROUTES.show(identity.externalId),
    ]);
    return { success: true, data: { entryId: updated.id } };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function actionToggleFavorite(
  identityInput: MediaIdentity,
  isFavorite: boolean,
): Promise<ActionResult<{ entryId: string }>> {
  try {
    const user = await requireUser();
    const identity = mediaIdentitySchema.parse(identityInput);
    const entry = await ensureLibraryEntry(user.id, identity);
    await setFavorite(user.id, entry.id, isFavorite);
    revalidateLibrary([
      identity.mediaType === "movie"
        ? ROUTES.movie(identity.externalId)
        : ROUTES.show(identity.externalId),
    ]);
    return { success: true, data: { entryId: entry.id } };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function actionTogglePin(
  entryId: string,
  isPinned: boolean,
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await setPinned(user.id, entryId, isPinned);
    revalidateLibrary();
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function actionToggleHidden(
  entryId: string,
  isHidden: boolean,
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await setHidden(user.id, entryId, isHidden);
    revalidateLibrary();
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function actionSetRating(
  identityInput: MediaIdentity,
  value: number,
  scale: RatingScale = "ten",
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const identity = mediaIdentitySchema.parse(identityInput);
    const parsed = ratingSchema.parse({ value, scale });
    // Normalize to scale
    if (parsed.scale === "five" && parsed.value > 5) {
      return { success: false, error: "Rating must be 0–5" };
    }
    if (parsed.scale === "ten" && parsed.value > 10) {
      return { success: false, error: "Rating must be 0–10" };
    }
    const entry = await ensureLibraryEntry(user.id, identity);
    await setRating(user.id, entry.id, parsed.value, parsed.scale);
    revalidateLibrary();
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function actionSaveReview(
  identityInput: MediaIdentity,
  body: string,
  options?: { containsSpoilers?: boolean },
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const identity = mediaIdentitySchema.parse(identityInput);
    const parsed = reviewSchema.parse({
      body,
      containsSpoilers: options?.containsSpoilers ?? false,
    });
    const entry = await ensureLibraryEntry(user.id, identity);
    await upsertReview(user.id, entry.id, parsed.body, {
      containsSpoilers: parsed.containsSpoilers,
      visibility: "private",
    });
    revalidateLibrary();
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function actionAddNote(
  identityInput: MediaIdentity,
  body: string,
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const identity = mediaIdentitySchema.parse(identityInput);
    const parsed = noteSchema.parse({ body });
    const entry = await ensureLibraryEntry(user.id, identity);
    await createNote(user.id, entry.id, parsed.body);
    revalidateLibrary();
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function actionUpdateNote(
  noteId: string,
  body: string,
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsed = noteSchema.parse({ body });
    await updateNote(user.id, noteId, parsed.body);
    revalidateLibrary();
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function actionDeleteNote(noteId: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await deleteNote(user.id, noteId);
    revalidateLibrary();
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function actionCreateTag(name: string, color?: string | null): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireUser();
    const parsed = tagSchema.parse({ name, color });
    const tag = await createTag(user.id, parsed.name, parsed.color);
    revalidateLibrary();
    return { success: true, data: { id: tag.id } };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function actionAssignTag(
  identityInput: MediaIdentity,
  tagId: string,
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const identity = mediaIdentitySchema.parse(identityInput);
    const entry = await ensureLibraryEntry(user.id, identity);
    await assignTag(user.id, entry.id, tagId);
    revalidateLibrary();
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function actionRemoveTag(
  entryId: string,
  tagId: string,
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await removeTagAssignment(user.id, entryId, tagId);
    revalidateLibrary();
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function actionCreateCollection(
  name: string,
  description?: string | null,
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireUser();
    const parsed = collectionSchema.parse({ name, description });
    const col = await createCollection(user.id, parsed.name, parsed.description);
    revalidateLibrary([ROUTES.collectionDetail(col.id)]);
    return { success: true, data: { id: col.id } };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function actionUpdateCollection(
  collectionId: string,
  patch: { name?: string; description?: string | null; is_pinned?: boolean },
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await updateCollection(user.id, collectionId, patch);
    revalidateLibrary([ROUTES.collectionDetail(collectionId)]);
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function actionDeleteCollection(
  collectionId: string,
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await deleteCollection(user.id, collectionId);
    revalidateLibrary();
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function actionAddToCollection(
  identityInput: MediaIdentity,
  collectionId: string,
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const identity = mediaIdentitySchema.parse(identityInput);
    const entry = await ensureLibraryEntry(user.id, identity);
    await addToCollection(user.id, collectionId, entry.id);
    revalidateLibrary([ROUTES.collectionDetail(collectionId)]);
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function actionRemoveFromCollection(
  collectionId: string,
  entryId: string,
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await removeFromCollection(user.id, collectionId, entryId);
    revalidateLibrary([ROUTES.collectionDetail(collectionId)]);
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function actionReorderCollection(
  collectionId: string,
  orderedEntryIds: string[],
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await reorderCollectionItems(user.id, collectionId, orderedEntryIds);
    revalidateLibrary([ROUTES.collectionDetail(collectionId)]);
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function actionMarkEpisode(
  identityInput: MediaIdentity,
  seasonNumber: number,
  episodeNumber: number,
  meta?: {
    episodeId?: string;
    episodeName?: string;
    stillPath?: string;
    runtimeMinutes?: number;
    totalEpisodes?: number;
  },
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const identity = mediaIdentitySchema.parse(identityInput);
    const entry = await ensureLibraryEntry(user.id, identity);
    await markEpisodeWatched(user.id, entry.id, seasonNumber, episodeNumber, meta);
    revalidateLibrary([ROUTES.show(identity.externalId)]);
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function actionUnmarkEpisode(
  entryId: string,
  seasonNumber: number,
  episodeNumber: number,
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await unmarkEpisode(user.id, entryId, seasonNumber, episodeNumber);
    revalidateLibrary();
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function actionSetMovieProgress(
  identityInput: MediaIdentity,
  minutes: number,
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const identity = mediaIdentitySchema.parse(identityInput);
    const entry = await ensureLibraryEntry(user.id, identity);
    await setMovieProgress(user.id, entry.id, minutes, identity.runtimeMinutes);
    revalidateLibrary([ROUTES.movie(identity.externalId)]);
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function actionLogSession(
  identityInput: MediaIdentity,
  input: {
    sessionDate?: string;
    durationMinutes?: number | null;
    isRewatch?: boolean;
    notes?: string | null;
    device?: string | null;
  },
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const identity = mediaIdentitySchema.parse(identityInput);
    const parsed = sessionSchema.parse(input);
    const entry = await ensureLibraryEntry(user.id, identity);
    await logWatchSession(user.id, entry.id, parsed);
    revalidateLibrary([ROUTES.history]);
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed" };
  }
}
