import type { Metadata } from "next";
import { Suspense } from "react";

import { MediaGrid } from "@/features/media/components/media-grid";
import { MediaRow } from "@/features/media/components/media-row";
import { FilterBar } from "@/features/media/components/filter-bar";
import { PaginationControls } from "@/features/media/components/pagination-controls";
import { CatalogConfigBanner } from "@/features/media/components/catalog-config-banner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getGenrePage, isCatalogConfigured } from "@/lib/media/catalog";
import { parseDiscoverFilters } from "@/lib/media/filters";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  return { title: `Genre ${id}` };
}

export default async function GenreDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const raw = await searchParams;

  if (!isCatalogConfigured()) {
    return <CatalogConfigBanner />;
  }

  const typeParam = typeof raw.type === "string" ? raw.type : "movie";
  const mediaType = typeParam === "tv" ? "tv" : "movie";
  const filters = parseDiscoverFilters(raw, {
    mediaType,
    genreIds: [id],
  });

  const data = await getGenrePage(id, mediaType, filters);
  const title = data.genre?.name ?? "Genre";

  const flatParams: Record<string, string | undefined> = {};
  Object.entries(raw).forEach(([k, v]) => {
    flatParams[k] = Array.isArray(v) ? v[0] : v;
  });

  return (
    <div className="space-y-8 animate-fade-up">
      <header className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wider text-primary">Genre</p>
        <h1 className="font-display text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground">
          Featured, popular, top rated, and newest {mediaType === "tv" ? "shows" : "movies"}.
        </p>
      </header>

      <Suspense fallback={null}>
        <FilterBar />
      </Suspense>

      {data.featured.length ? (
        <MediaRow title="Featured" items={data.featured} priorityCount={3} />
      ) : null}

      <Tabs defaultValue="popular">
        <TabsList>
          <TabsTrigger value="popular">Popular</TabsTrigger>
          <TabsTrigger value="top">Highest rated</TabsTrigger>
          <TabsTrigger value="newest">Newest</TabsTrigger>
        </TabsList>
        <TabsContent value="popular" className="space-y-4">
          <MediaGrid items={data.popular.results} />
          <PaginationControls
            page={data.popular.page}
            totalPages={data.popular.totalPages}
            basePath={`/genre/${id}`}
            searchParams={flatParams}
          />
        </TabsContent>
        <TabsContent value="top">
          <MediaGrid items={data.topRated.results} />
        </TabsContent>
        <TabsContent value="newest">
          <MediaGrid items={data.newest.results} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
