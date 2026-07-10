import { createClient } from "@/lib/supabase/server";
import { table } from "@/lib/library/supabase-table";
import { logActivity } from "@/lib/library/activity";
import type { EpisodeProgress, WatchSession } from "@/types/library";

export async function markEpisodeWatched(
  userId: string,
  entryId: string,
  seasonNumber: number,
  episodeNumber: number,
  meta?: {
    episodeId?: string;
    episodeName?: string;
    stillPath?: string;
    runtimeMinutes?: number;
    totalEpisodes?: number;
  },
): Promise<EpisodeProgress> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { data, error } = await table(supabase, "episode_progress")
    .upsert(
      {
        user_id: userId,
        entry_id: entryId,
        season_number: seasonNumber,
        episode_number: episodeNumber,
        episode_id: meta?.episodeId ?? null,
        episode_name: meta?.episodeName ?? null,
        still_path: meta?.stillPath ?? null,
        runtime_minutes: meta?.runtimeMinutes ?? null,
        is_watched: true,
        watched_at: now,
      },
      { onConflict: "entry_id,season_number,episode_number" },
    )
    .select("*")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to mark episode");

  // Roll up season
  const { count: watchedInSeason } = await table(supabase, "episode_progress")
    .select("*", { count: "exact", head: true })
    .eq("entry_id", entryId)
    .eq("season_number", seasonNumber)
    .eq("is_watched", true);

  await table(supabase, "season_progress").upsert(
    {
      user_id: userId,
      entry_id: entryId,
      season_number: seasonNumber,
      episodes_watched: watchedInSeason ?? 0,
      is_completed: false,
    },
    { onConflict: "entry_id,season_number" },
  );

  const { count: totalWatched } = await table(supabase, "episode_progress")
    .select("*", { count: "exact", head: true })
    .eq("entry_id", entryId)
    .eq("is_watched", true);

  const { data: entry } = await table(supabase, "library_entries")
    .select("*")
    .eq("id", entryId)
    .single();

  const totalEpisodes = meta?.totalEpisodes ?? entry?.total_episodes ?? null;
  const episodesWatched = totalWatched ?? 0;
  const progress =
    totalEpisodes && totalEpisodes > 0
      ? Math.min(100, Math.round((episodesWatched / totalEpisodes) * 10000) / 100)
      : entry?.progress_percent ?? 0;

  await table(supabase, "library_entries")
    .update({
      current_season: seasonNumber,
      current_episode: episodeNumber,
      episodes_watched: episodesWatched,
      total_episodes: totalEpisodes,
      progress_percent: progress,
      last_watched_at: now,
      status:
        progress >= 100
          ? "completed"
          : entry?.status === "plan_to_watch" || entry?.status === "wishlist"
            ? "watching"
            : entry?.status,
      completed_at: progress >= 100 ? now : entry?.completed_at,
      started_at: entry?.started_at ?? now,
    })
    .eq("id", entryId)
    .eq("user_id", userId);

  await logActivity(supabase, userId, {
    activityType: "episode_watched",
    summary: `Watched S${seasonNumber}E${episodeNumber}${meta?.episodeName ? ` — ${meta.episodeName}` : ""} of ${entry?.title ?? "show"}`,
    entryId,
    title: entry?.title,
    metadata: { seasonNumber, episodeNumber },
  });

  // Log session
  await table(supabase, "watch_sessions").insert({
    user_id: userId,
    entry_id: entryId,
    session_date: now.slice(0, 10),
    started_at: now,
    ended_at: now,
    duration_minutes: meta?.runtimeMinutes ?? null,
    season_number: seasonNumber,
    episode_number: episodeNumber,
    is_rewatch: false,
  });

  return data as EpisodeProgress;
}

export async function unmarkEpisode(
  userId: string,
  entryId: string,
  seasonNumber: number,
  episodeNumber: number,
): Promise<void> {
  const supabase = await createClient();
  await table(supabase, "episode_progress")
    .update({ is_watched: false, watched_at: null })
    .eq("user_id", userId)
    .eq("entry_id", entryId)
    .eq("season_number", seasonNumber)
    .eq("episode_number", episodeNumber);

  const { count: totalWatched } = await table(supabase, "episode_progress")
    .select("*", { count: "exact", head: true })
    .eq("entry_id", entryId)
    .eq("is_watched", true);

  const { data: entry } = await table(supabase, "library_entries")
    .select("total_episodes")
    .eq("id", entryId)
    .single();

  const total = entry?.total_episodes as number | null;
  const watched = totalWatched ?? 0;
  const progress =
    total && total > 0 ? Math.min(100, Math.round((watched / total) * 10000) / 100) : 0;

  await table(supabase, "library_entries")
    .update({
      episodes_watched: watched,
      progress_percent: progress,
    })
    .eq("id", entryId)
    .eq("user_id", userId);
}

