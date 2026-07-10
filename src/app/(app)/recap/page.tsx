import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { StatCounter } from "@/features/intelligence/components/stat-counter";
import { Badge } from "@/components/ui/badge";
import { getCurrentUser } from "@/lib/services/user-service";
import { loadIntelligenceData } from "@/lib/intelligence/load-profile";
import { buildMonthlyRecap } from "@/lib/intelligence/wrapped";
import { formatDate } from "@/lib/media/format";
import { ROUTES } from "@/constants/routes";

export const metadata: Metadata = {
  title: "Monthly recap",
};

interface PageProps {
  searchParams: Promise<{ year?: string; month?: string }>;
}

export default async function RecapPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();
  if (!user) return null;

  const params = await searchParams;
  const now = new Date();
  const year = Number(params.year) || now.getFullYear();
  const month = Number(params.month) || now.getMonth() + 1;

  const data = await loadIntelligenceData(user.id);
  const recap = buildMonthlyRecap(data, year, month);

  const prev = month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
  const next =
    month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };

  return (
    <div className="space-y-8 animate-fade-up">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <Badge variant="secondary">Monthly recap</Badge>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            {recap.label}
          </h1>
          <p className="text-sm text-muted-foreground">
            A snapshot of your month in film and television.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={ROUTES.recap(prev.year, prev.month)}>Previous</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={ROUTES.recap(next.year, next.month)}>Next</Link>
          </Button>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCounter value={recap.hoursWatched} label="Hours" />
        <StatCounter value={recap.movies} label="Movies" />
        <StatCounter value={recap.episodes} label="Episodes" />
        <StatCounter value={recap.reviewsWritten} label="Reviews" />
        <StatCounter value={recap.streakDays} label="Active days" />
      </section>

      <p className="text-sm text-muted-foreground">
        Most active day:{" "}
        <span className="font-medium text-foreground">
          {recap.mostActiveDay ? formatDate(recap.mostActiveDay) : "—"}
        </span>
      </p>

      {recap.genres.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold">Genres this month</h2>
          <div className="flex flex-wrap gap-2">
            {recap.genres.map((g) => (
              <Badge key={g.name} variant="outline">
                {g.name}
              </Badge>
            ))}
          </div>
        </section>
      ) : null}

      {recap.highestRated.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold">Highest rated</h2>
          <ul className="space-y-1">
            {recap.highestRated.map((e) => (
              <li key={e.id} className="text-sm">
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
                <span className="text-muted-foreground"> · ★ {e.user_rating}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
