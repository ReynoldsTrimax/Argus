"use client";

import { cn } from "@/lib/utils";
import type { CalendarDay } from "@/types/intelligence";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ContributionHeatmapProps {
  days: CalendarDay[];
  year: number;
  className?: string;
}

function intensity(count: number): string {
  if (count <= 0) return "bg-muted";
  if (count === 1) return "bg-primary/25";
  if (count === 2) return "bg-primary/45";
  if (count <= 4) return "bg-primary/70";
  return "bg-primary";
}

/**
 * GitHub-style activity heatmap for a full year.
 */
export function ContributionHeatmap({
  days,
  year,
  className,
}: ContributionHeatmapProps) {
  // Group into weeks (columns)
  const first = days[0] ? new Date(days[0].date + "T12:00:00") : new Date(year, 0, 1);
  const pad = first.getDay(); // 0 Sun
  const cells: (CalendarDay | null)[] = [
    ...Array.from({ length: pad }, () => null),
    ...days,
  ];

  const weeks: (CalendarDay | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold tracking-tight">{year} activity</h3>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          Less
          {[0, 1, 2, 3, 5].map((n) => (
            <span
              key={n}
              className={cn("h-2.5 w-2.5 rounded-sm", intensity(n))}
              aria-hidden
            />
          ))}
          More
        </div>
      </div>
      <div
        className="scrollbar-thin overflow-x-auto pb-1"
        role="img"
        aria-label={`Activity heatmap for ${year}`}
      >
        <div className="inline-flex gap-1">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-1">
              {week.map((day, di) =>
                day ? (
                  <Tooltip key={day.date}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className={cn(
                          "h-2.5 w-2.5 rounded-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring sm:h-3 sm:w-3",
                          intensity(day.count),
                        )}
                        aria-label={`${day.date}: ${day.count} activities`}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-medium">{day.date}</p>
                      <p className="text-xs opacity-90">
                        {day.count} event{day.count === 1 ? "" : "s"}
                        {day.episodes ? ` · ${day.episodes} ep` : ""}
                        {day.ratings ? ` · ${day.ratings} ratings` : ""}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <span
                    key={`pad-${wi}-${di}`}
                    className="h-2.5 w-2.5 sm:h-3 sm:w-3"
                    aria-hidden
                  />
                ),
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
