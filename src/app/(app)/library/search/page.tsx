import type { Metadata } from "next";
import Link from "next/link";

import { LibraryPosterCard } from "@/features/library/components/library-poster-card";
import { Input } from "@/components/ui/input";
import { searchLibrary } from "@/lib/library/entries";
import { getCurrentUser } from "@/lib/services/user-service";
import { ROUTES } from "@/constants/routes";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Search library",
};

interface PageProps {
  searchParams: Promise<{ q?: string }>;
}

/**
 * Personal library search — titles, notes, reviews, tags, collections.
 */
export default async function LibrarySearchPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();
  if (!user) return null;

  const { q = "" } = await searchParams;
  const results = q.trim() ? await searchLibrary(user.id, q) : null;

  return (
    <div className="space-y-8 animate-fade-up">
      <header className="space-y-3">
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Search your library
        </h1>
        <form>
          <Input
            name="q"
            defaultValue={q}
            placeholder="Search titles, notes, reviews, tags, collections…"
            className="max-w-xl"
            autoFocus
          />
        </form>
      </header>

      {!q.trim() ? (
        <p className="text-sm text-muted-foreground">
          Type a query and press Enter. This searches your own library, not the full
          catalog (use ⌘K for that).
        </p>
      ) : null}

      {results ? (
        <div className="space-y-8">
          <section className="space-y-3">
            <h2 className="text-sm font-semibold">
              Titles ({results.entries.length})
            </h2>
            {results.entries.length ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
                {results.entries.map((e) => (
                  <LibraryPosterCard key={e.id} entry={e} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No titles matched.</p>
            )}
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold">Notes ({results.notes.length})</h2>
            <ul className="space-y-2">
              {results.notes.map((n) => (
                <li
                  key={n.id}
                  className="rounded-lg border-0 bg-muted/40 dark:bg-white/[0.05] px-3 py-2 text-sm"
                >
                  {n.body}
                </li>
              ))}
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold">Reviews ({results.reviews.length})</h2>
            <ul className="space-y-2">
              {results.reviews.map((r) => (
                <li
                  key={r.id}
                  className="rounded-lg border-0 bg-muted/40 dark:bg-white/[0.05] px-3 py-2 text-sm line-clamp-3"
                >
                  {r.body}
                </li>
              ))}
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold">Tags</h2>
            <div className="flex flex-wrap gap-2">
              {results.tags.map((t) => (
                <Badge key={t.id} variant="secondary">
                  {t.name}
                </Badge>
              ))}
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold">Collections</h2>
            <ul className="space-y-1">
              {results.collections.map((c) => (
                <li key={c.id}>
                  <Link
                    href={ROUTES.collectionDetail(c.id)}
                    className="text-sm font-medium underline-offset-4 hover:underline"
                  >
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>
      ) : null}
    </div>
  );
}
