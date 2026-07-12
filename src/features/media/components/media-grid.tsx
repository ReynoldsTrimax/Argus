"use client";

import { Film } from "lucide-react";

import { PosterCard } from "@/features/media/components/poster-card";
import { EmptyState } from "@/components/feedback/empty-state";
import type { MediaSummary } from "@/types/media";

interface MediaGridProps {
  items: MediaSummary[];
  emptyTitle?: string;
  emptyDescription?: string;
}

/**
 * Responsive poster grid — padded so hover lift is not clipped.
 */
export function MediaGrid({
  items,
  emptyTitle = "No titles found",
  emptyDescription = "Try adjusting your filters.",
}: MediaGridProps) {
  if (!items.length) {
    return (
      <EmptyState
        icon={Film}
        title={emptyTitle}
        description={emptyDescription}
      />
    );
  }

  return (
    <div className="grid grid-cols-2 gap-x-5 gap-y-16 px-3 pt-10 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 sm:px-4">
      {items.map((item, index) => (
        <div
          key={`${item.mediaType}-${item.id}`}
          className="min-w-0 animate-fade-up"
          style={{ animationDelay: `${Math.min(index, 12) * 35}ms` }}
        >
          <PosterCard item={item} className="w-full" priority={index < 6} />
        </div>
      ))}
    </div>
  );
}
