/**
 * Authenticated entry point.
 *
 * This is the only place in the subsystem that touches identity, and it takes
 * the user from the Supabase session rather than from an argument the caller
 * chose. Nothing above it can ask for "recommendations for user X".
 *
 * Split by cost, as required by the page:
 *   - `getRecommendationsForCurrentUser` — expensive; profile + candidates + rank
 *   - the run cache below                — cheap; returns an already-built run
 */

import { getCurrentUser } from "@/lib/services/user-service";
import type { RecommendationRun } from "@/types/recommendations";

import { CACHE_TTL_MS, RUN_CACHE_MAX_USERS } from "./config";
import { type EngineDebugInfo, runRecommendationEngine } from "./engine";
import { loadRecommendationSignals } from "./load-signals";
import { fingerprintSignals } from "./taste-profile";
import { createTmdbCatalog } from "./tmdb-catalog";

export interface RecommendationsResult {
  run: RecommendationRun;
  /** Present only when the caller asked for debug output. */
  debug?: EngineDebugInfo;
  /** True when the run came from the per-user cache. */
  cached: boolean;
}

/* -------------------------------------------------------------------------- */
/* Per-user run cache                                                         */
/* -------------------------------------------------------------------------- */

interface CachedRun {
  fingerprint: string;
  expiresAt: number;
  run: RecommendationRun;
}

/**
 * Keyed by user id and validated against the library fingerprint, so rating a
 * film or dropping a show produces fresh recommendations on the next load
 * instead of waiting out the TTL. Values are per-user and never read across
 * users; the fingerprint is checked, not just the key, so a stale entry cannot
 * outlive the data it was built from.
 *
 * Process-local by design — the same reasoning as `cache.ts`: no infrastructure,
 * and a cache miss is only a slower page, never a wrong one.
 */
const runCache = new Map<string, CachedRun>();

function readRunCache(userId: string, fingerprint: string): RecommendationRun | null {
  const hit = runCache.get(userId);
  if (!hit) return null;
  if (hit.expiresAt <= Date.now() || hit.fingerprint !== fingerprint) {
    runCache.delete(userId);
    return null;
  }
  // Refresh insertion order for the eviction pass below.
  runCache.delete(userId);
  runCache.set(userId, hit);
  return hit.run;
}

function writeRunCache(userId: string, run: RecommendationRun): void {
  if (runCache.size >= RUN_CACHE_MAX_USERS) {
    const oldest = runCache.keys().next();
    if (!oldest.done) runCache.delete(oldest.value);
  }
  runCache.set(userId, {
    fingerprint: run.fingerprint,
    expiresAt: Date.now() + CACHE_TTL_MS.run,
    run,
  });
}

/* -------------------------------------------------------------------------- */
/* Service                                                                    */
/* -------------------------------------------------------------------------- */

export interface GetRecommendationsOptions {
  /**
   * Include per-candidate score breakdowns. Ignored in production builds —
   * scoring internals are a tuning tool, not a user-facing feature.
   */
  debug?: boolean;
}

/**
 * Recommendations for the signed-in user, or `null` when there is no session.
 *
 * Debug runs bypass the cache: an inspectable run has to be the one that was
 * just computed, otherwise the breakdown describes a different pool.
 */
export async function getRecommendationsForCurrentUser(
  options: GetRecommendationsOptions = {},
): Promise<RecommendationsResult | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const debug = Boolean(options.debug) && process.env.NODE_ENV !== "production";

  const data = await loadRecommendationSignals(user.id);
  const fingerprint = fingerprintSignals(data);

  if (!debug) {
    const cached = readRunCache(user.id, fingerprint);
    if (cached) return { run: cached, cached: true };
  }

  const { run, debug: debugInfo } = await runRecommendationEngine(
    data,
    createTmdbCatalog(),
    { includeFactors: debug },
  );

  if (!debug) writeRunCache(user.id, run);

  return { run, cached: false, ...(debug ? { debug: debugInfo } : {}) };
}
