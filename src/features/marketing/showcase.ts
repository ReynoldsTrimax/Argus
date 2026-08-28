import { getMediaProvider } from "@/lib/media/providers";
import { isCatalogConfigured } from "@/lib/media/catalog";
import { posterUrl } from "@/lib/media/image";
import type { MediaSummary } from "@/types/media";

/** A single poster tile on the landing page. */
export interface ShowcasePoster {
  id: string;
  title: string;
  posterUrl: string;
  /** Release year, shown as a mono caption. */
  year: string | null;
  /** Fallback gradient hue, used until/unless the image loads. */
  hue: number;
}

export interface LandingShowcase {
  /** Hero "continue watching" strip — 4 tiles. */
  hero: ShowcasePoster[];
  /** Library composition — 6 tiles. */
  library: ShowcasePoster[];
}

/** Gradient hues reused when TMDB is unavailable, so layout never shifts. */
const FALLBACK_HUES = [212, 232, 196, 250, 204, 222] as const;

const EMPTY_SHOWCASE: LandingShowcase = { hero: [], library: [] };

/**
 * Process-level cache for the showcase.
 *
 * The TMDB client talks to the API over `node:https` directly (it pins public
 * DNS to work around ISP resolvers that black-hole api.themoviedb.org), which
 * means it never touches `fetch` — so Next's Data Cache and the route's
 * `revalidate` do not apply to it and every render re-issued three live API
 * calls, costing ~600ms per request even on repeat views.
 *
 * Caching the resolved value here restores the intent of `revalidate = 3600`.
 * An in-flight promise is shared too, so concurrent renders on a cold cache
 * make one set of calls rather than one set each.
 */
const SHOWCASE_TTL_MS = 60 * 60 * 1000;

let cached: { value: LandingShowcase; expiresAt: number } | null = null;
let inFlight: Promise<LandingShowcase> | null = null;

function toPoster(item: MediaSummary, index: number): ShowcasePoster | null {
  const url = posterUrl(item.posterPath, "w342");
  if (!url) return null;

  return {
    id: `${item.mediaType}-${item.id}`,
    title: item.title,
    posterUrl: url,
    year: item.releaseDate ? item.releaseDate.slice(0, 4) : null,
    hue: FALLBACK_HUES[index % FALLBACK_HUES.length] ?? 212,
  };
}

/**
 * Trending + popular titles for the landing page's product visuals.
 *
 * Marketing surface only — it never blocks the page: any failure or a missing
 * TMDB key returns empty lists and the compositions fall back to their abstract
 * gradient tiles. Cached for an hour so the public landing page does not spend
 * a TMDB request per visitor.
 */
export async function getLandingShowcase(): Promise<LandingShowcase> {
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  if (inFlight) return inFlight;

  inFlight = fetchLandingShowcase()
    .then((value) => {
      // Only cache a real result; an empty list should be retried next request.
      if (value.hero.length > 0 || value.library.length > 0) {
        cached = { value, expiresAt: Date.now() + SHOWCASE_TTL_MS };
      }
      return value;
    })
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}

async function fetchLandingShowcase(): Promise<LandingShowcase> {
  if (!isCatalogConfigured()) return EMPTY_SHOWCASE;

  const provider = getMediaProvider();

  try {
    const [trending, popularMovies, popularTv] = await Promise.all([
      provider.getTrending("all", "day"),
      provider.getPopularMovies(),
      provider.getPopularTv(),
    ]);

    // Trending leads; popular movies and shows backfill so the strip is always
    // full even on a thin trending day.
    const seen = new Set<string>();
    const pool: ShowcasePoster[] = [];

    for (const item of [
      ...trending.results,
      ...popularMovies.results,
      ...popularTv.results,
    ]) {
      const key = `${item.mediaType}:${item.id}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const poster = toPoster(item, pool.length);
      if (poster) pool.push(poster);
      if (pool.length >= 10) break;
    }

    return {
      hero: pool.slice(0, 4),
      library: pool.slice(4, 10),
    };
  } catch (error) {
    console.warn(
      "[marketing] landing showcase failed:",
      error instanceof Error ? error.message : error,
    );
    return EMPTY_SHOWCASE;
  }
}
