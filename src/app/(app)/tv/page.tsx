import type { Metadata } from "next";
import { Suspense } from "react";

import { MediaGrid } from "@/features/media/components/media-grid";
import { FilterBar } from "@/features/media/components/filter-bar";
import { PaginationControls } from "@/features/media/components/pagination-controls";
import { CatalogConfigBanner } from "@/features/media/components/catalog-config-banner";
import { discoverTv, getTvGenres, isCatalogConfigured } from "@/lib/media/catalog";
import { parseDiscoverFilters } from "@/lib/media/filters";

export const metadata: Metadata = {
  title: "TV Shows",
  description: "Browse and filter TV series on Argus",
};

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function TvBrowsePage({ searchParams }: PageProps) {
  const params = await searchParams;

  if (!isCatalogConfigured()) {
    return (
      <div className="space-y-6">
        <Header />
        <CatalogConfigBanner />
      </div>
    );
  }

  const filters = parseDiscoverFilters(params, { mediaType: "tv" });

  let genres: Awaited<ReturnType<typeof getTvGenres>> = [];
  let result = {
    page: 1,
    totalPages: 0,
    totalResults: 0,
    results: [] as Awaited<ReturnType<typeof discoverTv>>["results"],
  };
  let loadError: string | null = null;

  try {
    const [g, r] = await Promise.all([getTvGenres(), discoverTv(filters)]);
    genres = g;
    result = r;
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Failed to load TV shows";
  }

  const flatParams: Record<string, string | undefined> = {};
  Object.entries(params).forEach(([k, v]) => {
    flatParams[k] = Array.isArray(v) ? v[0] : v;
  });

  return (
    <div className="space-y-6 animate-fade-up">
      <Header />
      {loadError ? (
        <p className="text-sm text-destructive" role="alert">
          {loadError}
        </p>
      ) : null}
      <Suspense fallback={null}>
        <FilterBar genres={genres} />
      </Suspense>
      <MediaGrid items={result.results} emptyTitle="No shows found" />
      <PaginationControls
        page={result.page}
        totalPages={result.totalPages}
        basePath="/tv"
        searchParams={flatParams}
      />
    </div>
  );
}

function Header() {
  return (
    <header className="space-y-1">
      <h1 className="font-display text-2xl font-semibold tracking-tight">TV Shows</h1>
      <p className="text-sm text-muted-foreground">
        Series, limited runs, and everything in between.
      </p>
    </header>
  );
}
