"use client";

import { cn } from "@/lib/utils";
import { Hairline, Reveal } from "./reveal";

/**
 * One reveal moment per section: the rule draws itself, then the heading and
 * lead rise behind it. No kicker, no section number — the heading is the
 * section's name and carries its own weight.
 *
 * The masked `charge` reveal is deliberately *not* used here; it is reserved
 * for the page's two poles (hero headline and closing statement) so it stays
 * an event rather than a per-section habit.
 */
export function SectionHeader({
  title,
  lead,
  className,
}: {
  title: React.ReactNode;
  lead?: string;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <Hairline className="w-full" electric />

      <Reveal delay={140} className="mt-8">
        <h2 className="landing-h2 text-silver max-w-3xl">{title}</h2>
      </Reveal>

      {lead ? (
        <Reveal delay={240} className="mt-5">
          <p className="landing-lead max-w-2xl">{lead}</p>
        </Reveal>
      ) : null}
    </div>
  );
}
