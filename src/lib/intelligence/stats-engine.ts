/**
 * Deterministic statistics engine.
 * All computations run in-process from loaded library data (cache-friendly).
 */

import type { LibraryEntry, WatchStatus } from "@/types/library";
import type {
  NamedCount,
  RatingBucket,
  StreakInfo,
  TimeSeriesPoint,
  UserStats,
} from "@/types/intelligence";
import type { IntelligenceRawData } from "@/lib/intelligence/load-profile";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function isCompleted(status: WatchStatus) {
  return status === "completed" || status === "rewatching";
}

/**
 * Statuses where any logged progress counts toward episodes / hours / series.
 * Includes dropped, paused, rewatching — not only completed + watching.
 */
function isEngagedStatus(status: WatchStatus) {
  return (
    status === "completed" ||
    status === "rewatching" ||
    status === "watching" ||
    status === "paused" ||
    status === "dropped"
  );
}

/** True if this TV entry contributes to series / episode totals. */
function isEngagedShow(entry: LibraryEntry, progressCount: number): boolean {
  if (entry.media_type !== "tv") return false;
  if (isEngagedStatus(entry.status)) return true;
  // plan / wishlist / archived only count when progress was actually logged
  return (entry.episodes_watched || 0) > 0 || progressCount > 0;
}

/** Episodes to credit for a TV entry (completed → full run; else logged progress). */
function creditedEpisodes(entry: LibraryEntry): number {
  if (entry.media_type !== "tv") return 0;
  const watched = entry.episodes_watched || 0;
  const total = entry.total_episodes || 0;
  if (entry.status === "completed" || entry.status === "rewatching") {
    return Math.max(total, watched, 0);
  }
  // watching, paused, dropped, plan-with-progress, etc.
  return Math.max(watched, 0);
}

/** Per-episode minutes — TV runtime field is episode length when set. */
function episodeMinutes(entry: LibraryEntry): number {
  const r = entry.runtime_minutes;
  if (typeof r === "number" && r > 0) {
    // Guard against full-series totals stored as runtime
    if (r > 180) return 42;
    return r;
  }
  return 42;
}

function entryGenres(entry: LibraryEntry): string[] {
  const meta = entry.metadata ?? {};
  const genres = meta.genres;
  if (Array.isArray(genres)) {
    return genres.filter((g): g is string => typeof g === "string");
  }
  return [];
}

function entryLanguage(entry: LibraryEntry): string | null {
  const lang = entry.metadata?.originalLanguage;
  return typeof lang === "string" ? lang : null;
}

