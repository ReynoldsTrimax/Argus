"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Heart, Repeat, Star } from "lucide-react";

import { cn } from "@/lib/utils";
import { posterUrl } from "@/lib/media/image";
import { formatYear } from "@/lib/media/format";
import { mediaHref } from "@/lib/media/routes";
import { WATCH_STATUS_LABELS, type WatchStatus } from "@/types/library";

import {
  displayRating,
  episodeLabel,
  partialProgress,
  type FriendTitleItem,
} from "../friend-title-item";

/**
 * Status accent colours, drawn from the design tokens rather than raw hex so
 * both themes stay correct. The dot is the only place status is encoded by
 * colour alone, and it is always paired with a text label for accessibility.
 */
const STATUS_ACCENT: Record<WatchStatus, string> = {
  watching: "bg-primary",
  rewatching: "bg-primary",
  completed: "bg-success",
  plan_to_watch: "bg-muted-foreground",
  wishlist: "bg-muted-foreground",
  paused: "bg-warning",
  dropped: "bg-destructive",
  archived: "bg-muted-foreground",
};

const SIZE = {
  sm: { frame: "w-[5.5rem] sm:w-24", title: "text-[11px]", meta: "text-[10px]" },
  md: { frame: "w-32 sm:w-36", title: "text-xs sm:text-sm", meta: "text-[11px]" },
} as const;

interface FriendPosterCardProps {
  item: FriendTitleItem;
  size?: keyof typeof SIZE;
  /**
   * Show the status chip. Off inside a shelf that is already one status —
   * repeating "Completed" on ninety posters is the text slop this card exists
   * to replace.
   */
  showStatus?: boolean;
  priority?: boolean;
  className?: string;
}

/**
 * A friend's tracked title as a poster.
 *
 * Deliberately not the catalog `PosterCard`: that one's hover reveals quick
 * actions that write to *your* library, which is the wrong affordance when you
 * are looking at someone else's shelf. This card is read-only and spends its
 * overlay budget on what the friend did with the title — their rating, how far
 * they got, whether they went back for another pass.
 */
export function FriendPosterCard({
  item,
  size = "md",
  showStatus = false,
  priority = false,
  className,
}: FriendPosterCardProps) {
  const reduceMotion = useReducedMotion();
  const [loaded, setLoaded] = React.useState(false);
  const [hovered, setHovered] = React.useState(false);

  const src = posterUrl(item.posterPath, "w342");
  const year = formatYear(item.releaseDate);
  const rating = displayRating(item);
  const episode = episodeLabel(item);
  const progress = partialProgress(item);
  const statusLabel = WATCH_STATUS_LABELS[item.status] ?? item.status;
  const dims = SIZE[size];

  // Read out as one sentence rather than a pile of separate labels.
  const description = [
    item.title,
    year,
    statusLabel,
    rating ? `rated ${rating} out of 10` : null,
    episode,
    progress != null ? `${progress}% watched` : null,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <motion.div
      className={cn("group relative shrink-0", dims.frame, className)}
      style={{ transformOrigin: "50% 85%" }}
      animate={
        reduceMotion
          ? { y: 0, zIndex: hovered ? 8 : 0 }
          : hovered
            ? { y: -6, scale: 1.05, zIndex: 20 }
            : { y: 0, scale: 1, zIndex: 0 }
      }
      transition={
        reduceMotion
          ? { duration: 0.01 }
          : { type: "spring", stiffness: 280, damping: 30, mass: 0.85 }
      }
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setHovered(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setHovered(false);
        }
      }}
    >
      <Link
        href={mediaHref(item.mediaType, item.externalId)}
        prefetch={false}
        className="focus-visible:ring-ring block rounded-lg focus-visible:ring-2 focus-visible:outline-none"
        aria-label={description}
      >
        <div
          className={cn(
            "bg-muted relative aspect-[2/3] overflow-hidden rounded-lg shadow-md",
            "transition-shadow duration-500 ease-out",
            hovered && "shadow-xl ring-1 shadow-black/40 ring-white/10",
          )}
        >
          {src ? (
            <>
              {!loaded ? (
                <div className="skeleton-shimmer absolute inset-0" aria-hidden />
              ) : null}
              <Image
                src={src}
                alt=""
                fill
                sizes="(max-width: 640px) 33vw, 144px"
                className={cn(
                  "object-cover transition-opacity duration-500 ease-out",
                  loaded ? "opacity-100" : "opacity-0",
                )}
                priority={priority}
                onLoad={() => setLoaded(true)}
              />
            </>
          ) : (
            <div className="bg-muted text-muted-foreground flex h-full items-center justify-center p-2 text-center text-[10px] leading-tight">
              {item.title}
            </div>
          )}

          {/* Scrim only where text sits, so the artwork stays the subject. */}
          {rating || episode || progress != null ? (
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/85 via-black/35 to-transparent"
              aria-hidden
            />
          ) : null}

          {rating ? (
            <div className="pointer-events-none absolute top-1.5 left-1.5 inline-flex items-center gap-0.5 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
              <Star className="fill-primary text-primary h-2.5 w-2.5" aria-hidden />
              {rating}
            </div>
          ) : null}

          <div className="pointer-events-none absolute top-1.5 right-1.5 flex flex-col items-end gap-1">
            {item.isFavorite ? (
              <span className="rounded bg-black/70 p-1 backdrop-blur-sm">
                <Heart
                  className="fill-destructive text-destructive h-2.5 w-2.5"
                  aria-hidden
                />
              </span>
            ) : null}
            {item.rewatchCount > 0 ? (
              <span className="inline-flex items-center gap-0.5 rounded bg-black/70 px-1 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
                <Repeat className="h-2.5 w-2.5" aria-hidden />
                {item.rewatchCount}
              </span>
            ) : null}
          </div>

          {episode ? (
            <p className="pointer-events-none absolute bottom-1.5 left-1.5 font-mono text-[10px] font-medium text-white/90">
              {episode}
            </p>
          ) : null}

          {progress != null ? (
            <div
              className="pointer-events-none absolute inset-x-1.5 bottom-1 h-[3px] overflow-hidden rounded-full bg-white/25"
              aria-hidden
            >
              <div
                className="bg-primary h-full rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
          ) : null}
        </div>

        <div className="mt-1.5 space-y-0.5 px-0.5">
          <p
            className={cn(
              "line-clamp-2 leading-snug font-medium tracking-tight",
              dims.title,
            )}
          >
            {item.title}
          </p>
          <p className={cn("text-muted-foreground flex items-center gap-1", dims.meta)}>
            {showStatus ? (
              <>
                <span
                  className={cn(
                    "h-1.5 w-1.5 shrink-0 rounded-full",
                    STATUS_ACCENT[item.status],
                  )}
                  aria-hidden
                />
                <span className="truncate">{statusLabel}</span>
              </>
            ) : (
              <span className="truncate">
                {year ?? "—"}
                <span className="mx-1 opacity-40">·</span>
                {item.mediaType === "tv" ? "TV" : "Film"}
              </span>
            )}
          </p>
        </div>
      </Link>
    </motion.div>
  );
}
