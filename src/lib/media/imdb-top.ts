/**
 * The "Top Rated" shelf on /movies and /tv, ordered by IMDb score.
 *
 * ## What this is, and what it is not
 *
 * IMDb publishes no free API for its Top 250, so this is **not** a mirror of
 * that list. It is Argus's own top-rated pool — TMDB's rating sort with a
 * credibility vote floor, which already puts Shawshank and Breaking Bad on page
 * one — with the *displayed rating and the ordering* taken from IMDb.
 *
 * The distinction matters because the two disagree in places: TMDB's audience
 * skews toward fandom voting, which is why its top documentary is a Selena Gomez
 * concert film. Re-ranking by IMDb corrects exactly that.
 *
 * ## Cost
 *
 * The candidate pool is `POOL_SIZE` titles, fetched from TMDB once and cached
 * for a day. Ranking is then done a page at a time: each page of `PAGE_SIZE`
 * costs at most `PAGE_SIZE` TMDB id lookups plus `PAGE_SIZE` OMDb calls, both
 * cached for a day. Ranking all 250 at once would need 250 OMDb calls before
 * first paint — a quarter of the free daily quota, and a page that takes a
 * minute to appear.
 *
 * The consequence, stated plainly: ordering is exact within a page, and the
 * page boundaries follow the TMDB pool. Warming every page makes the whole
 * shelf IMDb-ordered.
 */

import type { MediaSummary, PaginatedResult } from "@/types/media";
import { getMediaProvider } from "@/lib/media/providers";
import { TtlCache } from "@/lib/recommendations/cache";

import { CREDIBILITY_VOTE_FLOOR } from "./filters";
import {
  fetchImdbRatings,
  isImdbConfigured,
  rankByImdbRating,
  type ImdbRankedItem,
} from "./imdb";

/** Titles in the shelf. Matches the length people expect from a "top" list. */
export const POOL_SIZE = 250;
/** Titles per page. Also the per-request OMDb ceiling. */
export const PAGE_SIZE = 25;

const TTL_MS = 24 * 60 * 60 * 1000;
const poolCache = new TtlCache(16);

/** TMDB returns 20 per discover page. */
const TMDB_PAGE = 20;

export interface ImdbTopResult {
  items: ImdbRankedItem[];
  page: number;
  totalPages: number;
  totalResults: number;
  /** False when OMDb is unconfigured — the shelf then shows TMDB order. */
  imdbEnabled: boolean;
}

/**
 * The credibility-floored top-rated pool for a media type.
 *
 * Deduped by id: TMDB occasionally repeats a title across discover pages when
 * scores tie, and a duplicate in a ranked list reads as a bug.
 */
async function loadPool(mediaType: "movie" | "tv"): Promise<MediaSummary[]> {
  return poolCache.resolve(`pool:${mediaType}`, TTL_MS, async () => {
    const provider = getMediaProvider();
    const discover =
      mediaType === "movie"
        ? provider.discoverMovies.bind(provider)
        : provider.discoverTv.bind(provider);

    const pages = Math.ceil(POOL_SIZE / TMDB_PAGE);
    const requests: Promise<PaginatedResult<MediaSummary>>[] = [];

    for (let page = 1; page <= pages; page++) {
      requests.push(
        discover({
          mediaType,
          sortBy: "vote_average.desc",
          voteCountGte: CREDIBILITY_VOTE_FLOOR.broad[mediaType],
          page,
        }).catch(() => ({ page, totalPages: 0, totalResults: 0, results: [] })),
      );
    }

    const settled = await Promise.all(requests);
    const seen = new Set<string>();
    const pool: MediaSummary[] = [];

    for (const result of settled) {
      for (const item of result.results) {
        if (seen.has(item.id)) continue;
        seen.add(item.id);
        if (!item.posterPath) continue;
        pool.push(item);
        if (pool.length >= POOL_SIZE) break;
      }
      if (pool.length >= POOL_SIZE) break;
    }

    return pool;
  });
}

/**
 * One page of the top-rated shelf, ordered by IMDb rating.
 *
 * Degrades rather than fails: with OMDb unconfigured or unreachable the pool is
 * returned in TMDB order and `imdbEnabled` is false, so the page can say what it
 * is showing instead of implying an IMDb ranking it did not get.
 */
export async function getImdbTopRated(
  mediaType: "movie" | "tv",
  page = 1,
): Promise<ImdbTopResult> {
  const pool = await loadPool(mediaType);
  const totalPages = Math.max(1, Math.ceil(pool.length / PAGE_SIZE));
  const current = Math.min(Math.max(1, page), totalPages);

  const start = (current - 1) * PAGE_SIZE;
  const slice = pool.slice(start, start + PAGE_SIZE);

  if (!isImdbConfigured()) {
    return {
      items: slice.map((item) => ({ item, imdb: null })),
      page: current,
      totalPages,
      totalResults: pool.length,
      imdbEnabled: false,
    };
  }

  const ratings = await fetchImdbRatings(slice, PAGE_SIZE);

  return {
    items: rankByImdbRating(slice, ratings),
    page: current,
    totalPages,
    totalResults: pool.length,
    imdbEnabled: ratings.size > 0,
  };
}