function countMap(items: string[]): NamedCount[] {
  const map = new Map<string, number>();
  for (const item of items) {
    if (!item) continue;
    map.set(item, (map.get(item) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

function computeStreaks(activeDates: string[]): StreakInfo {
  if (!activeDates.length) {
    return { current: 0, longest: 0, lastActiveDate: null };
  }
  const unique = [...new Set(activeDates)].sort();
  const set = new Set(unique);
  const last = unique[unique.length - 1]!;

  let longest = 1;
  let run = 1;
  for (let i = 1; i < unique.length; i++) {
    const prev = new Date(unique[i - 1]! + "T12:00:00");
    const cur = new Date(unique[i]! + "T12:00:00");
    const diff = (cur.getTime() - prev.getTime()) / 86_400_000;
    if (diff === 1) {
      run += 1;
      longest = Math.max(longest, run);
    } else {
      run = 1;
    }
  }

  // Current streak from today or yesterday
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const cursor = new Date(today);
  let current = 0;
  const todayStr = cursor.toISOString().slice(0, 10);
  if (!set.has(todayStr)) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (set.has(cursor.toISOString().slice(0, 10))) {
    current += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return { current, longest: Math.max(longest, current), lastActiveDate: last };
}

export function computeUserStats(data: IntelligenceRawData): UserStats {
  const { entries, sessions, reviews, notes, tags, collections, episodeProgress } = data;

  const movies = entries.filter((e) => e.media_type === "movie");
  const shows = entries.filter((e) => e.media_type === "tv");

  const moviesWatched = movies.filter((e) => isCompleted(e.status)).length;
  const showsCompleted = shows.filter((e) => e.status === "completed").length;
  const showsWatching = shows.filter(
    (e) => e.status === "watching" || e.status === "rewatching" || e.status === "paused",
  ).length;
  const showsDropped = shows.filter((e) => e.status === "dropped").length;

  // Prefer granular episode_progress when present; always also credit entry fields
  // so completed / watching / dropped series without progress rows still count.
  const progressByShow = new Map<string, number>();
  for (const ep of episodeProgress) {
    const key = ep.entry_id;
    progressByShow.set(key, (progressByShow.get(key) ?? 0) + 1);
  }

  // Series count: completed + watching + paused + dropped + any other with progress
  const showsTracked = shows.filter((e) =>
    isEngagedShow(e, progressByShow.get(e.id) ?? 0),
  ).length;

  const episodesWatched = shows.reduce((sum, e) => {
    const fromProgress = progressByShow.get(e.id) ?? 0;
    if (!isEngagedShow(e, fromProgress)) return sum;
    const fromEntry = creditedEpisodes(e);
    return sum + Math.max(fromEntry, fromProgress);
  }, 0);

  const sessionMinutes = sessions.reduce(
    (sum, s) => sum + (s.duration_minutes ?? 0),
    0,
  );
  const movieMinutes = movies
    .filter(
      (e) =>
        isCompleted(e.status) ||
        e.status === "watching" ||
        e.status === "paused" ||
        e.status === "dropped" ||
        (e.movie_progress_minutes ?? 0) > 0,
    )
    .reduce((sum, e) => {
      if (isCompleted(e.status)) {
        return sum + (e.runtime_minutes ?? e.movie_progress_minutes ?? 0);
      }
      // Partial progress while watching / paused / dropped
      return sum + (e.movie_progress_minutes ?? 0);
    }, 0);

  const tvMinutes = shows.reduce((sum, e) => {
    const fromProgress = progressByShow.get(e.id) ?? 0;
    if (!isEngagedShow(e, fromProgress)) return sum;
    const fromEntry = creditedEpisodes(e);
    const eps = Math.max(fromEntry, fromProgress);
    return sum + eps * episodeMinutes(e);
  }, 0);

  // Use the richer of logged sessions vs library estimates so series always count
  const estimatedMinutes = movieMinutes + tvMinutes;
  const totalWatchMinutes = Math.max(sessionMinutes, estimatedMinutes);

  const runtimes = entries
    .map((e) => e.runtime_minutes)
    .filter((r): r is number => typeof r === "number" && r > 0);
  const averageRuntime =
    runtimes.length > 0
      ? Math.round(runtimes.reduce((a, b) => a + b, 0) / runtimes.length)
      : null;

  const rated = entries.filter((e) => e.user_rating != null);
  const averageRating =
    rated.length > 0
      ? Math.round(
          (rated.reduce((s, e) => s + (e.user_rating ?? 0), 0) / rated.length) * 10,
        ) / 10
      : null;

  const rewatchCount = entries.reduce((s, e) => s + (e.rewatch_count || 0), 0);

  const statusCounts = countMap(entries.map((e) => e.status));
  const byStatus = statusCounts.map((c) => ({
    ...c,
    name: c.name.replaceAll("_", " "),
  }));

  // Rating distribution buckets (0–10 scale)
  const buckets: RatingBucket[] = [
    { label: "0–2", min: 0, max: 2, count: 0 },
    { label: "2–4", min: 2, max: 4, count: 0 },
    { label: "4–6", min: 4, max: 6, count: 0 },
    { label: "6–8", min: 6, max: 8, count: 0 },
    { label: "8–10", min: 8, max: 10.01, count: 0 },
  ];
  for (const e of rated) {
    const v = e.user_rating ?? 0;
    const b = buckets.find((x) => v >= x.min && v < x.max);
    if (b) b.count += 1;
  }

  const genreNames = entries.flatMap(entryGenres);
  const genres = countMap(genreNames);

  const decades = countMap(
    entries
      .map((e) => e.release_date?.slice(0, 4))
      .filter((y): y is string => Boolean(y))
      .map((y) => `${Math.floor(Number(y) / 10) * 10}s`),
  );

  const years = countMap(
    entries
      .map((e) => e.release_date?.slice(0, 4))
      .filter((y): y is string => Boolean(y)),
  );

  const languages = countMap(
    entries.map(entryLanguage).filter((l): l is string => Boolean(l)),
  );

  // Monthly activity from sessions + last_watched
  const monthMap = new Map<string, number>();
  for (const s of sessions) {
    const key = s.session_date.slice(0, 7);
    monthMap.set(key, (monthMap.get(key) ?? 0) + 1);
  }
  for (const e of entries) {
    if (e.last_watched_at) {
      const key = e.last_watched_at.slice(0, 7);
      monthMap.set(key, (monthMap.get(key) ?? 0) + 1);
    }
  }
  const months: TimeSeriesPoint[] = [...monthMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-18)
    .map(([key, value]) => ({
      key,
      label: key,
      value,
    }));

  const weekdayCounts = new Array(7).fill(0) as number[];
  for (const s of sessions) {
    const d = new Date(s.session_date + "T12:00:00");
    weekdayCounts[d.getDay()]! += 1;
  }
  const weekdays: TimeSeriesPoint[] = WEEKDAYS.map((label, i) => ({
    key: String(i),
    label,
    value: weekdayCounts[i] ?? 0,
  }));

  const runtimeBuckets = countMap(
    runtimes.map((r) => {
      if (r < 90) return "Under 90m";
      if (r <= 130) return "90–130m";
      if (r <= 160) return "130–160m";
      return "Over 160m";
    }),
  );

  const activeDates = [
    ...sessions.map((s) => s.session_date),
    ...entries
      .map((e) => e.last_watched_at?.slice(0, 10))
      .filter((d): d is string => Boolean(d)),
    ...episodeProgress
      .map((e) => e.watched_at?.slice(0, 10))
      .filter((d): d is string => Boolean(d)),
  ];
  const streaks = computeStreaks(activeDates);

  const mostActiveMonth =
    months.length > 0
      ? [...months].sort((a, b) => b.value - a.value)[0]?.label ?? null
      : null;
  const yearActivity = countMap(activeDates.map((d) => d.slice(0, 4)));
  const mostActiveYear = yearActivity[0]?.name ?? null;

  // Lifetime span for averages
  const firstDate = activeDates.sort()[0];
  const monthsActive = firstDate
    ? Math.max(
        1,
        Math.ceil(
          (Date.now() - new Date(firstDate + "T12:00:00").getTime()) /
            (30 * 86_400_000),
        ),
      )
    : 1;
  const weeksActive = Math.max(1, monthsActive * 4.3);

  const completedShows = shows.filter((e) => e.status === "completed").length;
  const droppedShows = shows.filter((e) => e.status === "dropped").length;
  const finishedOrDropped = completedShows + droppedShows;
  const completionRate =
    finishedOrDropped > 0
      ? Math.round((completedShows / finishedOrDropped) * 1000) / 10
      : movies.length > 0
        ? Math.round((moviesWatched / Math.max(movies.length, 1)) * 1000) / 10
        : 0;

  const highRated = [...rated]
    .sort((a, b) => (b.user_rating ?? 0) - (a.user_rating ?? 0))
    .slice(0, 12);

  const mostRewatched = [...entries]
    .filter((e) => e.rewatch_count > 0)
    .sort((a, b) => b.rewatch_count - a.rewatch_count)
    .slice(0, 12);

  return {
    computedAt: new Date().toISOString(),
    totals: {
      moviesWatched,
      showsCompleted,
      /** Series currently watching / rewatching / paused. */
      showsWatching,
      /** Dropped series (included in showsTracked). */
      showsDropped,
      /**
       * All series with real activity: completed, watching, paused, dropped,
       * rewatching, or any status with logged episode progress.
       */
      showsTracked,
      episodesWatched,
      totalWatchMinutes,
      averageRuntime,
      averageRating,
      ratingsCount: rated.length,
      rewatchCount,
      wishlistSize: entries.filter(
        (e) => e.status === "wishlist" || e.status === "plan_to_watch",
      ).length,
      collectionCount: collections.length,
      reviewCount: reviews.length,
      noteCount: notes.length,
      tagCount: tags.length,
      librarySize: entries.length,
      favoritesCount: entries.filter((e) => e.is_favorite).length,
      pausedCount: entries.filter((e) => e.status === "paused").length,
      droppedCount: entries.filter((e) => e.status === "dropped").length,
      watchingCount: entries.filter(
        (e) => e.status === "watching" || e.status === "rewatching",
      ).length,
    },
    rates: {
      completionRate,
      droppedSeriesPercent:
        shows.length > 0
          ? Math.round((droppedShows / shows.length) * 1000) / 10
          : 0,
      moviesPerMonth: Math.round((moviesWatched / monthsActive) * 10) / 10,
      episodesPerWeek: Math.round((episodesWatched / weeksActive) * 10) / 10,
    },
    streaks,
    distributions: {
      byStatus,
      byMediaType: countMap(entries.map((e) => e.media_type)),
      ratings: buckets,
      genres: genres.slice(0, 15),
      decades: decades.slice(0, 12),
      years: years.slice(0, 20),
      languages: languages.slice(0, 12),
      months,
      weekdays,
      runtimes: runtimeBuckets,
    },
    favorites: {
      genres: genres.slice(0, 8),
      highRated,
      mostRewatched,
    },
    mostActiveMonth,
    mostActiveYear,
  };
}

export function formatWatchHours(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}
