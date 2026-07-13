"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import { Badge } from "@/components/ui/badge";
import { backdropUrl, posterUrl } from "@/lib/media/image";
import { formatVote, formatYear } from "@/lib/media/format";
import { mediaHref } from "@/lib/media/routes";
import type { MediaSummary } from "@/types/media";
import { springSoft } from "@/animations/motion";

interface HeroBannerProps {
  /** Rotating featured titles (trending etc.). */
  items: MediaSummary[];
  /** Legacy single-item support. */
  item?: MediaSummary;
  /** Auto-advance interval in ms (default 3s). */
  intervalMs?: number;
  ctaHref?: string;
}

/**
 * Cinematic discovery hero — auto-rotates through featured titles.
 * The feature itself is clickable; carousel controls stay separate.
 */
export function HeroBanner({
  items,
  item,
  intervalMs = 3000,
  ctaHref,
}: HeroBannerProps) {
  const reduceMotion = useReducedMotion();
  const slides = React.useMemo(() => {
    const list = items.length ? items : item ? [item] : [];
    const withArt = list.filter((i) => i.backdropPath || i.posterPath);
    return (withArt.length ? withArt : list).slice(0, 12);
  }, [items, item]);

  const [index, setIndex] = React.useState(0);
  const [paused, setPaused] = React.useState(false);

  React.useEffect(() => {
    if (slides.length <= 1 || paused || reduceMotion) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [slides.length, paused, reduceMotion, intervalMs]);

  const active = slides[index] ?? slides[0];
  if (!active) return null;

  const href = ctaHref ?? mediaHref(active.mediaType, active.id);
  const bg = backdropUrl(active.backdropPath ?? active.posterPath, "w1280");
  const poster = posterUrl(active.posterPath, "w500");
  const year = formatYear(active.releaseDate);

  const go = (dir: -1 | 1) => {
    setIndex((i) => (i + dir + slides.length) % slides.length);
  };

  return (
    <section
      className="relative overflow-hidden rounded-2xl border-0 bg-muted/40 dark:bg-white/[0.05] shadow-lg shadow-primary/5"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="carousel"
      aria-label="Featured titles"
    >
      <div className="absolute inset-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={active.id + active.mediaType}
            className="absolute inset-0"
            initial={reduceMotion ? false : { opacity: 0, scale: 1.06 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            {bg ? (
              <Image
                src={bg}
                alt=""
                fill
                priority={index === 0}
                sizes="100vw"
                className="object-cover"
              />
            ) : null}
          </motion.div>
        </AnimatePresence>
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/92 to-background/25" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/45" />
      </div>

      <div className="relative p-5 sm:p-8 lg:p-10">
        <Link
          href={href}
          prefetch
          className="group grid gap-6 outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:rounded-xl lg:grid-cols-[auto_1fr] lg:items-end lg:gap-10"
          aria-label={`Open ${active.title}`}
        >
          {poster ? (
            <motion.div
              key={`poster-${active.id}`}
              className="relative mx-auto aspect-[2/3] w-36 shrink-0 overflow-hidden rounded-xl border-0 shadow-xl shadow-primary/20 transition-transform duration-300 group-hover:-translate-y-1 sm:mx-0 sm:w-44 lg:w-48"
              initial={reduceMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={springSoft}
            >
              <Image
                src={poster}
                alt=""
                fill
                sizes="192px"
                className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                priority={index === 0}
              />
            </motion.div>
          ) : null}

          <div className="max-w-2xl space-y-4 text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <Badge variant="secondary" className="backdrop-blur">
                Featured
              </Badge>
              <Badge
                variant="outline"
                className="border-white/20 bg-black/20 backdrop-blur"
              >
                {active.mediaType === "tv" ? "TV Series" : "Movie"}
              </Badge>
              {year ? (
                <span className="text-xs text-muted-foreground">{year}</span>
              ) : null}
              {active.voteAverage != null && active.voteAverage > 0 ? (
                <span className="text-xs font-medium text-primary">
                  ★ {formatVote(active.voteAverage)}
                </span>
              ) : null}
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={`copy-${active.id}`}
                initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
                transition={{ duration: 0.35 }}
                className="space-y-3"
              >
                <h1 className="font-display text-balance text-[clamp(1.85rem,1.2rem+2.2vw,3rem)] font-bold leading-[1.08] tracking-[-0.03em] transition-colors group-hover:text-primary">
                  {active.title}
                </h1>
                {active.overview ? (
                  <p className="text-prose-soft line-clamp-3 text-muted-foreground text-pretty">
                    {active.overview}
                  </p>
                ) : null}
              </motion.div>
            </AnimatePresence>
          </div>
        </Link>

        {slides.length > 1 ? (
          <div className="relative z-[1] mt-5 flex items-center justify-center gap-2 sm:justify-start lg:pl-[calc(11rem+2.5rem)]">
            <button
              type="button"
              onClick={() => go(-1)}
              className="rounded-xl border-0 bg-muted/50 dark:bg-white/[0.08] p-1.5 text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Previous featured title"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="flex gap-1.5">
              {slides.map((s, i) => (
                <button
                  key={`${s.mediaType}-${s.id}`}
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-label={`Show ${s.title}`}
                  aria-current={i === index}
                  className={
                    i === index
                      ? "h-1.5 w-5 rounded-md bg-primary transition-all"
                      : "h-1.5 w-1.5 rounded-md bg-muted-foreground/40 transition-all hover:bg-muted-foreground/70"
                  }
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => go(1)}
              className="rounded-xl border-0 bg-muted/50 dark:bg-white/[0.08] p-1.5 text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Next featured title"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
