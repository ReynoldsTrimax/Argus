"use client";

import Image from "next/image";
import Link from "next/link";
import { Play, Info } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { backdropUrl, posterUrl } from "@/lib/media/image";
import { formatVote, formatYear } from "@/lib/media/format";
import { mediaHref } from "@/lib/media/routes";
import type { MediaSummary } from "@/types/media";
import { heroContainer, heroItem, scaleIn } from "@/animations/variants";
import { springSoft } from "@/animations/motion";

interface HeroBannerProps {
  item: MediaSummary;
  ctaHref?: string;
}

/**
 * Cinematic discovery hero with backdrop, poster, and staggered motion.
 */
export function HeroBanner({ item, ctaHref }: HeroBannerProps) {
  const reduceMotion = useReducedMotion();
  const href = ctaHref ?? mediaHref(item.mediaType, item.id);
  const bg = backdropUrl(item.backdropPath ?? item.posterPath, "w1280");
  const poster = posterUrl(item.posterPath, "w500");
  const year = formatYear(item.releaseDate);

  return (
    <section className="relative overflow-hidden rounded-2xl border border-border/50 bg-card shadow-lg shadow-primary/5">
      <div className="absolute inset-0">
        {bg ? (
          <motion.div
            className="absolute inset-0"
            initial={reduceMotion ? false : { scale: 1.12, opacity: 0.55 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <Image
              src={bg}
              alt=""
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
          </motion.div>
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/92 to-background/25" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/45" />
        {!reduceMotion ? (
          <>
            <div className="pointer-events-none absolute -left-10 top-1/4 h-48 w-48 rounded-full bg-primary/22 blur-3xl animate-glow-pulse" />
            <div className="pointer-events-none absolute -right-8 bottom-0 h-40 w-40 rounded-full bg-primary/12 blur-3xl animate-float" />
          </>
        ) : null}
      </div>

      <motion.div
        className="relative grid gap-6 p-5 sm:p-8 lg:grid-cols-[auto_1fr] lg:items-end lg:gap-10 lg:p-10"
        variants={reduceMotion ? undefined : heroContainer}
        initial={reduceMotion ? false : "hidden"}
        animate="visible"
      >
        {poster ? (
          <motion.div
            className="relative mx-auto aspect-[2/3] w-36 shrink-0 overflow-hidden rounded-xl border border-white/10 shadow-xl shadow-primary/20 sm:mx-0 sm:w-44 lg:w-48"
            variants={reduceMotion ? undefined : scaleIn}
            whileHover={
              reduceMotion
                ? undefined
                : { y: -10, rotateY: -7, rotateX: 5, scale: 1.04 }
            }
            transition={springSoft}
            style={{ transformStyle: "preserve-3d" }}
          >
            <Image src={poster} alt="" fill sizes="192px" className="object-cover" priority />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-primary/15 via-transparent to-transparent" />
          </motion.div>
        ) : null}

        <div className="max-w-2xl space-y-4 text-center sm:text-left">
          <motion.div
            variants={reduceMotion ? undefined : heroItem}
            className="flex flex-wrap items-center justify-center gap-2 sm:justify-start"
          >
            <Badge variant="secondary" className="backdrop-blur">
              Featured
            </Badge>
            <Badge variant="outline" className="border-white/20 bg-black/20 backdrop-blur">
              {item.mediaType === "tv" ? "TV Series" : "Movie"}
            </Badge>
            {year ? (
              <span className="text-xs text-muted-foreground">{year}</span>
            ) : null}
            {item.voteAverage != null && item.voteAverage > 0 ? (
              <span className="text-xs font-medium text-primary">
                ★ {formatVote(item.voteAverage)}
              </span>
            ) : null}
          </motion.div>

          <motion.h1
            variants={reduceMotion ? undefined : heroItem}
            className="font-display text-balance text-[clamp(1.85rem,1.2rem+2.2vw,3rem)] font-bold leading-[1.08] tracking-[-0.03em]"
          >
            {item.title}
          </motion.h1>

          {item.overview ? (
            <motion.p
              variants={reduceMotion ? undefined : heroItem}
              className="text-prose-soft line-clamp-3 text-muted-foreground text-pretty"
            >
              {item.overview}
            </motion.p>
          ) : null}

          <motion.div
            variants={reduceMotion ? undefined : heroItem}
            className="flex flex-wrap items-center justify-center gap-3 sm:justify-start"
          >
            <Button asChild size="lg" className="shadow-glow">
              <Link href={href}>
                <Play className="h-4 w-4 fill-current" />
                View details
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="bg-background/40 backdrop-blur">
              <Link href={href}>
                <Info className="h-4 w-4" />
                More info
              </Link>
            </Button>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}
