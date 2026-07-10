import type { Metadata } from "next";
import Link from "next/link";

import { CatalogConfigBanner } from "@/features/media/components/catalog-config-banner";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getMovieGenres, getTvGenres, isCatalogConfigured } from "@/lib/media/catalog";
import { mediaHref } from "@/lib/media/routes";

export const metadata: Metadata = {
  title: "Genres",
  description: "Browse movies and TV by genre",
};

export default async function GenresPage() {
  if (!isCatalogConfigured()) {
    return (
      <div className="space-y-6">
        <Header />
        <CatalogConfigBanner />
      </div>
    );
  }

  const [movieGenres, tvGenres] = await Promise.all([getMovieGenres(), getTvGenres()]);

  return (
    <div className="space-y-10 animate-fade-up">
      <Header />

      <section className="space-y-4">
        <h2 className="font-display text-lg font-semibold tracking-tight">Movie genres</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {movieGenres.map((g) => (
            <Link key={`m-${g.id}`} href={`${mediaHref("genre", g.id)}?type=movie`}>
              <Card className="h-full transition-colors hover:border-primary/40 hover:bg-card/80">
                <CardHeader className="p-4">
                  <CardTitle className="text-base">{g.name}</CardTitle>
                  <CardDescription>Movies</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-lg font-semibold tracking-tight">TV genres</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {tvGenres.map((g) => (
            <Link key={`t-${g.id}`} href={`${mediaHref("genre", g.id)}?type=tv`}>
              <Card className="h-full transition-colors hover:border-primary/40 hover:bg-card/80">
                <CardHeader className="p-4">
                  <CardTitle className="text-base">{g.name}</CardTitle>
                  <CardDescription>TV Shows</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function Header() {
  return (
    <header className="space-y-1">
      <h1 className="font-display text-2xl font-semibold tracking-tight">Genres</h1>
      <p className="text-sm text-muted-foreground">
        Dive into a mood — from science fiction to horror.
      </p>
    </header>
  );
}
