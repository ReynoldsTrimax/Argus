/**
 * Activity calendar / heatmap data.
 */

import type { CalendarDay } from "@/types/intelligence";
import type { IntelligenceRawData } from "@/lib/intelligence/load-profile";

function emptyDay(date: string): CalendarDay {
  return {
    date,
    count: 0,
    movies: 0,
    episodes: 0,
    ratings: 0,
    reviews: 0,
    notes: 0,
  };
}

export function buildCalendar(
  data: IntelligenceRawData,
  options?: { year?: number },
): CalendarDay[] {
  const year = options?.year ?? new Date().getFullYear();
  const map = new Map<string, CalendarDay>();

  const ensure = (date: string) => {
    if (!date.startsWith(String(year))) return null;
    if (!map.has(date)) map.set(date, emptyDay(date));
    return map.get(date)!;
  };

  for (const s of data.sessions) {
    const day = ensure(s.session_date);
    if (!day) continue;
    day.count += 1;
    if (s.season_number != null) day.episodes += 1;
    else day.movies += 1;
  }

  for (const e of data.entries) {
    if (e.last_watched_at) {
      const d = e.last_watched_at.slice(0, 10);
      const day = ensure(d);
      if (day) {
        day.count += 1;
        if (e.media_type === "movie") day.movies += 1;
      }
    }
    if (e.user_rating != null && e.updated_at) {
      const d = e.updated_at.slice(0, 10);
      const day = ensure(d);
      if (day) {
        day.ratings += 1;
        day.count += 1;
      }
    }
  }

  for (const r of data.reviews) {
    const d = r.created_at.slice(0, 10);
    const day = ensure(d);
    if (day) {
      day.reviews += 1;
      day.count += 1;
    }
  }

  for (const n of data.notes) {
    const d = n.created_at.slice(0, 10);
    const day = ensure(d);
    if (day) {
      day.notes += 1;
      day.count += 1;
    }
  }

  for (const ep of data.episodeProgress) {
    if (!ep.watched_at) continue;
    const d = ep.watched_at.slice(0, 10);
    const day = ensure(d);
    if (day) {
      day.episodes += 1;
      day.count += 1;
    }
  }

  // Fill year for heatmap continuity
  const start = new Date(`${year}-01-01T12:00:00`);
  const end = new Date(`${year}-12-31T12:00:00`);
  const days: CalendarDay[] = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const key = d.toISOString().slice(0, 10);
    days.push(map.get(key) ?? emptyDay(key));
  }

  return days;
}
