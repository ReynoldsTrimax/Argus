import { NextResponse, type NextRequest } from "next/server";

import { getTvSeason, isCatalogConfigured } from "@/lib/media/catalog";
import {
  RATE_LIMITS,
  checkRateLimit,
  rateLimitedResponse,
  requireApiUser,
} from "@/lib/api/guard";

interface RouteContext {
  params: Promise<{ showId: string; seasonNumber: string }>;
}

/**
 * GET /api/media/tv/:showId/season/:seasonNumber
 *
 * Session-gated; the only caller is the season list on a title page. Both path
 * segments reach the provider, so both are validated to the shapes TMDB uses
 * rather than passed through as arbitrary strings.
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;

  const limit = checkRateLimit(
    "season",
    auth.userId,
    RATE_LIMITS.season.limit,
    RATE_LIMITS.season.windowMs,
  );
  if (!limit.ok) return rateLimitedResponse(limit.retryAfterSeconds);

  if (!isCatalogConfigured()) {
    return NextResponse.json({ error: "Catalog not configured" }, { status: 503 });
  }

  const { showId, seasonNumber } = await context.params;

  // TMDB ids are numeric and season numbers are small non-negative integers.
  const validShowId = /^\d{1,12}$/.test(showId);
  const season = Number(seasonNumber);
  const validSeason = Number.isInteger(season) && season >= 0 && season <= 1000;

  if (!validShowId || !validSeason) {
    return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
  }

  try {
    const data = await getTvSeason(showId, season);
    if (!data) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    console.error("[api/media/tv/season]", error);
    return NextResponse.json({ error: "Failed to load season" }, { status: 502 });
  }
}
