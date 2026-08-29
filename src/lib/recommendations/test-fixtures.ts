/**
 * Deterministic fixtures for the recommendation engine tests.
 *
 * Imported only by `*.test.ts` files in this folder. The fake catalog is
 * hand-built rather than generated so that the expected ranking of each test is
 * something a reader can verify by eye.
 */

import type { LibraryEntry, MediaKind, RatingScale, WatchStatus } from "@/types/library";
import type { Genre, MediaSummary } from "@/types/media";

import type {
  CatalogListKind,
  CatalogPort,
  DiscoverQuery,
  TitleFacts,
} from "./catalog-port";
import { EMPTY_SIGNAL_DATA, type RecommendationSignalData } from "./signals";

/** Fixed clock so recency decay and freshness are exact in assertions. */
export const NOW = Date.parse("2025-06-01T12:00:00.000Z");

export const GENRES: Genre[] = [
  { id: "18", name: "Drama" },
  { id: "53", name: "Thriller" },
  { id: "27", name: "Horror" },
  { id: "35", name: "Comedy" },
  { id: "878", name: "Science Fiction" },
  { id: "80", name: "Crime" },
  { id: "16", name: "Animation" },
  { id: "99", name: "Documentary" },
];

export const GENRE_MAP = new Map(GENRES.map((g) => [g.id, g]));

export function genreId(name: string): string {
  const found = GENRES.find((g) => g.name === name);
  if (!found) throw new Error(`fixture missing genre ${name}`);
  return found.id;
}

/* -------------------------------------------------------------------------- */
/* Library entries                                                            */
/* -------------------------------------------------------------------------- */

let entrySeq = 0;

export interface EntryOptions {
  id?: string;
  externalId?: string;
  title: string;
  mediaType?: MediaKind;
  status?: WatchStatus;
  rating?: number | null;
  scale?: RatingScale | null;
  genres?: string[];
  language?: string;
  releaseDate?: string;
  runtime?: number | null;
  favorite?: boolean;
  rewatchCount?: number;
  totalEpisodes?: number | null;
  episodesWatched?: number;
  lastWatchedAt?: string | null;
  userId?: string;
  pinned?: boolean;
}

export function entry(options: EntryOptions): LibraryEntry {
  entrySeq += 1;
  const id = options.id ?? `entry-${entrySeq}`;
  const externalId = options.externalId ?? `${1000 + entrySeq}`;

  return {
    id,
    user_id: options.userId ?? "user-a",
    provider: "tmdb",
    media_type: options.mediaType ?? "movie",
    external_id: externalId,
    title: options.title,
    original_title: null,
    poster_path: `/poster-${externalId}.jpg`,
    backdrop_path: null,
    release_date: options.releaseDate ?? "2015-04-10",
    overview: null,
    runtime_minutes: options.runtime === undefined ? 118 : options.runtime,
    status: options.status ?? "completed",
    is_favorite: options.favorite ?? false,
    is_hidden: false,
    is_pinned: options.pinned ?? false,
    is_archived: false,
    progress_percent: 100,
    movie_progress_minutes: null,
    current_season: null,
    current_episode: null,
    episodes_watched: options.episodesWatched ?? 0,
    total_episodes: options.totalEpisodes ?? null,
    started_at: "2025-01-02T10:00:00.000Z",
    completed_at: "2025-01-10T10:00:00.000Z",
    last_watched_at:
      options.lastWatchedAt === undefined
        ? "2025-01-10T10:00:00.000Z"
        : options.lastWatchedAt,
    rewatch_count: options.rewatchCount ?? 0,
    user_rating: options.rating === undefined ? null : options.rating,
    rating_scale: options.scale === undefined ? "ten" : options.scale,
    metadata: {
      genres: options.genres ?? ["Drama"],
      originalLanguage: options.language ?? "en",
    },
    created_at: "2025-01-01T10:00:00.000Z",
    updated_at: "2025-01-10T10:00:00.000Z",
  };
}

export function signalData(
  entries: LibraryEntry[],
  overrides: Partial<RecommendationSignalData> = {},
): RecommendationSignalData {
  return { ...EMPTY_SIGNAL_DATA, ...overrides, entries };
}

/* -------------------------------------------------------------------------- */
/* Catalog summaries                                                          */
/* -------------------------------------------------------------------------- */

