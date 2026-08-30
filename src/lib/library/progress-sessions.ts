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
    summary: `Watched S${seasonNumber}E${episodeNumber} of ${entry?.title ?? "show"}${meta?.episodeName ? `: ${meta.episodeName}` : ""}`,
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

/**
 * Set “watched up to” position for a series (e.g. S2E5).
 * Updates entry progress and logs the newly completed runtime into sessions
 * so home hours watched increases.
 */
export async function setTvProgressPosition(
  userId: string,
  entryId: string,
  input: {
    seasonNumber: number;
    episodeNumber: number;
    seasons: { seasonNumber: number; episodeCount: number | null }[];
    episodeRuntimeMinutes?: number | null;
    totalEpisodes?: number | null;
  },
): Promise<{ episodesWatched: number; progressPercent: number; minutesAdded: number }> {
  const supabase = await createClient();
  const now = new Date().toISOString();
  const seasonNumber = Math.max(1, Math.floor(input.seasonNumber));
  const episodeNumber = Math.max(1, Math.floor(input.episodeNumber));

  const sorted = [...input.seasons]
    .filter((s) => s.seasonNumber > 0)
    .sort((a, b) => a.seasonNumber - b.seasonNumber);

  let episodesWatched = 0;
  for (const s of sorted) {
    const count = Math.max(0, s.episodeCount ?? 0);
    if (s.seasonNumber < seasonNumber) {
      episodesWatched += count || 0;
    } else if (s.seasonNumber === seasonNumber) {
      const cap = count > 0 ? Math.min(episodeNumber, count) : episodeNumber;
      episodesWatched += cap;
      break;
    }
  }

  // Fallback when season metadata is missing
  if (episodesWatched === 0) {
    episodesWatched = episodeNumber;
  }

  const { data: entry } = await table(supabase, "library_entries")
    .select("*")
    .eq("id", entryId)
    .eq("user_id", userId)
    .single();

  if (!entry) throw new Error("Library entry not found");

  const prevWatched = Number(entry.episodes_watched ?? 0);
  const fromSeasons = sorted.reduce((sum, s) => sum + (s.episodeCount ?? 0), 0);
  const totalEpisodes =
    input.totalEpisodes ??
    (entry.total_episodes as number | null) ??
    (fromSeasons > 0 ? fromSeasons : null);

  const progress =
    totalEpisodes && totalEpisodes > 0
      ? Math.min(100, Math.round((episodesWatched / totalEpisodes) * 10000) / 100)
      : 0;

  const epRuntime =
    (typeof input.episodeRuntimeMinutes === "number" && input.episodeRuntimeMinutes > 0
      ? input.episodeRuntimeMinutes
      : null) ??
    (typeof entry.runtime_minutes === "number" &&
    entry.runtime_minutes > 0 &&
    entry.runtime_minutes <= 180
      ? entry.runtime_minutes
      : 42);

  const deltaEpisodes = Math.max(0, episodesWatched - prevWatched);
  const minutesAdded = deltaEpisodes * epRuntime;

  // Preserve dropped — partial watch is still logged without flipping status.
  // Plan/wishlist become watching; 100% → completed.
  const status =
    progress >= 100
      ? "completed"
      : entry.status === "dropped"
        ? "dropped"
        : entry.status === "plan_to_watch" || entry.status === "wishlist"
          ? "watching"
          : entry.status === "completed" && progress < 100
            ? "watching"
            : entry.status;

  await table(supabase, "library_entries")
    .update({
      current_season: seasonNumber,
      current_episode: episodeNumber,
      episodes_watched: episodesWatched,
      total_episodes: totalEpisodes,
      progress_percent: progress,
      runtime_minutes: entry.runtime_minutes ?? epRuntime,
      last_watched_at: now,
      status,
      started_at: entry.started_at ?? now,
      completed_at: progress >= 100 ? now : entry.completed_at,
    })
    .eq("id", entryId)
    .eq("user_id", userId);

  // Anchor progress on the chosen episode row
  await table(supabase, "episode_progress").upsert(
    {
      user_id: userId,
      entry_id: entryId,
      season_number: seasonNumber,
      episode_number: episodeNumber,
      is_watched: true,
      watched_at: now,
      runtime_minutes: epRuntime,
    },
    { onConflict: "entry_id,season_number,episode_number" },
  );

  if (minutesAdded > 0) {
    await table(supabase, "watch_sessions").insert({
      user_id: userId,
      entry_id: entryId,
      session_date: now.slice(0, 10),
      started_at: now,
      ended_at: now,
      duration_minutes: minutesAdded,
      season_number: seasonNumber,
      episode_number: episodeNumber,
      is_rewatch: false,
      notes: `Progress set to S${seasonNumber}E${episodeNumber} (+${deltaEpisodes} ep)`,
    });
  }

  await logActivity(supabase, userId, {
    activityType: "episode_watched",
    summary: `Progress on ${entry.title ?? "show"}: S${seasonNumber}E${episodeNumber} (${episodesWatched} episodes)`,
    entryId,
    title: entry.title as string | null,
    metadata: {
      seasonNumber,
      episodeNumber,
      episodesWatched,
      minutesAdded,
    },
  });

  return { episodesWatched, progressPercent: progress, minutesAdded };
}

