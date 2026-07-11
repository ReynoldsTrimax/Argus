/**
 * Assembles the authenticated home dashboard payload.
 */

import { loadIntelligenceData } from "@/lib/intelligence/load-profile";
import { computeUserStats } from "@/lib/intelligence/stats-engine";
import { generateInsights } from "@/lib/intelligence/insights";
import { getRecommendations } from "@/lib/intelligence/recommendations";
import type { DashboardPayload } from "@/types/intelligence";
import {
  getContinueWatching,
  listLibrary,
} from "@/lib/library/entries";
import { getMediaProvider } from "@/lib/media/providers";
import { isCatalogConfigured } from "@/lib/media/catalog";
import type { LibraryEntry } from "@/types/library";

export async function getDashboardPayload(
  userId: string,
): Promise<DashboardPayload> {
  const data = await loadIntelligenceData(userId);
  const stats = computeUserStats(data);
  const insights = generateInsights(stats, data);

  const [
    continueWatching,
    recentlyWatched,
    planToWatch,
    dropped,
    favorites,
    recommendations,
  ] = await Promise.all([
    getContinueWatching(userId, 8),
    // Only completed — fixed size so the rail doesn't feel endless
    listLibrary(userId, {
      status: "completed",
      sort: "last_watched",
      pageSize: 8,
    }),
    listLibrary(userId, { status: "plan_to_watch", pageSize: 8, sort: "added" }),
    listLibrary(userId, { status: "dropped", pageSize: 8, sort: "updated" }),
    listLibrary(userId, { status: "favorites", pageSize: 8, sort: "rating" }),
    getRecommendations(stats, data.entries, 12),
  ]);

  const recentlyRated = data.entries
    .filter((e) => e.user_rating != null)
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .slice(0, 8);

  const entryMap = new Map(data.entries.map((e) => [e.id, e]));
  const recentlyReviewed = data.reviews
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .slice(0, 6)
    .map((r) => {
      const entry = entryMap.get(r.entry_id);
      return entry
        ? { entry, reviewPreview: r.body.slice(0, 140) }
        : null;
    })
    .filter(Boolean) as { entry: LibraryEntry; reviewPreview: string }[];

  const pinnedCollections = data.collections
    .filter((c) => c.is_pinned)
    .concat(data.collections.filter((c) => !c.is_pinned))
    .slice(0, 6);

  let trending: DashboardPayload["trending"] = [];
  let newReleases: DashboardPayload["newReleases"] = [];
  let upcoming: DashboardPayload["upcoming"] = [];

  if (isCatalogConfigured()) {
    try {
      const provider = getMediaProvider();
      const [t, now, up] = await Promise.all([
        provider.getTrending("all", "day"),
        provider.getNowPlayingMovies(),
        provider.getUpcomingMovies(),
      ]);
      trending = t.results.slice(0, 12);
      newReleases = now.results.slice(0, 12);
      upcoming = up.results.slice(0, 12);
    } catch (e) {
      console.error("[dashboard] catalog rails", e);
    }
  }

  // Merge favorites into watchlist highlights if plan-to-watch is empty
  const watchlistItems =
    planToWatch.items.length > 0 ? planToWatch.items : favorites.items;

  return {
    stats,
    insights,
    continueWatching,
    recentlyWatched: recentlyWatched.items.slice(0, 8),
    planToWatch: planToWatch.items.slice(0, 8),
    dropped: dropped.items.slice(0, 8),
    watchlist: watchlistItems.slice(0, 8),
    recentlyRated,
    recentlyReviewed,
    pinnedCollections,
    recommendations,
    activity: data.activity.slice(0, 10),
    trending,
    newReleases,
    upcoming,
  };
}
