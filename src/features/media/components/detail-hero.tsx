"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";

import { Badge } from "@/components/ui/badge";
import { RatingsDisplay } from "@/features/media/components/ratings-display";
import { HeroTrailerBackdrop } from "@/features/media/components/hero-trailer-backdrop";
import { logoUrl } from "@/lib/media/image";
import { formatRuntime, formatYear } from "@/lib/media/format";
import { mediaHref } from "@/lib/media/routes";
import type {
  Genre,
  MediaRating,
  MediaVideo,
  StreamingAvailability,
} from "@/types/media";
import { heroContainer, heroItem } from "@/animations/variants";
import { StreamingProviders } from "@/features/media/components/streaming-providers";

interface DetailHeroProps {
  title: string;
  tagline?: string | null;
  overview?: string | null;
  backdropPath?: string | null;
  posterPath?: string | null;
  logoPath?: string | null;
  releaseDate?: string | null;
  runtime?: number | null;
  certification?: string | null;
  status?: string | null;
  mediaTypeLabel: string;
  genres?: Genre[];
  ratings?: MediaRating[];
  /** YouTube trailers from TMDB — played full-bleed in the hero stage. */
  videos?: MediaVideo[];
  /** Live where-to-watch chips (Netflix, Prime, etc.). */
  streaming?: StreamingAvailability | null;
  children?: React.ReactNode;
}

/**
 * Shared cinematic hero for movie / TV detail pages.
 * Trailer/backdrop stage with logo + story only (no duplicate poster card).
 */
export function DetailHero({
  title,
  tagline,
  overview,
  backdropPath,
  posterPath,
  logoPath,
  releaseDate,
  runtime,
  certification,
  status,
  mediaTypeLabel,
  genres = [],
  ratings = [],
  videos = [],
  streaming,
  children,
}: DetailHeroProps) {
  const reduceMotion = useReducedMotion();
  const logo = logoUrl(logoPath, "w500");
  const year = formatYear(releaseDate);
  const runtimeLabel = formatRuntime(runtime);

  return (
    <section className="relative -mx-4 overflow-hidden sm:-mx-6 lg:-mx-8">
      <div className="relative min-h-[min(78vh,52rem)] w-full">
        <HeroTrailerBackdrop
          videos={videos}
          backdropPath={backdropPath}
          posterPath={posterPath}
          title={title}
          className="absolute inset-0"
        />

        <motion.div
          className="relative z-[1] flex min-h-[min(78vh,52rem)] flex-col justify-end"
          variants={reduceMotion ? undefined : heroContainer}
          initial={reduceMotion ? false : "hidden"}
          animate="visible"
        >
          <div className="content-container max-w-3xl pb-8 pt-24 sm:pb-12 sm:pt-28">
            <div className="space-y-4 text-center sm:text-left">
              {logo ? (
                <motion.div
                  variants={reduceMotion ? undefined : heroItem}
                  className="relative mx-auto h-16 w-full max-w-xs sm:mx-0 sm:h-20"
                >
                  <Image
                    src={logo}
                    alt={title}
                    fill
                    className="object-contain object-bottom drop-shadow-lg sm:object-left-bottom"
                    sizes="320px"
                    priority
                  />
                </motion.div>
              ) : (
                <motion.h1
                  variants={reduceMotion ? undefined : heroItem}
                  className="font-display text-balance text-[clamp(1.85rem,1.15rem+2.4vw,3.15rem)] font-bold leading-[1.08] tracking-[-0.03em] drop-shadow-sm"
                >
                  {title}
                </motion.h1>
              )}

              {logo ? <h1 className="sr-only">{title}</h1> : null}

              {tagline ? (
                <motion.p
                  variants={reduceMotion ? undefined : heroItem}
                  className="text-prose-soft italic text-muted-foreground text-pretty"
                >
                  {tagline}
                </motion.p>
              ) : null}

              <motion.div
                variants={reduceMotion ? undefined : heroItem}
                className="flex flex-wrap items-center justify-center gap-2 sm:justify-start"
              >
                <Badge variant="secondary">{mediaTypeLabel}</Badge>
                {certification ? <Badge variant="outline">{certification}</Badge> : null}
                {year ? <span className="text-sm text-muted-foreground">{year}</span> : null}
                {runtimeLabel ? (
                  <span className="text-sm text-muted-foreground">{runtimeLabel}</span>
                ) : null}
                {status ? (
                  <span className="text-sm text-muted-foreground">{status}</span>
                ) : null}
              </motion.div>

              {genres.length ? (
                <motion.div
                  variants={reduceMotion ? undefined : heroItem}
                  className="flex flex-wrap justify-center gap-1.5 sm:justify-start"
                >
                  {genres.map((g) => (
                    <Link key={g.id} href={mediaHref("genre", g.id)}>
                      <Badge
                        variant="muted"
                        className="transition-colors hover:bg-primary/15 hover:text-foreground"
                      >
                        {g.name}
                      </Badge>
                    </Link>
                  ))}
                </motion.div>
              ) : null}

              {ratings.length ? (
                <motion.div variants={reduceMotion ? undefined : heroItem}>
                  <RatingsDisplay ratings={ratings} />
                </motion.div>
              ) : null}

              {streaming?.providers?.length ? (
                <motion.div variants={reduceMotion ? undefined : heroItem}>
                  <StreamingProviders availability={streaming} compact />
                </motion.div>
              ) : null}

              {overview ? (
                <motion.p
                  variants={reduceMotion ? undefined : heroItem}
                  className="text-prose-soft max-w-2xl text-muted-foreground text-pretty"
                >
                  {overview}
                </motion.p>
              ) : null}

              {children ? (
                <motion.div variants={reduceMotion ? undefined : heroItem}>
                  {children}
                </motion.div>
              ) : null}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