/**
 * Recomputes entry-level rollups from the `episode_progress` rows.
 *
 * Every episode mutation has to answer the same four questions — how many
 * episodes are watched, what percent that is, where the user is now, and what
 * the status should be. Deriving all of it from the rows in one place means a
 * toggle and an untoggle can never disagree, which is what allowed the previous
 * unmark path to leave `current_season`/`current_episode` pointing at an episode
 * the user had just unchecked.
 *
 * `current_*` is set to the furthest watched episode rather than the one just
 * touched, so unchecking the latest episode walks the position back instead of
 * stranding it ahead of real progress.
 */
async function recalcEntryProgress(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  entryId: string,
  options?: { totalEpisodes?: number | null },
): Promise<{ episodesWatched: number; progressPercent: number }> {
  const now = new Date().toISOString();

  const { data: watchedRows } = await table(supabase, "episode_progress")
    .select("season_number, episode_number, runtime_minutes")
    .eq("user_id", userId)
    .eq("entry_id", entryId)
    .eq("is_watched", true)
    .order("season_number")
    .order("episode_number");

  const rows = (watchedRows ?? []) as {
    season_number: number;
    episode_number: number;
    runtime_minutes: number | null;
  }[];

  const { data: entry } = await table(supabase, "library_entries")
    .select("*")
    .eq("id", entryId)
    .eq("user_id", userId)
    .single();

  if (!entry) throw new Error("Library entry not found");

  const episodesWatched = rows.length;
  const totalEpisodes =
    options?.totalEpisodes ?? (entry.total_episodes as number | null) ?? null;

  const progressPercent =
    totalEpisodes && totalEpisodes > 0
      ? Math.min(100, Math.round((episodesWatched / totalEpisodes) * 10000) / 100)
      : 0;

  const furthest = rows[rows.length - 1] ?? null;

  // Never silently overwrite a deliberate "dropped". Otherwise: any progress on
  // an untracked/planned title means watching, a full run means completed, and
  // dropping back below 100% reopens a previously completed run.
  const status =
    entry.status === "dropped"
      ? "dropped"
      : progressPercent >= 100
        ? "completed"
        : episodesWatched === 0
          ? entry.status
          : entry.status === "plan_to_watch" ||
              entry.status === "wishlist" ||
              entry.status === "completed"
            ? "watching"
            : entry.status;

  await table(supabase, "library_entries")
    .update({
      current_season: furthest?.season_number ?? null,
      current_episode: furthest?.episode_number ?? null,
      episodes_watched: episodesWatched,
      total_episodes: totalEpisodes,
      progress_percent: progressPercent,
      status,
      last_watched_at: episodesWatched > 0 ? now : entry.last_watched_at,
      started_at: entry.started_at ?? (episodesWatched > 0 ? now : null),
      completed_at: progressPercent >= 100 ? (entry.completed_at ?? now) : null,
    })
    .eq("id", entryId)
    .eq("user_id", userId);

  // Season rollups for every season the user has rows in, so a season that just
  // dropped to zero is corrected rather than left at its old count.
  const bySeason = new Map<number, number>();
  for (const row of rows) {
    bySeason.set(row.season_number, (bySeason.get(row.season_number) ?? 0) + 1);
  }

  const { data: touchedSeasons } = await table(supabase, "episode_progress")
    .select("season_number")
    .eq("user_id", userId)
    .eq("entry_id", entryId);

  const seasonNumbers = new Set<number>([
    ...bySeason.keys(),
    ...((touchedSeasons ?? []) as { season_number: number }[]).map(
      (r) => r.season_number,
    ),
  ]);

  for (const seasonNumber of seasonNumbers) {
    await table(supabase, "season_progress").upsert(
      {
        user_id: userId,
        entry_id: entryId,
        season_number: seasonNumber,
        episodes_watched: bySeason.get(seasonNumber) ?? 0,
        is_completed: false,
      },
      { onConflict: "entry_id,season_number" },
    );
  }

  return { episodesWatched, progressPercent };
}

