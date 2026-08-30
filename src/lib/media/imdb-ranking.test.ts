import { describe, expect, it } from "vitest";

import type { MediaSummary } from "@/types/media";

import {
  CREDIBILITY_VOTE_FLOOR,
  credibilityFloorFor,
  parseDiscoverFilters,
} from "./filters";
import { rankByImdbRating, type ImdbRating } from "./imdb";

/* -------------------------------------------------------------------------- */
/* Vote floors                                                                */
/* -------------------------------------------------------------------------- */

describe("credibilityFloorFor", () => {
  it("applies no floor to sorts that do not depend on ratings", () => {
    expect(credibilityFloorFor({ sortBy: "popularity.desc" }, "movie")).toBeUndefined();
    expect(credibilityFloorFor({ sortBy: "release_date.desc" }, "tv")).toBeUndefined();
    expect(credibilityFloorFor({ sortBy: "title.asc" }, "movie")).toBeUndefined();
  });

  it("uses the broad floor for an unfiltered rating sort", () => {
    expect(credibilityFloorFor({ sortBy: "vote_average.desc" }, "movie")).toBe(
      CREDIBILITY_VOTE_FLOOR.broad.movie,
    );
    expect(credibilityFloorFor({ sortBy: "vote_average.desc" }, "tv")).toBe(
      CREDIBILITY_VOTE_FLOOR.broad.tv,
    );
  });

  it("drops to the lower floor once any filter narrows the pool", () => {
    // A broad floor returns zero documentary films, so narrowing must relax it.
    const narrowing = [
      { genreIds: ["99"] },
      { year: 1994 },
      { yearGte: 1990 },
      { language: "ja" },
      { runtimeGte: 150 },
      { voteAverageGte: 8 },
    ];

    for (const extra of narrowing) {
      expect(
        credibilityFloorFor({ sortBy: "vote_average.desc", ...extra }, "movie"),
      ).toBe(CREDIBILITY_VOTE_FLOOR.filtered.movie);
    }
  });

  it("keeps the broad floor above the filtered floor", () => {
    expect(CREDIBILITY_VOTE_FLOOR.broad.movie).toBeGreaterThan(
      CREDIBILITY_VOTE_FLOOR.filtered.movie,
    );
    expect(CREDIBILITY_VOTE_FLOOR.broad.tv).toBeGreaterThan(0);
  });
});

describe("parseDiscoverFilters", () => {
  it("defaults to the rating sort so the first page is what people expect", () => {
    expect(parseDiscoverFilters({}, { mediaType: "tv" }).sortBy).toBe(
      "vote_average.desc",
    );
  });

  it("attaches a vote floor to the default sort", () => {
    const filters = parseDiscoverFilters({}, { mediaType: "tv" });
    expect(filters.voteCountGte).toBe(CREDIBILITY_VOTE_FLOOR.broad.tv);
  });

  it("attaches no floor when the user picks trending", () => {
    const filters = parseDiscoverFilters(
      { sort: "popularity.desc" },
      { mediaType: "movie" },
    );
    expect(filters.sortBy).toBe("popularity.desc");
    expect(filters.voteCountGte).toBeUndefined();
  });

  it("relaxes the floor when a genre is selected", () => {
    const filters = parseDiscoverFilters({ genre: "99" }, { mediaType: "movie" });
    expect(filters.voteCountGte).toBe(CREDIBILITY_VOTE_FLOOR.filtered.movie);
  });

  it("respects a floor the caller already set", () => {
    const filters = parseDiscoverFilters({}, { mediaType: "movie", voteCountGte: 42 });
    expect(filters.voteCountGte).toBe(42);
  });

  it("ignores an unknown sort value rather than passing it upstream", () => {
    expect(
      parseDiscoverFilters({ sort: "'; DROP TABLE" }, { mediaType: "movie" }).sortBy,
    ).toBe("vote_average.desc");
  });

  it("still parses the existing filter params", () => {
    const filters = parseDiscoverFilters(
      {
        year: "1994",
        language: "ja",
        genre: "18",
        runtime: "long",
        rating: "8",
        page: "3",
      },
      { mediaType: "movie" },
    );
    expect(filters.year).toBe(1994);
    expect(filters.language).toBe("ja");
    expect(filters.genreIds).toEqual(["18"]);
    expect(filters.runtimeGte).toBe(150);
    expect(filters.voteAverageGte).toBe(8);
    expect(filters.page).toBe(3);
  });
});

/* -------------------------------------------------------------------------- */
/* IMDb ranking                                                               */
/* -------------------------------------------------------------------------- */

function summary(id: string, title: string): MediaSummary {
  return {
    id,
    mediaType: "movie",
    title,
    posterPath: `/p-${id}.jpg`,
    backdropPath: null,
    releaseDate: "2000-01-01",
    voteAverage: 7,
    voteCount: 1000,
  };
}

function rating(imdbId: string, value: number | null, votes = 1000): ImdbRating {
  return { imdbId, rating: value, votes };
}

describe("rankByImdbRating", () => {
  it("orders by IMDb rating, not by the incoming order", () => {
    const items = [summary("1", "Mid"), summary("2", "Best"), summary("3", "Worst")];
    const ratings = new Map([
      ["movie:1", rating("tt1", 8.1)],
      ["movie:2", rating("tt2", 9.3)],
      ["movie:3", rating("tt3", 6.4)],
    ]);

    expect(rankByImdbRating(items, ratings).map((r) => r.item.title)).toEqual([
      "Best",
      "Mid",
      "Worst",
    ]);
  });

  it("keeps unrated titles instead of dropping them, at the bottom", () => {
    const items = [summary("1", "Unrated"), summary("2", "Rated")];
    const ratings = new Map([["movie:2", rating("tt2", 8)]]);

    const ranked = rankByImdbRating(items, ratings);
    expect(ranked).toHaveLength(2);
    expect(ranked.map((r) => r.item.title)).toEqual(["Rated", "Unrated"]);
    expect(ranked[1]!.imdb).toBeNull();
  });

  it("preserves original order among unrated titles", () => {
    const items = [summary("1", "A"), summary("2", "B"), summary("3", "C")];
    expect(rankByImdbRating(items, new Map()).map((r) => r.item.title)).toEqual([
      "A",
      "B",
      "C",
    ]);
  });

  it("breaks equal ratings on vote count", () => {
    const items = [summary("1", "Fewer"), summary("2", "More")];
    const ratings = new Map([
      ["movie:1", rating("tt1", 8.5, 500)],
      ["movie:2", rating("tt2", 8.5, 900_000)],
    ]);
    expect(rankByImdbRating(items, ratings)[0]!.item.title).toBe("More");
  });

  it("is deterministic when rating and votes both tie", () => {
    const items = [summary("zzz", "Z"), summary("aaa", "A")];
    const ratings = new Map([
      ["movie:zzz", rating("tt1", 8, 100)],
      ["movie:aaa", rating("tt2", 8, 100)],
    ]);
    const first = rankByImdbRating(items, ratings).map((r) => r.item.id);
    const second = rankByImdbRating([...items].reverse(), ratings).map((r) => r.item.id);
    expect(first).toEqual(second);
    expect(first[0]).toBe("aaa");
  });

  it("returns an empty list for empty input", () => {
    expect(rankByImdbRating([], new Map())).toEqual([]);
  });
});
