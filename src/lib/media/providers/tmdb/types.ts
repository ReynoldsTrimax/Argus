/**
 * Raw TMDB API response shapes (v3).
 * Kept private to the TMDB adapter — never import from UI.
 */

export interface TmdbPaginated<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}

export interface TmdbGenre {
  id: number;
  name: string;
}

export interface TmdbMovieListItem {
  id: number;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  overview?: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average?: number;
  vote_count?: number;
  popularity?: number;
  genre_ids?: number[];
  adult?: boolean;
  original_language?: string;
  media_type?: string;
}

export interface TmdbPersonListItem {
  id: number;
  name: string;
  profile_path: string | null;
  known_for_department?: string;
  popularity?: number;
  media_type?: string;
  known_for?: TmdbMovieListItem[];
}

export interface TmdbCompanyListItem {
  id: number;
  name: string;
  logo_path: string | null;
  origin_country?: string;
}

export interface TmdbCollectionListItem {
  id: number;
  name: string;
  poster_path: string | null;
  backdrop_path: string | null;
}

export interface TmdbMultiResult {
  id: number;
  media_type: string;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  profile_path?: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average?: number;
  vote_count?: number;
  popularity?: number;
  genre_ids?: number[];
  adult?: boolean;
  original_language?: string;
  known_for_department?: string;
  known_for?: TmdbMovieListItem[];
}

export interface TmdbImages {
  backdrops?: TmdbImage[];
  posters?: TmdbImage[];
  logos?: TmdbImage[];
  profiles?: TmdbImage[];
  stills?: TmdbImage[];
}

export interface TmdbImage {
  file_path: string;
  aspect_ratio?: number;
  height?: number;
  width?: number;
  iso_639_1?: string | null;
  vote_average?: number;
  vote_count?: number;
}

export interface TmdbVideo {
  id: string;
  key: string;
  name: string;
  site: string;
  type: string;
  official: boolean;
  published_at?: string;
  iso_639_1?: string;
}

export interface TmdbCast {
  id: number;
  credit_id?: string;
  name: string;
  character?: string;
  order?: number;
  profile_path: string | null;
  known_for_department?: string;
}

export interface TmdbCrew {
  id: number;
  credit_id?: string;
  name: string;
  job?: string;
  department?: string;
  profile_path: string | null;
}

export interface TmdbMovieDetails extends TmdbMovieListItem {
  tagline?: string;
  runtime?: number;
  status?: string;
  budget?: number;
  revenue?: number;
  homepage?: string;
  imdb_id?: string;
  genres?: TmdbGenre[];
  production_companies?: {
    id: number;
    name: string;
    logo_path: string | null;
    origin_country?: string;
  }[];
  production_countries?: { iso_3166_1: string; name: string }[];
  spoken_languages?: {
    iso_639_1: string;
    name: string;
    english_name?: string;
  }[];
  belongs_to_collection?: {
    id: number;
    name: string;
    poster_path: string | null;
    backdrop_path: string | null;
  } | null;
  credits?: { cast?: TmdbCast[]; crew?: TmdbCrew[] };
  images?: TmdbImages;
  videos?: { results?: TmdbVideo[] };
  recommendations?: TmdbPaginated<TmdbMovieListItem>;
  similar?: TmdbPaginated<TmdbMovieListItem>;
  keywords?: { keywords?: { id: number; name: string }[] };
  release_dates?: {
    results?: {
      iso_3166_1: string;
      release_dates?: { certification?: string; type?: number }[];
    }[];
  };
  "watch/providers"?: TmdbWatchProviders;
  external_ids?: {
    imdb_id?: string | null;
    wikidata_id?: string | null;
    facebook_id?: string | null;
    instagram_id?: string | null;
    twitter_id?: string | null;
  };
}

