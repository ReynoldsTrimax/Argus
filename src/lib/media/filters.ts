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

/**
 * Parse URL search params into MediaDiscoverFilters.
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
    : defaults.sortBy ?? "popularity.desc";

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

  return filters;
}
