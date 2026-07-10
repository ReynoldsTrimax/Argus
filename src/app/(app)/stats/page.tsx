import type { Metadata } from "next";
import Link from "next/link";

import { StatCounter } from "@/features/intelligence/components/stat-counter";
import {
  ActivityAreaChart,
  GenrePieChart,
  NamedCountBars,
  RatingBarChart,
  WeekdayBarChart,
} from "@/features/intelligence/components/charts";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/services/user-service";
import { loadIntelligenceData } from "@/lib/intelligence/load-profile";
import {
  computeUserStats,
  formatWatchHours,
} from "@/lib/intelligence/stats-engine";
import { ROUTES } from "@/constants/routes";

export const metadata: Metadata = {
  title: "Statistics",
  description: "Your entertainment statistics",
};

export default async function StatsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const data = await loadIntelligenceData(user.id);
  const stats = computeUserStats(data);
  const year = new Date().getFullYear();
  const month = new Date().getMonth() + 1;

  return (
    <div className="space-y-8 animate-fade-up">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            Statistics
          </h1>
          <p className="text-sm text-muted-foreground">
            Live from your library — computed just now.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={ROUTES.recap(year, month)}>Monthly recap</Link>
          </Button>
          <Button asChild size="sm">
            <Link href={ROUTES.wrapped(year)}>Year in review</Link>
          </Button>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCounter
          value={Math.round(stats.totals.totalWatchMinutes / 60)}
          label="Hours watched"
          hint={formatWatchHours(stats.totals.totalWatchMinutes)}
        />
        <StatCounter value={stats.totals.moviesWatched} label="Movies watched" />
        <StatCounter value={stats.totals.showsCompleted} label="Shows completed" />
        <StatCounter value={stats.totals.episodesWatched} label="Episodes watched" />
        <StatCounter
          value={stats.totals.averageRating ?? 0}
          label="Avg rating"
          decimals={1}
          hint={`${stats.totals.ratingsCount} ratings`}
        />
        <StatCounter
          value={stats.rates.completionRate}
          label="Completion rate"
          suffix="%"
        />
        <StatCounter value={stats.streaks.longest} label="Longest streak" suffix="d" />
        <StatCounter value={stats.totals.rewatchCount} label="Rewatches" />
        <StatCounter value={stats.totals.wishlistSize} label="Wishlist size" />
        <StatCounter value={stats.totals.collectionCount} label="Collections" />
        <StatCounter value={stats.totals.reviewCount} label="Reviews" />
        <StatCounter value={stats.totals.noteCount} label="Notes" />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <GenrePieChart data={stats.distributions.genres} />
        <RatingBarChart data={stats.distributions.ratings} />
        <ActivityAreaChart data={stats.distributions.months} />
        <WeekdayBarChart data={stats.distributions.weekdays} />
        <NamedCountBars
          title="By decade"
          description="Release decades in your library"
          data={stats.distributions.decades}
        />
        <NamedCountBars
          title="Watch status"
          description="How titles are classified"
          data={stats.distributions.byStatus}
        />
        <NamedCountBars
          title="Runtime buckets"
          data={stats.distributions.runtimes}
        />
        <NamedCountBars
          title="Languages"
          data={stats.distributions.languages}
        />
      </section>

      <p className="text-xs text-muted-foreground">
        Most active month: {stats.mostActiveMonth ?? "—"} · Most active year:{" "}
        {stats.mostActiveYear ?? "—"} · Movies/month: {stats.rates.moviesPerMonth} ·
        Episodes/week: {stats.rates.episodesPerWeek} · Dropped series:{" "}
        {stats.rates.droppedSeriesPercent}%
      </p>
    </div>
  );
}
