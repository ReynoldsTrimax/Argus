import type { Metadata } from "next";
import { Heart } from "lucide-react";

import { LibraryPosterCard } from "@/features/library/components/library-poster-card";
import { EmptyState } from "@/components/feedback/empty-state";
import { listLibrary } from "@/lib/library/entries";
import { getCurrentUser } from "@/lib/services/user-service";

export const metadata: Metadata = {
  title: "Favorites",
  description: "Titles you love",
};

export default async function FavoritesPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const result = await listLibrary(user.id, {
    status: "favorites",
    pageSize: 100,
    sort: "rating",
  });

  return (
    <div className="space-y-6 animate-fade-up">
      <header className="space-y-1">
        <h1 className="font-display text-2xl font-semibold tracking-tight">Favorites</h1>
        <p className="text-sm text-muted-foreground">
          Heart anything you love, finished or not.
        </p>
      </header>

      {result.items.length === 0 ? (
        <EmptyState
          icon={Heart}
          title="No favorites yet"
          description="Open a title and tap Favorite to pin it here."
        />
      ) : (
        <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {result.items.map((entry) => (
            <LibraryPosterCard key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}
