import type { Metadata } from "next";
import { Suspense } from "react";

import { MediaGrid } from "@/features/media/components/media-grid";
import { FilterBar } from "@/features/media/components/filter-bar";
import { ImdbTopGrid } from "@/features/media/components/imdb-top-grid";
import { MediaShelfTabs } from "@/features/media/components/media-shelf-tabs";
import { PaginationControls } from "@/features/media/components/pagination-controls";
import { CatalogConfigBanner } from "@/features/media/components/catalog-config-banner";
import { discoverMovies, getMovieGenres, isCatalogConfigured } from "@/lib/media/catalog";
import { getMediaProvider } from "@/lib/media/providers";
import { parseDiscoverFilters } from "@/lib/media/filters";
import { getImdbTopRated, PAGE_SIZE } from "@/lib/media/imdb-top";

export const metadata: Metadata = {
  title: "Movies",
  description: "Browse and filter movies on Argus",
};

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function MoviesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const configured = isCatalogConfigured();

  if (!configured) {
    return (
      <div className="space-y-6">
        <Header />
        <CatalogConfigBanner />
      </div>
    );
  }

  const section = typeof params.section === "string" ? params.section : undefined;
  const pageParam = typeof params.page === "string" ? Number(params.page) || 1 : 1;

  const flatParams: Record<string, string | undefined> = {};
  Object.entries(params).forEach(([k, v]) => {
    flatParams[k] = Array.isArray(v) ? v[0] : v;
  });

  const tabs = [
    { label: "Browse", href: "/movies", active: section !== "top_rated" },
    {
      label: "Top Rated",
      href: "/movies?section=top_rated",
      active: section === "top_rated",
    },
  ];

  /* Top-rated shelf — a fixed ranked list, so the filter bar does not apply. */
  if (section === "top_rated") {
    const top = await getImdbTopRated("movie", pageParam);

    return (
      <div className="animate-fade-up space-y-6">
        <Header />
        <MediaShelfTabs tabs={tabs} />
        <p className="text-muted-foreground text-sm">
          {top.imdbEnabled
            ? "The highest-rated films in the catalog, ordered by their IMDb score."
            : "The highest-rated films in the catalog. IMDb scores are unavailable right now, so this is showing audience-score order."}
        </p>
        <ImdbTopGrid
          items={top.items}
          startRank={(top.page - 1) * PAGE_SIZE + 1}
          imdbEnabled={top.imdbEnabled}
        />
        <PaginationControls
          page={top.page}
          totalPages={top.totalPages}
          basePath="/movies"
          searchParams={flatParams}
        />
      </div>
    );
  }

  const filters = parseDiscoverFilters(params, { mediaType: "movie" });
  const provider = getMediaProvider();

  let genres: Awaited<ReturnType<typeof getMovieGenres>> = [];
  let result = {
    page: 1,
    totalPages: 0,
    totalResults: 0,
    results: [] as Awaited<ReturnType<typeof discoverMovies>>["results"],
  };
  let loadError: string | null = null;

  try {
    const [g, r] = await Promise.all([
      getMovieGenres(),
      section === "now_playing"
        ? provider.getNowPlayingMovies(filters.page)
        : section === "upcoming"
          ? provider.getUpcomingMovies(filters.page)
          : discoverMovies(filters),
    ]);
    genres = g;
    result = r;
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Failed to load movies";
  }

  return (
    <div className="animate-fade-up space-y-6">
      <Header />
      <MediaShelfTabs tabs={tabs} />
      {loadError ? (
        <p className="text-destructive text-sm" role="alert">
          {loadError}
        </p>
      ) : null}
      <Suspense fallback={null}>
        <FilterBar genres={genres} showRuntime />
      </Suspense>
      <MediaGrid items={result.results} />
      <PaginationControls
        page={result.page}
        totalPages={result.totalPages}
        basePath="/movies"
        searchParams={flatParams}
      />
    </div>
  );
}

function Header() {
  return (
    <header className="space-y-1">
      <h1 className="font-display text-2xl font-semibold tracking-tight">Movies</h1>
      <p className="text-muted-foreground text-sm">
        Filter by genre, year, language, rating, and more.
      </p>
    </header>
  );
}
