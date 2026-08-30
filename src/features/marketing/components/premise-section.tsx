"use client";

import { Hairline, Reveal } from "./reveal";
import { SectionHeader } from "./section-header";

const PRINCIPLES = [
  {
    key: "Status",
    title: "Six states, not two",
    body: "Watching, completed, paused, dropped, wishlist, rewatching. Because “watched / not watched” was never the truth.",
  },
  {
    key: "Progress",
    title: "Episode-level precision",
    body: "Minutes for films, episodes and seasons for series. Continue watching picks up exactly where you stopped.",
  },
  {
    key: "Memory",
    title: "Ratings keep their history",
    body: "Re-rate freely. Argus records the change instead of overwriting what you once thought.",
  },
] as const;

export function PremiseSection() {
  return (
    <section
      id="premise"
      className="content-container relative scroll-mt-24 py-20 sm:py-28"
    >
      <SectionHeader
        title="Nothing you watch should ever go missing."
        lead="Discovery lives in one app, progress in another, opinions nowhere at all. Argus keeps all three together, so the series you meant to finish never quietly disappears."
      />

      <div className="mt-14 grid gap-x-10 gap-y-12 sm:mt-16 sm:grid-cols-3">
        {PRINCIPLES.map((item, i) => (
          <div key={item.key}>
            <Hairline delay={i * 90} electric={i === 0} />
            <Reveal delay={i * 90 + 140} className="pt-7">
              <span className="landing-mono">{item.key}</span>
              <h3 className="font-display mt-4 text-xl font-semibold tracking-[-0.02em] text-white/95">
                {item.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-white/50">{item.body}</p>
            </Reveal>
          </div>
        ))}
      </div>
    </section>
  );
}
