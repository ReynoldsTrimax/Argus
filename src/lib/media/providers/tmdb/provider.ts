/**
 * TMDB implementation of MediaProvider.
 */

import type {
  CollectionDetails,
  Genre,
  MediaDiscoverFilters,
  MediaSummary,
  MovieDetails,
  PaginatedResult,
  PersonDetails,
  SearchResponse,
  StreamingAvailability,
  TvDetails,
  TvSeason,
} from "@/types/media";
import type { MediaProvider } from "@/lib/media/providers/types";

import { isTmdbConfigured, tmdbFetch } from "./client";
import {
  mapCollection,
  mapGenre,
  mapMediaSummary,
  mapMovieDetails,
  mapPaginated,
  mapPersonDetails,
  mapSearchResponse,
  mapSeason,
  mapTvDetails,
  mapWatchProviders,
} from "./mappers";
import type {
  TmdbCollectionDetails,
  TmdbGenre,
  TmdbMovieDetails,
  TmdbMovieListItem,
  TmdbMultiResult,
  TmdbPaginated,
  TmdbPersonDetails,
  TmdbSeasonDetails,
  TmdbTvDetails,
  TmdbWatchProviders,
} from "./types";

const MOVIE_APPEND =
  "credits,images,videos,recommendations,similar,keywords,release_dates,watch/providers,external_ids";
const TV_APPEND =
  "credits,images,videos,recommendations,similar,keywords,content_ratings,watch/providers,external_ids";
const PERSON_APPEND = "combined_credits,images,external_ids";

function sortParam(filters: MediaDiscoverFilters): string {
  const map: Record<string, string> = {
    "popularity.desc": "popularity.desc",
    "popularity.asc": "popularity.asc",
    "release_date.desc": "primary_release_date.desc",
    "release_date.asc": "primary_release_date.asc",
    "vote_average.desc": "vote_average.desc",
    "vote_average.asc": "vote_average.asc",
    "title.asc": "original_title.asc",
    "title.desc": "original_title.desc",
    "runtime.desc": "runtime.desc",
    "runtime.asc": "runtime.asc",
  };
  return map[filters.sortBy ?? "popularity.desc"] ?? "popularity.desc";
}

function tvSortParam(filters: MediaDiscoverFilters): string {
  const map: Record<string, string> = {
    "popularity.desc": "popularity.desc",
    "popularity.asc": "popularity.asc",
    "release_date.desc": "first_air_date.desc",
    "release_date.asc": "first_air_date.asc",
    "vote_average.desc": "vote_average.desc",
    "vote_average.asc": "vote_average.asc",
    "title.asc": "original_name.asc",
    "title.desc": "original_name.desc",
  };
  return map[filters.sortBy ?? "popularity.desc"] ?? "popularity.desc";
}

export class TmdbMediaProvider implements MediaProvider {
  readonly config = {
    id: "tmdb",
    name: "The Movie Database",
  } as const;

  private genreCache: { movie: Genre[]; tv: Genre[] } | null = null;

  async search(query: string, options?: { page?: number }): Promise<SearchResponse> {
    const q = query.trim();
    if (!q) {
      return { query: q, results: [], totalResults: 0 };
    }

    const page = options?.page ?? 1;
    const [multi, collections, companies, genres] = await Promise.all([
      tmdbFetch<TmdbPaginated<TmdbMultiResult>>("/search/multi", {
        query: q,
        page,
        include_adult: false,
      }),
      tmdbFetch<TmdbPaginated<{ id: number; name: string; poster_path: string | null }>>(
        "/search/collection",
        { query: q, page: 1 },
      ),
      tmdbFetch<TmdbPaginated<{ id: number; name: string; logo_path: string | null }>>(
        "/search/company",
        { query: q, page: 1 },
      ),
      this.getAllGenres(),
    ]);

    return mapSearchResponse(
      q,
      multi ?? { page: 1, results: [], total_pages: 0, total_results: 0 },
      collections,
      companies,
      genres,
    );
  }

