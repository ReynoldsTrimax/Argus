"use client";

import Image from "next/image";

import { cn } from "@/lib/utils";
import { useLightning } from "../lightning-context";
import type { ShowcasePoster } from "../showcase";

/**
 * Artwork tile for the landing compositions.
 *
 * With a `poster` it shows real TMDB artwork; without one it falls back to an
 * abstract gradient in the Argus blue/violet family, so the page still looks
 * designed when the catalog is unconfigured or unreachable. The gradient stays
 * underneath either way, acting as the loading colour.
 *
 * `lit` opts the tile into the hero flash: a white-hot overlay whose opacity
 * follows the same strike keyframes, so artwork briefly catches the lightning.
 */
export function ArtTile({
  hue,
  className,
  lit = false,
  poster,
  priority = false,
  sizes = "(min-width: 1024px) 12vw, 30vw",
  children,
}: {
  hue: number;
  className?: string;
  lit?: boolean;
  poster?: ShowcasePoster;
  priority?: boolean;
  sizes?: string;
  children?: React.ReactNode;
}) {
  const { phase, burst } = useLightning();

  return (
    <div
      className={cn("lx-art", className)}
      data-poster={poster ? "true" : undefined}
      style={{ "--art-h": poster?.hue ?? hue } as React.CSSProperties}
    >
      {poster ? (
        <Image
          src={poster.posterUrl}
          alt={poster.title}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover"
        />
      ) : null}

      {/* Keeps artwork legible against the near-black stage and unifies the
          palette across tiles with very different cover art. */}
      {poster ? (
        <div
          className="absolute inset-0 bg-[linear-gradient(180deg,hsl(0_0%_0%/0.1),hsl(0_0%_0%/0.55))]"
          aria-hidden="true"
        />
      ) : null}

      {lit ? (
        <div
          key={`${phase}-${burst}`}
          data-strike={phase}
          className="lit-overlay absolute inset-0"
          aria-hidden="true"
        />
      ) : null}

      {children}
    </div>
  );
}
