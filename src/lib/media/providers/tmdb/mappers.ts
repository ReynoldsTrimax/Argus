/**
 * Map raw TMDB payloads → provider-agnostic domain models.
 */

import type {
  CollectionDetails,
  Genre,
  MediaImage,
  MediaRating,
  MediaSummary,
  MediaVideo,
  MovieDetails,
  PaginatedResult,
  PersonCredit,
  PersonDetails,
  SearchResponse,
  SearchResultItem,
  StreamingAvailability,
  StreamingOfferType,
  StreamingProvider,
  TvDetails,
  TvEpisode,
  TvSeason,
  VideoType,
} from "@/types/media";
import { mediaHref } from "@/lib/media/routes";

import type {
  TmdbCollectionDetails,
  TmdbGenre,
  TmdbImage,
  TmdbMovieDetails,
  TmdbMovieListItem,
  TmdbMultiResult,
  TmdbPaginated,
  TmdbPersonDetails,
  TmdbSeasonDetails,
  TmdbTvDetails,
  TmdbVideo,
  TmdbWatchProviders,
} from "./types";

export function mapGenre(g: TmdbGenre): Genre {
  return { id: String(g.id), name: g.name };
}

export function mapMediaSummary(
  item: TmdbMovieListItem,
  forcedType?: "movie" | "tv",
): MediaSummary {
  const mediaType: "movie" | "tv" =
    forcedType ??
    (item.media_type === "tv" || (!item.title && Boolean(item.name)) ? "tv" : "movie");

  const title =
    mediaType === "tv"
      ? (item.name ?? item.title ?? "Untitled")
      : (item.title ?? item.name ?? "Untitled");

  return {
    id: String(item.id),
    mediaType,
    title,
    originalTitle: item.original_title ?? item.original_name ?? null,
    overview: item.overview ?? null,
    posterPath: item.poster_path,
    backdropPath: item.backdrop_path,
    releaseDate: item.release_date ?? item.first_air_date ?? null,
    voteAverage: item.vote_average ?? null,
    voteCount: item.vote_count ?? null,
    popularity: item.popularity ?? null,
    genreIds: item.genre_ids?.map(String),
    adult: item.adult,
    originalLanguage: item.original_language ?? null,
  };
}

export function mapPaginated<TIn, TOut>(
  data: TmdbPaginated<TIn>,
  map: (item: TIn) => TOut,
): PaginatedResult<TOut> {
  return {
    page: data.page,
    totalPages: data.total_pages,
    totalResults: data.total_results,
    results: data.results.map(map),
  };
}

function mapImage(img: TmdbImage, type: MediaImage["type"]): MediaImage {
  return {
    id: img.file_path,
    path: img.file_path,
    type,
    aspectRatio: img.aspect_ratio,
    width: img.width,
    height: img.height,
    language: img.iso_639_1 ?? null,
    voteAverage: img.vote_average,
  };
}

function mapVideoType(type: string): VideoType {
  const known: VideoType[] = [
    "Trailer",
    "Teaser",
    "Clip",
    "Featurette",
    "Behind the Scenes",
    "Bloopers",
    "Opening Credits",
  ];
  return (known.includes(type as VideoType) ? type : "Other") as VideoType;
}

export function mapVideo(v: TmdbVideo): MediaVideo {
  const site =
    v.site === "YouTube" ? "YouTube" : v.site === "Vimeo" ? "Vimeo" : "Other";
  return {
    id: v.id,
    key: v.key,
    name: v.name,
    site,
    type: mapVideoType(v.type),
    official: v.official,
    publishedAt: v.published_at ?? null,
    language: v.iso_639_1 ?? null,
  };
}

function mapTmdbRating(voteAverage?: number | null, voteCount?: number | null): MediaRating {
  return {
    provider: "tmdb",
    label: "TMDB",
    value: voteAverage != null ? Math.round(voteAverage * 10) / 10 : null,
    scale: 10,
    count: voteCount ?? null,
  };
}

