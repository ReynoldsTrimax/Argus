"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Bookmark, Check, Loader2, Play, Star } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { posterUrl } from "@/lib/media/image";
import { formatVote, formatYear } from "@/lib/media/format";
import { mediaHref } from "@/lib/media/routes";
import { actionUpsertAndSetStatus } from "@/features/library/actions/library-actions";
import type { MediaSummary } from "@/types/media";
import type { MediaIdentity, WatchStatus } from "@/types/library";

interface PosterCardProps {
  item: MediaSummary;
  className?: string;
  priority?: boolean;
  size?: "sm" | "md" | "lg";
  /** Show Plan / Watching / Completed on hover (default true). */
  quickActions?: boolean;
}

const sizeClass = {
  sm: "w-[7.5rem] sm:w-32",
  md: "w-36 sm:w-40",
  lg: "w-40 sm:w-48",
};

const QUICK_STATUSES = [
  "plan_to_watch",
  "watching",
  "completed",
] as const satisfies readonly WatchStatus[];

const STATUS_TOAST: Record<(typeof QUICK_STATUSES)[number], (title: string) => string> = {
  plan_to_watch: (title) => `Added “${title}” to Plan to Watch`,
  watching: (title) => `Added “${title}” to Watching`,
  completed: (title) => `Marked “${title}” as Completed`,
};

const STATUS_BADGE: Record<(typeof QUICK_STATUSES)[number], string> = {
  plan_to_watch: "Plan",
  watching: "Watching",
  completed: "Done",
};

/** ~66% of previous h-9 (36px) → ~24px */
const actionBtnClass =
  "inline-flex h-6 w-full items-center justify-center gap-1.5 rounded-md text-[10px] font-semibold shadow-sm backdrop-blur-md transition disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";

/** Smooth settle — no snappy bounce that fights the layout. */
const popTransition = {
  type: "spring" as const,
  stiffness: 260,
  damping: 30,
  mass: 0.9,
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
 * Catalog poster with smooth hover pop + translucent quick-list actions.
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
  const [hovered, setHovered] = React.useState(false);
  const [pending, setPending] = React.useState<WatchStatus | null>(null);
  const [lastStatus, setLastStatus] = React.useState<WatchStatus | null>(null);

  const href = mediaHref(item.mediaType, item.id);
  const src = posterUrl(item.posterPath, "w342");
  const year = formatYear(item.releaseDate);
  const showActions = quickActions && hovered;

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
      const toastFor = STATUS_TOAST[status as (typeof QUICK_STATUSES)[number]];
      toast.success(toastFor ? toastFor(item.title) : `Updated “${item.title}”`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setPending(null);
    }
  };

  const motionTarget = reduceMotion
    ? { y: 0, scale: 1, zIndex: hovered ? 8 : 0 }
    : hovered
      ? { y: -12, scale: 1.12, zIndex: 40 }
      : { y: 0, scale: 1, zIndex: 0 };

  return (
    <motion.div
      className={cn(
        "group relative shrink-0 will-change-transform",
        sizeClass[size],
        className,
      )}
      style={{ transformOrigin: "50% 80%" }}
      animate={motionTarget}
      transition={reduceMotion ? { duration: 0.01 } : popTransition}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setHovered(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setHovered(false);
        }
      }}
    >
      <div
        className={cn(
          "relative aspect-[2/3] overflow-hidden rounded-xl bg-muted shadow-md",
          "transition-shadow duration-500 ease-out",
          hovered && "shadow-2xl shadow-black/50 ring-1 ring-white/10",
        )}
      >
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
                  "object-cover transition-[transform,opacity] duration-500 ease-out",
                  hovered && "scale-[1.02]",
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

        <div
          className={cn(
            "pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-[55%] bg-gradient-to-t from-black/90 via-black/40 to-transparent transition-opacity duration-400 ease-out",
            hovered ? "opacity-100" : "opacity-0",
          )}
        />

        {item.voteAverage != null && item.voteAverage > 0 ? (
          <div className="pointer-events-none absolute left-2 top-2 z-[1] inline-flex items-center gap-1 rounded-md bg-black/65 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
            <Star className="h-3 w-3 fill-primary text-primary" aria-hidden="true" />
            {formatVote(item.voteAverage)}
          </div>
        ) : null}

        {lastStatus && lastStatus in STATUS_BADGE ? (
          <div className="pointer-events-none absolute right-2 top-2 z-[1] rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
            {STATUS_BADGE[lastStatus as (typeof QUICK_STATUSES)[number]]}
          </div>
        ) : null}

        <AnimatePresence>
          {showActions ? (
            <motion.div
              key="quick-actions"
              initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 4 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-x-0 bottom-0 z-10 flex flex-col gap-1 p-2"
            >
              <button
                type="button"
                disabled={pending != null}
                onClick={(e) => void setStatus("plan_to_watch", e)}
                className={cn(
                  actionBtnClass,
                  "bg-black/55 text-white ring-1 ring-white/10 hover:bg-black/70",
                )}
                aria-label={`Add ${item.title} to plan to watch`}
              >
                {pending === "plan_to_watch" ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Bookmark className="h-3 w-3" />
                )}
                Plan to Watch
              </button>
              <button
                type="button"
                disabled={pending != null}
                onClick={(e) => void setStatus("watching", e)}
                className={cn(
                  actionBtnClass,
                  "bg-white/35 text-white ring-1 ring-white/35 hover:bg-white/50",
                )}
                aria-label={`Add ${item.title} to watching`}
              >
                {pending === "watching" ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Play className="h-3 w-3 fill-current" />
                )}
                Watching
              </button>
              <button
                type="button"
                disabled={pending != null}
                onClick={(e) => void setStatus("completed", e)}
                className={cn(
                  actionBtnClass,
                  "bg-primary/45 text-white ring-1 ring-primary/40 hover:bg-primary/60",
                )}
                aria-label={`Mark ${item.title} as completed`}
              >
                {pending === "completed" ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Check className="h-3 w-3" />
                )}
                Completed
              </button>
            </motion.div>
          ) : null}
        </AnimatePresence>
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
