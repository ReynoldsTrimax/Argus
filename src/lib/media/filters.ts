import type { MediaDiscoverFilters, MediaSortBy } from "@/types/media";

const SORT_VALUES: MediaSortBy[] = [
  "popularity.desc",
  "popularity.asc",
  "release_date.desc",
  "release_date.asc",
  "vote_average.desc",
  "vote_average.asc",
  "title.asc",
  "title.desc",
  "runtime.desc",
  "runtime.asc",
];

/** Sorts whose output is meaningless without a minimum vote count. */
const RATING_SORTS: MediaSortBy[] = ["vote_average.desc", "vote_average.asc"];

/**
 * Minimum audience votes before a title's score is treated as credible.
 *
 * Measured against the live catalog rather than guessed. With no floor,
 * `vote_average.desc` returns a page of one-vote 10.0 titles. The `broad`
 * numbers are the point where page one becomes the list people expect —
 * Shawshank first for films, Breaking Bad first for series.
 *
 * `filtered` exists because a broad floor starves narrow queries: at 5,000
 * votes TMDB returns *zero* documentary films, and at 2,000 it returns one. Any
 * genre, year, language or runtime filter shrinks the pool enough that the
 * credibility bar has to come down with it, or the page is simply empty.
 */
export const CREDIBILITY_VOTE_FLOOR = {
  broad: { movie: 5000, tv: 1000 },
  filtered: { movie: 500, tv: 500 },
} as const;

/** Filters that narrow the pool enough to require the lower floor. */
function isNarrowed(filters: MediaDiscoverFilters): boolean {
  return Boolean(
    filters.genreIds?.length ||
    filters.year ||
    filters.yearGte ||
    filters.yearLte ||
    filters.language ||
    filters.runtimeGte ||
    filters.runtimeLte ||
    filters.voteAverageGte,
  );
}

/**
 * The vote floor to apply for a given sort and filter combination, or
 * `undefined` when the sort does not depend on ratings.
 */
export function credibilityFloorFor(
  filters: MediaDiscoverFilters,
  mediaType: "movie" | "tv",
): number | undefined {
  if (!filters.sortBy || !RATING_SORTS.includes(filters.sortBy)) return undefined;
  const tier = isNarrowed(filters)
    ? CREDIBILITY_VOTE_FLOOR.filtered
    : CREDIBILITY_VOTE_FLOOR.broad;
  return tier[mediaType];
}

/**
 * Parse URL search params into MediaDiscoverFilters.
 *
 * A rating sort automatically gains a vote floor unless the caller already set
 * one. Callers that want raw provider ordering can pass `voteCountGte: 0`.
 */
export function parseDiscoverFilters(
  params: Record<string, string | string[] | undefined>,
  defaults: Partial<MediaDiscoverFilters> = {},
): MediaDiscoverFilters {
  const get = (key: string) => {
    const v = params[key];
    return Array.isArray(v) ? v[0] : v;
  };

  const sortRaw = get("sort");
  const sortBy = SORT_VALUES.includes(sortRaw as MediaSortBy)
    ? (sortRaw as MediaSortBy)
    : (defaults.sortBy ?? "vote_average.desc");

  const year = get("year");
  const rating = get("rating");
  const language = get("language");
  const genre = get("genre");
  const page = get("page");
  const runtime = get("runtime");

  const filters: MediaDiscoverFilters = {
    ...defaults,
    sortBy,
    page: page ? Math.max(1, Number(page) || 1) : 1,
  };

  if (year && year !== "all") filters.year = Number(year);
  if (language && language !== "all") filters.language = language;
  if (genre && genre !== "all") {
    filters.genreIds = [genre];
  }
  if (rating && rating !== "all") {
    filters.voteAverageGte = Number(rating);
  }
  if (runtime === "short") {
    filters.runtimeLte = 90;
  } else if (runtime === "medium") {
    filters.runtimeGte = 90;
    filters.runtimeLte = 150;
  } else if (runtime === "long") {
    filters.runtimeGte = 150;
  }

  if (filters.voteCountGte == null) {
    const floor = credibilityFloorFor(filters, filters.mediaType ?? "movie");
    if (floor != null) filters.voteCountGte = floor;
  }

  return filters;
}
