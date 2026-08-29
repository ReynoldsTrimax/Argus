"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { WATCH_STATUS_LABELS, type WatchStatus } from "@/types/library";

import { sortByStatus, type FriendTitleItem } from "../friend-title-item";
import { FriendPosterCard } from "./friend-poster-card";

/** Posters revealed before the "show all" control appears. */
const PAGE_SIZE = 36;

interface FriendLibraryBrowserProps {
  items: FriendTitleItem[];
  /** Used in the empty-filter copy. */
  name: string;
}

type Filter = WatchStatus | "all";

/**
 * A friend's library as filterable poster art.
 *
 * Filtering is client-side because the whole payload is already on the page and
 * bounded by the server's row cap — a round trip per tab would be slower and
 * would lose the counts, which are the useful part of the control.
 *
 * Only the first `PAGE_SIZE` posters mount initially. A heavy library can run to
 * hundreds of titles, and mounting every `next/image` at once costs a visible
 * stall on the first paint for rows nobody has scrolled to.
 */
export function FriendLibraryBrowser({ items, name }: FriendLibraryBrowserProps) {
  const [filter, setFilter] = React.useState<Filter>("all");
  const [expanded, setExpanded] = React.useState(false);
  const reduceMotion = useReducedMotion();

  const counts = React.useMemo(() => {
    const map = new Map<WatchStatus, number>();
    for (const item of items) {
      map.set(item.status, (map.get(item.status) ?? 0) + 1);
    }
    return [...map.entries()].sort(([a], [b]) => sortByStatus(a, b));
  }, [items]);

  const filtered = React.useMemo(
    () => (filter === "all" ? items : items.filter((item) => item.status === filter)),
    [items, filter],
  );

  const visible = expanded ? filtered : filtered.slice(0, PAGE_SIZE);
  const hidden = filtered.length - visible.length;

  const select = (next: Filter) => {
    setFilter(next);
    // Collapse on change so switching to a large shelf does not inherit an
    // expansion the user asked for on a different one.
    setExpanded(false);
  };

  return (
    <section className="space-y-5" aria-label={`${name}'s library`}>
      <div
        className="-mx-1 flex scrollbar-thin gap-1.5 overflow-x-auto px-1 pb-1"
        role="tablist"
        aria-label="Filter by status"
      >
        <FilterChip
          label="Everything"
          count={items.length}
          active={filter === "all"}
          onSelect={() => select("all")}
        />
        {counts.map(([status, count]) => (
          <FilterChip
            key={status}
            label={WATCH_STATUS_LABELS[status] ?? status}
            count={count}
            active={filter === status}
            onSelect={() => select(status)}
          />
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-muted-foreground py-8 text-center text-sm">Nothing here.</p>
      ) : (
        <>
          <motion.ul
            // Re-keyed on the filter so switching tabs replays the reveal
            // instead of swapping posters in place with no transition.
            key={filter}
            className="grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7"
            initial={reduceMotion ? undefined : "hidden"}
            animate={reduceMotion ? undefined : "visible"}
            variants={{
              hidden: {},
              visible: {
                transition: { staggerChildren: 0.02, delayChildren: 0.02 },
              },
            }}
          >
            {visible.map((item, index) => (
              <motion.li
                key={item.key}
                className="min-w-0"
                variants={
                  reduceMotion
                    ? undefined
                    : {
                        hidden: { opacity: 0, y: 10 },
                        visible: {
                          opacity: 1,
                          y: 0,
                          transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] },
                        },
                      }
                }
              >
                <FriendPosterCard
                  item={item}
                  showStatus={filter === "all"}
                  priority={index < 7}
                  className="w-full"
                />
              </motion.li>
            ))}
          </motion.ul>

          {hidden > 0 ? (
            <div className="flex justify-center pt-1">
              <Button variant="outline" size="sm" onClick={() => setExpanded(true)}>
                Show {hidden} more
              </Button>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}

interface FilterChipProps {
  label: string;
  count: number;
  active: boolean;
  onSelect: () => void;
}

function FilterChip({ label, count, active, onSelect }: FilterChipProps) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onSelect}
      className={cn(
        "focus-visible:ring-ring inline-flex shrink-0 items-center gap-1.5 rounded-sm border px-2.5 py-1.5",
        "text-xs font-medium transition-colors duration-200",
        "focus-visible:ring-2 focus-visible:outline-none",
        active
          ? "border-primary/55 bg-primary/15 text-foreground"
          : "border-border text-muted-foreground hover:border-primary/40 hover:bg-accent hover:text-foreground dark:border-white/12",
      )}
    >
      {label}
      <span
        className={cn(
          "font-mono text-[10px] tabular-nums",
          active ? "text-primary" : "opacity-60",
        )}
      >
        {count}
      </span>
    </button>
  );
}
