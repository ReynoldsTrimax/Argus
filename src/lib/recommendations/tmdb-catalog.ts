/**
 * TMDB implementation of `CatalogPort`.
 *
 * Sits at the same layer as `lib/media/providers/tmdb/provider.ts`: it composes
 * the existing `MediaProvider` for everything the provider already exposes, and
 * for the one thing it does not — a person's *crew* filmography — it uses the
 * provider package's own `tmdbFetch`. Extending `MediaProvider` and
 * `MediaDiscoverFilters` for a single recommendation lane would change files the
 * whole catalog depends on, and the point of this port is that the engine can
 * be given whatever it needs without that.
 *
 * All reads go through `catalogCache`, so a warm run costs no API calls and a
 * cold run makes each distinct request exactly once.
 */

import type { MediaKind } from "@/types/library";
import type { Genre, MediaSummary, MovieDetails, TvDetails } from "@/types/media";
import { getMediaProvider } from "@/lib/media/providers";
import { isTmdbConfigured, tmdbFetch } from "@/lib/media/providers/tmdb/client";
import { mapMediaSummary } from "@/lib/media/providers/tmdb/mappers";
import type { TmdbMovieListItem } from "@/lib/media/providers/tmdb/types";

import { catalogCache } from "./cache";
import type {
  CatalogListKind,
  CatalogPort,
  DiscoverQuery,
  PersonRef,
  TitleFacts,
} from "./catalog-port";
import { CACHE_TTL_MS } from "./config";
import { candidateKey } from "./signals";

/** Cast entries beyond the top billing tell you nothing about a preference. */
const MAX_CAST_PER_TITLE = 8;
/** Keywords are long-tailed; the head is the part that characterizes a title. */
const MAX_KEYWORDS_PER_TITLE = 18;
/** Crew jobs that count as authorship for the "creators" affinity. */
const AUTHOR_JOBS = new Set(["Director", "Creator", "Writer", "Screenplay"]);

/** A failed catalog read degrades a lane; it must never fail the page. */
async function safe<T>(label: string, load: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await load();
  } catch (error) {
    console.warn(
      `[recommendations] catalog ${label} failed:`,
      error instanceof Error ? error.message : error,
    );
    return fallback;
  }
}

function toPersonRefs(
  credits: { id: string; name: string; job?: string | null }[],
  predicate: (job: string) => boolean,
): PersonRef[] {
  const out: PersonRef[] = [];
  const seen = new Set<string>();
  for (const credit of credits) {
    const jobs = (credit.job ?? "").split(" · ").map((j) => j.trim());
    if (!jobs.some(predicate)) continue;
    if (seen.has(credit.id)) continue;
    seen.add(credit.id);
    out.push({ id: credit.id, name: credit.name });
  }
  return out;
}

function movieToFacts(details: MovieDetails): TitleFacts {
  return {
    key: candidateKey("movie", details.id),
    mediaType: "movie",
    externalId: details.id,
    title: details.title,
    genres: details.genres.map((g) => g.name),
    keywords: details.keywords.slice(0, MAX_KEYWORDS_PER_TITLE).map((k) => k.name),
    directors: toPersonRefs(details.crew, (job) => job === "Director"),
    creators: toPersonRefs(
      details.crew,
      (job) => AUTHOR_JOBS.has(job) && job !== "Director",
    ),
    cast: details.cast
      .slice(0, MAX_CAST_PER_TITLE)
      .map((c) => ({ id: c.id, name: c.name })),
    runtimeMinutes: details.runtime ?? null,
    originalLanguage: details.originalLanguage ?? null,
    popularity: details.popularity ?? null,
    voteAverage: details.voteAverage ?? null,
    releaseDate: details.releaseDate ?? null,
    collectionId: details.collection?.id ?? null,
    episodeCount: null,
    similar: details.similar,
    recommended: details.recommendations,
  };
}

function tvToFacts(details: TvDetails): TitleFacts {
  return {
    key: candidateKey("tv", details.id),
    mediaType: "tv",
    externalId: details.id,
    title: details.title,
    genres: details.genres.map((g) => g.name),
    keywords: details.keywords.slice(0, MAX_KEYWORDS_PER_TITLE).map((k) => k.name),
    directors: toPersonRefs(details.crew, (job) => job === "Director"),
    creators: details.createdBy.map((c) => ({ id: c.id, name: c.name })),
    cast: details.cast
      .slice(0, MAX_CAST_PER_TITLE)
      .map((c) => ({ id: c.id, name: c.name })),
    runtimeMinutes: details.episodeRunTime?.[0] ?? null,
    originalLanguage: details.originalLanguage ?? null,
    popularity: details.popularity ?? null,
    voteAverage: details.voteAverage ?? null,
    releaseDate: details.firstAirDate ?? details.releaseDate ?? null,
    collectionId: null,
    episodeCount: details.numberOfEpisodes ?? null,
    similar: details.similar,
    recommended: details.recommendations,
  };
}

/** `/person/{id}/combined_credits` — the only shape this adapter needs. */
interface TmdbCombinedCredits {
  cast?: (TmdbMovieListItem & { media_type?: string })[];
  crew?: (TmdbMovieListItem & { media_type?: string; job?: string })[];
}

