/**
 * Provider-agnostic media domain models.
 *
 * UI and features depend only on these types — never on TMDB (or any
 * vendor) response shapes. New providers map into this layer.
 */

/** Canonical media kinds used across routing and search. */
export type MediaType = "movie" | "tv" | "person" | "collection" | "company" | "genre";

/** External provider identifier (extensible). */
export type MediaProviderId =
  | "tmdb"
  | "watchmode"
  | "justwatch"
  | "omdb"
  | "tvmaze"
  | "imdb"
  | "rotten_tomatoes"
  | "metacritic"
  | "argus"
  | "frame";

/** Stable external reference: provider + type + remote id. */
export interface ExternalId {
  provider: MediaProviderId;
  mediaType: MediaType;
  id: string;
}

export interface Genre {
  id: string;
  name: string;
}

export interface ProductionCompany {
  id: string;
  name: string;
  logoPath: string | null;
  originCountry: string | null;
}

export interface Network {
  id: string;
  name: string;
  logoPath: string | null;
  originCountry: string | null;
}

export interface Country {
  code: string;
  name: string;
}

export interface Language {
  code: string;
  name: string;
  englishName?: string;
}

export interface Keyword {
  id: string;
  name: string;
}

/** Modular rating from any source. */
export interface MediaRating {
  provider: MediaProviderId;
  /** Display label e.g. "TMDB", "IMDb", "Rotten Tomatoes" */
  label: string;
  /** Normalized 0–100 when possible; otherwise raw. */
  value: number | null;
  /** Original scale max (10 for TMDB, 10 for IMDb, 100 for RT). */
  scale: number;
  /** Vote / review count when known. */
  count?: number | null;
  /** Optional secondary score (e.g. RT audience). */
  secondaryValue?: number | null;
  secondaryLabel?: string;
  /** URL to external page if available. */
  url?: string | null;
}

export type StreamingOfferType = "flatrate" | "rent" | "buy" | "ads" | "free" | "unavailable";

export interface StreamingProvider {
  id: string;
  name: string;
  logoPath: string | null;
  offerType: StreamingOfferType;
  /** Deep link when available from a future provider. */
  link?: string | null;
  displayPriority?: number;
}

export interface StreamingAvailability {
  region: string;
  link?: string | null;
  providers: StreamingProvider[];
  /** True when data is a structural placeholder (no live API). */
  isPlaceholder?: boolean;
}

export interface MediaImage {
  id: string;
  path: string;
  type: "poster" | "backdrop" | "logo" | "profile" | "still";
  aspectRatio?: number;
  width?: number;
  height?: number;
  language?: string | null;
  voteAverage?: number;
}

export type VideoType =
  | "Trailer"
  | "Teaser"
  | "Clip"
  | "Featurette"
  | "Behind the Scenes"
  | "Bloopers"
  | "Opening Credits"
  | "Other";

export interface MediaVideo {
  id: string;
  key: string;
  name: string;
  site: "YouTube" | "Vimeo" | "Other";
  type: VideoType;
  official: boolean;
  publishedAt?: string | null;
  language?: string | null;
}

export interface PersonCredit {
  id: string;
  creditId?: string;
  name: string;
  character?: string | null;
  job?: string | null;
  department?: string | null;
  profilePath: string | null;
  order?: number;
  mediaType?: "movie" | "tv";
  title?: string;
  releaseDate?: string | null;
  posterPath?: string | null;
  popularity?: number;
}

export interface MediaCollectionRef {
  id: string;
  name: string;
  posterPath: string | null;
  backdropPath: string | null;
}

/** Lightweight card model for lists, rows, search. */
export interface MediaSummary {
  id: string;
  mediaType: "movie" | "tv";
  title: string;
  originalTitle?: string | null;
  overview?: string | null;
  posterPath: string | null;
  backdropPath: string | null;
  releaseDate?: string | null;
  voteAverage?: number | null;
  voteCount?: number | null;
  popularity?: number | null;
  genreIds?: string[];
  adult?: boolean;
  originalLanguage?: string | null;
}