export interface SummaryOptions {
  id: string;
  title: string;
  mediaType?: MediaKind;
  genres?: string[];
  releaseDate?: string;
  voteAverage?: number;
  voteCount?: number;
  popularity?: number;
  language?: string;
  overview?: string;
  posterPath?: string | null;
}

export function summary(options: SummaryOptions): MediaSummary {
  return {
    id: options.id,
    mediaType: options.mediaType ?? "movie",
    title: options.title,
    originalTitle: options.title,
    overview: options.overview ?? "A film about people making difficult choices.",
    posterPath:
      options.posterPath === undefined ? `/p-${options.id}.jpg` : options.posterPath,
    backdropPath: null,
    releaseDate: options.releaseDate ?? "2018-03-02",
    voteAverage: options.voteAverage ?? 7.2,
    voteCount: options.voteCount ?? 1500,
    popularity: options.popularity ?? 40,
    genreIds: (options.genres ?? ["Drama"]).map(genreId),
    adult: false,
    originalLanguage: options.language ?? "en",
  };
}

export function facts(options: {
  mediaType?: MediaKind;
  externalId: string;
  title: string;
  genres?: string[];
  keywords?: string[];
  directors?: { id: string; name: string }[];
  cast?: { id: string; name: string }[];
  runtimeMinutes?: number | null;
  collectionId?: string | null;
  similar?: MediaSummary[];
  recommended?: MediaSummary[];
  popularity?: number | null;
}): TitleFacts {
  const mediaType = options.mediaType ?? "movie";
  return {
    key: `${mediaType}:${options.externalId}`,
    mediaType,
    externalId: options.externalId,
    title: options.title,
    genres: options.genres ?? ["Drama"],
    keywords: options.keywords ?? [],
    directors: options.directors ?? [],
    creators: [],
    cast: options.cast ?? [],
    runtimeMinutes: options.runtimeMinutes === undefined ? 120 : options.runtimeMinutes,
    originalLanguage: "en",
    popularity: options.popularity === undefined ? 45 : options.popularity,
    voteAverage: 7.5,
    releaseDate: "2015-04-10",
    collectionId: options.collectionId ?? null,
    episodeCount: null,
    similar: options.similar ?? [],
    recommended: options.recommended ?? [],
  };
}

/* -------------------------------------------------------------------------- */
/* Fake catalog                                                               */
/* -------------------------------------------------------------------------- */

export interface FakeCatalogConfig {
  configured?: boolean;
  factsByKey?: Map<string, TitleFacts>;
  /** Results returned for any discover query on a given genre id. */
  discoverByGenre?: Map<string, MediaSummary[]>;
  lists?: Partial<Record<CatalogListKind, MediaSummary[]>>;
  personCredits?: Map<string, { name: string; credits: MediaSummary[] }>;
  collections?: Map<string, MediaSummary[]>;
}

export interface FakeCatalog extends CatalogPort {
  /** Call log, so tests can assert on request counts and caching behaviour. */
  calls: string[];
}

export function fakeCatalog(config: FakeCatalogConfig = {}): FakeCatalog {
  const calls: string[] = [];

  return {
    calls,
    isConfigured: () => config.configured ?? true,

    async getGenreMap() {
      calls.push("genres");
      return GENRE_MAP;
    },

    async getTitleFacts(mediaType, externalId) {
      calls.push(`facts:${mediaType}:${externalId}`);
      return config.factsByKey?.get(`${mediaType}:${externalId}`) ?? null;
    },

    async discover(query: DiscoverQuery) {
      calls.push(`discover:${query.mediaType}:${(query.genreIds ?? []).join(",")}`);
      const out: MediaSummary[] = [];
      for (const id of query.genreIds ?? []) {
        for (const item of config.discoverByGenre?.get(id) ?? []) {
          if (item.mediaType !== query.mediaType) continue;
          out.push(item);
        }
      }
      return out;
    },

    async getList(kind) {
      calls.push(`list:${kind}`);
      return config.lists?.[kind] ?? [];
    },

    async getPersonCredits(personId) {
      calls.push(`person:${personId}`);
      return config.personCredits?.get(personId) ?? null;
    },

    async getCollectionParts(collectionId) {
      calls.push(`collection:${collectionId}`);
      return config.collections?.get(collectionId) ?? [];
    },
  };
}
