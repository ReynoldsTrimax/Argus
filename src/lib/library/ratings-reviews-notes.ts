import { createClient } from "@/lib/supabase/server";
import { table } from "@/lib/library/supabase-table";
import { logActivity } from "@/lib/library/activity";
import type { Note, RatingScale, Review, ReviewVisibility } from "@/types/library";

export async function setRating(
  userId: string,
  entryId: string,
  value: number,
  scale: RatingScale = "ten",
): Promise<void> {
  const supabase = await createClient();
  const { data: entry } = await table(supabase, "library_entries")
    .select("id, title, user_rating")
    .eq("id", entryId)
    .eq("user_id", userId)
    .single();

  if (!entry) throw new Error("Entry not found");

  const previous = entry.user_rating as number | null;

  const { error } = await table(supabase, "library_entries")
    .update({ user_rating: value, rating_scale: scale })
    .eq("id", entryId)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);

  await table(supabase, "rating_history").insert({
    entry_id: entryId,
    user_id: userId,
    value,
    scale,
    previous_value: previous,
  });

  await logActivity(supabase, userId, {
    activityType: "rated",
    summary: `Rated ${entry.title as string} ${value}/${scale === "five" ? 5 : scale === "hundred" ? 100 : 10}`,
    entryId,
    title: entry.title as string,
    metadata: { value, scale, previous },
  });
}

export async function getRatingHistory(userId: string, entryId: string) {
  const supabase = await createClient();
  const { data } = await table(supabase, "rating_history")
    .select("id, value, scale, previous_value, created_at")
    .eq("user_id", userId)
    .eq("entry_id", entryId)
    .order("created_at", { ascending: false })
    .limit(20);
  return data ?? [];
}

export async function upsertReview(
  userId: string,
  entryId: string,
  body: string,
  options?: { containsSpoilers?: boolean; visibility?: ReviewVisibility },
): Promise<Review> {
  const supabase = await createClient();
  const wordCount = body.trim().split(/\s+/).filter(Boolean).length;

  const { data: existing } = await table(supabase, "reviews")
    .select("*")
    .eq("user_id", userId)
    .eq("entry_id", entryId)
    .maybeSingle();

  if (existing) {
    await table(supabase, "review_versions").insert({
      review_id: existing.id,
      user_id: userId,
      body: existing.body,
    });

    const { data, error } = await table(supabase, "reviews")
      .update({
        body,
        contains_spoilers: options?.containsSpoilers ?? existing.contains_spoilers,
        visibility: options?.visibility ?? existing.visibility,
        word_count: wordCount,
      })
      .eq("id", existing.id)
      .select("*")
      .single();

    if (error || !data) throw new Error(error?.message ?? "Failed to update review");
    return data as Review;
  }

  const { data, error } = await table(supabase, "reviews")
    .insert({
      user_id: userId,
      entry_id: entryId,
      body,
      contains_spoilers: options?.containsSpoilers ?? false,
      visibility: options?.visibility ?? "private",
      word_count: wordCount,
    })
    .select("*")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to create review");

  const { data: entry } = await table(supabase, "library_entries")
    .select("title")
    .eq("id", entryId)
    .single();

  await logActivity(supabase, userId, {
    activityType: "reviewed",
    summary: `Wrote a review for ${entry?.title ?? "a title"}`,
    entryId,
    title: entry?.title,
  });

  return data as Review;
}

export async function getReview(
  userId: string,
  entryId: string,
): Promise<Review | null> {
  const supabase = await createClient();
  const { data } = await table(supabase, "reviews")
    .select("*")
    .eq("user_id", userId)
    .eq("entry_id", entryId)
    .maybeSingle();
  return (data as Review) ?? null;
}

export async function listNotes(userId: string, entryId: string): Promise<Note[]> {
  const supabase = await createClient();
  const { data } = await table(supabase, "notes")
    .select("*")
    .eq("user_id", userId)
    .eq("entry_id", entryId)
    .order("created_at", { ascending: false });
  return (data ?? []) as Note[];
}

export async function createNote(
  userId: string,
  entryId: string,
  body: string,
): Promise<Note> {
  const supabase = await createClient();
  const { data, error } = await table(supabase, "notes")
    .insert({ user_id: userId, entry_id: entryId, body })
    .select("*")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to create note");

  const { data: entry } = await table(supabase, "library_entries")
    .select("title")
    .eq("id", entryId)
    .single();

  await logActivity(supabase, userId, {
    activityType: "note_added",
    summary: `Added a note on ${entry?.title ?? "a title"}`,
    entryId,
    title: entry?.title,
  });

  return data as Note;
}

export async function updateNote(
  userId: string,
  noteId: string,
  body: string,
): Promise<Note> {
  const supabase = await createClient();
  const { data, error } = await table(supabase, "notes")
    .update({ body })
    .eq("id", noteId)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to update note");
  return data as Note;
}

export async function deleteNote(userId: string, noteId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await table(supabase, "notes")
    .delete()
    .eq("id", noteId)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
}