/** Base ratings before async OMDb enrichment (IMDb / RT / Metacritic). */
export function buildModularRatings(
  voteAverage?: number | null,
  voteCount?: number | null,
): MediaRating[] {
  // Re-export shape from central ratings module for mapper sync path.
  return [
    mapTmdbRating(voteAverage, voteCount),
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

function pickCertification(
  releaseDates?: TmdbMovieDetails["release_dates"],
  region = "US",
): string | null {
  const entry =
    releaseDates?.results?.find((r) => r.iso_3166_1 === region) ??
    releaseDates?.results?.[0];
  const cert = entry?.release_dates?.find((d) => d.certification)?.certification;
  return cert || null;
}

function pickTvCertification(
  contentRatings?: TmdbTvDetails["content_ratings"],
  region = "US",
): string | null {
  const entry =
    contentRatings?.results?.find((r) => r.iso_3166_1 === region) ??
    contentRatings?.results?.[0];
  return entry?.rating || null;
}

/**
 * Cast strip — one card per person (first billed role wins).
 * Avoids the same actor repeating when TMDB lists multiple characters.
 */
function mapCast(cast: NonNullable<TmdbMovieDetails["credits"]>["cast"]): PersonCredit[] {
  const seen = new Set<string>();
  const out: PersonCredit[] = [];
  for (const c of cast ?? []) {
    const id = String(c.id);
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({
      id,
      creditId: c.credit_id,
      name: c.name,
      character: c.character ?? null,
      profilePath: c.profile_path,
      order: c.order,
      department: c.known_for_department,
    });
    if (out.length >= 24) break;
  }
  return out;
}

/** Job priority for crew ordering (lower = more important). */
const CREW_JOB_RANK: Record<string, number> = {
  Director: 0,
  "Co-Director": 1,
  Writer: 2,
  Screenplay: 3,
  Story: 4,
  Novel: 5,
  Characters: 6,
  "Executive Producer": 7,
  Producer: 8,
  "Co-Producer": 9,
  "Associate Producer": 10,
  "Director of Photography": 11,
  Cinematography: 12,
  Editor: 13,
  "Original Music Composer": 14,
  Music: 15,
  "Production Design": 16,
  "Art Direction": 17,
  "Costume Design": 18,
  Casting: 19,
};

/**
 * Crew strip — one card per person with roles merged
 * (e.g. "Director · Writer" instead of repeating the same face).
 */
function mapCrew(crew: NonNullable<TmdbMovieDetails["credits"]>["crew"]): PersonCredit[] {
  type Acc = {
    id: string;
    creditId?: string;
    name: string;
    profilePath: string | null;
    department: string | null;
    jobs: string[];
    bestRank: number;
  };

  const byPerson = new Map<string, Acc>();

  for (const c of crew ?? []) {
    if (!c.job?.trim()) continue;
    const id = String(c.id);
    const job = c.job.trim();
    const rank = CREW_JOB_RANK[job] ?? 50;
    const existing = byPerson.get(id);

    if (!existing) {
      byPerson.set(id, {
        id,
        creditId: c.credit_id,
        name: c.name,
        profilePath: c.profile_path,
        department: c.department ?? null,
        jobs: [job],
        bestRank: rank,
      });
      continue;
    }

    if (!existing.jobs.includes(job)) {
      existing.jobs.push(job);
    }
    if (rank < existing.bestRank) {
      existing.bestRank = rank;
      // Prefer the higher-priority credit id / department / photo
      existing.creditId = c.credit_id ?? existing.creditId;
      if (c.profile_path) existing.profilePath = c.profile_path;
      if (c.department) existing.department = c.department;
    }
  }

  // Sort jobs on each person by rank for a readable label
  const jobRank = (j: string) => CREW_JOB_RANK[j] ?? 50;

  return [...byPerson.values()]
    .map((p) => {
      const jobs = [...p.jobs].sort((a, b) => jobRank(a) - jobRank(b));
      return {
        id: p.id,
        creditId: p.creditId,
        name: p.name,
        job: jobs.slice(0, 3).join(" · "),
        department: p.department,
        profilePath: p.profilePath,
        _rank: p.bestRank as number | undefined,
      };
    })
    .sort((a, b) => (a._rank ?? 50) - (b._rank ?? 50) || a.name.localeCompare(b.name))
    .slice(0, 24)
    .map(({ _rank: _r, ...credit }) => {
      void _r;
      return credit as PersonCredit;
    });
}

function preferredWatchRegions(): string[] {
  const env =
    process.env.WATCH_REGION?.trim().toUpperCase() ||
    process.env.NEXT_PUBLIC_WATCH_REGION?.trim().toUpperCase() ||
    "US";
  // Prefer configured region, then common markets with good JustWatch coverage
  const order = [env, "US", "IN", "GB", "CA", "AU", "DE", "FR", "BR", "MX"];
  return [...new Set(order)];
}

/**
 * Map TMDB watch/providers → domain streaming availability.
 * Picks the best region with real offers (flatrate preferred).
 */
export function mapWatchProviders(
  data: TmdbWatchProviders | undefined,
  region?: string,
): StreamingAvailability | null {
  const results = data?.results;
  if (!results || !Object.keys(results).length) {
    return {
      region: region ?? preferredWatchRegions()[0] ?? "US",
      providers: [],
      isPlaceholder: true,
    };
  }

  const tryRegions = [
    ...(region ? [region.toUpperCase()] : []),
    ...preferredWatchRegions(),
    ...Object.keys(results),
  ];
  const seen = new Set<string>();
  let chosenKey: string | null = null;
  let bestScore = -1;

  for (const key of tryRegions) {
    if (seen.has(key) || !results[key]) continue;
    seen.add(key);
    const block = results[key];
    const flat = block.flatrate?.length ?? 0;
    const free = (block.free?.length ?? 0) + (block.ads?.length ?? 0);
    const other = (block.rent?.length ?? 0) + (block.buy?.length ?? 0);
    // Prefer subscription / free over rent-buy only
    const score = flat * 100 + free * 40 + other;
    if (score > bestScore) {
      bestScore = score;
      chosenKey = key;
    }
    // Early exit if preferred region has solid flatrate coverage
    if (
      preferredWatchRegions().includes(key) &&
      flat > 0 &&
      key === (region?.toUpperCase() ?? preferredWatchRegions()[0])
    ) {
      break;
    }
  }

  if (!chosenKey || bestScore <= 0) {
    return {
      region: preferredWatchRegions()[0] ?? "US",
      providers: [],
      isPlaceholder: true,
    };
  }

  const regionData = results[chosenKey];
  if (!regionData) {
    return {
      region: chosenKey,
      providers: [],
      isPlaceholder: true,
    };
  }

  const mapOffer = (
    list:
      | {
          provider_id: number;
          provider_name: string;
          logo_path: string | null;
          display_priority?: number;
        }[]
      | undefined,
    offerType: StreamingOfferType,
  ): StreamingProvider[] =>
    (list ?? []).map((p) => ({
      id: String(p.provider_id),
      name: p.provider_name,
      logoPath: p.logo_path,
      offerType,
      displayPriority: p.display_priority,
    }));

  const providers = [
    ...mapOffer(regionData.flatrate, "flatrate"),
    ...mapOffer(regionData.free, "free"),
    ...mapOffer(regionData.ads, "ads"),
    ...mapOffer(regionData.rent, "rent"),
    ...mapOffer(regionData.buy, "buy"),
  ].sort((a, b) => (a.displayPriority ?? 99) - (b.displayPriority ?? 99));

  return {
    region: chosenKey,
    link: regionData.link ?? null,
    providers,
    isPlaceholder: providers.length === 0,
  };
}

export function mapMovieDetails(raw: TmdbMovieDetails): MovieDetails {
  const images: MediaImage[] = [
    ...(raw.images?.backdrops ?? []).slice(0, 20).map((i) => mapImage(i, "backdrop")),
    ...(raw.images?.posters ?? []).slice(0, 20).map((i) => mapImage(i, "poster")),
    ...(raw.images?.logos ?? []).slice(0, 10).map((i) => mapImage(i, "logo")),
  ];

  const logo =
    raw.images?.logos?.find((l) => l.iso_639_1 === "en") ?? raw.images?.logos?.[0];

  const summary = mapMediaSummary(raw, "movie");

  return {
    ...summary,
    mediaType: "movie",
    tagline: raw.tagline ?? null,
    runtime: raw.runtime ?? null,
    status: raw.status ?? null,
    budget: raw.budget ?? null,
    revenue: raw.revenue ?? null,
    homepage: raw.homepage ?? null,
    imdbId: raw.imdb_id ?? raw.external_ids?.imdb_id ?? null,
    certification: pickCertification(raw.release_dates),
    genres: (raw.genres ?? []).map(mapGenre),
    productionCompanies: (raw.production_companies ?? []).map((c) => ({
      id: String(c.id),
      name: c.name,
      logoPath: c.logo_path,
      originCountry: c.origin_country ?? null,
    })),
    productionCountries: (raw.production_countries ?? []).map((c) => ({
      code: c.iso_3166_1,
      name: c.name,
    })),
    spokenLanguages: (raw.spoken_languages ?? []).map((l) => ({
      code: l.iso_639_1,
      name: l.name,
      englishName: l.english_name,
    })),
    keywords: (raw.keywords?.keywords ?? []).map((k) => ({
      id: String(k.id),
      name: k.name,
    })),
    collection: raw.belongs_to_collection
      ? {
          id: String(raw.belongs_to_collection.id),
          name: raw.belongs_to_collection.name,
          posterPath: raw.belongs_to_collection.poster_path,
          backdropPath: raw.belongs_to_collection.backdrop_path,
        }
      : null,
    cast: mapCast(raw.credits?.cast),
    crew: mapCrew(raw.credits?.crew),
    images,
    videos: (raw.videos?.results ?? []).map(mapVideo),
    recommendations: (raw.recommendations?.results ?? [])
      .slice(0, 18)
      .map((i) => mapMediaSummary(i, "movie")),
    similar: (raw.similar?.results ?? [])
      .slice(0, 18)
      .map((i) => mapMediaSummary(i, "movie")),
    ratings: buildModularRatings(raw.vote_average, raw.vote_count),
    streaming: mapWatchProviders(raw["watch/providers"]),
    logoPath: logo?.file_path ?? null,
  };
}

export function mapTvDetails(raw: TmdbTvDetails): TvDetails {
  const images: MediaImage[] = [
    ...(raw.images?.backdrops ?? []).slice(0, 20).map((i) => mapImage(i, "backdrop")),
    ...(raw.images?.posters ?? []).slice(0, 20).map((i) => mapImage(i, "poster")),
    ...(raw.images?.logos ?? []).slice(0, 10).map((i) => mapImage(i, "logo")),
  ];
  const logo =
    raw.images?.logos?.find((l) => l.iso_639_1 === "en") ?? raw.images?.logos?.[0];

  return {
    id: String(raw.id),
    mediaType: "tv",
    title: raw.name ?? "Untitled",
    originalTitle: raw.original_name ?? null,
    overview: raw.overview ?? null,
    posterPath: raw.poster_path,
    backdropPath: raw.backdrop_path,
    releaseDate: raw.first_air_date ?? null,
    firstAirDate: raw.first_air_date ?? null,
    lastAirDate: raw.last_air_date ?? null,
    voteAverage: raw.vote_average ?? null,
    voteCount: raw.vote_count ?? null,
    popularity: raw.popularity ?? null,
    adult: raw.adult,
    originalLanguage: raw.original_language ?? null,
    tagline: raw.tagline ?? null,
    status: raw.status ?? null,
    type: raw.type ?? null,
    numberOfSeasons: raw.number_of_seasons ?? null,
    numberOfEpisodes: raw.number_of_episodes ?? null,
    episodeRunTime: raw.episode_run_time ?? [],
    inProduction: raw.in_production,
    homepage: raw.homepage ?? null,
    imdbId: raw.external_ids?.imdb_id ?? null,
    certification: pickTvCertification(raw.content_ratings),
    genres: (raw.genres ?? []).map(mapGenre),
    networks: (raw.networks ?? []).map((n) => ({
      id: String(n.id),
      name: n.name,
      logoPath: n.logo_path,
      originCountry: n.origin_country ?? null,
    })),
    productionCompanies: (raw.production_companies ?? []).map((c) => ({
      id: String(c.id),
      name: c.name,
      logoPath: c.logo_path,
      originCountry: c.origin_country ?? null,
    })),
    productionCountries: (raw.production_countries ?? []).map((c) => ({
      code: c.iso_3166_1,
      name: c.name,
    })),
    spokenLanguages: (raw.spoken_languages ?? []).map((l) => ({
      code: l.iso_639_1,
      name: l.name,
      englishName: l.english_name,
    })),
    keywords: (raw.keywords?.results ?? []).map((k) => ({
      id: String(k.id),
      name: k.name,
    })),
    createdBy: (raw.created_by ?? []).map((c) => ({
      id: String(c.id),
      creditId: c.credit_id,
      name: c.name,
      profilePath: c.profile_path,
      job: "Creator",
    })),
    cast: mapCast(raw.credits?.cast),
    crew: mapCrew(raw.credits?.crew),
    seasons: (raw.seasons ?? [])
      .filter((s) => s.season_number > 0)
      .map((s) => ({
        id: String(s.id),
        seasonNumber: s.season_number,
        name: s.name,
        overview: s.overview ?? null,
        airDate: s.air_date ?? null,
        episodeCount: s.episode_count ?? null,
        posterPath: s.poster_path,
      })),
    images,
    videos: (raw.videos?.results ?? []).map(mapVideo),
    recommendations: (raw.recommendations?.results ?? [])
      .slice(0, 18)
      .map((i) => mapMediaSummary(i, "tv")),
    similar: (raw.similar?.results ?? [])
      .slice(0, 18)
      .map((i) => mapMediaSummary(i, "tv")),
    ratings: buildModularRatings(raw.vote_average, raw.vote_count),
    streaming: mapWatchProviders(raw["watch/providers"]),
    logoPath: logo?.file_path ?? null,
  };
}

export function mapSeason(raw: TmdbSeasonDetails): TvSeason {
  const episodes: TvEpisode[] = (raw.episodes ?? []).map((e) => ({
    id: String(e.id),
    episodeNumber: e.episode_number,
    seasonNumber: e.season_number,
    name: e.name,
    overview: e.overview ?? null,
    airDate: e.air_date ?? null,
    runtime: e.runtime ?? null,
    stillPath: e.still_path,
    voteAverage: e.vote_average ?? null,
    voteCount: e.vote_count ?? null,
  }));

  return {
    id: String(raw.id),
    seasonNumber: raw.season_number,
    name: raw.name,
    overview: raw.overview ?? null,
    airDate: raw.air_date ?? null,
    episodeCount: episodes.length || null,
    posterPath: raw.poster_path,
    episodes,
  };
}

export function mapPersonDetails(raw: TmdbPersonDetails): PersonDetails {
  const castCredits = (raw.combined_credits?.cast ?? [])
    .filter((c) => c.media_type === "movie" || c.media_type === "tv")
    .sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0));

  const movieCredits: PersonCredit[] = castCredits
    .filter((c) => c.media_type === "movie")
    .map((c) => ({
      id: String(c.id),
      creditId: c.credit_id,
      name: c.title ?? c.name ?? "Untitled",
      character: c.character ?? null,
      profilePath: null,
      mediaType: "movie" as const,
      title: c.title ?? c.name,
      releaseDate: c.release_date ?? null,
      posterPath: c.poster_path,
      popularity: c.popularity,
      order: c.order,
    }));

  const tvCredits: PersonCredit[] = castCredits
    .filter((c) => c.media_type === "tv")
    .map((c) => ({
      id: String(c.id),
      creditId: c.credit_id,
      name: c.name ?? c.title ?? "Untitled",
      character: c.character ?? null,
      profilePath: null,
      mediaType: "tv" as const,
      title: c.name ?? c.title,
      releaseDate: c.first_air_date ?? null,
      posterPath: c.poster_path,
      popularity: c.popularity,
      order: c.order,
    }));

  const knownFor: MediaSummary[] = castCredits.slice(0, 12).map((c) =>
    mapMediaSummary(c, c.media_type === "tv" ? "tv" : "movie"),
  );

  return {
    id: String(raw.id),
    mediaType: "person",
    name: raw.name,
    biography: raw.biography ?? null,
    birthday: raw.birthday ?? null,
    deathday: raw.deathday ?? null,
    placeOfBirth: raw.place_of_birth ?? null,
    knownForDepartment: raw.known_for_department ?? null,
    gender: raw.gender ?? null,
    popularity: raw.popularity ?? null,
    profilePath: raw.profile_path,
    homepage: raw.homepage ?? null,
    imdbId: raw.imdb_id ?? raw.external_ids?.imdb_id ?? null,
    alsoKnownAs: raw.also_known_as ?? [],
    movieCredits,
    tvCredits,
    images: (raw.images?.profiles ?? []).slice(0, 24).map((i) => mapImage(i, "profile")),
    knownFor,
  };
}

