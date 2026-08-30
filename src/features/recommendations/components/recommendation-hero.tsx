import { Info } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toTenPoint } from "@/lib/recommendations/rating";
import type { RecommendationRun, TasteProfile } from "@/types/recommendations";

/**
 * Hero + "what Argus read" panel.
 *
 * A Server Component: nothing here is interactive, and the copy is derived from
 * the profile so the page can never claim more than the engine actually knows.
 * Each line is omitted when its evidence is missing rather than showing an
 * em dash — an absent signal should look absent, not broken.
 */

const STRENGTH_COPY: Record<
  TasteProfile["signalStrength"],
  { badge: string; line: string }
> = {
  empty: {
    badge: "No history yet",
    line: "Argus has not seen you watch anything yet, so nothing below is personal.",
  },
  sparse: {
    badge: "Learning",
    line: "Only a few titles to go on so far, so expect these to sharpen quickly.",
  },
  moderate: {
    badge: "Tuned",
    line: "Enough history to rank on your taste rather than on what is popular.",
  },
  rich: {
    badge: "Well tuned",
    line: "A deep library to read from, so the ranking leans hard on your own patterns.",
  },
};

function joinList(values: string[]): string {
  if (values.length === 0) return "";
  if (values.length === 1) return values[0]!;
  return `${values.slice(0, -1).join(", ")} and ${values[values.length - 1]}`;
}

interface FactProps {
  label: string;
  value: string;
}

function Fact({ label, value }: FactProps) {
  return (
    <div className="min-w-0">
      <dt className="text-muted-foreground font-mono text-[10px] tracking-[0.16em] uppercase">
        {label}
      </dt>
      <dd className="mt-1 text-sm leading-snug">{value}</dd>
    </div>
  );
}

export function RecommendationHero({ run }: { run: RecommendationRun }) {
  const { profile } = run;
  const strength = STRENGTH_COPY[profile.signalStrength];

  const facts: FactProps[] = [];

  const likedGenres = profile.genres.filter((g) => g.score > 0.1).slice(0, 3);
  if (likedGenres.length > 0) {
    facts.push({
      label: "Leans toward",
      value: joinList(likedGenres.map((g) => g.key)),
    });
  }

  if (profile.ratings.count > 0 && profile.ratings.mean != null) {
    facts.push({
      label: "Your ratings",
      value: `${profile.ratings.count} titles, averaging ${toTenPoint(
        profile.ratings.mean,
      ).toFixed(1)}/10`,
    });
  }

  const topDecade = profile.decades.find((d) => d.score > 0.1);
  if (topDecade) {
    facts.push({ label: "Era", value: `Returns to the ${topDecade.key}` });
  }

  if (profile.runtime.meanMinutes != null) {
    facts.push({
      label: "Session length",
      value: `Around ${profile.runtime.meanMinutes} minutes`,
    });
  }

  const topCreator = profile.creators.find((c) => c.score > 0.2);
  if (topCreator) {
    facts.push({ label: "Follows", value: topCreator.key });
  }

  if (profile.completion.droppedCount > 0) {
    facts.push({
      label: "Finishes",
      value: `${Math.round(profile.completion.completionRate * 100)}% of what you start`,
    });
  }

  const mediaLean =
    profile.mediaTypeBias.movie === 0 && profile.mediaTypeBias.tv === 0
      ? null
      : Math.abs(profile.mediaTypeBias.movie - profile.mediaTypeBias.tv) < 0.15
        ? "Films and series about equally"
        : profile.mediaTypeBias.movie > profile.mediaTypeBias.tv
          ? "Mostly films"
          : "Mostly series";
  if (mediaLean) facts.push({ label: "Format", value: mediaLean });

  return (
    <header className="space-y-6">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={profile.signalStrength === "empty" ? "muted" : "default"}>
            {strength.badge}
          </Badge>
          {run.mode === "personalized" ? (
            <Badge variant="outline">{profile.signalTitles} titles read</Badge>
          ) : null}
        </div>

        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          {run.mode === "personalized" ? "Picked for you." : "Somewhere to start."}
        </h1>

        <p className="text-muted-foreground max-w-2xl text-sm leading-relaxed text-pretty">
          {run.mode === "personalized"
            ? "Built from your library, ratings and viewing habits, including what you dropped. Every row says why it is here."
            : strength.line}
        </p>
      </div>

      {run.notice ? (
        <div
          className={cn(
            "border-border bg-muted/40 flex items-start gap-2.5 rounded-lg border p-3",
            "dark:bg-white/[0.03]",
          )}
          role="status"
        >
          <Info className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p className="text-muted-foreground text-sm leading-relaxed">{run.notice}</p>
        </div>
      ) : null}

      {facts.length > 0 ? (
        <section
          className="surface-card panel-corner p-5"
          aria-label="What Argus read from your library"
        >
          <h2 className="text-muted-foreground font-mono text-[10px] tracking-[0.16em] uppercase">
            What Argus read
          </h2>
          <dl className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {facts.map((fact) => (
              <Fact key={fact.label} {...fact} />
            ))}
          </dl>

          {profile.avoidedGenres.length > 0 ? (
            <p className="text-muted-foreground mt-5 text-xs leading-relaxed">
              Ranked down, because you keep abandoning them:{" "}
              <span className="text-foreground/80">
                {joinList(profile.avoidedGenres.slice(0, 3).map((g) => g.key))}
              </span>
              . They are pushed down, not hidden.
            </p>
          ) : null}
        </section>
      ) : null}
    </header>
  );
}
