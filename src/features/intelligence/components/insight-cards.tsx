import { cn } from "@/lib/utils";
import type { Insight } from "@/types/intelligence";
import { Lightbulb, Sparkles, TrendingUp, Clock } from "lucide-react";

const severityStyles: Record<Insight["severity"], string> = {
  positive: "border-0 bg-success/10",
  info: "border-0 bg-primary/10",
  neutral: "border-0 bg-muted/40 dark:bg-white/[0.05]",
  warning: "border-0 bg-warning/10",
};

const categoryIcon = {
  habits: Clock,
  taste: Sparkles,
  completion: TrendingUp,
  time: Clock,
  streak: Lightbulb,
};

export function InsightCards({ insights }: { insights: Insight[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {insights.map((insight) => {
        const Icon = categoryIcon[insight.category] ?? Lightbulb;
        return (
          <article
            key={insight.id}
            className={cn(
              "rounded-2xl p-4",
              severityStyles[insight.severity],
            )}
          >
            <div className="mb-2 flex items-center gap-2">
              <Icon className="h-4 w-4 text-primary" aria-hidden />
              <h3 className="text-sm font-semibold tracking-tight">{insight.title}</h3>
            </div>
            <p className="text-sm text-muted-foreground text-pretty">{insight.body}</p>
          </article>
        );
      })}
    </div>
  );
}