export function mapCollection(raw: TmdbCollectionDetails): CollectionDetails {
  const parts = (raw.parts ?? [])
    .map((p) => mapMediaSummary(p, "movie"))
    .sort((a, b) => (a.releaseDate ?? "").localeCompare(b.releaseDate ?? ""));

  return {
    id: String(raw.id),
    mediaType: "collection",
    name: raw.name,
    overview: raw.overview ?? null,
    posterPath: raw.poster_path,
    backdropPath: raw.backdrop_path,
    parts,
  };
}

export function mapSearchResponse(
  query: string,
  multi: TmdbPaginated<TmdbMultiResult>,
  collections: TmdbPaginated<{ id: number; name: string; poster_path: string | null }> | null,
  companies: TmdbPaginated<{ id: number; name: string; logo_path: string | null }> | null,
  genres: Genre[],
): SearchResponse {
  const results: SearchResultItem[] = [];

  for (const item of multi.results) {
    if (item.media_type === "movie") {
      const year = item.release_date?.slice(0, 4) ?? null;
      results.push({
        id: String(item.id),
        kind: "movie",
        title: item.title ?? "Untitled",
        subtitle: year ? `Movie · ${year}` : "Movie",
        imagePath: item.poster_path ?? null,
        year,
        mediaType: "movie",
        popularity: item.popularity,
        href: mediaHref("movie", item.id),
      });
    } else if (item.media_type === "tv") {
      const year = item.first_air_date?.slice(0, 4) ?? null;
      results.push({
        id: String(item.id),
        kind: "tv",
        title: item.name ?? "Untitled",
        subtitle: year ? `TV · ${year}` : "TV Series",
        imagePath: item.poster_path ?? null,
        year,
        mediaType: "tv",
        popularity: item.popularity,
        href: mediaHref("tv", item.id),
      });
    } else if (item.media_type === "person") {
      results.push({
        id: String(item.id),
        kind: "person",
        title: item.name ?? "Unknown",
        subtitle: item.known_for_department ?? "Person",
        imagePath: item.profile_path ?? null,
        popularity: item.popularity,
        href: mediaHref("person", item.id),
      });
    }
  }

  for (const c of collections?.results ?? []) {
    results.push({
      id: String(c.id),
      kind: "collection",
      title: c.name,
      subtitle: "Collection",
      imagePath: c.poster_path,
      href: mediaHref("collection", c.id),
    });
  }

  for (const c of companies?.results ?? []) {
    results.push({
      id: String(c.id),
      kind: "company",
      title: c.name,
      subtitle: "Company",
      imagePath: c.logo_path,
      href: `/discover?company=${c.id}`,
    });
  }

  const q = query.toLowerCase().trim();
  if (q.length >= 2) {
    for (const g of genres) {
      if (g.name.toLowerCase().includes(q)) {
        results.push({
          id: g.id,
          kind: "genre",
          title: g.name,
          subtitle: "Genre",
          imagePath: null,
          href: mediaHref("genre", g.id),
        });
      }
    }
  }

  return {
    query,
    results,
    totalResults: results.length,
  };
}