export async function listEpisodeProgress(
  userId: string,
  entryId: string,
): Promise<EpisodeProgress[]> {
  const supabase = await createClient();
  const { data } = await table(supabase, "episode_progress")
    .select("*")
    .eq("user_id", userId)
    .eq("entry_id", entryId)
    .order("season_number")
    .order("episode_number");
  return (data ?? []) as EpisodeProgress[];
}

export async function logWatchSession(
  userId: string,
  entryId: string,
  input: {
    sessionDate?: string;
    startedAt?: string | null;
    endedAt?: string | null;
    durationMinutes?: number | null;
    isRewatch?: boolean;
    seasonNumber?: number | null;
    episodeNumber?: number | null;
    device?: string | null;
    location?: string | null;
    notes?: string | null;
  },
): Promise<WatchSession> {
  const supabase = await createClient();
  const { data, error } = await table(supabase, "watch_sessions")
    .insert({
      user_id: userId,
      entry_id: entryId,
      session_date: input.sessionDate ?? new Date().toISOString().slice(0, 10),
      started_at: input.startedAt ?? null,
      ended_at: input.endedAt ?? null,
      duration_minutes: input.durationMinutes ?? null,
      is_rewatch: input.isRewatch ?? false,
      season_number: input.seasonNumber ?? null,
      episode_number: input.episodeNumber ?? null,
      device: input.device ?? null,
      location: input.location ?? null,
      notes: input.notes ?? null,
    })
    .select("*")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to log session");

  await table(supabase, "library_entries")
    .update({ last_watched_at: new Date().toISOString() })
    .eq("id", entryId)
    .eq("user_id", userId);

  const { data: entry } = await table(supabase, "library_entries")
    .select("title")
    .eq("id", entryId)
    .single();

  await logActivity(supabase, userId, {
    activityType: "session_logged",
    summary: `Logged a watch session for ${entry?.title ?? "title"}`,
    entryId,
    title: entry?.title,
  });

  return data as WatchSession;
}

export async function listWatchSessions(
  userId: string,
  options?: { entryId?: string; limit?: number },
): Promise<(WatchSession & { library_entries?: { title: string; poster_path: string | null; media_type: string; external_id: string } })[]> {
  const supabase = await createClient();
  let query = table(supabase, "watch_sessions")
    .select("*, library_entries(title, poster_path, media_type, external_id)")
    .eq("user_id", userId)
    .order("session_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(options?.limit ?? 50);

  if (options?.entryId) {
    query = query.eq("entry_id", options.entryId);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[sessions]", error.message);
    return [];
  }
  return (data ?? []) as (WatchSession & {
    library_entries?: {
      title: string;
      poster_path: string | null;
      media_type: string;
      external_id: string;
    };
  })[];
}

export async function listActivity(userId: string, limit = 40) {
  const supabase = await createClient();
  const { data } = await table(supabase, "activity_log")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function recordRecentlyViewed(
  userId: string,
  input: {
    mediaType: "movie" | "tv";
    externalId: string;
    title: string;
    posterPath?: string | null;
    provider?: string;
  },
): Promise<void> {
  const supabase = await createClient();
  await table(supabase, "recently_viewed").upsert(
    {
      user_id: userId,
      provider: input.provider ?? "tmdb",
      media_type: input.mediaType,
      external_id: input.externalId,
      title: input.title,
      poster_path: input.posterPath ?? null,
      viewed_at: new Date().toISOString(),
    },
    { onConflict: "user_id,provider,media_type,external_id" },
  );
}

export async function listRecentlyViewed(userId: string, limit = 12) {
  const supabase = await createClient();
  const { data } = await table(supabase, "recently_viewed")
    .select("*")
    .eq("user_id", userId)
    .order("viewed_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}
