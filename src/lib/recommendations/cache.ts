/**
 * Process-level TTL cache with in-flight request sharing.
 *
 * Why not Next's Data Cache: the TMDB client speaks to the API over
 * `node:https` directly (it pins public DNS to work around resolvers that
 * black-hole api.themoviedb.org), so it never touches `fetch` and neither
 * `revalidate` nor `unstable_cache` tags apply to it. `features/marketing/
 * showcase.ts` already solved this the same way for the landing page; this is
 * that pattern, generalized, because a recommendation run issues on the order
 * of twenty catalog calls instead of three.
 *
 * Sharing the in-flight promise matters as much as the TTL: on a cold cache,
 * two anchors whose similar-lists overlap, or two users hitting the page at
 * once, would otherwise each pay for the same request.
 *
 * Scope is one server process. That is deliberate — it needs no infrastructure,
 * survives the request boundary, and is correct under multiple instances since
 * every entry is derived from public catalog data with no user content in it.
 */

import { CATALOG_CACHE_MAX_ENTRIES } from "./config";

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class TtlCache {
  private readonly entries = new Map<string, CacheEntry<unknown>>();
  private readonly inFlight = new Map<string, Promise<unknown>>();

  constructor(private readonly maxEntries: number = CATALOG_CACHE_MAX_ENTRIES) {}

  /**
   * Resolve `key`, calling `load` only on a miss.
   *
   * A rejected load is not cached — a transient TMDB timeout must not blank a
   * lane for the whole TTL.
   */
  async resolve<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
    const hit = this.entries.get(key);
    if (hit && hit.expiresAt > Date.now()) {
      // Refresh insertion order so hot keys survive eviction.
      this.entries.delete(key);
      this.entries.set(key, hit);
      return hit.value as T;
    }

    const pending = this.inFlight.get(key);
    if (pending) return pending as Promise<T>;

    const promise = load()
      .then((value) => {
        this.set(key, value, ttlMs);
        return value;
      })
      .finally(() => {
        this.inFlight.delete(key);
      });

    this.inFlight.set(key, promise);
    return promise;
  }

  private set<T>(key: string, value: T, ttlMs: number): void {
    if (this.entries.size >= this.maxEntries) {
      // Insertion-ordered Map: the first key is the least recently used.
      const oldest = this.entries.keys().next();
      if (!oldest.done) this.entries.delete(oldest.value);
    }
    this.entries.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  /** Test / diagnostic helper. */
  size(): number {
    return this.entries.size;
  }

  clear(): void {
    this.entries.clear();
    this.inFlight.clear();
  }
}

/** Shared by every catalog read in the recommendation engine. */
export const catalogCache = new TtlCache();
