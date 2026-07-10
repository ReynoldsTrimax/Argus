import { Check, X } from "lucide-react";

import type { DecisionScore } from "@/types/intelligence";
import { cn } from "@/lib/utils";

interface DecisionScoreCardProps {
  decision: DecisionScore;
  className?: string;
}

/**
 * Explainable Decision Score for title detail pages.
 */
export function DecisionScoreCard({ decision, className }: DecisionScoreCardProps) {
  const ring =
    decision.score >= 85
      ? "text-success"
      : decision.score >= 70
        ? "text-primary"
        : decision.score >= 50
          ? "text-warning"
          : "text-muted-foreground";

  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card p-5 shadow-sm",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Decision Score
          </p>
          <p className={cn("font-display text-3xl font-semibold tabular-nums", ring)}>
            {decision.score}
            <span className="text-base font-normal text-muted-foreground">
              {" "}
              / {decision.max}
            </span>
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{decision.summary}</p>
        </div>
        <ScoreRing score={decision.score} className={ring} />
      </div>
      <ul className="mt-4 space-y-2">
        {decision.reasons.map((r) => (
          <li key={r.label} className="flex items-start gap-2 text-sm">
            {r.positive ? (
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
            ) : (
              <X className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            )}
            <span className={r.positive ? "text-foreground" : "text-muted-foreground"}>
              {r.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ScoreRing({ score, className }: { score: number; className?: string }) {
  const r = 28;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" className={className} aria-hidden>
      <circle
        cx="36"
        cy="36"
        r={r}
        fill="none"
        stroke="hsl(var(--muted))"
        strokeWidth="6"
      />
      <circle
        cx="36"
        cy="36"
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
        transform="rotate(-90 36 36)"
      />
    </svg>
  );
}
