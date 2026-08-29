"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Sparkles, Star } from "lucide-react";

import { cn } from "@/lib/utils";
import { posterUrl } from "@/lib/media/image";
import { formatVote, formatYear } from "@/lib/media/format";
import { mediaHref } from "@/lib/media/routes";
import type { Recommendation } from "@/types/recommendations";

interface RecommendationCardProps {
  item: Recommendation;
  priority?: boolean;
  /** Renders the score breakdown under the card. Development only. */
  debug?: boolean;
}

/** Tier badge copy. Wording matches what the tier actually means in scoring. */
const TIER_LABEL: Record<Recommendation["tier"], string> = {
  safe: "Strong match",
  adjacent: "Good fit",
  discovery: "Worth a look",
  wildcard: "Wildcard",
};

/**
 * One recommendation.
 *
 * The reason is the point of this card, so unlike the catalog `PosterCard` — a
 * browsing surface with quick status actions — the reason is always visible
 * under the poster, and hovering reveals the supporting reasons rather than a
 * row of buttons. Both cards share the poster proportions and lift so the two
 * surfaces still feel like one product.
 */
export function RecommendationCard({
  item,
  priority,
  debug = false,
}: RecommendationCardProps) {
  const reduceMotion = useReducedMotion();
  const [loaded, setLoaded] = React.useState(false);
  const [hovered, setHovered] = React.useState(false);

  const href = mediaHref(item.media.mediaType, item.media.id);
  const src = posterUrl(item.media.posterPath, "w342");
  const year = formatYear(item.media.releaseDate);
  const hasDetails = item.explanation.details.length > 0;

  return (
    <motion.article
      className="group relative w-40 shrink-0 sm:w-44"
      style={{ transformOrigin: "50% 85%" }}
      animate={
        reduceMotion
          ? { y: 0, zIndex: hovered ? 8 : 0 }
          : hovered
            ? { y: -8, zIndex: 30 }
            : { y: 0, zIndex: 0 }
      }
      transition={
        reduceMotion
          ? { duration: 0.01 }
          : { type: "spring", stiffness: 260, damping: 30, mass: 0.9 }
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
        href={href}
        prefetch={false}
        className="focus-visible:ring-ring block rounded-xl focus-visible:ring-2 focus-visible:outline-none"
        aria-label={`${item.media.title}${year ? `, ${year}` : ""} — ${item.explanation.headline}`}
      >
        <div
          className={cn(
            "bg-muted relative aspect-[2/3] overflow-hidden rounded-xl shadow-md",
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
                sizes="(max-width: 640px) 40vw, 176px"
                className={cn(
                  "object-cover transition-opacity duration-500 ease-out",
                  loaded ? "opacity-100" : "opacity-0",
                )}
                priority={priority}
                onLoad={() => setLoaded(true)}
              />
            </>
          ) : (
            <div className="bg-muted text-muted-foreground flex h-full items-center justify-center p-3 text-center text-xs">
              {item.media.title}
            </div>
          )}

          {item.media.voteAverage != null && item.media.voteAverage > 0 ? (
            <div className="pointer-events-none absolute top-2 left-2 inline-flex items-center gap-1 rounded-md bg-black/65 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
              <Star className="fill-primary text-primary h-3 w-3" aria-hidden />
              {formatVote(item.media.voteAverage)}
            </div>
          ) : null}

          {item.tier === "wildcard" ? (
            <div className="pointer-events-none absolute top-2 right-2 inline-flex items-center gap-1 rounded-md bg-black/65 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
              <Sparkles className="h-3 w-3" aria-hidden />
              Wildcard
            </div>
          ) : null}
        </div>

        <div className="mt-2 space-y-1 px-0.5">
          <p className="line-clamp-1 text-sm leading-snug font-medium tracking-tight">
            {item.media.title}
          </p>
          <p className="text-muted-foreground text-[11px]">
            {year ?? "—"}
            <span className="mx-1 opacity-40">·</span>
            {item.media.mediaType === "tv" ? "TV" : "Movie"}
            <span className="mx-1 opacity-40">·</span>
            <span className="font-mono tracking-tight">{TIER_LABEL[item.tier]}</span>
          </p>
          {/*
            The headline is the whole reason this title is on screen, so it stays
            visible rather than hiding behind a hover the user may never try.
          */}
          <p className="text-foreground/75 line-clamp-2 text-[11px] leading-snug">
            {item.explanation.headline}
          </p>
        </div>
      </Link>

      <AnimatePresence>
        {hovered && hasDetails ? (
          <motion.div
            key="details"
            initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -2 }}
            transition={{ duration: reduceMotion ? 0.01 : 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="border-border bg-popover text-popover-foreground absolute inset-x-0 top-full z-40 mt-1 rounded-lg border p-2.5 shadow-lg"
          >
            <ul className="space-y-1">
              {item.explanation.details.map((detail) => (
                <li
                  key={detail}
                  className="text-muted-foreground text-[11px] leading-snug"
                >
                  {detail}
                </li>
              ))}
            </ul>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {debug && item.factors ? (
        <table className="border-border/60 mt-2 w-full border-t text-[10px]">
          <caption className="text-muted-foreground pt-1 pb-1 text-left font-mono">
            score {item.score} · conf {item.confidence}
          </caption>
          <tbody>
            {item.factors.map((factor) => (
              <tr key={factor.key}>
                <td className="text-muted-foreground pr-2 align-top">{factor.key}</td>
                <td
                  className={cn(
                    "text-right font-mono tabular-nums",
                    factor.contribution < 0 ? "text-destructive" : "text-success",
                  )}
                >
                  {factor.contribution > 0 ? "+" : ""}
                  {factor.contribution}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </motion.article>
  );
}
