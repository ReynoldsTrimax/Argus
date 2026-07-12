"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { Check, Loader2, Play, Star } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { posterUrl } from "@/lib/media/image";
import { formatVote, formatYear } from "@/lib/media/format";
import { mediaHref } from "@/lib/media/routes";
import { springSoft } from "@/animations/motion";
import { actionUpsertAndSetStatus } from "@/features/library/actions/library-actions";
import type { MediaSummary } from "@/types/media";
import type { MediaIdentity, WatchStatus } from "@/types/library";

interface PosterCardProps {
  item: MediaSummary;
  className?: string;
  priority?: boolean;
  size?: "sm" | "md" | "lg";
  /** Show Watching / Completed quick actions on hover (default true). */
  quickActions?: boolean;
}

const sizeClass = {
  sm: "w-[7.5rem] sm:w-32",
  md: "w-36 sm:w-40",
  lg: "w-40 sm:w-48",
};

function toIdentity(item: MediaSummary): MediaIdentity {
  return {
    provider: "tmdb",
    mediaType: item.mediaType,
    externalId: item.id,
    title: item.title,
    originalTitle: item.originalTitle,
    posterPath: item.posterPath,
    backdropPath: item.backdropPath,
    releaseDate: item.releaseDate,
    overview: item.overview,
    originalLanguage: item.originalLanguage,
  };
}

/**
 * Catalog poster with hover lift + quick Watching / Completed actions.
 */
export function PosterCard({
  item,
  className,
  priority,
  size = "md",
  quickActions = true,
}: PosterCardProps) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [loaded, setLoaded] = React.useState(false);
  const [pending, setPending] = React.useState<WatchStatus | null>(null);
  const [lastStatus, setLastStatus] = React.useState<WatchStatus | null>(null);

  const href = mediaHref(item.mediaType, item.id);
  const src = posterUrl(item.posterPath, "w342");
  const year = formatYear(item.releaseDate);

  const setStatus = async (status: WatchStatus, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (pending) return;

    setPending(status);
    try {
      const res = await actionUpsertAndSetStatus(toIdentity(item), status);
      if (!res.success) {
        toast.error(res.error ?? "Could not update status");
        return;
      }
      setLastStatus(status);
      toast.success(
        status === "watching"
          ? `Added “${item.title}” to Watching`
          : `Marked “${item.title}” as Completed`,
      );
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setPending(null);
    }
  };

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
              y: -6,
              scale: 1.04,
              zIndex: 5,
              transition: springSoft,
            }
      }
      whileTap={reduceMotion ? undefined : { scale: 0.98 }}
    >
      <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-muted shadow-md transition-shadow duration-300 ease-out group-hover:shadow-xl group-hover:shadow-black/50">
        {/* Main navigation target — full poster */}
        <Link
          href={href}
          prefetch
          className="absolute inset-0 z-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
          aria-label={`${item.title}${year ? `, ${year}` : ""}`}
        >
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
        </Link>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-1/2 bg-gradient-to-t from-black/80 via-black/30 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        {item.voteAverage != null && item.voteAverage > 0 ? (
          <div className="pointer-events-none absolute left-2 top-2 z-[1] inline-flex items-center gap-1 rounded-md bg-black/65 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
            <Star className="h-3 w-3 fill-primary text-primary" aria-hidden="true" />
            {formatVote(item.voteAverage)}
          </div>
        ) : null}

        {lastStatus ? (
          <div className="pointer-events-none absolute right-2 top-2 z-[1] rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
            {lastStatus === "watching" ? "Watching" : "Done"}
          </div>
        ) : null}

        {/* Quick actions — only on hover, above the link */}
        {quickActions ? (
          <div
            className={cn(
              "absolute inset-x-0 bottom-0 z-10 flex gap-1.5 p-2",
              "translate-y-1 opacity-0 transition-all duration-300 ease-out",
              "group-hover:translate-y-0 group-hover:opacity-100",
              "group-focus-within:translate-y-0 group-focus-within:opacity-100",
            )}
          >
            <button
              type="button"
              disabled={pending != null}
              onClick={(e) => void setStatus("watching", e)}
              className={cn(
                "inline-flex h-8 flex-1 items-center justify-center gap-1 rounded-lg",
                "bg-white/95 text-[11px] font-semibold text-black shadow-md",
                "transition hover:bg-white disabled:opacity-60",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              )}
              aria-label={`Mark ${item.title} as watching`}
            >
              {pending === "watching" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Play className="h-3.5 w-3.5 fill-current" />
              )}
              <span className="hidden sm:inline">Watching</span>
            </button>
            <button
              type="button"
              disabled={pending != null}
              onClick={(e) => void setStatus("completed", e)}
              className={cn(
                "inline-flex h-8 flex-1 items-center justify-center gap-1 rounded-lg",
                "bg-[hsl(var(--nav-active))] text-[11px] font-semibold text-white shadow-md",
                "transition hover:brightness-110 disabled:opacity-60",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              )}
              aria-label={`Mark ${item.title} as completed`}
            >
              {pending === "completed" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
              <span className="hidden sm:inline">Done</span>
            </button>
          </div>
        ) : null}
      </div>

      <Link href={href} prefetch className="mt-2 block space-y-0.5 px-0.5">
        <p className="line-clamp-2 text-sm font-medium leading-snug tracking-tight">
          {item.title}
        </p>
        <p className="text-xs text-muted-foreground">
          {year ?? "—"}
          <span className="mx-1 opacity-40">·</span>
          {item.mediaType === "tv" ? "TV" : "Movie"}
        </p>
      </Link>
    </motion.div>
  );
}
