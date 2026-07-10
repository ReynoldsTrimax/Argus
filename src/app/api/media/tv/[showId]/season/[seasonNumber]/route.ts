import { NextResponse, type NextRequest } from "next/server";

import { getTvSeason, isCatalogConfigured } from "@/lib/media/catalog";

interface RouteContext {
  params: Promise<{ showId: string; seasonNumber: string }>;
}

/**
 * GET /api/media/tv/:showId/season/:seasonNumber
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  if (!isCatalogConfigured()) {
    return NextResponse.json({ error: "Catalog not configured" }, { status: 503 });
  }

  const { showId, seasonNumber } = await context.params;
  const n = Number(seasonNumber);
  if (!showId || Number.isNaN(n)) {
    return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
  }

  try {
    const season = await getTvSeason(showId, n);
    if (!season) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(season, {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    console.error("[api/media/tv/season]", error);
    return NextResponse.json({ error: "Failed to load season" }, { status: 500 });
  }
}
