"use client";

import type { ComponentType } from "react";
import { Clapperboard, Layers, Search, Star } from "lucide-react";

import { EdgeTraces } from "./electric-cta";
import { Reveal } from "./reveal";
import { SectionHeader } from "./section-header";

const CAPABILITIES = [
  {
    icon: Clapperboard,
    title: "Cinematic catalog",
    body: "Films, series, anime, documentaries and limited series — with galleries, trailers, cast, collections and streaming availability.",
  },
  {
    icon: Layers,
    title: "A library that scales",
    body: "Tags, collections, watchlist, favorites, history and private notes. Unlimited organization without a rigid folder tree.",
  },
  {
    icon: Search,
    title: "Command-driven",
    body: "⌘K reaches everything: titles, people, genres, collections and every page in the app. Keyboard first, always.",
  },
  {
    icon: Star,
    title: "Opinions on record",
    body: "Rate, review, flag spoilers, keep notes to yourself. Your take on a title is data, not a throwaway star.",
  },
] as const;

export function CapabilitiesSection() {
  return (
    <section
      id="capabilities"
      className="content-container relative scroll-mt-24 py-20 sm:py-28"
    >
      <SectionHeader
        title="A command center, not another list."
        lead="Every surface is built for long sessions: dark, dense where it should be, and navigable entirely from the keyboard."
      />

      <div className="mt-14 grid gap-4 sm:mt-16 sm:grid-cols-2 lg:grid-cols-4">
        {CAPABILITIES.map((item, i) => (
          <Reveal key={item.title} delay={i * 70} amount={0.15}>
            <CapabilityCard {...item} />
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function CapabilityCard({
  icon: Icon,
  title,
  body,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  body: string;
}) {
  return (
    <article className="lx-card lx-corner h-full p-6">
      <div className="lx-card__bloom" aria-hidden="true" />
      <EdgeTraces />

      <Icon className="lx-icon h-5 w-5" aria-hidden="true" />
      <h3 className="font-display mt-6 text-lg font-semibold tracking-[-0.02em] text-white/95">
        {title}
      </h3>
      <p className="mt-3 text-sm leading-relaxed text-white/50">{body}</p>
    </article>
  );
}
