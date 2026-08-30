import type { Metadata } from "next";
import { Activity } from "lucide-react";

import { EmptyState } from "@/components/feedback/empty-state";
import { listActivity } from "@/lib/library/progress-sessions";
import { getCurrentUser } from "@/lib/services/user-service";
import { formatRelativeDate } from "@/lib/utils";
import type { ActivityLogItem } from "@/types/library";

export const metadata: Metadata = {
  title: "Activity",
  description: "Your personal activity feed",
};

export default async function ActivityPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const items = (await listActivity(user.id, 60)) as ActivityLogItem[];

  return (
    <div className="space-y-6 animate-fade-up">
      <header className="space-y-1">
        <h1 className="font-display text-2xl font-semibold tracking-tight">Activity</h1>
        <p className="text-sm text-muted-foreground">
          A private log of what you&apos;ve done in Argus.
        </p>
      </header>

      {items.length === 0 ? (
        <EmptyState
          icon={Activity}
          title="No activity yet"
          description="Rate, review, or change a status to start your feed."
        />
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="rounded-2xl border-0 bg-muted/40 px-4 py-3 dark:bg-white/[0.05]"
            >
              <p className="text-sm">{item.summary}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatRelativeDate(item.created_at)} · {item.activity_type.replaceAll("_", " ")}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
