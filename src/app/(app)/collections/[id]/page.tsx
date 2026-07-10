import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { LibraryPosterCard } from "@/features/library/components/library-poster-card";
import { CollectionActions } from "@/features/library/components/collection-actions";
import { EmptyState } from "@/components/feedback/empty-state";
import {
  getCollection,
  listCollectionItems,
} from "@/lib/library/tags-collections";
import { getCurrentUser } from "@/lib/services/user-service";
import { Film } from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id: _id } = await params;
  return { title: "Collection" };
}

export default async function UserCollectionPage({ params }: PageProps) {
  const user = await getCurrentUser();
  if (!user) return null;

  const { id } = await params;
  const collection = await getCollection(user.id, id);
  if (!collection) notFound();

  const items = await listCollectionItems(user.id, id);

  return (
    <div className="space-y-6 animate-fade-up">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            {collection.name}
          </h1>
          {collection.description ? (
            <p className="max-w-2xl text-sm text-muted-foreground text-pretty">
              {collection.description}
            </p>
          ) : null}
          <p className="text-xs text-muted-foreground">
            {collection.item_count} title{collection.item_count === 1 ? "" : "s"}
          </p>
        </div>
        <CollectionActions
          collectionId={collection.id}
          name={collection.name}
          description={collection.description}
          isPinned={collection.is_pinned}
        />
      </header>

      {items.length === 0 ? (
        <EmptyState
          icon={Film}
          title="Empty collection"
          description="Add titles from any movie or TV page using the Collections menu."
        />
      ) : (
        <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {items.map((item) =>
            item.library_entries ? (
              <LibraryPosterCard key={item.id} entry={item.library_entries} />
            ) : null,
          )}
        </div>
      )}
    </div>
  );
}
