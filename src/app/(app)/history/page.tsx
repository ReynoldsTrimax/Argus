import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { History } from "lucide-react";

import { EmptyState } from "@/components/feedback/empty-state";
import { listWatchSessions } from "@/lib/library/progress-sessions";
import { getCurrentUser } from "@/lib/services/user-service";
import { posterUrl } from "@/lib/media/image";
import { formatDate } from "@/lib/media/format";
import { ROUTES } from "@/constants/routes";

export const metadata: Metadata = {
  title: "Watch history",
  description: "Your chronological watch sessions",
};

export default async function HistoryPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const sessions = await listWatchSessions(user.id, { limit: 80 });

  return (
    <div className="space-y-6 animate-fade-up">
      <header className="space-y-1">
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Watch history
        </h1>
        <p className="text-sm text-muted-foreground">
          Every session you&apos;ve logged.
        </p>
      </header>

      {sessions.length === 0 ? (
        <EmptyState
          icon={History}
          title="No sessions yet"
          description="Log a watch session from any title page, or mark episodes as watched."
        />
      ) : (
        <ol className="space-y-3">
          {sessions.map((s) => {
            const entry = s.library_entries;
            const href = entry
              ? entry.media_type === "movie"
                ? ROUTES.movie(entry.external_id)
                : ROUTES.show(entry.external_id)
              : ROUTES.library;
            const poster = posterUrl(entry?.poster_path, "w92");

            return (
              <li key={s.id}>
                <Link
                  href={href}
                  className="flex items-center gap-3 rounded-2xl border-0 bg-muted/40 dark:bg-white/[0.05] p-3 transition-colors hover:bg-muted/40"
                >
                  <span className="relative h-14 w-10 shrink-0 overflow-hidden rounded-md bg-muted">
                    {poster ? (
                      <Image src={poster} alt="" fill sizes="40px" className="object-cover" />
                    ) : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {entry?.title ?? "Unknown title"}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {formatDate(s.session_date)}
                      {s.season_number != null
                        ? ` · S${s.season_number}E${s.episode_number}`
                        : ""}
                      {s.duration_minutes ? ` · ${s.duration_minutes}m` : ""}
                      {s.is_rewatch ? " · Rewatch" : ""}
                    </span>
                    {s.notes ? (
                      <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                        {s.notes}
                      </span>
                    ) : null}
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
