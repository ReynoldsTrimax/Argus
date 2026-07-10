import { describe, expect, it } from "vitest";

import { computeUserStats, formatWatchHours } from "@/lib/intelligence/stats-engine";
import type { IntelligenceRawData } from "@/lib/intelligence/load-profile";
import type { LibraryEntry } from "@/types/library";

function entry(partial: Partial<LibraryEntry> & Pick<LibraryEntry, "id" | "title">): LibraryEntry {
  return {
    user_id: "u1",
    provider: "tmdb",
    media_type: "movie",
    external_id: partial.id,
    original_title: null,
    poster_path: null,
    backdrop_path: null,
    release_date: "2020-01-01",
    overview: null,
    runtime_minutes: 120,
    status: "completed",
    is_favorite: false,
    is_hidden: false,
    is_pinned: false,
    is_archived: false,
    progress_percent: 100,
    movie_progress_minutes: null,
    current_season: null,
    current_episode: null,
    episodes_watched: 0,
    total_episodes: null,
    started_at: null,
    completed_at: "2024-06-01T12:00:00Z",
    last_watched_at: "2024-06-01T12:00:00Z",
    rewatch_count: 0,
    user_rating: 8,
    rating_scale: "ten",
    metadata: { genres: ["Drama"] },
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-06-01T12:00:00Z",
    ...partial,
  };
}

const empty: IntelligenceRawData = {
  entries: [],
  sessions: [],
  reviews: [],
  notes: [],
  tags: [],
  tagAssignments: [],
  collections: [],
  activity: [],
  episodeProgress: [],
};

describe("computeUserStats", () => {
  it("returns zeros for empty library", () => {
    const stats = computeUserStats(empty);
    expect(stats.totals.librarySize).toBe(0);
    expect(stats.totals.moviesWatched).toBe(0);
    expect(stats.streaks.current).toBe(0);
  });

  it("counts completed movies and ratings", () => {
    const data: IntelligenceRawData = {
      ...empty,
      entries: [
        entry({ id: "1", title: "Film A", user_rating: 9 }),
        entry({
          id: "2",
          title: "Film B",
          status: "watching",
          progress_percent: 40,
          user_rating: null,
        }),
      ],
    };
    const stats = computeUserStats(data);
    expect(stats.totals.librarySize).toBe(2);
    expect(stats.totals.moviesWatched).toBe(1);
    expect(stats.totals.ratingsCount).toBe(1);
    expect(stats.totals.averageRating).toBe(9);
    expect(stats.distributions.genres[0]?.name).toBe("Drama");
  });
});

describe("formatWatchHours", () => {
  it("formats minutes as hours and minutes", () => {
    expect(formatWatchHours(90)).toBe("1h 30m");
    expect(formatWatchHours(60)).toBe("1h");
    expect(formatWatchHours(45)).toBe("45m");
  });
});
