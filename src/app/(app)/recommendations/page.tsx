import type { Metadata } from "next";
import Link from "next/link";
import { Compass, Sparkles } from "lucide-react";

import { EmptyState } from "@/components/feedback/empty-state";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import { getRecommendationsForCurrentUser } from "@/lib/recommendations/service";
import { RecommendationDebugPanel } from "@/features/recommendations/components/recommendation-debug-panel";
import { RecommendationHero } from "@/features/recommendations/components/recommendation-hero";
import { RecommendationRail } from "@/features/recommendations/components/recommendation-rail";

export const metadata: Metadata = {
  title: "Recommendations",
  description: "Personalized picks built from your library, ratings and viewing habits",
};

/**
 * Personalized recommendations.
 *
 * Server Component. It never receives a user id: the service resolves the
 * signed-in user from the Supabase session itself, so there is no parameter a
 * client could tamper with to read another account's picks.
 *
 * Deliberately not statically revalidated — the output is per-user. Repeat cost
 * is handled by the engine's own per-user run cache and the shared catalog
 * cache, not by the page.
 */
interface PageProps {
  searchParams: Promise<{ debug?: string }>;
}

export default async function RecommendationsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  // Debug output is gated twice: the flag here, and `NODE_ENV` inside the
  // service. Scoring internals are a tuning tool, not a feature.
  const wantsDebug = params.debug === "1" && process.env.NODE_ENV !== "production";

  const result = await getRecommendationsForCurrentUser({ debug: wantsDebug });

  // The app layout already redirects unauthenticated users; this is the
  // secondary check, matching the other authenticated pages.
  if (!result) return null;

  const { run, debug } = result;
  const hasItems = run.sections.some((section) => section.items.length > 0);

  return (
    <div className="animate-fade-up space-y-10">
      <RecommendationHero run={run} />

      {hasItems ? (
        <div className="space-y-2">
          {run.sections.map((section, index) => (
            <RecommendationRail
              key={section.id}
              section={section}
              priorityCount={index === 0 ? 4 : 0}
              debug={wantsDebug}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={run.mode === "unavailable" ? Compass : Sparkles}
          title={
            run.mode === "unavailable"
              ? "Catalog not connected"
              : "Nothing new to suggest yet"
          }
          description={
            run.mode === "unavailable"
              ? "Recommendations need a configured catalog provider. Once TMDB credentials are set, this page fills in automatically."
              : "Argus could not find titles outside your library to suggest. Add a few more titles or ratings and check back."
          }
        />
      )}

      <footer className="border-border/60 flex flex-wrap items-center justify-between gap-3 border-t pt-6">
        <p className="text-muted-foreground text-xs">
          {run.mode === "personalized"
            ? "Ranked deterministically from your own library — no AI, no other users' data."
            : "General picks. This page becomes personal as soon as you start tracking titles."}
        </p>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={ROUTES.library}>Your library</Link>
          </Button>
          <Button asChild size="sm">
            <Link href={ROUTES.discover}>Browse catalog</Link>
          </Button>
        </div>
      </footer>

      {wantsDebug && debug ? <RecommendationDebugPanel run={run} debug={debug} /> : null}
    </div>
  );
}
