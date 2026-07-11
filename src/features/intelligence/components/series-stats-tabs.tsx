"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { StatCounter } from "@/features/intelligence/components/stat-counter";

interface SeriesStatsTabsProps {
  episodesWatched: number;
  showsTracked: number;
  showsCompleted: number;
  showsWatching: number;
  showsDropped: number;
  className?: string;
}

/**
 * Tabbed home metric: Episodes vs Series — same card size as other stat tiles.
 */
export function SeriesStatsTabs({
  episodesWatched,
  showsTracked,
  showsCompleted,
  showsWatching,
  showsDropped,
  className,
}: SeriesStatsTabsProps) {
  const [tab, setTab] = React.useState<"episodes" | "series">("episodes");

  const seriesHint = [
    showsCompleted > 0 ? `${showsCompleted} completed` : null,
    showsWatching > 0 ? `${showsWatching} watching` : null,
    showsDropped > 0 ? `${showsDropped} dropped` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const tabs = (
    <div
      className="inline-flex w-fit rounded-full border-0 bg-muted/60 p-0.5 dark:bg-white/[0.08]"
      role="tablist"
      aria-label="Episodes or series"
    >
      <button
        type="button"
        role="tab"
        aria-selected={tab === "episodes"}
        onClick={() => setTab("episodes")}
        className={cn(
          "rounded-full px-2.5 py-0.5 text-[10px] font-medium transition-colors sm:px-3 sm:text-[11px]",
          tab === "episodes"
            ? "bg-primary text-primary-foreground shadow-xs"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        Episodes
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={tab === "series"}
        onClick={() => setTab("series")}
        className={cn(
          "rounded-full px-2.5 py-0.5 text-[10px] font-medium transition-colors sm:px-3 sm:text-[11px]",
          tab === "series"
            ? "bg-primary text-primary-foreground shadow-xs"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        Series
      </button>
    </div>
  );

  if (tab === "episodes") {
    return (
      <StatCounter
        value={episodesWatched}
        label="Episodes watched"
        hint={
          seriesHint
            ? `Across all statuses · ${seriesHint}`
            : "Includes watching, dropped, and completed"
        }
        header={tabs}
        className={className}
      />
    );
  }

  return (
    <StatCounter
      value={showsTracked}
      label="Series watched"
      hint={
        seriesHint ||
        "Completed, watching, dropped, and other logged series"
      }
      header={tabs}
      className={className}
    />
  );
}