  async getMovie(id: string): Promise<MovieDetails | null> {
    const raw = await tmdbFetch<TmdbMovieDetails>(`/movie/${id}`, {
      append_to_response: MOVIE_APPEND,
      include_image_language: "en,null",
    });
    return raw ? mapMovieDetails(raw) : null;
  }

  async getTvShow(id: string): Promise<TvDetails | null> {
    const raw = await tmdbFetch<TmdbTvDetails>(`/tv/${id}`, {
      append_to_response: TV_APPEND,
      include_image_language: "en,null",
    });
    return raw ? mapTvDetails(raw) : null;
  }

  async getTvSeason(showId: string, seasonNumber: number): Promise<TvSeason | null> {
    const raw = await tmdbFetch<TmdbSeasonDetails>(
      `/tv/${showId}/season/${seasonNumber}`,
    );
    return raw ? mapSeason(raw) : null;
  }

  async getPerson(id: string): Promise<PersonDetails | null> {
    const raw = await tmdbFetch<TmdbPersonDetails>(`/person/${id}`, {
      append_to_response: PERSON_APPEND,
    });
    return raw ? mapPersonDetails(raw) : null;
  }

  async getCollection(id: string): Promise<CollectionDetails | null> {
    const raw = await tmdbFetch<TmdbCollectionDetails>(`/collection/${id}`);
    return raw ? mapCollection(raw) : null;
  }

  async getMovieGenres(): Promise<Genre[]> {
    const data = await tmdbFetch<{ genres: TmdbGenre[] }>("/genre/movie/list");
    return (data?.genres ?? []).map(mapGenre);
  }

  async getTvGenres(): Promise<Genre[]> {
    const data = await tmdbFetch<{ genres: TmdbGenre[] }>("/genre/tv/list");
    return (data?.genres ?? []).map(mapGenre);
  }

  private async getAllGenres(): Promise<Genre[]> {
    if (this.genreCache) {
      const map = new Map<string, Genre>();
      [...this.genreCache.movie, ...this.genreCache.tv].forEach((g) => map.set(g.id, g));
      return [...map.values()];
    }
    const [movie, tv] = await Promise.all([this.getMovieGenres(), this.getTvGenres()]);
    this.genreCache = { movie, tv };
    const map = new Map<string, Genre>();
    [...movie, ...tv].forEach((g) => map.set(g.id, g));
    return [...map.values()];
  }

  async getTrending(
    mediaType: "all" | "movie" | "tv" | "person" = "all",
    timeWindow: "day" | "week" = "day",
    page = 1,
  ): Promise<PaginatedResult<MediaSummary>> {
    const data = await tmdbFetch<TmdbPaginated<TmdbMovieListItem>>(
      `/trending/${mediaType}/${timeWindow}`,
      { page },
    );
    if (!data) {
      return emptyPage();
    }
    const results = data.results.filter((r) => r.media_type !== "person");
    return mapPaginated({ ...data, results }, (item) => mapMediaSummary(item));
  }

  async getPopularMovies(page = 1): Promise<PaginatedResult<MediaSummary>> {
    const data = await tmdbFetch<TmdbPaginated<TmdbMovieListItem>>("/movie/popular", {
      page,
    });
    return data
      ? mapPaginated(data, (i) => mapMediaSummary(i, "movie"))
      : emptyPage();
  }

  async getPopularTv(page = 1): Promise<PaginatedResult<MediaSummary>> {
    const data = await tmdbFetch<TmdbPaginated<TmdbMovieListItem>>("/tv/popular", {
      page,
    });
    return data ? mapPaginated(data, (i) => mapMediaSummary(i, "tv")) : emptyPage();
  }

  async getNowPlayingMovies(page = 1): Promise<PaginatedResult<MediaSummary>> {
    const data = await tmdbFetch<TmdbPaginated<TmdbMovieListItem>>("/movie/now_playing", {
      page,
    });
    return data
      ? mapPaginated(data, (i) => mapMediaSummary(i, "movie"))
      : emptyPage();
  }