export interface TmdbTvDetails {
  id: number;
  name?: string;
  original_name?: string;
  overview?: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date?: string;
  last_air_date?: string;
  vote_average?: number;
  vote_count?: number;
  popularity?: number;
  adult?: boolean;
  original_language?: string;
  tagline?: string;
  status?: string;
  type?: string;
  homepage?: string;
  number_of_seasons?: number;
  number_of_episodes?: number;
  episode_run_time?: number[];
  in_production?: boolean;
  genres?: TmdbGenre[];
  networks?: {
    id: number;
    name: string;
    logo_path: string | null;
    origin_country?: string;
  }[];
  production_companies?: {
    id: number;
    name: string;
    logo_path: string | null;
    origin_country?: string;
  }[];
  production_countries?: { iso_3166_1: string; name: string }[];
  spoken_languages?: {
    iso_639_1: string;
    name: string;
    english_name?: string;
  }[];
  created_by?: {
    id: number;
    name: string;
    profile_path: string | null;
    credit_id?: string;
  }[];
  seasons?: {
    id: number;
    name: string;
    overview?: string;
    air_date?: string | null;
    episode_count?: number;
    poster_path: string | null;
    season_number: number;
  }[];
  credits?: { cast?: TmdbCast[]; crew?: TmdbCrew[] };
  images?: TmdbImages;
  videos?: { results?: TmdbVideo[] };
  recommendations?: TmdbPaginated<TmdbMovieListItem>;
  similar?: TmdbPaginated<TmdbMovieListItem>;
  keywords?: { results?: { id: number; name: string }[] };
  content_ratings?: {
    results?: { iso_3166_1: string; rating?: string }[];
  };
  "watch/providers"?: TmdbWatchProviders;
  external_ids?: {
    imdb_id?: string | null;
    freebase_mid?: string | null;
    freebase_id?: string | null;
    tvdb_id?: number | null;
    tvrage_id?: number | null;
    wikidata_id?: string | null;
    facebook_id?: string | null;
    instagram_id?: string | null;
    twitter_id?: string | null;
  };
}

export interface TmdbSeasonDetails {
  id: number;
  name: string;
  overview?: string;
  air_date?: string | null;
  poster_path: string | null;
  season_number: number;
  episodes?: {
    id: number;
    name: string;
    overview?: string;
    air_date?: string | null;
    episode_number: number;
    season_number: number;
    runtime?: number | null;
    still_path: string | null;
    vote_average?: number;
    vote_count?: number;
  }[];
}

export interface TmdbPersonDetails {
  id: number;
  name: string;
  biography?: string;
  birthday?: string | null;
  deathday?: string | null;
  place_of_birth?: string | null;
  known_for_department?: string;
  gender?: number;
  popularity?: number;
  profile_path: string | null;
  homepage?: string | null;
  imdb_id?: string | null;
  also_known_as?: string[];
  combined_credits?: {
    cast?: (TmdbMovieListItem & {
      character?: string;
      credit_id?: string;
      media_type?: string;
      order?: number;
    })[];
    crew?: (TmdbMovieListItem & {
      job?: string;
      department?: string;
      credit_id?: string;
      media_type?: string;
    })[];
  };
  images?: { profiles?: TmdbImage[] };
  external_ids?: {
    imdb_id?: string | null;
    facebook_id?: string | null;
    instagram_id?: string | null;
    twitter_id?: string | null;
  };
}

export interface TmdbCollectionDetails {
  id: number;
  name: string;
  overview?: string;
  poster_path: string | null;
  backdrop_path: string | null;
  parts?: TmdbMovieListItem[];
}

export interface TmdbWatchProviders {
  results?: Record<
    string,
    {
      link?: string;
      flatrate?: TmdbProvider[];
      rent?: TmdbProvider[];
      buy?: TmdbProvider[];
      ads?: TmdbProvider[];
      free?: TmdbProvider[];
    }
  >;
}

export interface TmdbProvider {
  provider_id: number;
  provider_name: string;
  logo_path: string | null;
  display_priority?: number;
}
