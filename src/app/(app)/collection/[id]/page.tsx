import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { MediaGrid } from "@/features/media/components/media-grid";
import { CatalogConfigBanner } from "@/features/media/components/catalog-config-banner";
import { getCollection, isCatalogConfigured } from "@/lib/media/catalog";
import { backdropUrl, posterUrl } from "@/lib/media/image";
import { formatDate, formatYear } from "@/lib/media/format";
import { Badge } from "@/components/ui/badge";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  if (!isCatalogConfigured()) return { title: "Collection" };
  try {
    const collection = await getCollection(id);
    if (!collection) return { title: "Not found" };
    return {
      title: collection.name,
      description: collection.overview?.slice(0, 160) ?? collection.name,
    };
  } catch {
    return { title: "Collection" };
  }
}

export default async function CollectionPage({ params }: PageProps) {
  const { id } = await params;

  if (!isCatalogConfigured()) {
    return <CatalogConfigBanner />;
  }

  const collection = await getCollection(id);
  if (!collection) notFound();

  const bg = backdropUrl(collection.backdropPath ?? collection.posterPath, "w1280");
  const poster = posterUrl(collection.posterPath, "w342");

  return (
    <div className="space-y-10 animate-fade-up">
      <section className="relative -mx-4 overflow-hidden sm:-mx-6 lg:-mx-8">
        <div className="absolute inset-0 h-72 sm:h-80">
          {bg ? (
            <Image src={bg} alt="" fill priority sizes="100vw" className="object-cover" />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background/40" />
        </div>

        <div className="relative content-container flex flex-col gap-6 pb-6 pt-20 sm:flex-row sm:items-end sm:pt-28">
          {poster ? (
            <div className="relative mx-auto aspect-[2/3] w-36 shrink-0 overflow-hidden rounded-xl border-0 shadow-xl sm:mx-0 sm:w-40">
              <Image src={poster} alt="" fill sizes="160px" className="object-cover" priority />
            </div>
          ) : null}
          <div className="space-y-2 text-center sm:text-left">
            <Badge variant="secondary">Collection</Badge>
            <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              {collection.name}
            </h1>
            {collection.overview ? (
              <p className="max-w-2xl text-sm text-muted-foreground text-pretty">
                {collection.overview}
              </p>
            ) : null}
            <p className="text-xs text-muted-foreground">
              {collection.parts.length} titles
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold tracking-tight">Timeline</h2>
        <ol className="relative space-y-3 border-l border-border pl-6">
          {collection.parts.map((part) => (
            <li key={part.id} className="relative">
              <span className="absolute -left-[1.7rem] top-1.5 h-2.5 w-2.5 rounded-full bg-primary shadow-glow" />
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <span className="text-xs font-medium tabular-nums text-primary">
                  {formatYear(part.releaseDate) ?? "TBA"}
                </span>
                <Link
                  href={`/movie/${part.id}`}
                  className="text-sm font-medium underline-offset-4 hover:underline"
                >
                  {part.title}
                </Link>
                {part.releaseDate ? (
                  <span className="text-xs text-muted-foreground">
                    {formatDate(part.releaseDate)}
                  </span>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold tracking-tight">Movies</h2>
        <MediaGrid items={collection.parts} emptyTitle="No movies in this collection" />
      </section>
    </div>
  );
}
