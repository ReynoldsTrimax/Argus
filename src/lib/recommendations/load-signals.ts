/**
 * Server-side signal loading.
 *
 * Reuses `loadIntelligenceData` for everything it already fetches — entries,
 * sessions, reviews, notes, tag assignments, episode progress — and adds only
 * the three tables it does not: status history (repeat drops), recently viewed
 * (browsing curiosity) and collection items (hand curation). Duplicating the
 * existing loader to add three queries would mean two definitions of "this
 * user's library" drifting apart.
 *
 * Every query is scoped by `user_id` on top of RLS. RLS is the layer that
 * actually enforces isolation; the explicit filter is there so a caller reading
 * this file can see the scope without going to the migration.
 */

import { createClient } from "@/lib/supabase/server";
import { table } from "@/lib/library/supabase-table";
import { loadIntelligenceData } from "@/lib/intelligence/load-profile";

import type {
  RecentlyViewedRow,
  RecommendationSignalData,
  StatusHistoryRow,
} from "./signals";

/** Row caps mirror `load-profile.ts` — bounded work per request. */
const LIMITS = {
  statusHistory: 5000,
  recentlyViewed: 200,
  collectionItems: 5000,
  hiddenTitles: 5000,
} as const;

export async function loadRecommendationSignals(
  userId: string,
): Promise<RecommendationSignalData> {
  const supabase = await createClient();

  const [base, statusHistoryRes, recentlyViewedRes, collectionItemsRes, hiddenRes] =
    await Promise.all([
      loadIntelligenceData(userId),
      table(supabase, "library_status_history")
        .select("entry_id, from_status, to_status, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(LIMITS.statusHistory),
      table(supabase, "recently_viewed")
        .select("provider, media_type, external_id, viewed_at")
        .eq("user_id", userId)
        .order("viewed_at", { ascending: false })
        .limit(LIMITS.recentlyViewed),
      table(supabase, "collection_items")
        .select("entry_id")
        .eq("user_id", userId)
        .limit(LIMITS.collectionItems),
      // `loadIntelligenceData` filters `is_hidden = false`, which is right for
      // stats — a hidden title should not shape the profile. It still must not be
      // recommended back, so the identities are fetched separately.
      table(supabase, "library_entries")
        .select("media_type, external_id")
        .eq("user_id", userId)
        .eq("is_hidden", true)
        .limit(LIMITS.hiddenTitles),
    ]);

  return {
    entries: base.entries,
    hiddenTitles: (hiddenRes.data ?? []) as RecommendationSignalData["hiddenTitles"],
    sessions: base.sessions.map((s) => ({
      entry_id: s.entry_id,
      is_rewatch: s.is_rewatch,
    })),
    reviews: base.reviews.map((r) => ({ entry_id: r.entry_id })),
    notes: base.notes.map((n) => ({ entry_id: n.entry_id })),
    tagAssignments: base.tagAssignments.map((t) => ({ entry_id: t.entry_id })),
    collectionItems: ((collectionItemsRes.data ?? []) as { entry_id: string }[]).map(
      (c) => ({ entry_id: c.entry_id }),
    ),
    statusHistory: (statusHistoryRes.data ?? []) as StatusHistoryRow[],
    recentlyViewed: (recentlyViewedRes.data ?? []) as RecentlyViewedRow[],
    episodeProgress: base.episodeProgress.map((e) => ({ entry_id: e.entry_id })),
  };
}