export function createTmdbCatalog(): CatalogPort {
  const provider = getMediaProvider();

  return {
    isConfigured() {
      return isTmdbConfigured();
    },

    async getGenreMap() {
      return catalogCache.resolve("genres:all", CACHE_TTL_MS.genres, async () => {
        const [movie, tv] = await Promise.all([
          safe<Genre[]>("movie-genres", () => provider.getMovieGenres(), []),
          safe<Genre[]>("tv-genres", () => provider.getTvGenres(), []),
        ]);
        const map = new Map<string, Genre>();
        for (const genre of [...movie, ...tv]) map.set(genre.id, genre);
        return map;
      });
    },

    async getTitleFacts(mediaType: MediaKind, externalId: string) {
      const key = `facts:${mediaType}:${externalId}`;
      return catalogCache.resolve(key, CACHE_TTL_MS.details, () =>
        safe<TitleFacts | null>(
          key,
          async () => {
            if (mediaType === "movie") {
              // provider.getMovie, not catalog.getMovie: the catalog facade adds
              // an OMDb ratings round-trip that recommendations do not use.
              const details = await provider.getMovie(externalId);
              return details ? movieToFacts(details) : null;
            }
            const details = await provider.getTvShow(externalId);
            return details ? tvToFacts(details) : null;
          },
          null,
        ),
      );
    },

    async discover(query: DiscoverQuery) {
      const key = `discover:${JSON.stringify(query)}`;
      return catalogCache.resolve(key, CACHE_TTL_MS.discover, () =>
        safe<MediaSummary[]>(key, async () => {
          const filters = {
            genreIds: query.genreIds,
            yearGte: query.yearGte,
            yearLte: query.yearLte,
            runtimeGte: query.runtimeGte,
            runtimeLte: query.runtimeLte,
            voteAverageGte: query.voteAverageGte,
            language: query.language,
            sortBy: query.sortBy ?? ("popularity.desc" as const),
            page: query.page ?? 1,
          };
          const page =
            query.mediaType === "movie"
              ? await provider.discoverMovies(filters)
              : await provider.discoverTv(filters);
          return page.results;
        }, []),
      );
    },

    async getList(kind: CatalogListKind) {
      const key = `list:${kind}`;
      const ttl = kind === "trending" ? CACHE_TTL_MS.trending : CACHE_TTL_MS.discover;
      return catalogCache.resolve(key, ttl, () =>
        safe<MediaSummary[]>(key, async () => {
          switch (kind) {
            case "trending":
              return (await provider.getTrending("all", "week")).results;
            case "popular_movies":
              return (await provider.getPopularMovies()).results;
            case "popular_tv":
              return (await provider.getPopularTv()).results;
            case "top_rated_movies":
              return (await provider.getTopRatedMovies()).results;
            case "top_rated_tv":
              return (await provider.getTopRatedTv()).results;
            case "now_playing_movies":
              return (await provider.getNowPlayingMovies()).results;
            default:
              return [];
          }
        }, []),
      );
    },

    async getPersonCredits(personId: string) {
      const key = `person:${personId}`;
      return catalogCache.resolve(key, CACHE_TTL_MS.person, () =>
        safe<{ name: string; credits: MediaSummary[] } | null>(
          key,
          async () => {
            // Two calls, but only for the handful of people with real affinity:
            // `getPerson` gives the display name through the domain model, while
            // combined_credits is the only source of *crew* filmography — a
            // director's own films never appear in their cast credits, so
            // without it the people lane would be actors-only.
            const [person, credits] = await Promise.all([
              provider.getPerson(personId),
              tmdbFetch<TmdbCombinedCredits>(`/person/${personId}/combined_credits`),
            ]);
            if (!person) return null;

            const seen = new Set<string>();
            const out: MediaSummary[] = [];

            const push = (
              item: TmdbMovieListItem & { media_type?: string },
              authored: boolean,
            ) => {
              const type = item.media_type === "tv" ? "tv" : "movie";
              const summary = mapMediaSummary(item, type);
              const dedupe = `${type}:${summary.id}`;
              if (seen.has(dedupe)) return;
              seen.add(dedupe);
              // Authored credits first: they carry the person's intent, which is
              // what a "from this director" recommendation is claiming.
              if (authored) out.unshift(summary);
              else out.push(summary);
            };

            for (const item of credits?.crew ?? []) {
              const jobs = (item.job ?? "").split(",").map((j) => j.trim());
              if (!jobs.some((job) => AUTHOR_JOBS.has(job))) continue;
              push(item, true);
            }
            for (const item of credits?.cast ?? []) push(item, false);

            return { name: person.name, credits: out };
          },
          null,
        ),
      );
    },

    async getCollectionParts(collectionId: string) {
      const key = `collection:${collectionId}`;
      return catalogCache.resolve(key, CACHE_TTL_MS.details, () =>
        safe<MediaSummary[]>(key, async () => {
          const collection = await provider.getCollection(collectionId);
          return collection?.parts ?? [];
        }, []),
      );
    },
  };
}
