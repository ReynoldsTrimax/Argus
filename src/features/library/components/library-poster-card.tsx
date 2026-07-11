"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Heart, Pin } from "lucide-react";

import { cn } from "@/lib/utils";
import { posterUrl } from "@/lib/media/image";
import { Badge } from "@/components/ui/badge";
import { WATCH_STATUS_LABELS, type LibraryEntry } from "@/types/library";
import { ROUTES } from "@/constants/routes";
import { springSoft } from "@/animations/motion";

interface LibraryPosterCardProps {
  entry: LibraryEntry;
  className?: string;
  showProgress?: boolean;
}

/**
 * Library poster — subtle lift hover only.
 */
export function LibraryPosterCard({
  entry,
  className,
  showProgress = true,
}: LibraryPosterCardProps) {
  const reduceMotion = useReducedMotion();
  const href =
    entry.media_type === "movie"
      ? ROUTES.movie(entry.external_id)
      : ROUTES.show(entry.external_id);
  const src = posterUrl(entry.poster_path, "w342");
  const progress = Math.min(100, Math.max(0, entry.progress_percent ?? 0));

  return (
    <motion.div
      className={cn("group relative z-0 w-full will-change-transform", className)}
      style={{ transformOrigin: "50% 70%" }}
      whileHover={
        reduceMotion
          ? undefined
          : { y: -6, scale: 1.04, zIndex: 5, transition: springSoft }
      }
      whileTap={reduceMotion ? undefined : { scale: 0.98 }}
    >
      <Link
        href={href}
        prefetch
        className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        aria-label={entry.title}
      >
        <div className="relative aspect-[2/3] overflow-hidden rounded-xl border border-transparent bg-muted shadow-md transition-shadow duration-300 group-hover:shadow-xl group-hover:shadow-black/50">
          {src ? (
            <Image
              src={src}
              alt=""
              fill
              sizes="(max-width: 640px) 33vw, 160px"
              className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.05]"
            />
          ) : (
            <div className="flex h-full items-center justify-center p-2 text-center text-xs text-muted-foreground">
              {entry.title}
            </div>
          )}

          <div className="absolute left-1.5 top-1.5 flex flex-col gap-1">
            {entry.is_favorite ? (
              <span className="inline-flex rounded-md bg-black/65 p-1 text-primary backdrop-blur-sm">
                <Heart className="h-3 w-3 fill-current" aria-label="Favorite" />
              </span>
            ) : null}
            {entry.is_pinned ? (
              <span className="inline-flex rounded-md bg-black/65 p-1 text-white backdrop-blur-sm">
                <Pin className="h-3 w-3" aria-label="Pinned" />
              </span>
            ) : null}
          </div>

          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-2 pb-2 pt-8">
            <Badge
              variant="secondary"
              className="mb-1 h-5 max-w-full truncate px-1.5 text-[10px]"
            >
              {WATCH_STATUS_LABELS[entry.status] ?? entry.status}
            </Badge>
            {showProgress && progress > 0 && progress < 100 ? (
              <div className="h-1 overflow-hidden rounded-full bg-white/20">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${progress}%` }}
                />
              </div>
            ) : null}
          </div>
        </div>
        <p className="mt-2 line-clamp-2 px-0.5 text-sm font-medium leading-snug">
          {entry.title}
        </p>
      </Link>
    </motion.div>
  );
}
