import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { Library, Search } from "lucide-react";

import { LibraryPosterCard } from "@/features/library/components/library-poster-card";
import { LibraryFilters } from "@/features/library/components/library-filters";
import { SmartFilters } from "@/features/library/components/smart-filters";
import { PaginationControls } from "@/features/media/components/pagination-controls";
import { EmptyState } from "@/components/feedback/empty-state";
import { Button } from "@/components/ui/button";
import { listLibrary } from "@/lib/library/entries";
import { getCurrentUser } from "@/lib/services/user-service";
import { ROUTES } from "@/constants/routes";
import type { LibraryEntry, LibraryListFilters } from "@/types/library";

export const metadata: Metadata = {
  title: "Library",
  description: "Your personal entertainment library",
};

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function applySmartFilters(
  items: LibraryEntry[],
  params: Record<string, string | undefined>,
): LibraryEntry[] {
  let list = items;
  const minRating = params.minRating ? Number(params.minRating) : null;
  const yearFrom = params.yearFrom ? Number(params.yearFrom) : null;
  const yearTo = params.yearTo ? Number(params.yearTo) : null;
  const genre = params.genre?.toLowerCase().trim();
  const maxRuntime = params.maxRuntime ? Number(params.maxRuntime) : null;

  if (minRating != null && !Number.isNaN(minRating)) {
    list = list.filter((e) => (e.user_rating ?? -1) >= minRating);
  }
  if (yearFrom != null && !Number.isNaN(yearFrom)) {
    list = list.filter((e) => {
      const y = Number(e.release_date?.slice(0, 4));
      return !Number.isNaN(y) && y >= yearFrom;
    });
  }
  if (yearTo != null && !Number.isNaN(yearTo)) {
    list = list.filter((e) => {
      const y = Number(e.release_date?.slice(0, 4));
      return !Number.isNaN(y) && y <= yearTo;
    });
  }
  if (genre) {
    list = list.filter((e) => {
      const genres = Array.isArray(e.metadata?.genres)
        ? (e.metadata.genres as string[])
        : [];
      return genres.some((g) => g.toLowerCase().includes(genre));
    });
  }
  if (maxRuntime != null && !Number.isNaN(maxRuntime)) {
    list = list.filter(
      (e) => e.runtime_minutes != null && e.runtime_minutes <= maxRuntime,
    );
  }
  return list;
}

export default async function LibraryPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();
  if (!user) return null;

  const params = await searchParams;
  const get = (k: string) => {
    const v = params[k];
    return Array.isArray(v) ? v[0] : v;
  };

  const filters: LibraryListFilters = {
    status: (get("status") as LibraryListFilters["status"]) ?? "all",
    mediaType: (get("type") as "movie" | "tv" | "all") ?? "all",
    q: get("q"),
    sort: (get("sort") as LibraryListFilters["sort"]) ?? "last_watched",
    page: 1,
    pageSize: 200,
  };

  const result = await listLibrary(user.id, filters);
  const flatParams: Record<string, string | undefined> = {};
  Object.entries(params).forEach(([k, v]) => {
    flatParams[k] = Array.isArray(v) ? v[0] : v;
  });

  const smart = applySmartFilters(result.items, flatParams);
  const page = Number(get("page") ?? "1") || 1;
  const pageSize = 24;
  const total = smart.length;
  const pageItems = smart.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="space-y-6 animate-fade-up">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="font-display text-2xl font-semibold tracking-tight">Library</h1>
          <p className="text-sm text-muted-foreground">
            Filter by status, rating, year, genre, runtime — answer questions about your
            taste.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={ROUTES.librarySearch}>
            <Search className="h-4 w-4" />
            Search library
          </Link>
        </Button>
      </header>

      <Suspense fallback={null}>
        <LibraryFilters />
      </Suspense>
      <Suspense fallback={null}>
        <SmartFilters />
      </Suspense>

      {pageItems.length === 0 ? (
        <EmptyState
          icon={Library}
          title="No matching titles"
          description="Try clearing smart filters or add titles from Discover."
        />
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            {total} title{total === 1 ? "" : "s"}
          </p>
          <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {pageItems.map((entry) => (
              <LibraryPosterCard key={entry.id} entry={entry} />
            ))}
          </div>
          <PaginationControls
            page={page}
            totalPages={Math.ceil(total / pageSize) || 1}
            basePath={ROUTES.library}
            searchParams={flatParams}
          />
        </>
      )}

      {pageItems.length === 0 ? (
        <div className="flex justify-center">
          <Button asChild>
            <Link href={ROUTES.discover}>Go to Discover</Link>
          </Button>
        </div>
      ) : null}
    </div>
  );
}
