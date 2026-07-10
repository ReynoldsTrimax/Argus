/**
 * Multi-source ratings assembly (TMDB + OMDb → IMDb / RT / Metacritic).
 */

import type { MediaRating } from "@/types/media";
import {
  fetchOmdbByImdbId,
  fetchOmdbByTitle,
  isOmdbConfigured,
  type OmdbResponse,
} from "@/lib/media/providers/omdb/client";

function parseNumber(raw: string | undefined | null): number | null {
  if (!raw || raw === "N/A") return null;
  const cleaned = raw.replace(/[^0-9.]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function parseVotes(raw: string | undefined | null): number | null {
  if (!raw || raw === "N/A") return null;
  const n = Number(raw.replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

function parsePercent(raw: string | undefined | null): number | null {
  if (!raw || raw === "N/A") return null;
  // "87%" or "87/100"
  const m = raw.match(/(\d+(?:\.\d+)?)/);
  if (!m) return null;
  return Number(m[1]);
}

function mapTmdbRating(
  voteAverage?: number | null,
  voteCount?: number | null,
): MediaRating {
  return {
    provider: "tmdb",
    label: "TMDB",
    value: voteAverage != null ? Math.round(voteAverage * 10) / 10 : null,
    scale: 10,
    count: voteCount ?? null,
  };
}

function ratingsFromOmdb(data: OmdbResponse): MediaRating[] {
  const list: MediaRating[] = [];

  const imdbFromField = parseNumber(data.imdbRating);
  const imdbFromArray = data.Ratings?.find(
    (r) => r.Source === "Internet Movie Database",
  );
  const imdbValue =
    imdbFromField ??
    (imdbFromArray ? parseNumber(imdbFromArray.Value.split("/")[0]) : null);

  list.push({
    provider: "imdb",
    label: "IMDb",
    value: imdbValue,
    scale: 10,
    count: parseVotes(data.imdbVotes),
    url: data.imdbID ? `https://www.imdb.com/title/${data.imdbID}/` : null,
  });

  const rt = data.Ratings?.find((r) => r.Source === "Rotten Tomatoes");
  const rtCritic = rt ? parsePercent(rt.Value) : null;

  list.push({
    provider: "rotten_tomatoes",
    label: "Rotten Tomatoes",
    value: rtCritic,
    scale: 100,
    url: null,
  });

  const metaFromField = parseNumber(data.Metascore);
  const metaFromArray = data.Ratings?.find((r) => r.Source === "Metacritic");
  const metaValue =
    metaFromField ??
    (metaFromArray ? parsePercent(metaFromArray.Value) : null);

  list.push({
    provider: "metacritic",
    label: "Metacritic",
    value: metaValue,
    scale: 100,
  });

  return list;
}

function placeholderExternalRatings(): MediaRating[] {
  return [
    { provider: "imdb", label: "IMDb", value: null, scale: 10 },
    {
      provider: "rotten_tomatoes",
      label: "Rotten Tomatoes",
      value: null,
      scale: 100,
    },
    { provider: "metacritic", label: "Metacritic", value: null, scale: 100 },
  ];
}

/**
 * TMDB-only modular list (used during mapping before async OMDb enrich).
 */
export function buildBaseRatings(
  voteAverage?: number | null,
  voteCount?: number | null,
): MediaRating[] {
  return [mapTmdbRating(voteAverage, voteCount), ...placeholderExternalRatings()];
}

export interface EnrichRatingsInput {
  imdbId?: string | null;
  title: string;
  releaseDate?: string | null;
  mediaType: "movie" | "tv";
  voteAverage?: number | null;
  voteCount?: number | null;
}

/**
 * Returns TMDB + live IMDb / RT / Metacritic when OMDb is configured.
 */
export async function enrichRatings(
  input: EnrichRatingsInput,
): Promise<MediaRating[]> {
  const base = mapTmdbRating(input.voteAverage, input.voteCount);

  if (!isOmdbConfigured()) {
    return [base, ...placeholderExternalRatings()];
  }

  let omdb: OmdbResponse | null = null;
  if (input.imdbId) {
    omdb = await fetchOmdbByImdbId(input.imdbId);
  }
  if (!omdb) {
    omdb = await fetchOmdbByTitle(
      input.title,
      input.releaseDate,
      input.mediaType === "tv" ? "series" : "movie",
    );
  }

  if (!omdb) {
    return [base, ...placeholderExternalRatings()];
  }

  const external = ratingsFromOmdb(omdb);
  // Prefer live values; keep order TMDB → IMDb → RT → Metacritic
  return [base, ...external];
}
