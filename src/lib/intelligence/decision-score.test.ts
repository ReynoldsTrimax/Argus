import { describe, expect, it } from "vitest";

import { computeDecisionScore } from "@/lib/intelligence/decision-score";
import { computeUserStats } from "@/lib/intelligence/stats-engine";
import type { IntelligenceRawData } from "@/lib/intelligence/load-profile";

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

describe("computeDecisionScore", () => {
  it("returns a bounded score with reasons", () => {
    const stats = computeUserStats(empty);
    const result = computeDecisionScore(
      {
        title: "Test Movie",
        mediaType: "movie",
        genres: [{ id: "1", name: "Action" }],
        voteAverage: 8.2,
        popularity: 80,
        runtime: 110,
        releaseDate: "2020-01-01",
        overview: "A thrilling adventure across the stars and galaxies.",
        crew: [{ id: "9", name: "Jane Doe", job: "Director", profilePath: null }],
      },
      stats,
      [],
    );

    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.reasons.length).toBeGreaterThan(0);
    expect(result.summary.length).toBeGreaterThan(0);
  });

  it("penalizes already completed titles", () => {
    const stats = computeUserStats(empty);
    const library = [
      {
        id: "e1",
        user_id: "u",
        provider: "tmdb",
        media_type: "movie" as const,
        external_id: "1",
        title: "Done Film",
        original_title: null,
        poster_path: null,
        backdrop_path: null,
        release_date: null,
        overview: null,
        runtime_minutes: 100,
        status: "completed" as const,
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
        completed_at: null,
        last_watched_at: null,
        rewatch_count: 0,
        user_rating: 7,
        rating_scale: "ten" as const,
        metadata: {},
        created_at: "",
        updated_at: "",
      },
    ];

    const result = computeDecisionScore(
      {
        title: "Done Film",
        mediaType: "movie",
        genres: [],
        voteAverage: 7,
      },
      stats,
      library,
    );

    expect(result.reasons.some((r) => !r.positive && r.label.includes("completed"))).toBe(
      true,
    );
  });
});