export interface MovieDetails extends MediaSummary {
  mediaType: "movie";
  tagline?: string | null;
  runtime?: number | null;
  status?: string | null;
  budget?: number | null;
  revenue?: number | null;
  homepage?: string | null;
  imdbId?: string | null;
  certification?: string | null;
  genres: Genre[];
  productionCompanies: ProductionCompany[];
  productionCountries: Country[];
  spokenLanguages: Language[];
  keywords: Keyword[];
  collection?: MediaCollectionRef | null;
  cast: PersonCredit[];
  crew: PersonCredit[];
  images: MediaImage[];
  videos: MediaVideo[];
  recommendations: MediaSummary[];
  similar: MediaSummary[];
  ratings: MediaRating[];
  streaming?: StreamingAvailability | null;
  logoPath?: string | null;
}

export interface TvEpisode {
  id: string;
  episodeNumber: number;
  seasonNumber: number;
  name: string;
  overview?: string | null;
  airDate?: string | null;
  runtime?: number | null;
  stillPath: string | null;
  voteAverage?: number | null;
  voteCount?: number | null;
}

export interface TvSeason {
  id: string;
  seasonNumber: number;
  name: string;
  overview?: string | null;
  airDate?: string | null;
  episodeCount?: number | null;
  posterPath: string | null;
  episodes?: TvEpisode[];
}

export interface TvDetails extends MediaSummary {
  mediaType: "tv";
  tagline?: string | null;
  status?: string | null;
  type?: string | null;
  firstAirDate?: string | null;
  lastAirDate?: string | null;
  numberOfSeasons?: number | null;
  numberOfEpisodes?: number | null;
  episodeRunTime?: number[];
  inProduction?: boolean;
  homepage?: string | null;
  imdbId?: string | null;
  certification?: string | null;
  genres: Genre[];
  networks: Network[];
  productionCompanies: ProductionCompany[];
  productionCountries: Country[];
  spokenLanguages: Language[];
  keywords: Keyword[];
  createdBy: PersonCredit[];
  cast: PersonCredit[];
  crew: PersonCredit[];
  seasons: TvSeason[];
  images: MediaImage[];
  videos: MediaVideo[];
  recommendations: MediaSummary[];
  similar: MediaSummary[];
  ratings: MediaRating[];
  streaming?: StreamingAvailability | null;
  logoPath?: string | null;
}

export interface PersonDetails {
  id: string;
  mediaType: "person";
  name: string;
  biography?: string | null;
  birthday?: string | null;
  deathday?: string | null;
  placeOfBirth?: string | null;
  knownForDepartment?: string | null;
  gender?: number | null;
  popularity?: number | null;
  profilePath: string | null;
  homepage?: string | null;
  imdbId?: string | null;
  alsoKnownAs?: string[];
  movieCredits: PersonCredit[];
  tvCredits: PersonCredit[];
  images: MediaImage[];
  knownFor: MediaSummary[];
}

export interface CollectionDetails {
  id: string;
  mediaType: "collection";
  name: string;
  overview?: string | null;
  posterPath: string | null;
  backdropPath: string | null;
  parts: MediaSummary[];
}

export interface PaginatedResult<T> {
  page: number;
  totalPages: number;
  totalResults: number;
  results: T[];
}

export type SearchResultKind =
  | "movie"
  | "tv"
  | "person"
  | "collection"
  | "company"
  | "genre";

export interface SearchResultItem {
  id: string;
  kind: SearchResultKind;
  title: string;
  subtitle?: string | null;
  imagePath: string | null;
  year?: string | null;
  mediaType?: "movie" | "tv";
  popularity?: number | null;
  href: string;
}

export interface SearchResponse {
  query: string;
  results: SearchResultItem[];
  totalResults: number;
  /** Hook for future AI search results in the same contract. */
  aiResults?: SearchResultItem[];
}

export type MediaSortBy =
  | "popularity.desc"
  | "popularity.asc"
  | "release_date.desc"
  | "release_date.asc"
  | "vote_average.desc"
  | "vote_average.asc"
  | "title.asc"
  | "title.desc"
  | "runtime.desc"
  | "runtime.asc";

export interface MediaDiscoverFilters {
  mediaType?: "movie" | "tv";
  genreIds?: string[];
  year?: number;
  yearGte?: number;
  yearLte?: number;
  language?: string;
  runtimeGte?: number;
  runtimeLte?: number;
  voteAverageGte?: number;
  voteAverageLte?: number;
  sortBy?: MediaSortBy;
  page?: number;
  /** Streaming provider id — provider-ready; may be ignored until integrated. */
  watchProviderId?: string;
  watchRegion?: string;
  releaseStatus?: string;
}

export interface DiscoverySection {
  id: string;
  title: string;
  href?: string;
  items: MediaSummary[];
}
