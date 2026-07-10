"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  Play,
  Plus,
  Star,
  ThumbsUp,
  VolumeX,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { backdropUrl, posterUrl } from "@/lib/media/image";
import { formatVote, formatYear } from "@/lib/media/format";
import { mediaHref } from "@/lib/media/routes";
import type { MediaSummary } from "@/types/media";
import {
  claimHover,
  registerHoverCard,
  releaseHover,
} from "@/features/media/components/poster-hover-lock";

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

const EXPAND_DELAY_MS = 280;
const SOFT_CLOSE_MS = 90;
const EXIT_MS = 280;

/** Expo-out ease — buttery on 120Hz displays */
const EASE_FLUID = "cubic-bezier(0.16, 1, 0.3, 1)";
const EASE_SOFT = "cubic-bezier(0.22, 1, 0.36, 1)";
const DUR_POP = "480ms";
const DUR_LAYOUT = "520ms";

type HoverRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

type ExpandLayout = {
  top: number;
  left: number;
  width: number;
};

function measure(el: HTMLElement): HoverRect {
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

function expandLayout(poster: HoverRect): ExpandLayout {
  const width = Math.min(
    Math.max(poster.width * 2.15, 300),
    360,
    window.innerWidth - 24,
  );
  const height = width * (9 / 16) + 124;
  let left = poster.left + poster.width / 2 - width / 2;
  let top = poster.top + poster.height * 0.1 - 6;
  left = Math.min(Math.max(10, left), window.innerWidth - width - 10);
  top = Math.min(Math.max(10, top), window.innerHeight - height - 10);
  return { top, left, width };
}

const ringBtn =
  "flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-white/40 bg-white/[0.04] text-white transition-[border-color,background-color,transform] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-primary/70 hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70";

/**
 * Catalog poster — pitch-black stage, blue accent, ultra-fluid GPU pop.
 */
export function PosterCard({
  item,
  className,
  priority,
  size = "md",
}: PosterCardProps) {
  const router = useRouter();
  const cardId = `${item.mediaType}-${item.id}`;
  const posterRef = React.useRef<HTMLDivElement>(null);
  const expandTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const softCloseTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const exitTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const openGen = React.useRef(0);

  const [mounted, setMounted] = React.useState(false);
  const [loaded, setLoaded] = React.useState(false);
  const [visible, setVisible] = React.useState(false);
  const [popping, setPopping] = React.useState(false);
  const [expanded, setExpanded] = React.useState(false);
  const [rect, setRect] = React.useState<HoverRect | null>(null);
  const [panel, setPanel] = React.useState<ExpandLayout | null>(null);
  const [instant, setInstant] = React.useState(false);
  const [reduceMotion, setReduceMotion] = React.useState(false);

  const href = mediaHref(item.mediaType, item.id);
  const posterSrc = posterUrl(item.posterPath, "w500");
  const backdropSrc = backdropUrl(item.backdropPath, "w780") ?? posterSrc;
  const year = formatYear(item.releaseDate);
  const matchPct =
    item.voteAverage != null && item.voteAverage > 0
      ? Math.round((item.voteAverage / 10) * 100)
      : null;

  const clearTimers = React.useCallback(() => {
    if (expandTimer.current) clearTimeout(expandTimer.current);
    if (softCloseTimer.current) clearTimeout(softCloseTimer.current);
    if (exitTimer.current) clearTimeout(exitTimer.current);
    expandTimer.current = null;
    softCloseTimer.current = null;
    exitTimer.current = null;
  }, []);

  const forceClose = React.useCallback(() => {
    clearTimers();
    openGen.current += 1;
    setInstant(true);
    setPopping(false);
    setExpanded(false);
    setVisible(false);
    setRect(null);
    setPanel(null);
    releaseHover(cardId);
    requestAnimationFrame(() => setInstant(false));
  }, [cardId, clearTimers]);

  React.useEffect(() => {
    setMounted(true);
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(mq.matches);
    const onChange = () => setReduceMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  React.useEffect(() => registerHoverCard(cardId, forceClose), [cardId, forceClose]);

  const startHover = React.useCallback(() => {
    clearTimers();
    const el = posterRef.current;
    if (!el) return;

    claimHover(cardId);
    const gen = ++openGen.current;
    const m = measure(el);
    setInstant(false);
    setRect(m);
    setPanel(expandLayout(m));
    setVisible(true);
    setExpanded(false);
    setPopping(false);

    // Double-rAF: paint rest state, then animate → buttery on high-refresh displays
    requestAnimationFrame(() => {
      if (openGen.current !== gen) return;
      requestAnimationFrame(() => {
        if (openGen.current !== gen) return;
        setPopping(true);
      });
    });

    if (!reduceMotion) {
      expandTimer.current = setTimeout(() => {
        if (openGen.current !== gen) return;
        if (posterRef.current) {
          const latest = measure(posterRef.current);
          setRect(latest);
          setPanel(expandLayout(latest));
        }
        setExpanded(true);
      }, EXPAND_DELAY_MS);
    }
  }, [cardId, clearTimers, reduceMotion]);

  const softClose = React.useCallback(() => {
    clearTimers();
    const gen = openGen.current;
    softCloseTimer.current = setTimeout(() => {
      if (openGen.current !== gen) return;
      setPopping(false);
      setExpanded(false);
      exitTimer.current = setTimeout(() => {
        if (openGen.current !== gen) return;
        setVisible(false);
        setRect(null);
        setPanel(null);
        releaseHover(cardId);
      }, reduceMotion ? 0 : EXIT_MS);
    }, SOFT_CLOSE_MS);
  }, [cardId, clearTimers, reduceMotion]);

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

  React.useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") forceClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible, forceClose]);

  const goToTitle = React.useCallback(() => {
    forceClose();
    router.push(href);
  }, [forceClose, href, router]);

  const tags = React.useMemo(() => {
    const t: string[] = [item.mediaType === "tv" ? "Series" : "Movie"];
    if (year) t.push(year);
    if (item.originalLanguage) t.push(item.originalLanguage.toUpperCase());
    return t;
  }, [item.mediaType, item.originalLanguage, year]);

  // GPU-only pop: translate3d + scale3d (compositor thread → 120Hz smooth)
  const scale = reduceMotion ? 1.03 : expanded ? 1 : 1.14;
  const lift = reduceMotion ? -3 : expanded ? 0 : -18;
  const transform = popping
    ? `translate3d(0, ${lift}px, 0) scale3d(${scale}, ${scale}, 1)`
    : "translate3d(0, 0, 0) scale3d(1, 1, 1)";

  const transition = instant || reduceMotion
    ? "none"
    : [
        `transform ${DUR_POP} ${EASE_FLUID}`,
        `opacity ${DUR_POP} ${EASE_SOFT}`,
        `top ${DUR_LAYOUT} ${EASE_FLUID}`,
        `left ${DUR_LAYOUT} ${EASE_FLUID}`,
        `width ${DUR_LAYOUT} ${EASE_FLUID}`,
        `box-shadow ${DUR_POP} ${EASE_SOFT}`,
      ].join(", ");

  const floating =
    mounted && visible && rect
      ? createPortal(
          <div className="pointer-events-none fixed inset-0 z-[100]" aria-hidden>
            <div
              className="pointer-events-auto absolute"
              style={{
                top: expanded && panel ? panel.top : rect.top,
                left: expanded && panel ? panel.left : rect.left,
                width: expanded && panel ? panel.width : rect.width,
                height: expanded && panel ? "auto" : rect.height,
                transform,
                opacity: popping || expanded ? 1 : 0.92,
                transformOrigin: "50% 60%",
                transition,
                zIndex: 100,
                willChange: instant ? "auto" : "transform, opacity",
                backfaceVisibility: "hidden",
                WebkitBackfaceVisibility: "hidden",
                contain: "layout style",
              }}
              onMouseEnter={keepHover}
              onMouseLeave={softClose}
            >
              <div
                className={cn(
                  "overflow-hidden bg-black",
                  expanded ? "rounded-lg" : "h-full rounded-2xl",
                )}
                style={{
                  boxShadow: popping
                    ? "0 32px 64px -12px rgba(0,0,0,0.95), 0 0 0 1px rgba(56,140,255,0.18), 0 0 40px -8px rgba(56,140,255,0.2)"
                    : "0 8px 20px -8px rgba(0,0,0,0.7)",
                  transition: instant
                    ? "none"
                    : `box-shadow ${DUR_POP} ${EASE_SOFT}`,
                }}
              >
                <div
                  className={cn(
                    "relative w-full overflow-hidden bg-black",
                    expanded ? "aspect-video" : "h-full",
                  )}
                >
                  <button
                    type="button"
                    className="absolute inset-0 cursor-pointer"
                    onClick={goToTitle}
                    aria-label={`Open ${item.title}`}
                  >
                    {(expanded ? backdropSrc : posterSrc) ? (
                      <Image
                        src={(expanded ? backdropSrc : posterSrc)!}
                        alt=""
                        fill
                        sizes={expanded ? "360px" : "200px"}
                        className={cn(
                          "object-cover will-change-transform",
                          !instant &&
                            "transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
                          popping && !expanded && "scale-[1.06]",
                        )}
                        priority={priority}
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center p-3 text-center text-xs text-white/60">
                        {item.title}
                      </div>
                    )}
                    <div
                      className={cn(
                        "pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent",
                        expanded ? "opacity-100" : "opacity-75",
                      )}
                    />
                  </button>

                  {expanded ? (
                    <>
                      <div className="pointer-events-none absolute inset-x-0 bottom-0 px-3.5 pb-3 pt-12">
                        <p className="font-display line-clamp-2 text-lg font-bold leading-tight tracking-tight text-white drop-shadow-md">
                          {item.title}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="absolute bottom-2.5 right-2.5 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-white/40 bg-black/60 text-white transition duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-primary/60 hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
                        aria-label="Mute"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <VolumeX className="h-4 w-4" aria-hidden />
                      </button>
                    </>
                  ) : null}

                  {!expanded && item.voteAverage != null && item.voteAverage > 0 ? (
                    <div className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full border border-white/15 bg-black/55 px-2 py-0.5 text-[10px] font-medium text-white">
                      <Star className="h-3 w-3 fill-primary text-primary" aria-hidden />
                      {formatVote(item.voteAverage)}
                    </div>
                  ) : null}
                </div>

                {expanded ? (
                  <div
                    className="space-y-3 bg-black px-3.5 pb-3.5 pt-3"
                    style={{
                      opacity: expanded ? 1 : 0,
                      transition: instant
                        ? "none"
                        : `opacity 360ms ${EASE_SOFT} 40ms`,
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={goToTitle}
                          className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground transition duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-105 hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-95"
                          aria-label={`Play ${item.title}`}
                        >
                          <Play className="h-5 w-5 fill-current" aria-hidden />
                        </button>
                        <button
                          type="button"
                          onClick={goToTitle}
                          className={ringBtn}
                          aria-label="Add to list"
                        >
                          <Plus className="h-5 w-5" aria-hidden />
                        </button>
                        <button
                          type="button"
                          onClick={goToTitle}
                          className={ringBtn}
                          aria-label="Rate"
                        >
                          <ThumbsUp className="h-4 w-4" aria-hidden />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={goToTitle}
                        className={ringBtn}
                        aria-label={`More about ${item.title}`}
                      >
                        <ChevronDown className="h-5 w-5" aria-hidden />
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px]">
                      {matchPct != null ? (
                        <span className="font-semibold text-primary">
                          {matchPct}% Match
                        </span>
                      ) : null}
                      {item.voteAverage != null && item.voteAverage > 0 ? (
                        <span className="inline-flex items-center gap-0.5 text-white/85">
                          <Star className="h-3 w-3 fill-primary text-primary" aria-hidden />
                          {formatVote(item.voteAverage)}
                        </span>
                      ) : null}
                      <span className="rounded-[2px] border border-primary/35 px-1 py-px text-[10px] font-medium uppercase tracking-wide text-primary/90">
                        {item.mediaType === "tv" ? "TV" : "HD"}
                      </span>
                      {year ? <span className="text-white/65">{year}</span> : null}
                    </div>

                    <p className="text-[12px] leading-relaxed text-white/65">
                      {tags.map((t, i) => (
                        <React.Fragment key={t}>
                          {i > 0 ? (
                            <span className="mx-1.5 text-white/30" aria-hidden>
                              •
                            </span>
                          ) : null}
                          <span>{t}</span>
                        </React.Fragment>
                      ))}
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <div
        className={cn(
          "poster-card relative shrink-0",
          sizeClass[size],
          className,
        )}
        onMouseEnter={startHover}
        onMouseLeave={softClose}
      >
        <Link
          href={href}
          className="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          aria-label={`${item.title}${year ? `, ${year}` : ""}`}
          tabIndex={visible ? -1 : 0}
        >
          <div
            ref={posterRef}
            className={cn(
              "relative aspect-[2/3] overflow-hidden rounded-2xl border border-white/10 bg-card shadow-md",
              visible && "invisible",
            )}
          >
            {posterSrc ? (
              <>
                {!loaded ? (
                  <div className="absolute inset-0 skeleton-shimmer" aria-hidden />
                ) : null}
                <Image
                  src={posterSrc}
                  alt=""
                  fill
                  sizes="(max-width: 640px) 40vw, 180px"
                  className={cn(
                    "object-cover transition-opacity duration-300",
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
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            {item.voteAverage != null && item.voteAverage > 0 ? (
              <div className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full border border-white/12 bg-black/55 px-2 py-0.5 text-[10px] font-medium text-white">
                <Star className="h-3 w-3 fill-primary text-primary" aria-hidden />
                {formatVote(item.voteAverage)}
              </div>
            ) : null}
          </div>

          <div
            className={cn(
              "mt-3 space-y-0.5 px-0.5 transition-opacity duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
              visible && "opacity-50",
            )}
          >
            <p className="text-title-card line-clamp-2">{item.title}</p>
            <p className="text-caption text-muted-foreground/90">
              {year ?? "—"}
              <span className="mx-1 opacity-40">·</span>
              {item.mediaType === "tv" ? "TV" : "Movie"}
            </p>
          </div>
        </Link>
      </div>
      {floating}
    </>
  );
}
