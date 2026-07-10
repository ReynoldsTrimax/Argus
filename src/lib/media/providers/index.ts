/**
 * Media provider factory.
 * Swap or compose providers here without touching UI or feature code.
 */

import type { MediaProvider } from "@/lib/media/providers/types";
import { createTmdbProvider } from "@/lib/media/providers/tmdb/provider";

let cached: MediaProvider | null = null;

/**
 * Returns the active catalog provider (currently TMDB).
 * Future: multi-provider composition, A/B, or regional routing.
 */
export function getMediaProvider(): MediaProvider {
  if (!cached) {
    cached = createTmdbProvider();
  }
  return cached;
}

export type { MediaProvider } from "@/lib/media/providers/types";
