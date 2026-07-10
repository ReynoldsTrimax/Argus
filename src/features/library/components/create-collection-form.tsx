"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { actionCreateCollection } from "@/features/library/actions/library-actions";
import { ROUTES } from "@/constants/routes";

export function CreateCollectionForm() {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [pending, startTransition] = React.useTransition();

  return (
    <form
      className="flex flex-col gap-2 sm:flex-row sm:items-center"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const res = await actionCreateCollection(name.trim());
          if (!res.success) {
            toast.error(res.error);
            return;
          }
          toast.success("Collection created");
          setName("");
          router.push(ROUTES.collectionDetail(res.data.id));
          router.refresh();
        });
      }}
    >
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="New collection name"
        disabled={pending}
        className="sm:max-w-sm"
        required
      />
      <Button type="submit" disabled={pending || !name.trim()}>
        Create
      </Button>
    </form>
  );
}
