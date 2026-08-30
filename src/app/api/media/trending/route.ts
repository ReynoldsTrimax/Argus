import { NextResponse } from "next/server";

import { getMediaProvider } from "@/lib/media/providers";
import { isCatalogConfigured } from "@/lib/media/catalog";
import {
  RATE_LIMITS,
  checkRateLimit,
  rateLimitedResponse,
  requireApiUser,
} from "@/lib/api/guard";

/**
 * Trending titles for the command palette empty state.
 * Session-gated for the same reason as search: it spends TMDB quota.
 */
export async function GET() {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;

  const limit = checkRateLimit(
    "trending",
    auth.userId,
    RATE_LIMITS.trending.limit,
    RATE_LIMITS.trending.windowMs,
  );
  if (!limit.ok) return rateLimitedResponse(limit.retryAfterSeconds);

  if (!isCatalogConfigured()) {
    return NextResponse.json({ results: [] }, { status: 503 });
  }

  try {
    const data = await getMediaProvider().getTrending("all", "day");
    return NextResponse.json(
      {
        results: data.results.slice(0, 8).map((item) => ({
          id: item.id,
          kind: item.mediaType,
          title: item.title,
          subtitle: item.mediaType === "tv" ? "TV" : "Movie",
          imagePath: item.posterPath,
          href: item.mediaType === "tv" ? `/tv/${item.id}` : `/movie/${item.id}`,
          popularity: item.popularity,
        })),
      },
      {
        headers: {
          "Cache-Control": "private, max-age=300",
        },
      },
    );
  } catch (error) {
    console.error("[api/media/trending]", error);
    return NextResponse.json({ results: [] }, { status: 502 });
  }
}
