"use client";

import { useRef } from "react";
import { Search } from "lucide-react";
import {
  motion,
  useMotionTemplate,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";

import { ArtTile } from "./art-tile";
import type { ShowcasePoster } from "../showcase";

const CONTINUE = [
  { hue: 212, progress: 68 },
  { hue: 228, progress: 34 },
  { hue: 196, progress: 91 },
  { hue: 250, progress: 12 },
] as const;

const STATS = [
  { label: "Hours", value: "1,284" },
  { label: "Titles", value: "372" },
  { label: "Streak", value: "12d" },
] as const;

const ACTIVITY = [34, 52, 28, 66, 44, 78, 58, 92, 48, 70, 38, 84] as const;

/**
 * The product *is* the hero visual: an Argus surface sitting inside the
 * environment, angled and lit by the same lightning as the background.
 *
 * Decorative duplication of copy that already exists in the page, so the whole
 * composition is hidden from assistive tech.
 */
export function ProductComposition({ posters = [] }: { posters?: ShowcasePoster[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const mainY = useTransform(scrollYProgress, [0, 1], [16, -16]);
  const satY = useTransform(scrollYProgress, [0, 1], [44, -44]);
  const chipY = useTransform(scrollYProgress, [0, 1], [-28, 30]);

  // Full transform strings stay hardware accelerated under load.
  const mainTransform = useMotionTemplate`translate3d(0, ${mainY}px, 0)`;
  const satTransform = useMotionTemplate`translate3d(0, ${satY}px, 0)`;
  const chipTransform = useMotionTemplate`translate3d(0, ${chipY}px, 0)`;

  return (
    <div ref={ref} className="relative" aria-hidden="true">
      <div className="[transform-style:preserve-3d] md:[transform:perspective(1700px)_rotateY(-11deg)_rotateX(5deg)]">
        {/* —— Main surface —— */}
        <motion.div
          className="relative z-10"
          style={reduce ? undefined : { transform: mainTransform }}
        >
          <div
            className="lx-panel lx-corner lx-rise p-3 sm:p-4"
            style={{ animationDelay: "480ms" }}
          >
            {/* Chrome */}
            <div className="flex items-center gap-3 border-b border-white/[0.07] pb-3">
              <span className="font-mono text-[0.625rem] tracking-[0.22em] text-white/70 uppercase">
                Argus
              </span>
              <span className="h-3 w-px bg-white/10" />
              {/* Capped so the ⌘K affordance stays on-screen when the panel bleeds. */}
              <div className="flex h-7 w-full max-w-[20rem] items-center gap-2 border border-white/[0.07] bg-white/[0.02] px-2">
                <Search className="h-3 w-3 shrink-0 text-white/40" />
                <span className="truncate text-[0.6875rem] text-white/40">
                  Search everything
                </span>
                <span className="ml-auto shrink-0 border border-white/15 px-1 font-mono text-[0.5625rem] text-white/55">
                  ⌘K
                </span>
              </div>
            </div>

            {/* Continue watching */}
            <div className="mt-4">
              <span className="landing-mono">Continue watching</span>
            </div>
            <div className="mt-2.5 grid grid-cols-4 gap-2">
              {CONTINUE.map((item, i) => {
                const poster = posters[i];
                return (
                  <div key={poster?.id ?? item.hue}>
                    <ArtTile
                      hue={item.hue}
                      lit
                      poster={poster}
                      priority={i < 2}
                      sizes="(min-width: 1024px) 11vw, 22vw"
                      className="aspect-[2/3]"
                    >
                      <div
                        className="lx-rise absolute inset-x-0 bottom-0 h-[3px] bg-black/50"
                        style={{ animationDelay: `${560 + i * 70}ms` }}
                      >
                        <div
                          className="h-full bg-[hsl(var(--electric))]"
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                    </ArtTile>
                    {poster ? (
                      <p className="mt-1.5 truncate text-[0.625rem] leading-tight text-white/55">
                        {poster.title}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>

            {/* Insight strip — hairline grid, mono numerals */}
            <div className="mt-4 grid grid-cols-3 gap-px bg-white/[0.07]">
              {STATS.map((stat) => (
                <div key={stat.label} className="bg-[hsl(0_0%_4%)] px-2.5 py-2.5">
                  <p className="landing-mono text-[0.5625rem]">{stat.label}</p>
                  <p className="mt-1 font-mono text-base leading-none text-white/90 tabular-nums">
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>

            {/* Activity */}
            <div className="mt-3.5 flex h-12 items-end gap-1">
              {ACTIVITY.map((height, i) => (
                <span
                  key={i}
                  data-play="true"
                  className="lx-bar w-full"
                  style={{ height: `${height}%`, animationDelay: `${660 + i * 26}ms` }}
                />
              ))}
            </div>
          </div>
        </motion.div>

        {/* —— Decision score satellite —— */}
        <motion.div
          className="absolute -bottom-9 -left-4 z-20 sm:-bottom-10 sm:-left-10"
          style={reduce ? undefined : { transform: satTransform }}
        >
          <div
            className="lx-panel lx-rise w-[10.5rem] p-3 sm:w-[12.5rem]"
            style={{ animationDelay: "600ms" }}
          >
            <p className="landing-mono text-[0.5625rem]">Decision score</p>
            <div className="mt-2 flex items-end gap-2">
              <span className="font-mono text-3xl leading-none font-medium text-white tabular-nums">
                87
              </span>
              <span className="mb-0.5 font-mono text-[0.5625rem] tracking-[0.16em] text-[hsl(var(--electric))] uppercase">
                Strong
              </span>
            </div>
            <div className="mt-3 h-px w-full bg-white/10">
              <div className="h-px w-[87%] bg-[hsl(var(--electric))]" />
            </div>
          </div>
        </motion.div>

        {/* —— Streak chip (desktop only: mobile stays uncluttered) —— */}
        <motion.div
          className="absolute -top-5 right-[16%] z-20 hidden sm:block"
          style={reduce ? undefined : { transform: chipTransform }}
        >
          <div
            className="lx-panel lx-rise flex items-center gap-2 px-3 py-2"
            style={{ animationDelay: "680ms" }}
          >
            <span className="h-1 w-1 bg-[hsl(var(--electric))]" />
            <span className="font-mono text-[0.5625rem] tracking-[0.16em] text-white/75 uppercase">
              12-day streak
            </span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
