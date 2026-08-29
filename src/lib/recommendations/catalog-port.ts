/**
 * The catalog capability the recommendation engine needs — and nothing more.
 *
 * The engine depends on this port rather than on `MediaProvider` directly for
 * two reasons: the tests need a fake catalog with fixed data (a recommender
 * whose ranking cannot be asserted is untestable), and the port is where caching
 * lives, so the engine never has to think about request counts.
 *
 * The real implementation is `tmdb-catalog.ts`. `MediaProvider` is untouched.
 */

import type { MediaKind } from "@/types/library";
import type { Genre, MediaSummary } from "@/types/media";

export interface PersonRef {
  id: string;
  name: string;
}

/**
 * Everything one detail call yields about a title.
 *
 * TMDB's movie/TV detail endpoints already return credits, keywords, `similar`
 * and `recommendations` in a single append-to-response request — the existing
 * provider asks for all of them. So enriching one anchor costs exactly one API
 * call and produces both the attribute evidence and two candidate lists.
 */
export interface TitleFacts {
  /** `mediaType:externalId`. */
  key: string;
  mediaType: MediaKind;
  externalId: string;
  title: string;
  genres: string[];
  keywords: string[];
  directors: PersonRef[];
  /** TV creators; empty for movies. */
  creators: PersonRef[];
  /** Top-billed cast, already truncated by the adapter. */
  cast: PersonRef[];
  /** Movie runtime, or a TV show's typical episode runtime. */
  runtimeMinutes: number | null;
  originalLanguage: string | null;
  popularity: number | null;
  voteAverage: number | null;
  releaseDate: string | null;
  /** TMDB collection (franchise) id, when the title belongs to one. */
  collectionId: string | null;
  /** Total episodes for TV, null for movies. */
  episodeCount: number | null;
  similar: MediaSummary[];
  recommended: MediaSummary[];
}

export interface DiscoverQuery {
  mediaType: MediaKind;
  genreIds?: string[];
  yearGte?: number;
  yearLte?: number;
  runtimeGte?: number;
  runtimeLte?: number;
  voteAverageGte?: number;
  language?: string;
  sortBy?: "popularity.desc" | "vote_average.desc" | "release_date.desc";
  page?: number;
}

export type CatalogListKind =
  | "trending"
  | "popular_movies"
  | "popular_tv"
  | "top_rated_movies"
  | "top_rated_tv"
  | "now_playing_movies";

export interface CatalogPort {
  /** Whether a catalog is configured at all. Cold-start pages depend on this. */
  isConfigured(): boolean;
  /** Genre id → name, for both media types. Cached aggressively. */
  getGenreMap(): Promise<Map<string, Genre>>;
  /** One detail call. Returns null for unknown ids or on failure. */
  getTitleFacts(mediaType: MediaKind, externalId: string): Promise<TitleFacts | null>;
  discover(query: DiscoverQuery): Promise<MediaSummary[]>;
  getList(kind: CatalogListKind): Promise<MediaSummary[]>;
  /** Titles credited to a person, used for director / creator / cast lanes. */
  getPersonCredits(
    personId: string,
  ): Promise<{ name: string; credits: MediaSummary[] } | null>;
  /** Parts of a franchise collection. */
  getCollectionParts(collectionId: string): Promise<MediaSummary[]>;
}
