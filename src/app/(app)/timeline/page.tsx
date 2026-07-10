import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState } from "@/components/feedback/empty-state";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/services/user-service";
import { listActivity } from "@/lib/library/progress-sessions";
import { formatRelativeDate } from "@/lib/utils";
import { Activity } from "lucide-react";
import type { ActivityLogItem } from "@/types/library";
import { ROUTES } from "@/constants/routes";

export const metadata: Metadata = {
  title: "Timeline",
  description: "Chronological entertainment journal",
};

interface PageProps {
  searchParams: Promise<{ q?: string; type?: string }>;
}

export default async function TimelinePage({ searchParams }: PageProps) {
  const user = await getCurrentUser();
  if (!user) return null;

  const { q = "", type = "all" } = await searchParams;
  let items = (await listActivity(user.id, 120)) as ActivityLogItem[];

  if (type !== "all") {
    items = items.filter((i) => i.activity_type === type);
  }
  if (q.trim()) {
    const term = q.trim().toLowerCase();
    items = items.filter(
      (i) =>
        i.summary.toLowerCase().includes(term) ||
        (i.title ?? "").toLowerCase().includes(term),
    );
  }

  const groups = new Map<string, ActivityLogItem[]>();
  for (const item of items) {
    const day = item.created_at.slice(0, 10);
    if (!groups.has(day)) groups.set(day, []);
    groups.get(day)!.push(item);
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <header className="space-y-1">
        <h1 className="font-display text-2xl font-semibold tracking-tight">Timeline</h1>
        <p className="text-sm text-muted-foreground">
          Every journal moment — started, finished, rated, reviewed.
        </p>
      </header>

      <form className="flex flex-col gap-3 sm:flex-row sm:items-end" method="get">
        <div className="flex-1 space-y-1.5 sm:max-w-xs">
          <label htmlFor="q" className="text-xs font-medium text-muted-foreground">
            Search
          </label>
          <Input id="q" name="q" defaultValue={q} placeholder="Search timeline…" />
        </div>
        <div className="space-y-1.5 sm:w-48">
          <label htmlFor="type" className="text-xs font-medium text-muted-foreground">
            Type
          </label>
          <select
            id="type"
            name="type"
            defaultValue={type}
            className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-xs"
          >
            <option value="all">All types</option>
            <option value="rated">Rated</option>
            <option value="reviewed">Reviewed</option>
            <option value="finished">Finished</option>
            <option value="status_changed">Status</option>
            <option value="favorited">Favorites</option>
            <option value="collection_created">Collections</option>
            <option value="episode_watched">Episodes</option>
            <option value="session_logged">Sessions</option>
          </select>
        </div>
        <Button type="submit" size="sm">
          Filter
        </Button>
      </form>

      <p className="text-xs text-muted-foreground">
        Compact view:{" "}
        <Link href={ROUTES.activity} className="underline underline-offset-2">
          Activity
        </Link>
      </p>

      {groups.size === 0 ? (
        <EmptyState
          icon={Activity}
          title="Timeline is empty"
          description="Interact with titles to build your journal."
        />
      ) : (
        <div className="space-y-8">
          {[...groups.entries()].map(([day, dayItems]) => (
            <section key={day} className="relative space-y-3 border-l border-border pl-5">
              <h2 className="sticky top-16 z-10 -ml-5 bg-background/90 px-5 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground backdrop-blur">
                {formatDayHeading(day)}
              </h2>
              <ul className="space-y-2">
                {dayItems.map((item) => (
                  <li
                    key={item.id}
                    className="relative rounded-2xl border border-border bg-card shadow-xs px-4 py-3"
                  >
                    <span className="absolute -left-[1.45rem] top-4 h-2.5 w-2.5 rounded-full bg-primary shadow-glow" />
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="muted" className="text-[10px]">
                        {item.activity_type.replaceAll("_", " ")}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatRelativeDate(item.created_at)}
                      </span>
                    </div>
                    <p className="mt-1.5 text-sm">{item.summary}</p>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function formatDayHeading(isoDay: string) {
  const d = new Date(isoDay + "T12:00:00");
  return new Intl.DateTimeFormat("en", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(d);
}
