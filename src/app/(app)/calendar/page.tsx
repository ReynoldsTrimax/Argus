import type { Metadata } from "next";
import Link from "next/link";

import { ContributionHeatmap } from "@/features/intelligence/components/contribution-heatmap";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/services/user-service";
import { loadIntelligenceData } from "@/lib/intelligence/load-profile";
import { buildCalendar } from "@/lib/intelligence/calendar";
import { ROUTES } from "@/constants/routes";

export const metadata: Metadata = {
  title: "Calendar",
  description: "Your viewing activity calendar",
};

interface PageProps {
  searchParams: Promise<{ year?: string }>;
}

export default async function CalendarPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();
  if (!user) return null;

  const params = await searchParams;
  const currentYear = new Date().getFullYear();
  const year = Number(params.year) || currentYear;

  const data = await loadIntelligenceData(user.id);
  const days = buildCalendar(data, { year });
  const activeDays = days.filter((d) => d.count > 0).length;
  const totalEvents = days.reduce((s, d) => s + d.count, 0);

  return (
    <div className="space-y-6 animate-fade-up">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            Watch calendar
          </h1>
          <p className="text-sm text-muted-foreground">
            {activeDays} active days · {totalEvents} events in {year}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`${ROUTES.calendar}?year=${year - 1}`}>{year - 1}</Link>
          </Button>
          <Button asChild size="sm" variant={year === currentYear ? "default" : "outline"}>
            <Link href={`${ROUTES.calendar}?year=${currentYear}`}>{currentYear}</Link>
          </Button>
          {year < currentYear ? (
            <Button asChild variant="outline" size="sm">
              <Link href={`${ROUTES.calendar}?year=${year + 1}`}>{year + 1}</Link>
            </Button>
          ) : null}
        </div>
      </header>

      <div className="rounded-2xl border border-border bg-card/50 p-4 sm:p-6">
        <ContributionHeatmap days={days} year={year} />
      </div>

      <p className="text-xs text-muted-foreground">
        Density includes sessions, episode completions, ratings, reviews, and notes.
      </p>
    </div>
  );
}
