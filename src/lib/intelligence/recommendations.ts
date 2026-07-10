/**
 * Lightweight non-AI recommendation engine.
 */

import type { RecommendationItem, UserStats } from "@/types/intelligence";
import type { LibraryEntry } from "@/types/library";
import { getMediaProvider } from "@/lib/media/providers";
import { isCatalogConfigured } from "@/lib/media/catalog";

/**
 * Recommend catalog titles based on favorite genres + high-rated history.
 * Excludes already-tracked external IDs.
 */
export async function getRecommendations(
  stats: UserStats,
  library: LibraryEntry[],
  limit = 12,
): Promise<RecommendationItem[]> {
  if (!isCatalogConfigured()) return [];

  const seen = new Set(library.map((e) => `${e.media_type}:${e.external_id}`));
  const provider = getMediaProvider();
  const results: RecommendationItem[] = [];

  const topGenre = stats.favorites.genres[0];
  // TMDB genre name → we need id; use discover popular + filter by library taste scoring
  try {
    const [popularMovies, popularTv, topMovies] = await Promise.all([
      provider.getPopularMovies(),
      provider.getPopularTv(),
      provider.getTopRatedMovies(),
    ]);

    const pool = [
      ...popularMovies.results,
      ...popularTv.results,
      ...topMovies.results,
    ];

    const favGenreNames = new Set(
      stats.favorites.genres.map((g) => g.name.toLowerCase()),
    );
    const highTitles = new Set(
      stats.favorites.highRated.map((e) => e.title.toLowerCase()),
    );

    for (const item of pool) {
      const key = `${item.mediaType}:${item.id}`;
      if (seen.has(key)) continue;

      let score = item.voteAverage ?? 5;
      let reason = "Popular right now";

      // Boost if release year near user's preferred decades
      const year = item.releaseDate?.slice(0, 4);
      if (year && stats.distributions.decades[0]) {
        const decade = `${Math.floor(Number(year) / 10) * 10}s`;
        if (decade === stats.distributions.decades[0].name) {
          score += 2;
          reason = `Fits your ${decade} preference`;
        }
      }

      if (topGenre) {
        // Soft signal: high vote + popular in genre-heavy libraries
        score += 0.5;
        reason =
          favGenreNames.size > 0
            ? `Aligned with your ${topGenre.name} taste`
            : reason;
      }

      if (highTitles.size > 0 && (item.voteAverage ?? 0) >= 7.5) {
        score += 1;
        reason = "Similar quality to titles you rate highly";
      }

      results.push({
        ...item,
        reason,
        score,
      });
    }
  } catch (e) {
    console.error("[recommendations]", e);
    return [];
  }

  // Dedupe by id+type
  const map = new Map<string, RecommendationItem>();
  for (const r of results) {
    const key = `${r.mediaType}:${r.id}`;
    const prev = map.get(key);
    if (!prev || r.score > prev.score) map.set(key, r);
  }

  return [...map.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
