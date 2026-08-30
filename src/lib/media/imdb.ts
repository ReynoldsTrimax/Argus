/**
 * IMDb rating lookups for catalog lists.
 *
 * `enrichRatings` in `ratings.ts` serves detail pages: one title, three
 * providers, full rating objects. Ranking a list needs something different —
 * many titles, one number each, and a hard ceiling on request count — so this
 * module is separate rather than a loop over that one.
 *
 * ## Why two hops per title
 *
 * TMDB's discover and list endpoints do not return IMDb ids, and OMDb has no
 * TMDB id lookup. So a TMDB title becomes an IMDb rating via:
 *
 *   TMDB `/{type}/{id}/external_ids`  →  imdb_id  →  OMDb `?i=<imdb_id>`
 *
 * Matching by title+year instead would halve the calls but silently mismatch on
 * remakes and shared titles, which is exactly the kind of error that is
 * invisible in a ranked list. The TMDB half is cheap and generously
 * rate-limited; OMDb is the scarce resource (1,000/day on the free tier), so
 * that is what the batch ceiling protects.
 *
 * Both hops are cached for a day. Ratings move slowly and an IMDb id never
 * changes, so a warm cache serves a page with no upstream traffic at all.
 */

import { TtlCache } from "@/lib/recommendations/cache";
import { fetchOmdbByImdbId, isOmdbConfigured } from "@/lib/media/providers/omdb/client";
import { tmdbFetch } from "@/lib/media/providers/tmdb/client";
import type { MediaSummary } from "@/types/media";

/** IMDb ids and ratings are effectively static over a day. */
const TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Most OMDb lookups a single request may trigger.
 *
 * Sized to one page of results. The free tier is 1,000 calls/day, so an
 * uncapped batch over a large candidate pool would exhaust the quota in a
 * handful of page views and then silently return nothing.
 */
export const MAX_IMDB_LOOKUPS_PER_BATCH = 30;

const imdbCache = new TtlCache(4000);

export interface ImdbRating {
  imdbId: string;
  /** 0–10, or null when OMDb has no score for the title. */
  rating: number | null;
  /** Number of IMDb votes, or null when unknown. */
  votes: number | null;
}

interface TmdbExternalIds {
  imdb_id?: string | null;
}

function parseRating(raw: string | undefined): number | null {
  if (!raw || raw === "N/A") return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseVotes(raw: string | undefined): number | null {
  if (!raw || raw === "N/A") return null;
  const n = Number(raw.replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

/** TMDB id → IMDb id. Cached; returns null when TMDB has no mapping. */
async function resolveImdbId(
  mediaType: "movie" | "tv",
  tmdbId: string,
): Promise<string | null> {
  return imdbCache.resolve(`imdbid:${mediaType}:${tmdbId}`, TTL_MS, async () => {
    try {
      const data = await tmdbFetch<TmdbExternalIds>(
        `/${mediaType}/${tmdbId}/external_ids`,
      );
      const id = data?.imdb_id?.trim();
      return id && id.startsWith("tt") ? id : null;
    } catch {
      return null;
    }
  });
}

/** IMDb id → rating. Cached; returns null when OMDb has nothing usable. */
async function fetchRating(imdbId: string): Promise<ImdbRating | null> {
  return imdbCache.resolve(`rating:${imdbId}`, TTL_MS, async () => {
    const data = await fetchOmdbByImdbId(imdbId);
    if (!data) return null;
    return {
      imdbId,
      rating: parseRating(data.imdbRating),
      votes: parseVotes(data.imdbVotes),
    };
  });
}

/**
 * IMDb ratings for a list of catalog titles, keyed by `mediaType:tmdbId`.
 *
 * Titles beyond `MAX_IMDB_LOOKUPS_PER_BATCH` are skipped rather than queued —
 * a caller that wants more should paginate. Individual failures are omitted
 * from the map instead of throwing, so one dead lookup costs one rating and not
 * the whole page.
 */
export async function fetchImdbRatings(
  items: Pick<MediaSummary, "id" | "mediaType">[],
  limit = MAX_IMDB_LOOKUPS_PER_BATCH,
): Promise<Map<string, ImdbRating>> {
  const out = new Map<string, ImdbRating>();
  if (!isOmdbConfigured() || items.length === 0) return out;

  const slice = items.slice(0, Math.max(0, Math.min(limit, MAX_IMDB_LOOKUPS_PER_BATCH)));

  await Promise.all(
    slice.map(async (item) => {
      try {
        const imdbId = await resolveImdbId(item.mediaType, item.id);
        if (!imdbId) return;
        const rating = await fetchRating(imdbId);
        if (rating?.rating != null) {
          out.set(`${item.mediaType}:${item.id}`, rating);
        }
      } catch {
        // A single unreachable title should not blank the rest of the page.
      }
    }),
  );

  return out;
}

export function isImdbConfigured(): boolean {
  return isOmdbConfigured();
}

/* -------------------------------------------------------------------------- */
/* Ranking                                                                    */
/* -------------------------------------------------------------------------- */

export interface ImdbRankedItem {
  item: MediaSummary;
  /** Null when no IMDb rating could be resolved. */
  imdb: ImdbRating | null;
}

/**
 * Order titles by IMDb rating, highest first. Pure — the ratings are passed in.
 *
 * Titles with no resolved rating sink to the bottom in their original order
 * rather than being dropped: a missing IMDb id is a data gap, not a judgement
 * about the title, and silently shrinking the page would look like a bug.
 * Ties break on vote count then TMDB id so the order is stable across runs.
 */
export function rankByImdbRating(
  items: MediaSummary[],
  ratings: Map<string, ImdbRating>,
): ImdbRankedItem[] {
  return items
    .map((item, index) => ({
      item,
      imdb: ratings.get(`${item.mediaType}:${item.id}`) ?? null,
      index,
    }))
    .sort((a, b) => {
      const aRating = a.imdb?.rating;
      const bRating = b.imdb?.rating;

      if (aRating == null && bRating == null) return a.index - b.index;
      if (aRating == null) return 1;
      if (bRating == null) return -1;

      if (Math.abs(bRating - aRating) > 1e-9) return bRating - aRating;

      const aVotes = a.imdb?.votes ?? 0;
      const bVotes = b.imdb?.votes ?? 0;
      if (aVotes !== bVotes) return bVotes - aVotes;

      return a.item.id.localeCompare(b.item.id);
    })
    .map(({ item, imdb }) => ({ item, imdb }));
}
