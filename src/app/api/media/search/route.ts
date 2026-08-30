import { NextResponse, type NextRequest } from "next/server";

import { isCatalogConfigured, searchCatalog } from "@/lib/media/catalog";
import {
  RATE_LIMITS,
  checkRateLimit,
  rateLimitedResponse,
  requireApiUser,
} from "@/lib/api/guard";

/**
 * GET /api/media/search?q=
 * Universal catalog search for the command palette.
 *
 * Session-gated: the only caller is the palette inside the authenticated shell,
 * and one request here fans out into several upstream TMDB calls.
 */
export async function GET(request: NextRequest) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;

  const limit = checkRateLimit(
    "search",
    auth.userId,
    RATE_LIMITS.search.limit,
    RATE_LIMITS.search.windowMs,
  );
  if (!limit.ok) return rateLimitedResponse(limit.retryAfterSeconds);

  if (!isCatalogConfigured()) {
    return NextResponse.json(
      {
        query: "",
        results: [],
        totalResults: 0,
        error: "Search is unavailable right now.",
      },
      { status: 503 },
    );
  }

  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 1) {
    return NextResponse.json({ query: q, results: [], totalResults: 0 });
  }

  try {
    const pageRaw = Number(request.nextUrl.searchParams.get("page") ?? "1");
    // Clamp rather than trust: an arbitrary page number is passed straight to
    // the provider, and a huge or negative value is a wasted upstream call.
    const page = Number.isFinite(pageRaw)
      ? Math.min(Math.max(1, Math.trunc(pageRaw)), 500)
      : 1;
    const data = await searchCatalog(q, page);
    return NextResponse.json(data, {
      headers: {
        // Per-user results are not involved, but the response is now behind a
        // session, so keep it off shared caches.
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (error) {
    // Logged server-side with detail; the client gets a fixed string. The raw
    // message here comes from the upstream provider and has included request
    // paths and configuration hints.
    console.error("[api/media/search]", error);
    return NextResponse.json(
      {
        query: q,
        results: [],
        totalResults: 0,
        error: "Search failed. Please try again.",
      },
      { status: 502 },
    );
  }
}
