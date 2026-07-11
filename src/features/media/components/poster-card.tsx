"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Star } from "lucide-react";

import { cn } from "@/lib/utils";
import { posterUrl } from "@/lib/media/image";
import { formatVote, formatYear } from "@/lib/media/format";
import { mediaHref } from "@/lib/media/routes";
import { springSoft } from "@/animations/motion";
import type { MediaSummary } from "@/types/media";

interface PosterCardProps {
  item: MediaSummary;
  className?: string;
  priority?: boolean;
  size?: "sm" | "md" | "lg";
}

const sizeClass = {
  sm: "w-[7.5rem] sm:w-32",
  md: "w-36 sm:w-40",
  lg: "w-40 sm:w-48",
};

/**
 * Catalog poster — subtle lift/scale hover only (no Netflix expand menu).
 */
export function PosterCard({
  item,
  className,
  priority,
  size = "md",
}: PosterCardProps) {
  const reduceMotion = useReducedMotion();
  const [loaded, setLoaded] = React.useState(false);
  const href = mediaHref(item.mediaType, item.id);
  const src = posterUrl(item.posterPath, "w342");
  const year = formatYear(item.releaseDate);

  return (
    <motion.div
      className={cn(
        "group relative z-0 shrink-0 will-change-transform",
        sizeClass[size],
        className,
      )}
      style={{ transformOrigin: "50% 70%" }}
      whileHover={
        reduceMotion
          ? undefined
          : {
              // Mild lift only — high z-index was stacking over the search bar
              y: -6,
              scale: 1.04,
              zIndex: 5,
              transition: springSoft,
            }
      }
      whileTap={reduceMotion ? undefined : { scale: 0.98 }}
    >
      <Link
        href={href}
        prefetch
        className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        aria-label={`${item.title}${year ? `, ${year}` : ""}`}
      >
        {/* No colored border on hover — soft shadow only so the pop stays clean */}
        <div className="relative aspect-[2/3] overflow-hidden rounded-xl border border-transparent bg-muted shadow-md transition-shadow duration-300 ease-out group-hover:shadow-xl group-hover:shadow-black/50">
          {src ? (
            <>
              {!loaded ? (
                <div className="absolute inset-0 skeleton-shimmer" aria-hidden />
              ) : null}
              <Image
                src={src}
                alt=""
                fill
                sizes="(max-width: 640px) 40vw, 160px"
                className={cn(
                  "object-cover transition-[transform,opacity] duration-500 ease-out group-hover:scale-[1.04]",
                  loaded ? "opacity-100" : "opacity-0",
                )}
                priority={priority}
                onLoad={() => setLoaded(true)}
              />
            </>
          ) : (
            <div className="flex h-full items-center justify-center bg-muted p-3 text-center text-xs text-muted-foreground">
              {item.title}
            </div>
          )}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          {item.voteAverage != null && item.voteAverage > 0 ? (
            <div className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-md bg-black/65 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
              <Star className="h-3 w-3 fill-primary text-primary" aria-hidden="true" />
              {formatVote(item.voteAverage)}
            </div>
          ) : null}
        </div>
        <div className="mt-2 space-y-0.5 px-0.5">
          <p className="line-clamp-2 text-sm font-medium leading-snug tracking-tight">
            {item.title}
          </p>
          <p className="text-xs text-muted-foreground">
            {year ?? "—"}
            <span className="mx-1 opacity-40">·</span>
            {item.mediaType === "tv" ? "TV" : "Movie"}
          </p>
        </div>
      </Link>
    </motion.div>
  );
}
