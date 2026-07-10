/**
 * Media provider adapter contract.
 *
 * Implementations (TMDB, Watchmode, …) fulfill this interface.
 * Application code should depend on MediaProvider, not vendor SDKs.
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

export interface MediaProviderConfig {
  /** Human-readable name for logging / UI. */
  name: string;
  /** Stable id matching MediaProviderId. */
  id: string;
}

export interface MediaProvider {
  readonly config: MediaProviderConfig;

  /** Multi-entity search (movies, TV, people, companies, collections). */
  search(query: string, options?: { page?: number }): Promise<SearchResponse>;

  getMovie(id: string): Promise<MovieDetails | null>;
  getTvShow(id: string): Promise<TvDetails | null>;
  getTvSeason(showId: string, seasonNumber: number): Promise<TvSeason | null>;
  getPerson(id: string): Promise<PersonDetails | null>;
  getCollection(id: string): Promise<CollectionDetails | null>;

  getMovieGenres(): Promise<Genre[]>;
  getTvGenres(): Promise<Genre[]>;

  getTrending(
    mediaType: "all" | "movie" | "tv" | "person",
    timeWindow?: "day" | "week",
    page?: number,
  ): Promise<PaginatedResult<MediaSummary>>;

  getPopularMovies(page?: number): Promise<PaginatedResult<MediaSummary>>;
  getPopularTv(page?: number): Promise<PaginatedResult<MediaSummary>>;
  getNowPlayingMovies(page?: number): Promise<PaginatedResult<MediaSummary>>;
  getUpcomingMovies(page?: number): Promise<PaginatedResult<MediaSummary>>;
  getTopRatedMovies(page?: number): Promise<PaginatedResult<MediaSummary>>;
  getTopRatedTv(page?: number): Promise<PaginatedResult<MediaSummary>>;

  discoverMovies(
    filters: MediaDiscoverFilters,
  ): Promise<PaginatedResult<MediaSummary>>;
  discoverTv(
    filters: MediaDiscoverFilters,
  ): Promise<PaginatedResult<MediaSummary>>;

  /**
   * Streaming offers. May return placeholders until a dedicated
   * availability provider (JustWatch/Watchmode) is wired.
   */
  getStreamingAvailability(
    mediaType: "movie" | "tv",
    id: string,
    region?: string,
  ): Promise<StreamingAvailability | null>;
}