/**
 * Marks or unmarks every episode in a season in one round trip.
 *
 * The per-episode path is fine for a single tap but a 24-episode season would
 * fire 24 sequential writes and 24 recalculations, so the whole set is upserted
 * at once and the rollup runs a single time at the end.
 */
export async function setSeasonWatched(
  userId: string,
  entryId: string,
  seasonNumber: number,
  episodeNumbers: number[],
  watched: boolean,
  meta?: { runtimeMinutes?: number | null; totalEpisodes?: number | null },
): Promise<{ episodesWatched: number; progressPercent: number; changed: number }> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  if (episodeNumbers.length === 0) {
    const rollup = await recalcEntryProgress(supabase, userId, entryId, {
      totalEpisodes: meta?.totalEpisodes ?? null,
    });
    return { ...rollup, changed: 0 };
  }

  // Count what actually changes so hours are credited only for new episodes.
  const { data: existing } = await table(supabase, "episode_progress")
    .select("episode_number, is_watched")
    .eq("user_id", userId)
    .eq("entry_id", entryId)
    .eq("season_number", seasonNumber);

  const previously = new Map(
    ((existing ?? []) as { episode_number: number; is_watched: boolean }[]).map((r) => [
      r.episode_number,
      r.is_watched,
    ]),
  );
  const changed = episodeNumbers.filter(
    (n) => (previously.get(n) ?? false) !== watched,
  ).length;

  await table(supabase, "episode_progress").upsert(
    episodeNumbers.map((episodeNumber) => ({
      user_id: userId,
      entry_id: entryId,
      season_number: seasonNumber,
      episode_number: episodeNumber,
      is_watched: watched,
      watched_at: watched ? now : null,
      runtime_minutes: meta?.runtimeMinutes ?? null,
    })),
    { onConflict: "entry_id,season_number,episode_number" },
  );

  const rollup = await recalcEntryProgress(supabase, userId, entryId, {
    totalEpisodes: meta?.totalEpisodes ?? null,
  });

  const { data: entry } = await table(supabase, "library_entries")
    .select("title")
    .eq("id", entryId)
    .single();

  // One session row for the batch, so bulk-marking a season credits its hours
  // without inserting a row per episode.
  const runtime = meta?.runtimeMinutes ?? null;
  if (watched && changed > 0 && runtime && runtime > 0) {
    await table(supabase, "watch_sessions").insert({
      user_id: userId,
      entry_id: entryId,
      session_date: now.slice(0, 10),
      started_at: now,
      ended_at: now,
      duration_minutes: changed * runtime,
      season_number: seasonNumber,
      episode_number: episodeNumbers[episodeNumbers.length - 1] ?? null,
      is_rewatch: false,
      notes: `Marked season ${seasonNumber} (+${changed} ep)`,
    });
  }

  if (changed > 0) {
    await logActivity(supabase, userId, {
      activityType: "episode_watched",
      summary: `${watched ? "Marked" : "Cleared"} season ${seasonNumber} of ${entry?.title ?? "show"} (${changed} episode${changed === 1 ? "" : "s"})`,
      entryId,
      title: entry?.title,
      metadata: { seasonNumber, changed, watched },
    });
  }

  return { ...rollup, changed };
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

  // Shared rollup: also corrects season_progress and walks current_season /
  // current_episode back, which the previous inline version left stale.
  await recalcEntryProgress(supabase, userId, entryId);
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
