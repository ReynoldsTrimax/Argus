/**
 * Year-in-review and monthly recap generators.
 */

import type { LibraryEntry } from "@/types/library";
import type { MonthlyRecap, WrappedReport } from "@/types/intelligence";
import type { IntelligenceRawData } from "@/lib/intelligence/load-profile";
import { buildCalendar } from "@/lib/intelligence/calendar";
import { computeUserStats } from "@/lib/intelligence/stats-engine";

function inYear(date: string | null | undefined, year: number) {
  return Boolean(date?.startsWith(String(year)));
}

function inMonth(date: string | null | undefined, year: number, month: number) {
  if (!date) return false;
  const m = String(month).padStart(2, "0");
  return date.startsWith(`${year}-${m}`);
}

export function buildWrapped(
  data: IntelligenceRawData,
  year: number,
): WrappedReport {
  const stats = computeUserStats(data);
  const yearSessions = data.sessions.filter((s) => inYear(s.session_date, year));
  const yearEntries = data.entries.filter(
    (e) =>
      inYear(e.completed_at, year) ||
      inYear(e.last_watched_at, year) ||
      inYear(e.created_at, year),
  );

  const moviesWatched = yearEntries.filter(
    (e) => e.media_type === "movie" && (e.status === "completed" || inYear(e.completed_at, year)),
  ).length;
  const showsCompleted = yearEntries.filter(
    (e) => e.media_type === "tv" && e.status === "completed",
  ).length;
  const episodesWatched = data.episodeProgress.filter((e) =>
    inYear(e.watched_at, year),
  ).length;

  const minutes = yearSessions.reduce((s, x) => s + (x.duration_minutes ?? 0), 0);
  const hoursWatched = Math.round((minutes || moviesWatched * 110 + episodesWatched * 42) / 60);

  const ratedInYear = yearEntries
    .filter((e) => e.user_rating != null)
    .sort((a, b) => (b.user_rating ?? 0) - (a.user_rating ?? 0));

  const favoriteMovie =
    ratedInYear.find((e) => e.media_type === "movie") ??
    yearEntries.find((e) => e.media_type === "movie") ??
    null;
  const favoriteShow =
    ratedInYear.find((e) => e.media_type === "tv") ??
    yearEntries.find((e) => e.media_type === "tv") ??
    null;

  const monthMap = new Map<string, number>();
  for (const s of yearSessions) {
    const key = s.session_date.slice(0, 7);
    monthMap.set(key, (monthMap.get(key) ?? 0) + 1);
  }
  const biggestMonth =
    [...monthMap.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  const tagCounts = new Map<string, number>();
  for (const a of data.tagAssignments) {
    const tag = data.tags.find((t) => t.id === a.tag_id);
    if (!tag) continue;
    tagCounts.set(tag.name, (tagCounts.get(tag.name) ?? 0) + 1);
  }
  const topTags = [...tagCounts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  return {
    year,
    moviesWatched,
    showsCompleted,
    episodesWatched,
    hoursWatched,
    favoriteMovie,
    favoriteShow,
    topGenres: stats.distributions.genres.slice(0, 5),
    highestRated: ratedInYear.slice(0, 8),
    mostRewatched: stats.favorites.mostRewatched.slice(0, 5),
    biggestMonth,
    longestStreak: stats.streaks.longest,
    heatmap: buildCalendar(data, { year }),
    topTags,
    reviewCount: data.reviews.filter((r) => inYear(r.created_at, year)).length,
    noteCount: data.notes.filter((n) => inYear(n.created_at, year)).length,
  };
}

export function buildMonthlyRecap(
  data: IntelligenceRawData,
  year: number,
  month: number,
): MonthlyRecap {
  const label = new Intl.DateTimeFormat("en", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, 1));

  const sessions = data.sessions.filter((s) =>
    inMonth(s.session_date, year, month),
  );
  const minutes = sessions.reduce((s, x) => s + (x.duration_minutes ?? 0), 0);
  const hoursWatched = Math.round(minutes / 60);

  const movies = data.entries.filter(
    (e) =>
      e.media_type === "movie" &&
      (inMonth(e.completed_at, year, month) || inMonth(e.last_watched_at, year, month)),
  ).length;

  const episodes = data.episodeProgress.filter((e) =>
    inMonth(e.watched_at, year, month),
  ).length;

  const dayMap = new Map<string, number>();
  for (const s of sessions) {
    dayMap.set(s.session_date, (dayMap.get(s.session_date) ?? 0) + 1);
  }
  const mostActiveDay =
    [...dayMap.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  const highestRated = data.entries
    .filter(
      (e) =>
        e.user_rating != null &&
        (inMonth(e.updated_at, year, month) || inMonth(e.completed_at, year, month)),
    )
    .sort((a, b) => (b.user_rating ?? 0) - (a.user_rating ?? 0))
    .slice(0, 5);

  const stats = computeUserStats(data);

  // Approximate streak days active this month
  const streakDays = dayMap.size;

  return {
    year,
    month,
    label,
    hoursWatched,
    movies,
    episodes,
    genres: stats.distributions.genres.slice(0, 5),
    highestRated: highestRated as LibraryEntry[],
    mostActiveDay,
    reviewsWritten: data.reviews.filter((r) => inMonth(r.created_at, year, month))
      .length,
    streakDays,
  };
}
