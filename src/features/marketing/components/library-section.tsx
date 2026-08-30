"use client";

import { ArtTile } from "./art-tile";
import { Hairline, Reveal } from "./reveal";
import { SectionHeader } from "./section-header";
import type { ShowcasePoster } from "../showcase";

/** Fallback shape when TMDB is unconfigured — keeps the layout identical. */
const TILES = [
  { hue: 210, progress: 100 },
  { hue: 232, progress: 62 },
  { hue: 194, progress: 100 },
  { hue: 250, progress: 28 },
  { hue: 204, progress: 84 },
  { hue: 222, progress: 45 },
] as const;

const STATUS = [
  "Completed",
  "Watching",
  "Completed",
  "Wishlist",
  "Watching",
  "Paused",
] as const;

const ORGANISERS = [
  {
    key: "Collections",
    body: "Group anything: a director run, a rewatch queue, a “someday” shelf.",
  },
  {
    key: "Tags",
    body: "Unlimited, freeform, and searchable alongside notes and reviews.",
  },
  {
    key: "History",
    body: "Every session recorded, so the timeline reads like a journal.",
  },
] as const;

export function LibrarySection({ posters = [] }: { posters?: ShowcasePoster[] }) {
  return (
    <section
      id="library"
      className="content-container relative scroll-mt-24 py-20 sm:py-28"
    >
      <SectionHeader
        title="Everything, arranged the way you think."
        lead="Argus does not force one shape on your collection. Status, tags, collections and progress are separate dimensions you can combine however you like."
      />

      <div className="mt-14 grid gap-14 sm:mt-16 lg:grid-cols-12 lg:gap-10">
        <div className="lg:col-span-4">
          <div className="space-y-10">
            {ORGANISERS.map((item, i) => (
              <div key={item.key}>
                <Hairline delay={i * 90} electric={i === 0} />
                <Reveal delay={i * 90 + 140} className="pt-5">
                  <span className="landing-mono">{item.key}</span>
                  <p className="mt-3 text-sm leading-relaxed text-white/50">
                    {item.body}
                  </p>
                </Reveal>
              </div>
            ))}
          </div>
        </div>

        {/* Editorial artwork composition — deliberately off-grid */}
        <div className="lg:col-span-8">
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6 sm:gap-4">
            {TILES.map((tile, i) => {
              const poster = posters[i];
              return (
                <div
                  key={poster?.id ?? tile.hue}
                  className={i % 2 === 1 ? "sm:translate-y-10" : undefined}
                >
                  <Reveal delay={i * 70} amount={0.1}>
                    <ArtTile
                      hue={tile.hue}
                      poster={poster}
                      sizes="(min-width: 640px) 14vw, 30vw"
                      className="aspect-[2/3]"
                    >
                      <div
                        className="absolute inset-x-0 bottom-0 h-[3px] bg-black/50"
                        aria-hidden="true"
                      >
                        <div
                          className="h-full bg-[hsl(var(--electric))]"
                          style={{ width: `${tile.progress}%` }}
                        />
                      </div>
                    </ArtTile>

                    <div className="mt-2.5">
                      <p className="landing-mono text-[0.625rem] text-[hsl(var(--electric))]">
                        {STATUS[i]}
                      </p>
                      {poster ? (
                        <p className="mt-1 truncate text-xs leading-tight text-white/70">
                          {poster.title}
                        </p>
                      ) : null}
                    </div>
                  </Reveal>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
