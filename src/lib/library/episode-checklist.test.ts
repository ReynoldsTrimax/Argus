import { describe, expect, it } from "vitest";

import {
  allEpisodesToggleState,
  episodeKey,
  episodeNumbersForSeason,
  rollupState,
  seasonToggleState,
  trackedSeasons,
  type ChecklistSeason,
} from "./episode-checklist";

const season = (
  seasonNumber: number,
  episodeCount: number | null,
): ChecklistSeason => ({
  seasonNumber,
  name: seasonNumber === 0 ? "Specials" : `Season ${seasonNumber}`,
  episodeCount,
});

/** Treats an explicit list of "s:e" keys as the watched set. */
const watchedFrom = (keys: string[]) => {
  const set = new Set(keys);
  return (s: number, e: number) => set.has(episodeKey(s, e));
};

describe("episodeKey", () => {
  it("distinguishes season and episode positions", () => {
    expect(episodeKey(1, 2)).toBe("1:2");
    expect(episodeKey(1, 2)).not.toBe(episodeKey(2, 1));
  });
});

describe("episodeNumbersForSeason", () => {
  it("produces a 1-based run for a known count", () => {
    expect(episodeNumbersForSeason(season(1, 3))).toEqual([1, 2, 3]);
  });

  it("returns nothing when the count is unknown or empty", () => {
    expect(episodeNumbersForSeason(season(1, null))).toEqual([]);
    expect(episodeNumbersForSeason(season(1, 0))).toEqual([]);
  });
});

describe("trackedSeasons", () => {
  it("drops seasons with no toggleable episodes", () => {
    const result = trackedSeasons([season(1, 10), season(2, null), season(3, 0)]);
    expect(result.map((s) => s.seasonNumber)).toEqual([1]);
  });

  it("keeps specials when they have episodes", () => {
    const result = trackedSeasons([season(0, 1), season(1, 10)]);
    expect(result.map((s) => s.seasonNumber)).toEqual([0, 1]);
  });
});

describe("rollupState", () => {
  it("maps none, some, and all to the three states", () => {
    expect(rollupState(0, 10)).toBe(false);
    expect(rollupState(4, 10)).toBe("mixed");
    expect(rollupState(10, 10)).toBe(true);
  });

  it("treats an empty set as unwatched rather than complete", () => {
    // Guards the vacuous-truth trap: 0 of 0 must not read as "all watched",
    // which would render a filled toggle for a season with nothing in it.
    expect(rollupState(0, 0)).toBe(false);
  });

  it("clamps counts above the total", () => {
    expect(rollupState(12, 10)).toBe(true);
  });
});

describe("seasonToggleState", () => {
  it("is false when no episode is watched", () => {
    expect(seasonToggleState(season(1, 3), watchedFrom([]))).toBe(false);
  });

  it("is mixed on partial progress", () => {
    expect(seasonToggleState(season(1, 3), watchedFrom(["1:2"]))).toBe("mixed");
  });

  it("is true only when every episode is watched", () => {
    const all = watchedFrom(["1:1", "1:2", "1:3"]);
    expect(seasonToggleState(season(1, 3), all)).toBe(true);
  });

  it("ignores watched episodes belonging to other seasons", () => {
    expect(seasonToggleState(season(2, 2), watchedFrom(["1:1", "1:2"]))).toBe(false);
  });

  it("is false for a season with an unknown episode count", () => {
    expect(seasonToggleState(season(1, null), watchedFrom(["1:1"]))).toBe(false);
  });
});

describe("allEpisodesToggleState", () => {
  const seasons = [season(1, 2), season(2, 3)];

  it("is false with nothing watched", () => {
    expect(allEpisodesToggleState(seasons, watchedFrom([]))).toBe(false);
  });

  it("is mixed when one full season of several is watched", () => {
    // The scenario that motivated the feature: season 1 done, rest untouched.
    expect(allEpisodesToggleState(seasons, watchedFrom(["1:1", "1:2"]))).toBe("mixed");
  });

  it("is true when every episode across every season is watched", () => {
    const all = watchedFrom(["1:1", "1:2", "2:1", "2:2", "2:3"]);
    expect(allEpisodesToggleState(seasons, all)).toBe(true);
  });

  it("excludes untrackable seasons from the total", () => {
    // Season 3 has no count, so a fully watched 1 and 2 still reads as complete
    // rather than being held at "mixed" by episodes that cannot be toggled.
    const withUnknown = [...seasons, season(3, null)];
    const all = watchedFrom(["1:1", "1:2", "2:1", "2:2", "2:3"]);
    expect(allEpisodesToggleState(withUnknown, all)).toBe(true);
  });

  it("is false when there is nothing trackable at all", () => {
    expect(allEpisodesToggleState([season(1, null)], watchedFrom(["1:1"]))).toBe(false);
  });
});