  async getUpcomingMovies(page = 1): Promise<PaginatedResult<MediaSummary>> {
    const data = await tmdbFetch<TmdbPaginated<TmdbMovieListItem>>("/movie/upcoming", {
      page,
    });
    return data
      ? mapPaginated(data, (i) => mapMediaSummary(i, "movie"))
      : emptyPage();
  }

  async getTopRatedMovies(page = 1): Promise<PaginatedResult<MediaSummary>> {
    const data = await tmdbFetch<TmdbPaginated<TmdbMovieListItem>>("/movie/top_rated", {
      page,
    });
    return data
      ? mapPaginated(data, (i) => mapMediaSummary(i, "movie"))
      : emptyPage();
  }

  async getTopRatedTv(page = 1): Promise<PaginatedResult<MediaSummary>> {
    const data = await tmdbFetch<TmdbPaginated<TmdbMovieListItem>>("/tv/top_rated", {
      page,
    });
    return data ? mapPaginated(data, (i) => mapMediaSummary(i, "tv")) : emptyPage();
  }

  async discoverMovies(
    filters: MediaDiscoverFilters,
  ): Promise<PaginatedResult<MediaSummary>> {
    const data = await tmdbFetch<TmdbPaginated<TmdbMovieListItem>>("/discover/movie", {
      page: filters.page ?? 1,
      sort_by: sortParam(filters),
      with_genres: filters.genreIds?.join(","),
      primary_release_year: filters.year,
      "primary_release_date.gte": filters.yearGte
        ? `${filters.yearGte}-01-01`
        : undefined,
      "primary_release_date.lte": filters.yearLte
        ? `${filters.yearLte}-12-31`
        : undefined,
      with_original_language: filters.language,
      "with_runtime.gte": filters.runtimeGte,
      "with_runtime.lte": filters.runtimeLte,
      "vote_average.gte": filters.voteAverageGte,
      "vote_average.lte": filters.voteAverageLte,
      with_watch_providers: filters.watchProviderId,
      watch_region: filters.watchRegion ?? (filters.watchProviderId ? "US" : undefined),
      include_adult: false,
    });
    return data
      ? mapPaginated(data, (i) => mapMediaSummary(i, "movie"))
      : emptyPage();
  }

  async discoverTv(
    filters: MediaDiscoverFilters,
  ): Promise<PaginatedResult<MediaSummary>> {
    const data = await tmdbFetch<TmdbPaginated<TmdbMovieListItem>>("/discover/tv", {
      page: filters.page ?? 1,
      sort_by: tvSortParam(filters),
      with_genres: filters.genreIds?.join(","),
      first_air_date_year: filters.year,
      "first_air_date.gte": filters.yearGte ? `${filters.yearGte}-01-01` : undefined,
      "first_air_date.lte": filters.yearLte ? `${filters.yearLte}-12-31` : undefined,
      with_original_language: filters.language,
      "vote_average.gte": filters.voteAverageGte,
      "vote_average.lte": filters.voteAverageLte,
      with_watch_providers: filters.watchProviderId,
      watch_region: filters.watchRegion ?? (filters.watchProviderId ? "US" : undefined),
      include_adult: false,
    });
    return data ? mapPaginated(data, (i) => mapMediaSummary(i, "tv")) : emptyPage();
  }

  async getStreamingAvailability(
    mediaType: "movie" | "tv",
    id: string,
    region = "US",
  ): Promise<StreamingAvailability | null> {
    const path =
      mediaType === "movie"
        ? `/movie/${id}/watch/providers`
        : `/tv/${id}/watch/providers`;
    const data = await tmdbFetch<TmdbWatchProviders>(path);
    return mapWatchProviders(data ?? undefined, region);
  }
}

function emptyPage<T = MediaSummary>(): PaginatedResult<T> {
  return { page: 1, totalPages: 0, totalResults: 0, results: [] };
}

export function createTmdbProvider(): TmdbMediaProvider {
  if (!isTmdbConfigured()) {
    console.warn(
      "[Argus] TMDB credentials missing. Catalog endpoints will fail until configured.",
    );
  }
  return new TmdbMediaProvider();
}
