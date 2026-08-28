"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { actionSetLibraryVisibility } from "@/features/social/actions/friend-actions";
import { LIBRARY_VISIBILITY_LABELS, type LibraryVisibility } from "@/types/social";

const DESCRIPTIONS: Record<LibraryVisibility, string> = {
  private: "Nobody can see what you watch, even friends.",
  friends: "Accepted friends can see your library and progress.",
  public: "Any signed-in Argus user can see your library.",
};

/**
 * Library visibility picker.
 *
 * Defaults to friends-only in the database, so enabling the social features
 * never retroactively exposes an existing library. The description updates with
 * the selection because "friends" and "anyone signed in" are easy to conflate,
 * and the consequence of picking the wrong one is not recoverable after the fact.
 */
export function LibraryVisibilityControl({ value }: { value: LibraryVisibility }) {
  const router = useRouter();
  const [current, setCurrent] = React.useState<LibraryVisibility>(value);
  const [pending, startTransition] = React.useTransition();

  // Reconcile with the server if it changes underneath us.
  const [prev, setPrev] = React.useState(value);
  if (prev !== value) {
    setPrev(value);
    setCurrent(value);
  }

  const change = (next: LibraryVisibility) => {
    const previous = current;
    setCurrent(next);
    startTransition(async () => {
      const res = await actionSetLibraryVisibility(next);
      if (!res.success) {
        setCurrent(previous);
        toast.error(res.error);
        return;
      }
      toast.success(`Library visible to: ${LIBRARY_VISIBILITY_LABELS[next]}`);
      router.refresh();
    });
  };

  return (
    <div className="space-y-2 rounded-xl bg-muted/40 p-3 dark:bg-white/[0.05]">
      <Select
        value={current}
        onValueChange={(v) => change(v as LibraryVisibility)}
        disabled={pending}
      >
        <SelectTrigger className="h-9 text-sm" aria-label="Library visibility">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(LIBRARY_VISIBILITY_LABELS) as LibraryVisibility[]).map((key) => (
            <SelectItem key={key} value={key}>
              {LIBRARY_VISIBILITY_LABELS[key]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-muted-foreground text-xs">{DESCRIPTIONS[current]}</p>
    </div>
  );
}
