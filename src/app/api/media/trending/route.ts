import { NextResponse } from "next/server";

import { getMediaProvider } from "@/lib/media/providers";
import { isCatalogConfigured } from "@/lib/media/catalog";

/**
 * Trending titles for command palette empty state.
 */
export async function GET() {
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
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      },
    );
  } catch (error) {
    console.error("[api/media/trending]", error);
    return NextResponse.json({ results: [] }, { status: 500 });
  }
}
