"use client";

import { cn } from "@/lib/utils";

import type { FriendTitleItem } from "../friend-title-item";
import { FriendPosterCard } from "./friend-poster-card";

interface FriendPosterRailProps {
  heading: string;
  items: FriendTitleItem[];
  empty: string;
  className?: string;
}

/**
 * A short poster strip for the friends list.
 *
 * Horizontally scrollable rather than wrapped: these sit two-per-row inside a
 * friend card, and a wrapping grid would change the card's height depending on
 * how much each friend happens to be watching.
 */
export function FriendPosterRail({
  heading,
  items,
  empty,
  className,
}: FriendPosterRailProps) {
  return (
    <div
      className={cn(
        "bg-background/40 space-y-2 rounded-xl p-3 dark:bg-black/20",
        className,
      )}
    >
      <p className="text-muted-foreground text-[11px] font-medium tracking-[0.04em] uppercase">
        {heading}
      </p>

      {items.length === 0 ? (
        <p className="text-muted-foreground text-xs">{empty}</p>
      ) : (
        <ul
          className="-mx-1 flex scrollbar-thin gap-2.5 overflow-x-auto px-1 pt-1 pb-2"
          aria-label={heading}
        >
          {items.map((item) => (
            <li key={item.key} className="shrink-0">
              <FriendPosterCard item={item} size="sm" />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
