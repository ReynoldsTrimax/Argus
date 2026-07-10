import type { Metadata } from "next";
import Link from "next/link";
import {
  BarChart3,
  CalendarDays,
  Compass,
  Gift,
  Library,
  Lightbulb,
  Search,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/feedback/empty-state";
import { PageHeaderMotion } from "@/components/motion/page-header-motion";
import { ScrollReveal } from "@/components/motion/scroll-reveal";
import { LibraryPosterCard } from "@/features/library/components/library-poster-card";
import { MediaRow } from "@/features/media/components/media-row";
import { PosterCard } from "@/features/media/components/poster-card";
import { StatCounter } from "@/features/intelligence/components/stat-counter";
import { InsightCards } from "@/features/intelligence/components/insight-cards";
import { DashboardSection } from "@/features/intelligence/components/dashboard-section";
import {
  ActivityAreaChart,
  GenrePieChart,
} from "@/features/intelligence/components/charts";
import { getSessionContext } from "@/lib/services/user-service";
import { formatDisplayName } from "@/lib/utils";
import { ROUTES } from "@/constants/routes";
import { getDashboardPayload } from "@/lib/intelligence/dashboard";
import { formatWatchHours } from "@/lib/intelligence/stats-engine";
import { formatRelativeDate } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Home",
  description: "Your personal entertainment intelligence dashboard",
};

/**
 * Premium intelligence dashboard — personal home for Argus.
 */
