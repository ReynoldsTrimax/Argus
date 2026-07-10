"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  actionDeleteCollection,
  actionUpdateCollection,
} from "@/features/library/actions/library-actions";
import { ROUTES } from "@/constants/routes";

interface CollectionActionsProps {
  collectionId: string;
  name: string;
  description: string | null;
  isPinned: boolean;
}

export function CollectionActions({
  collectionId,
  name,
  description,
  isPinned,
}: CollectionActionsProps) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [editName, setEditName] = React.useState(name);
  const [editDesc, setEditDesc] = React.useState(description ?? "");

  return (
    <div className="flex w-full flex-col gap-2 sm:max-w-xs">
      <Input
        value={editName}
        onChange={(e) => setEditName(e.target.value)}
        disabled={pending}
        aria-label="Collection name"
      />
      <Input
        value={editDesc}
        onChange={(e) => setEditDesc(e.target.value)}
        placeholder="Description"
        disabled={pending}
        aria-label="Description"
      />
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const res = await actionUpdateCollection(collectionId, {
                name: editName.trim(),
                description: editDesc.trim() || null,
              });
              if (!res.success) toast.error(res.error);
              else {
                toast.success("Saved");
                router.refresh();
              }
            })
          }
        >
          Save
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const res = await actionUpdateCollection(collectionId, {
                is_pinned: !isPinned,
              });
              if (!res.success) toast.error(res.error);
              else {
                toast.success(isPinned ? "Unpinned" : "Pinned");
                router.refresh();
              }
            })
          }
        >
          {isPinned ? "Unpin" : "Pin"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="destructive"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              if (!confirm("Delete this collection?")) return;
              const res = await actionDeleteCollection(collectionId);
              if (!res.success) toast.error(res.error);
              else {
                toast.success("Deleted");
                router.push(ROUTES.collections);
                router.refresh();
              }
            })
          }
        >
          Delete
        </Button>
      </div>
    </div>
  );
}
