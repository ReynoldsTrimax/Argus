"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import { Heart, Pin } from "lucide-react";

import { cn } from "@/lib/utils";
import { posterUrl } from "@/lib/media/image";
import { Badge } from "@/components/ui/badge";
import { WATCH_STATUS_LABELS, type LibraryEntry } from "@/types/library";
import { ROUTES } from "@/constants/routes";
import {
  claimHover,
  registerHoverCard,
  releaseHover,
} from "@/features/media/components/poster-hover-lock";

interface LibraryPosterCardProps {
  entry: LibraryEntry;
  className?: string;
  showProgress?: boolean;
}

type HoverRect = { top: number; left: number; width: number; height: number };

/**
 * Library poster with the same portal pop + instant scroll kill as catalog cards.
 */
export function LibraryPosterCard({
  entry,
  className,
  showProgress = true,
}: LibraryPosterCardProps) {
  const href =
    entry.media_type === "movie"
      ? ROUTES.movie(entry.external_id)
      : ROUTES.show(entry.external_id);
  const src = posterUrl(entry.poster_path, "w500");
  const cardId = `lib-${entry.id}`;

  const posterRef = React.useRef<HTMLDivElement>(null);
  const softCloseTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const exitTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const openGen = React.useRef(0);

  const [mounted, setMounted] = React.useState(false);
  const [visible, setVisible] = React.useState(false);
  const [popping, setPopping] = React.useState(false);
  const [rect, setRect] = React.useState<HoverRect | null>(null);
  const [instant, setInstant] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  const clearTimers = React.useCallback(() => {
    if (softCloseTimer.current) clearTimeout(softCloseTimer.current);
    if (exitTimer.current) clearTimeout(exitTimer.current);
    softCloseTimer.current = null;
    exitTimer.current = null;
  }, []);

  const forceClose = React.useCallback(() => {
    clearTimers();
    openGen.current += 1;
    setInstant(true);
    setPopping(false);
    setVisible(false);
    setRect(null);
    releaseHover(cardId);
    requestAnimationFrame(() => setInstant(false));
  }, [cardId, clearTimers]);

  React.useEffect(
    () => registerHoverCard(cardId, forceClose),
    [cardId, forceClose],
  );

  const startHover = React.useCallback(() => {
    clearTimers();
    const el = posterRef.current;
    if (!el) return;
    claimHover(cardId);
    const gen = ++openGen.current;
    const r = el.getBoundingClientRect();
    setInstant(false);
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    setVisible(true);
    requestAnimationFrame(() => {
      if (openGen.current !== gen) return;
      requestAnimationFrame(() => {
        if (openGen.current !== gen) return;
        setPopping(true);
      });
    });
  }, [cardId, clearTimers]);

  const softClose = React.useCallback(() => {
    clearTimers();
    const gen = openGen.current;
    softCloseTimer.current = setTimeout(() => {
      if (openGen.current !== gen) return;
      setPopping(false);
      exitTimer.current = setTimeout(() => {
        if (openGen.current !== gen) return;
        setVisible(false);
        setRect(null);
        releaseHover(cardId);
      }, 140);
    }, 80);
  }, [cardId, clearTimers]);

  const keepHover = React.useCallback(() => {
    clearTimers();
    claimHover(cardId);
    setVisible(true);
    setPopping(true);
  }, [cardId, clearTimers]);

  React.useEffect(() => () => {
    clearTimers();
    releaseHover(cardId);
  }, [cardId, clearTimers]);

  React.useEffect(() => {
    if (!visible) return;
    const kill = () => forceClose();
    window.addEventListener("scroll", kill, true);
    window.addEventListener("wheel", kill, { capture: true, passive: true });
    window.addEventListener("touchmove", kill, { capture: true, passive: true });
    window.addEventListener("resize", kill);
    return () => {
      window.removeEventListener("scroll", kill, true);
      window.removeEventListener("wheel", kill, true);
      window.removeEventListener("touchmove", kill, true);
      window.removeEventListener("resize", kill);
    };
  }, [visible, forceClose]);

  const floating =
    mounted && visible && rect
      ? createPortal(
          <div className="pointer-events-none fixed inset-0 z-[100]">
            <div
              className="pointer-events-auto absolute overflow-hidden rounded-xl border border-white/15 bg-muted"
              style={{
                top: rect.top,
                left: rect.left,
                width: rect.width,
                height: rect.height,
                transform: popping
                  ? "translate3d(0, -18px, 0) scale3d(1.14, 1.14, 1)"
                  : "translate3d(0, 0, 0) scale3d(1, 1, 1)",
                transformOrigin: "50% 80%",
                willChange: instant ? "auto" : "transform",
                backfaceVisibility: "hidden",
                transition: instant
                  ? "none"
                  : "transform 480ms cubic-bezier(0.16,1,0.3,1), box-shadow 480ms cubic-bezier(0.16,1,0.3,1)",
                boxShadow: popping
                  ? "0 32px 64px -12px rgba(0,0,0,0.95), 0 0 0 1px rgba(56,140,255,0.18)"
                  : "0 8px 16px -6px rgba(0,0,0,0.7)",
              }}
              onMouseEnter={keepHover}
              onMouseLeave={softClose}
            >
              <Link href={href} className="absolute inset-0 block" onClick={forceClose}>
                {src ? (
                  <Image
                    src={src}
                    alt=""
                    fill
                    sizes="200px"
                    className={cn(
                      "object-cover",
                      !instant && "transition-transform duration-500",
                      popping && "scale-105",
                    )}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center p-3 text-center text-xs text-muted-foreground">
                    {entry.title}
                  </div>
                )}
                <div className="absolute left-2 top-2">
                  <Badge
                    variant="secondary"
                    className="bg-black/65 text-[10px] text-white backdrop-blur"
                  >
                    {WATCH_STATUS_LABELS[entry.status]}
                  </Badge>
                </div>
                <div className="absolute right-2 top-2 flex gap-1">
                  {entry.is_favorite ? (
                    <span className="rounded-full bg-black/60 p-1 text-primary">
                      <Heart className="h-3 w-3 fill-current" aria-label="Favorite" />
                    </span>
                  ) : null}
                  {entry.is_pinned ? (
                    <span className="rounded-full bg-black/60 p-1 text-white">
                      <Pin className="h-3 w-3" aria-label="Pinned" />
                    </span>
                  ) : null}
                </div>
                {showProgress &&
                entry.progress_percent > 0 &&
                entry.progress_percent < 100 ? (
                  <div className="absolute inset-x-0 bottom-0 h-1 bg-black/40">
                    <div
                      className="h-full bg-primary"
                      style={{ width: `${entry.progress_percent}%` }}
                    />
                  </div>
                ) : null}
              </Link>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <div
        className={cn("relative w-full", className)}
        onMouseEnter={startHover}
        onMouseLeave={softClose}
      >
        <Link
          href={href}
          className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          tabIndex={visible ? -1 : 0}
        >
          <div
            ref={posterRef}
            className={cn(
              "relative aspect-[2/3] overflow-hidden rounded-xl border border-border/60 bg-muted shadow-sm",
              visible && "invisible",
            )}
          >
            {src ? (
              <Image
                src={src}
                alt=""
                fill
                sizes="(max-width: 640px) 45vw, 180px"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center p-3 text-center text-xs text-muted-foreground">
                {entry.title}
              </div>
            )}
            <div className="absolute left-2 top-2 flex flex-col gap-1">
              <Badge
                variant="secondary"
                className="bg-black/65 text-[10px] text-white backdrop-blur"
              >
                {WATCH_STATUS_LABELS[entry.status]}
              </Badge>
            </div>
            <div className="absolute right-2 top-2 flex gap-1">
              {entry.is_favorite ? (
                <span className="rounded-full bg-black/60 p-1 text-primary">
                  <Heart className="h-3 w-3 fill-current" aria-label="Favorite" />
                </span>
              ) : null}
              {entry.is_pinned ? (
                <span className="rounded-full bg-black/60 p-1 text-white">
                  <Pin className="h-3 w-3" aria-label="Pinned" />
                </span>
              ) : null}
            </div>
            {showProgress &&
            entry.progress_percent > 0 &&
            entry.progress_percent < 100 ? (
              <div className="absolute inset-x-0 bottom-0 h-1 bg-black/40">
                <div
                  className="h-full bg-primary"
                  style={{ width: `${entry.progress_percent}%` }}
                />
              </div>
            ) : null}
          </div>
          <div
            className={cn(
              "mt-2 space-y-0.5 px-0.5 transition-opacity",
              visible && "opacity-50",
            )}
          >
            <p className="text-title-card line-clamp-2">{entry.title}</p>
            <p className="text-caption text-muted-foreground">
              {entry.media_type === "tv" ? "TV" : "Movie"}
              {entry.user_rating != null ? ` · ★ ${entry.user_rating}` : ""}
              {entry.progress_percent > 0
                ? ` · ${Math.round(entry.progress_percent)}%`
                : ""}
            </p>
          </div>
        </Link>
      </div>
      {floating}
    </>
  );
}
