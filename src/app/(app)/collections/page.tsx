import type { Metadata } from "next";
import Link from "next/link";
import { FolderPlus } from "lucide-react";

import { EmptyState } from "@/components/feedback/empty-state";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreateCollectionForm } from "@/features/library/components/create-collection-form";
import { listCollections } from "@/lib/library/tags-collections";
import { getCurrentUser } from "@/lib/services/user-service";
import { ROUTES } from "@/constants/routes";

export const metadata: Metadata = {
  title: "Collections",
  description: "Your custom collections",
};

export default async function CollectionsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const collections = await listCollections(user.id);

  return (
    <div className="space-y-8 animate-fade-up">
      <header className="space-y-1">
        <h1 className="font-display text-2xl font-semibold tracking-tight">Collections</h1>
        <p className="text-sm text-muted-foreground">
          Build themed shelves — Nolan, comfort movies, date night, and more.
        </p>
      </header>

      <CreateCollectionForm />

      {collections.length === 0 ? (
        <EmptyState
          icon={FolderPlus}
          title="No collections yet"
          description="Create your first collection above, then add titles from any detail page."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {collections.map((c) => (
            <Link key={c.id} href={ROUTES.collectionDetail(c.id)}>
              <Card className="h-full transition-colors hover:border-primary/40">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">{c.name}</CardTitle>
                    {c.is_pinned ? <Badge variant="secondary">Pinned</Badge> : null}
                  </div>
                  <CardDescription className="line-clamp-2">
                    {c.description || `${c.item_count} title${c.item_count === 1 ? "" : "s"}`}
                  </CardDescription>
                  <p className="text-xs text-muted-foreground">{c.item_count} items</p>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
