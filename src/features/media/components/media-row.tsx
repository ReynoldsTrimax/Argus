"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { PosterCard } from "@/features/media/components/poster-card";
import type { MediaSummary } from "@/types/media";

interface MediaRowProps {
  title: string;
  items: MediaSummary[];
  href?: string;
  className?: string;
  priorityCount?: number;
}

/**
 * Horizontal media rail. Pop-out hover lives in a document portal,
 * so overflow-x scroll never clips the animation.
 */
export function MediaRow({
  title,
  items,
  href,
  className,
  priorityCount = 0,
}: MediaRowProps) {
  const scrollerRef = React.useRef<HTMLDivElement>(null);

  const scroll = (dir: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({
      left: dir * Math.min(el.clientWidth * 0.82, 540),
      behavior: "smooth",
    });
  };

  if (!items.length) return null;

  return (
    <section className={cn("min-w-0 max-w-full space-y-4", className)} aria-label={title}>
      <div className="flex items-end justify-between gap-3 px-1">
        <div>
          {href ? (
            <Link
              href={href}
              className="group inline-flex items-center gap-1.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <h2 className="text-section-title transition-colors duration-300 group-hover:text-primary">
                {title}
              </h2>
              <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform duration-300 group-hover:translate-x-1 group-hover:text-primary" />
            </Link>
          ) : (
            <h2 className="text-section-title">{title}</h2>
          )}
        </div>
        <div className="hidden items-center gap-1.5 sm:flex">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            className="rounded-full"
            onClick={() => scroll(-1)}
            aria-label={`Scroll ${title} left`}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            className="rounded-full"
            onClick={() => scroll(1)}
            aria-label={`Scroll ${title} right`}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div
        ref={scrollerRef}
        className="scrollbar-thin flex max-w-full gap-4 overflow-x-auto scroll-smooth px-0.5 pb-4 pt-2 snap-x snap-mandatory"
        tabIndex={0}
        role="list"
      >
        {items.map((item, index) => (
          <div
            key={`${item.mediaType}-${item.id}`}
            className="snap-start"
            role="listitem"
          >
            <PosterCard item={item} priority={index < priorityCount} />
          </div>
        ))}
      </div>
    </section>
  );
}
