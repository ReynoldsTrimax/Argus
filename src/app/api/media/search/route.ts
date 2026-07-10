import { NextResponse, type NextRequest } from "next/server";

import { isCatalogConfigured, searchCatalog } from "@/lib/media/catalog";

/**
 * GET /api/media/search?q=
 * Universal catalog search for the command palette and future AI search.
 */
export async function GET(request: NextRequest) {
  if (!isCatalogConfigured()) {
    return NextResponse.json(
      {
        query: "",
        results: [],
        totalResults: 0,
        error: "TMDB is not configured",
      },
      { status: 503 },
    );
  }

  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 1) {
    return NextResponse.json({ query: q, results: [], totalResults: 0 });
  }

  try {
    const page = Number(request.nextUrl.searchParams.get("page") ?? "1") || 1;
    const data = await searchCatalog(q, page);
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    });
  } catch (error) {
    console.error("[api/media/search]", error);
    return NextResponse.json(
      {
        query: q,
        results: [],
        totalResults: 0,
        error: error instanceof Error ? error.message : "Search failed",
      },
      { status: 500 },
    );
  }
}
