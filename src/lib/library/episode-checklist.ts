/**
 * Pure helpers behind the season/episode checklist.
 *
 * Kept out of the component so the tri-state rollup can be tested directly:
 * "some of this season" versus "all of it" drives both what the user sees and
 * which way the next tap goes, and it is easy to get wrong at the boundaries
 * (empty seasons, specials, missing episode counts).
 */

/** Three-way watched state: none, some, all. */
export type ChecklistToggleState = boolean | "mixed";

export interface ChecklistSeason {
  seasonNumber: number;
  name: string;
  episodeCount: number | null;
}

/** Stable identity for one episode within a show. */
export function episodeKey(seasonNumber: number, episodeNumber: number): string {
  return `${seasonNumber}:${episodeNumber}`;
}

/**
 * Episode numbers for a season, derived from its count rather than fetched.
 *
 * The checklist renders numbers only, so season metadata already on the page is
 * sufficient; fetching would cost one request per expanded season for data that
 * would go unused.
 */
export function episodeNumbersForSeason(season: ChecklistSeason): number[] {
  const count = season.episodeCount ?? 0;
  if (count <= 0) return [];
  return Array.from({ length: count }, (_, i) => i + 1);
}

/**
 * Seasons the checklist can act on.
 *
 * A season with no known episode count has nothing to toggle — showing it would
 * offer a control that cannot resolve to a real set of episodes.
 */
export function trackedSeasons(seasons: ChecklistSeason[]): ChecklistSeason[] {
  return seasons.filter((s) => (s.episodeCount ?? 0) > 0);
}

/** Collapses a watched/total pair into the three-way state. */
export function rollupState(watched: number, total: number): ChecklistToggleState {
  if (total <= 0 || watched <= 0) return false;
  if (watched >= total) return true;
  return "mixed";
}

export function seasonToggleState(
  season: ChecklistSeason,
  isWatched: (seasonNumber: number, episodeNumber: number) => boolean,
): ChecklistToggleState {
  const numbers = episodeNumbersForSeason(season);
  let watched = 0;
  for (const n of numbers) {
    if (isWatched(season.seasonNumber, n)) watched += 1;
  }
  return rollupState(watched, numbers.length);
}

export function allEpisodesToggleState(
  seasons: ChecklistSeason[],
  isWatched: (seasonNumber: number, episodeNumber: number) => boolean,
): ChecklistToggleState {
  let total = 0;
  let watched = 0;
  for (const season of trackedSeasons(seasons)) {
    for (const n of episodeNumbersForSeason(season)) {
      total += 1;
      if (isWatched(season.seasonNumber, n)) watched += 1;
    }
  }
  return rollupState(watched, total);
}