export default async function DashboardPage() {
  const { user, profile } = await getSessionContext();
  const name = formatDisplayName({
    displayName: profile?.display_name,
    username: profile?.username,
    email: user?.email,
  });

  if (!user) return null;

  const dash = await getDashboardPayload(user.id);
  const { stats, insights } = dash;
  const year = new Date().getFullYear();

  return (
    <div className="space-y-10">
      <PageHeaderMotion
        eyebrow="Welcome back"
        title={name}
        description="Your cinematic intelligence hub — habits, taste, and what to watch next."
        actions={
          <>
            <Button asChild size="sm">
              <Link href={ROUTES.librarySearch}>
                <Search className="h-4 w-4" />
                Quick search
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href={ROUTES.discover}>
                <Compass className="h-4 w-4" />
                Discover
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href={ROUTES.stats}>
                <BarChart3 className="h-4 w-4" />
                Stats
              </Link>
            </Button>
            <Button asChild variant="secondary" size="sm">
              <Link href={ROUTES.wrapped(year)}>
                <Gift className="h-4 w-4" />
                {year} Wrapped
              </Link>
            </Button>
          </>
        }
      />

      {/* Hero metrics */}
      <ScrollReveal variant="scale">
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 stagger-children">
          <StatCounter
            value={Math.round(stats.totals.totalWatchMinutes / 60)}
            label="Hours watched"
            hint={formatWatchHours(stats.totals.totalWatchMinutes)}
            suffix="h"
          />
          <StatCounter
            value={stats.totals.moviesWatched}
            label="Movies finished"
            hint={`${stats.totals.librarySize} in library`}
          />
          <StatCounter
            value={stats.totals.episodesWatched}
            label="Episodes watched"
            hint={`${stats.totals.showsCompleted} series completed`}
          />
          <StatCounter
            value={stats.streaks.current}
            label="Current streak"
            hint={`Best ${stats.streaks.longest} days`}
            suffix="d"
          />
        </section>
      </ScrollReveal>

      {/* Insights strip */}
      {insights.length > 0 ? (
        <DashboardSection
          title="Insights"
          href={ROUTES.insights}
          description="Deterministic observations from your journal"
        >
          <InsightCards insights={insights.slice(0, 3)} />
        </DashboardSection>
      ) : null}

      {/* Continue + charts */}
      <div className="grid gap-8 xl:grid-cols-5">
        <div className="space-y-8 xl:col-span-3">
          <DashboardSection title="Continue watching" href={ROUTES.library}>
            {dash.continueWatching.length === 0 ? (
              <EmptyState
                icon={Library}
                title="Nothing in progress"
                description="Mark a title as Watching to see it here."
                className="py-10"
              />
            ) : (
              <div className="scrollbar-thin flex gap-3 overflow-x-auto pb-2">
                {dash.continueWatching.map((e) => (
                  <div key={e.id} className="w-36 shrink-0 sm:w-40">
                    <LibraryPosterCard entry={e} />
                  </div>
                ))}
              </div>
            )}
          </DashboardSection>

          <DashboardSection title="Recently watched" href={ROUTES.history}>
            {dash.recentlyWatched.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent watches yet.</p>
            ) : (
              <div className="scrollbar-thin flex gap-3 overflow-x-auto pb-2">
                {dash.recentlyWatched.map((e) => (
                  <div key={e.id} className="w-36 shrink-0 sm:w-40">
                    <LibraryPosterCard entry={e} />
                  </div>
                ))}
              </div>
            )}
          </DashboardSection>
        </div>

        <div className="space-y-4 xl:col-span-2">
          <ActivityAreaChart data={stats.distributions.months} />
          <GenrePieChart data={stats.distributions.genres} />
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={ROUTES.calendar}>
                <CalendarDays className="h-4 w-4" />
                Calendar
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href={ROUTES.timeline}>
                <Sparkles className="h-4 w-4" />
                Timeline
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href={ROUTES.insights}>
                <Lightbulb className="h-4 w-4" />
                All insights
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Watchlist + rated */}
      <div className="grid gap-8 lg:grid-cols-2">
        <DashboardSection title="Watchlist highlights" href={ROUTES.watchlist}>
          {dash.watchlist.length === 0 ? (
            <p className="text-sm text-muted-foreground">Your plan-to-watch list is empty.</p>
          ) : (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {dash.watchlist.slice(0, 4).map((e) => (
                <LibraryPosterCard key={e.id} entry={e} showProgress={false} />
              ))}
            </div>
          )}
        </DashboardSection>

        <DashboardSection title="Recently rated" href={ROUTES.library}>
          {dash.recentlyRated.length === 0 ? (
            <p className="text-sm text-muted-foreground">Rate a title to see it here.</p>
          ) : (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {dash.recentlyRated.slice(0, 4).map((e) => (
                <LibraryPosterCard key={e.id} entry={e} />
              ))}
            </div>
          )}
        </DashboardSection>
      </div>

      {/* Recommendations */}
      {dash.recommendations.length > 0 ? (
        <DashboardSection
          title="Recommended for you"
          description="Based on genres, ratings, and history — not AI"
        >
          <div className="scrollbar-thin flex gap-3 overflow-x-auto pb-2">
            {dash.recommendations.map((item) => (
              <div key={`${item.mediaType}-${item.id}`} className="w-36 shrink-0 sm:w-40">
                <PosterCard item={item} />
                <p className="mt-1 line-clamp-2 px-0.5 text-[11px] text-muted-foreground">
                  {item.reason}
                </p>
              </div>
            ))}
          </div>
        </DashboardSection>
      ) : null}

      {dash.trending.length > 0 ? (
        <MediaRow title="Trending now" items={dash.trending} href={ROUTES.discover} />
      ) : null}
      {dash.newReleases.length > 0 ? (
        <MediaRow title="New releases" items={dash.newReleases} href={ROUTES.movies} />
      ) : null}
      {dash.upcoming.length > 0 ? (
        <MediaRow title="Upcoming" items={dash.upcoming} href="/movies?section=upcoming" />
      ) : null}

      {/* Pinned collections + reviews */}
      <div className="grid gap-8 lg:grid-cols-2">
        <DashboardSection title="Pinned collections" href={ROUTES.collections}>
          {dash.pinnedCollections.length === 0 ? (
            <p className="text-sm text-muted-foreground">Pin a collection to surface it here.</p>
          ) : (
            <ul className="space-y-2">
              {dash.pinnedCollections.map((c) => (
                <li key={c.id}>
                  <Link
                    href={ROUTES.collectionDetail(c.id)}
                    className="flex items-center justify-between rounded-2xl border border-border bg-card shadow-xs px-3 py-2.5 text-sm transition-colors hover:bg-muted/40"
                  >
                    <span className="font-medium">{c.name}</span>
                    <Badge variant="muted">{c.item_count}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </DashboardSection>

        <DashboardSection title="Recently reviewed" href={ROUTES.activity}>
          {dash.recentlyReviewed.length === 0 ? (
            <p className="text-sm text-muted-foreground">Write a review from any title page.</p>
          ) : (
            <ul className="space-y-3">
              {dash.recentlyReviewed.map(({ entry, reviewPreview }) => (
                <li
                  key={entry.id}
                  className="rounded-2xl border border-border bg-muted/40 px-3 py-2.5"
                >
                  <Link
                    href={
                      entry.media_type === "movie"
                        ? ROUTES.movie(entry.external_id)
                        : ROUTES.show(entry.external_id)
                    }
                    className="text-sm font-medium hover:underline"
                  >
                    {entry.title}
                  </Link>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {reviewPreview}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </DashboardSection>
      </div>

      {/* Favorite genres chips */}
      {stats.favorites.genres.length > 0 ? (
        <DashboardSection title="Favorite genres" href={ROUTES.stats}>
          <div className="flex flex-wrap gap-2">
            {stats.favorites.genres.map((g) => (
              <Badge key={g.name} variant="outline" className="h-8 rounded-full px-3">
                {g.name}
                <span className="ml-1.5 text-muted-foreground">{g.count}</span>
              </Badge>
            ))}
          </div>
        </DashboardSection>
      ) : null}

      {/* Activity timeline preview */}
      <DashboardSection title="Activity" href={ROUTES.timeline}>
        {dash.activity.length === 0 ? (
          <p className="text-sm text-muted-foreground">Your feed will fill as you journal.</p>
        ) : (
          <ul className="space-y-2">
            {dash.activity.map((a) => (
              <li
                key={a.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-border/80 bg-card/30 px-3 py-2 text-sm"
              >
                <span>{a.summary}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatRelativeDate(a.created_at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </DashboardSection>
    </div>
  );
}
