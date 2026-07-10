"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";

import { Badge } from "@/components/ui/badge";
import { RatingsDisplay } from "@/features/media/components/ratings-display";
import { HeroTrailerBackdrop } from "@/features/media/components/hero-trailer-backdrop";
import { logoUrl, posterUrl } from "@/lib/media/image";
import { formatRuntime, formatYear } from "@/lib/media/format";
import { mediaHref } from "@/lib/media/routes";
import type {
  Genre,
  MediaRating,
  MediaVideo,
  StreamingAvailability,
} from "@/types/media";
import { heroContainer, heroItem, scaleIn } from "@/animations/variants";
import { springSoft } from "@/animations/motion";
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
 * Large trailer stage with poster + meta overlaid — journal lives below, not on the stage.
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
  const poster = posterUrl(posterPath, "w500");
  const logo = logoUrl(logoPath, "w500");
  const year = formatYear(releaseDate);
  const runtimeLabel = formatRuntime(runtime);
  const hasTrailer = videos.some((v) => v.site === "YouTube" && v.key);

  return (
    <section className="relative -mx-4 overflow-hidden sm:-mx-6 lg:-mx-8">
      {/*
        Fixed-feel stage so the trailer has a comfortable cinema viewport
        on every screen size (object-fit: cover behavior lives inside backdrop).
      */}
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
          <div className="content-container grid gap-6 pb-8 pt-20 sm:pb-10 sm:pt-24 lg:grid-cols-[auto_1fr] lg:items-end lg:gap-8">
            {poster ? (
              <motion.div
                className="relative mx-auto aspect-[2/3] w-40 shrink-0 overflow-hidden rounded-2xl border border-white/15 shadow-2xl shadow-black/40 sm:mx-0 sm:w-48 lg:w-52"
                variants={reduceMotion ? undefined : scaleIn}
                whileHover={
                  reduceMotion
                    ? undefined
                    : { y: -10, rotateY: -5, rotateX: 3, scale: 1.03 }
                }
                transition={springSoft}
                style={{ transformStyle: "preserve-3d" }}
              >
                <Image
                  src={poster}
                  alt=""
                  fill
                  sizes="208px"
                  className="object-cover"
                  priority
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-primary/15 via-transparent to-transparent" />
                {hasTrailer ? (
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-2.5 pb-2.5 pt-10">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-white/85">
                      Cinematic backdrop
                    </p>
                  </div>
                ) : null}
              </motion.div>
            ) : null}

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
