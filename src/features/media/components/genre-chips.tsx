"use client";

import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { mediaHref } from "@/lib/media/routes";
import type { Genre } from "@/types/media";
import { cn } from "@/lib/utils";

interface GenreChipsProps {
  genres: Genre[];
  className?: string;
}

/**
 * Horizontally scrollable genre chips.
 */
export function GenreChips({ genres, className }: GenreChipsProps) {
  if (!genres.length) return null;

  return (
    <section className={cn("space-y-3", className)} aria-label="Browse by genre">
      <div className="flex items-end justify-between gap-3 px-1">
        <h2 className="text-section-title">Browse by Genre</h2>
        <Link
          href="/genres"
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          View all
        </Link>
      </div>
      <div className="scrollbar-thin flex gap-2 overflow-x-auto pb-1">
        {genres.map((g) => (
          <Link
            key={g.id}
            href={mediaHref("genre", g.id)}
            className="shrink-0 transition-transform duration-200 ease-out hover:-translate-y-0.5 active:scale-[0.98]"
          >
            <Badge
              variant="outline"
              className="h-9 cursor-pointer rounded-full px-4 text-sm font-medium transition-colors hover:border-primary/50 hover:bg-primary/12 hover:text-foreground"
            >
              {g.name}
            </Badge>
          </Link>
        ))}
      </div>
    </section>
  );
}
