import type { Metadata } from "next";
import Link from "next/link";
import { Bookmark } from "lucide-react";

import { LibraryPosterCard } from "@/features/library/components/library-poster-card";
import { EmptyState } from "@/components/feedback/empty-state";
import { Button } from "@/components/ui/button";
import { listLibrary } from "@/lib/library/entries";
import { getCurrentUser } from "@/lib/services/user-service";
import { ROUTES } from "@/constants/routes";

export const metadata: Metadata = {
  title: "Watchlist",
  description: "Titles you plan to watch",
};

export default async function WatchlistPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const planned = await listLibrary(user.id, {
    status: "plan_to_watch",
    pageSize: 100,
    sort: "added",
  });
  const wishlist = await listLibrary(user.id, {
    status: "wishlist",
    pageSize: 100,
    sort: "added",
  });

  const items = [...planned.items, ...wishlist.items];
  // Pure pick: rotate from end of list (recently added tend to land last).
  const random = items.length > 0 ? items[items.length - 1] : null;

  return (
    <div className="space-y-6 animate-fade-up">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="font-display text-2xl font-semibold tracking-tight">Watchlist</h1>
          <p className="text-sm text-muted-foreground">
            Everything you plan to watch. Pin titles from any detail page.
          </p>
        </div>
        {random ? (
          <Button asChild size="sm">
            <Link
              href={
                random.media_type === "movie"
                  ? ROUTES.movie(random.external_id)
                  : ROUTES.show(random.external_id)
              }
            >
              Surprise me
            </Link>
          </Button>
        ) : null}
      </header>

      {items.length === 0 ? (
        <EmptyState
          icon={Bookmark}
          title="Nothing on your list"
          description="Find something on Discover and mark it Plan to Watch."
        />
      ) : (
        <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {items.map((entry) => (
            <LibraryPosterCard key={entry.id} entry={entry} showProgress={false} />
          ))}
        </div>
      )}
    </div>
  );
}
