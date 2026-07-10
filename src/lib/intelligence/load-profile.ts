/**
 * Load raw personal data used by the stats / insights engines.
 */

import { createClient } from "@/lib/supabase/server";
import { table } from "@/lib/library/supabase-table";
import type { LibraryEntry } from "@/types/library";

export interface IntelligenceRawData {
  entries: LibraryEntry[];
  sessions: {
    id: string;
    entry_id: string;
    session_date: string;
    duration_minutes: number | null;
    season_number: number | null;
    episode_number: number | null;
    is_rewatch: boolean;
    created_at: string;
  }[];
  reviews: { id: string; entry_id: string; body: string; created_at: string; updated_at: string }[];
  notes: { id: string; entry_id: string; created_at: string }[];
  tags: { id: string; name: string }[];
  tagAssignments: { tag_id: string; entry_id: string }[];
  collections: { id: string; name: string; item_count: number; is_pinned: boolean }[];
  activity: { id: string; summary: string; created_at: string; activity_type: string }[];
  episodeProgress: {
    id: string;
    entry_id: string;
    is_watched: boolean;
    watched_at: string | null;
    season_number: number;
    episode_number: number;
  }[];
}

export async function loadIntelligenceData(userId: string): Promise<IntelligenceRawData> {
  const supabase = await createClient();

  const [
    entriesRes,
    sessionsRes,
    reviewsRes,
    notesRes,
    tagsRes,
    tagAssignRes,
    collectionsRes,
    activityRes,
    episodesRes,
  ] = await Promise.all([
    table(supabase, "library_entries")
      .select("*")
      .eq("user_id", userId)
      .eq("is_hidden", false)
      .limit(5000),
    table(supabase, "watch_sessions")
      .select(
        "id, entry_id, session_date, duration_minutes, season_number, episode_number, is_rewatch, created_at",
      )
      .eq("user_id", userId)
      .order("session_date", { ascending: false })
      .limit(5000),
    table(supabase, "reviews")
      .select("id, entry_id, body, created_at, updated_at")
      .eq("user_id", userId)
      .limit(2000),
    table(supabase, "notes")
      .select("id, entry_id, created_at")
      .eq("user_id", userId)
      .limit(5000),
    table(supabase, "tags").select("id, name").eq("user_id", userId).limit(500),
    table(supabase, "tag_assignments")
      .select("tag_id, entry_id")
      .eq("user_id", userId)
      .limit(5000),
    table(supabase, "collections")
      .select("id, name, item_count, is_pinned")
      .eq("user_id", userId)
      .limit(500),
    table(supabase, "activity_log")
      .select("id, summary, created_at, activity_type")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100),
    table(supabase, "episode_progress")
      .select("id, entry_id, is_watched, watched_at, season_number, episode_number")
      .eq("user_id", userId)
      .eq("is_watched", true)
      .limit(10000),
  ]);

  return {
    entries: (entriesRes.data ?? []) as LibraryEntry[],
    sessions: sessionsRes.data ?? [],
    reviews: reviewsRes.data ?? [],
    notes: notesRes.data ?? [],
    tags: tagsRes.data ?? [],
    tagAssignments: tagAssignRes.data ?? [],
    collections: collectionsRes.data ?? [],
    activity: activityRes.data ?? [],
    episodeProgress: episodesRes.data ?? [],
  };
}
