"use client";

import { Reveal } from "./reveal";
import { SectionHeader } from "./section-header";

const MONTHS = [
  { label: "J", value: 38 },
  { label: "F", value: 54 },
  { label: "M", value: 31 },
  { label: "A", value: 68 },
  { label: "M", value: 46 },
  { label: "J", value: 82 },
  { label: "J", value: 61 },
  { label: "A", value: 94 },
  { label: "S", value: 52 },
  { label: "O", value: 74 },
  { label: "N", value: 42 },
  { label: "D", value: 88 },
] as const;

/** What the Decision Score is weighted from — the reasoning it promises to show. */
const FACTORS = [
  { label: "Ratings", value: 92 },
  { label: "Genre history", value: 84 },
  { label: "Runtime fit", value: 71 },
  { label: "Completion", value: 63 },
] as const;

const FACTOR_TICKS = 12;

const GENRES = [
  { label: "Sci-fi", value: 34 },
  { label: "Thriller", value: 26 },
  { label: "Drama", value: 19 },
  { label: "Anime", value: 13 },
  { label: "Documentary", value: 8 },
] as const;

/** A real 52-week year. */
const HEAT_WEEKS = 52;

/**
 * Deterministic pseudo-random intensity — server and client markup match
 * exactly, but the year reads like watch history rather than a repeating
 * diagonal: most days light, a few heavy, roughly a fifth of them blank.
 */
function heatIntensity(index: number): number {
  let h = (index + 1) * 2654435761;
  h ^= h >>> 15;
  h = (h * 2246822519) >>> 0;
  h ^= h >>> 13;
  const unit = (h >>> 0) / 4294967295;
  return unit < 0.19 ? 0 : Math.pow(unit, 1.7);
}

const HEAT_CELLS = Array.from({ length: HEAT_WEEKS * 7 }, (_, i) => heatIntensity(i));

export function IntelligenceSection() {
  return (
    <section
      id="intelligence"
      className="content-container relative scroll-mt-24 py-20 sm:py-28"
    >
      <SectionHeader
        title="Your taste, measured."
        lead="Hours, streaks, distributions, completion rates — plus an explainable Decision Score for anything you are still deciding about."
      />

      <div className="mt-14 grid gap-4 sm:mt-16 lg:grid-cols-12">
        {/* —— Monthly activity —— */}
        <Reveal className="lg:col-span-7" amount={0.25}>
          <div className="lx-panel lx-corner h-full p-6 sm:p-8">
            <div className="flex items-baseline justify-between">
              <span className="landing-mono">Monthly activity</span>
              <span className="font-mono text-xs text-white/65 tabular-nums">
                1,284 h
              </span>
            </div>

            {/* Bars sit on a baseline rather than floating in the panel. */}
            <div className="mt-8 flex h-40 items-end gap-1.5 border-b border-white/[0.14] sm:gap-2.5">
              {MONTHS.map((month, i) => (
                <span
                  key={`${month.label}-${i}`}
                  className="lx-bar w-full"
                  style={{ height: `${month.value}%`, animationDelay: `${i * 45}ms` }}
                />
              ))}
            </div>
            <div className="mt-3 flex gap-1.5 sm:gap-2.5">
              {MONTHS.map((month, i) => (
                <span
                  key={`label-${i}`}
                  className="w-full text-center font-mono text-[0.625rem] text-white/55"
                >
                  {month.label}
                </span>
              ))}
            </div>

            {/* Year heatmap — 52 weeks × 7 days, cells fill their track. */}
            <div className="mt-10 border-t border-white/[0.07] pt-6">
              <div className="flex items-baseline justify-between">
                <span className="landing-mono">Year</span>
                <span className="font-mono text-[0.625rem] text-white/55 tabular-nums">
                  52 weeks
                </span>
              </div>
              <div
                className="mt-4 grid grid-flow-col grid-rows-7 gap-[2px]"
                style={{ gridAutoColumns: "minmax(0, 1fr)" }}
              >
                {HEAT_CELLS.map((intensity, i) => (
                  <span
                    key={i}
                    className="lx-cell aspect-square w-full"
                    style={{
                      // Stagger by week, so the year fills as one left-to-right sweep.
                      animationDelay: `${Math.floor(i / 7) * 11}ms`,
                      backgroundColor:
                        intensity === 0
                          ? "hsl(0 0% 100% / 0.05)"
                          : `hsl(var(--electric) / ${(0.16 + intensity * 0.78).toFixed(2)})`,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </Reveal>

        {/* —— Decision score + distribution —— */}
        <Reveal className="lg:col-span-5" delay={90} amount={0.25}>
          <div className="lx-panel h-full p-6 sm:p-8">
            <span className="landing-mono">Decision score</span>

            <div className="mt-6 flex items-end gap-5">
              <p className="font-mono text-6xl leading-[0.82] font-medium text-white tabular-nums">
                87
              </p>
              <p className="pb-1 font-mono text-[0.6875rem] leading-none tracking-[0.2em] text-[hsl(var(--electric))] uppercase">
                Strong
                <br />
                match
              </p>
            </div>

            <p className="mt-5 max-w-[26rem] text-xs leading-relaxed text-white/60">
              Weighted from your ratings, genre history, runtime tolerance and completion
              rate — and it always shows its reasoning.
            </p>

            {/* The reasoning itself, as tick meters — distinct from the smooth
                distribution bars below so the panel reads as two measurements. */}
            <div className="mt-8 border-t border-white/[0.07] pt-6">
              <span className="landing-mono">Weighting</span>
              <ul className="mt-4 space-y-3">
                {FACTORS.map((factor, row) => {
                  const filled = Math.round((factor.value / 100) * FACTOR_TICKS);
                  return (
                    <li key={factor.label} className="flex items-center gap-3">
                      <span className="w-24 shrink-0 truncate text-xs text-white/70">
                        {factor.label}
                      </span>
                      <span className="flex flex-1 gap-[3px]" aria-hidden="true">
                        {Array.from({ length: FACTOR_TICKS }, (_, tick) => (
                          <span
                            key={tick}
                            className="lx-cell h-2.5 flex-1"
                            style={{
                              animationDelay: `${200 + row * 90 + tick * 26}ms`,
                              backgroundColor:
                                tick < filled
                                  ? "hsl(var(--electric))"
                                  : "hsl(0 0% 100% / 0.09)",
                            }}
                          />
                        ))}
                      </span>
                      <span className="w-8 shrink-0 text-right font-mono text-[0.625rem] text-white/60 tabular-nums">
                        {factor.value}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="mt-8 border-t border-white/[0.07] pt-6">
              <span className="landing-mono">Distribution</span>
              <ul className="mt-4 space-y-3.5">
                {GENRES.map((genre, i) => (
                  <li key={genre.label} className="flex items-center gap-3">
                    <span className="w-24 shrink-0 truncate text-xs text-white/70">
                      {genre.label}
                    </span>
                    <span className="h-0.5 flex-1 bg-white/[0.09]">
                      <span
                        className="lx-barx block h-0.5 bg-[hsl(var(--electric))]"
                        style={{
                          width: `${genre.value * 2.6}%`,
                          animationDelay: `${180 + i * 70}ms`,
                        }}
                      />
                    </span>
                    <span className="w-8 shrink-0 text-right font-mono text-[0.625rem] text-white/60 tabular-nums">
                      {genre.value}%
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
