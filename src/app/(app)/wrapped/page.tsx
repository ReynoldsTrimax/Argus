import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

import { ContributionHeatmap } from "@/features/intelligence/components/contribution-heatmap";
import { StatCounter } from "@/features/intelligence/components/stat-counter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/services/user-service";
import { loadIntelligenceData } from "@/lib/intelligence/load-profile";
import { buildWrapped } from "@/lib/intelligence/wrapped";
import { posterUrl } from "@/lib/media/image";
import { ROUTES } from "@/constants/routes";

export const metadata: Metadata = {
  title: "Year in Review",
};

interface PageProps {
  searchParams: Promise<{ year?: string }>;
}

export default async function WrappedPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();
  if (!user) return null;

  const params = await searchParams;
  const year = Number(params.year) || new Date().getFullYear();
  const data = await loadIntelligenceData(user.id);
  const report = buildWrapped(data, year);

  return (
    <div className="space-y-10 animate-fade-up">
      <header className="relative overflow-hidden rounded-3xl border-0 bg-muted/40 dark:bg-white/[0.05]/60 p-6 sm:p-10">
        <div
          className="pointer-events-none absolute inset-0 gradient-mesh dark:gradient-mesh-dark opacity-80"
          aria-hidden
        />
        <div className="relative space-y-3">
          <Badge variant="secondary">Year in Review</Badge>
          <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            {year}
          </h1>
          <p className="max-w-lg text-sm text-muted-foreground text-pretty">
            Your personal entertainment Wrapped — hours, favorites, and streaks.
          </p>
          <div className="flex flex-wrap gap-2 pt-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`${ROUTES.wrapped()}?year=${year - 1}`}>{year - 1}</Link>
            </Button>
            <Button asChild size="sm">
              <Link href={ROUTES.stats}>Full stats</Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCounter value={report.hoursWatched} label="Hours watched" />
        <StatCounter value={report.moviesWatched} label="Movies" />
        <StatCounter value={report.showsCompleted} label="Shows completed" />
        <StatCounter value={report.episodesWatched} label="Episodes" />
        <StatCounter value={report.longestStreak} label="Longest streak" suffix="d" />
        <StatCounter value={report.reviewCount} label="Reviews" />
        <StatCounter value={report.noteCount} label="Notes" />
        <StatCounter
          value={report.topGenres[0]?.count ?? 0}
          label={report.topGenres[0]?.name ?? "Top genre"}
          hint="Most logged genre affinity"
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <FavoriteCard label="Favorite movie" entry={report.favoriteMovie} />
        <FavoriteCard label="Favorite show" entry={report.favoriteShow} />
      </section>

      {report.highestRated.length > 0 ? (
        <section className="space-y-3">
          <h2 className="font-display text-lg font-semibold">Highest rated</h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {report.highestRated.map((e) => (
              <li
                key={e.id}
                className="flex items-center justify-between rounded-xl border-0 bg-muted/40 px-3 py-2 text-sm dark:bg-white/[0.05]"
              >
                <Link
                  href={
                    e.media_type === "movie"
                      ? ROUTES.movie(e.external_id)
                      : ROUTES.show(e.external_id)
                  }
                  className="font-medium hover:underline"
                >
                  {e.title}
                </Link>
                <span className="tabular-nums text-primary">★ {e.user_rating}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="rounded-2xl border-0 bg-muted/40 dark:bg-white/[0.05] p-4 sm:p-6">
        <ContributionHeatmap days={report.heatmap} year={year} />
      </section>

      {report.topTags.length > 0 ? (
        <section className="space-y-2">
          <h2 className="font-display text-lg font-semibold">Top tags</h2>
          <div className="flex flex-wrap gap-2">
            {report.topTags.map((t) => (
              <Badge key={t.name} variant="outline">
                {t.name} · {t.count}
              </Badge>
            ))}
          </div>
        </section>
      ) : null}

      <p className="text-center text-xs text-muted-foreground">
        Biggest month: {report.biggestMonth ?? "—"} · Share-ready layout for your eyes only
        (social export comes later).
      </p>
    </div>
  );
}

function FavoriteCard({
  label,
  entry,
}: {
  label: string;
  entry: { title: string; poster_path: string | null; external_id: string; media_type: string; user_rating: number | null } | null;
}) {
  if (!entry) {
    return (
      <div className="rounded-2xl border-0 p-6 text-sm text-muted-foreground">
        {label}: not enough data
      </div>
    );
  }
  const src = posterUrl(entry.poster_path, "w185");
  const href =
    entry.media_type === "movie"
      ? ROUTES.movie(entry.external_id)
      : ROUTES.show(entry.external_id);

  return (
    <Link
      href={href}
      className="flex gap-4 rounded-2xl border-0 bg-muted/40 dark:bg-white/[0.05] p-4 transition-colors hover:bg-muted/30"
    >
      <span className="relative h-28 w-20 shrink-0 overflow-hidden rounded-lg bg-muted">
        {src ? (
          <Image src={src} alt="" fill className="object-cover" sizes="80px" />
        ) : null}
      </span>
      <span className="space-y-1">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <span className="block font-display text-xl font-semibold tracking-tight">
          {entry.title}
        </span>
        {entry.user_rating != null ? (
          <span className="text-sm text-primary">★ {entry.user_rating}</span>
        ) : null}
      </span>
    </Link>
  );
}
