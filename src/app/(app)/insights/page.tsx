import type { Metadata } from "next";

import { InsightCards } from "@/features/intelligence/components/insight-cards";
import { getCurrentUser } from "@/lib/services/user-service";
import { loadIntelligenceData } from "@/lib/intelligence/load-profile";
import { computeUserStats } from "@/lib/intelligence/stats-engine";
import { generateInsights } from "@/lib/intelligence/insights";

export const metadata: Metadata = {
  title: "Insights",
  description: "Personal entertainment insights",
};

export default async function InsightsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const data = await loadIntelligenceData(user.id);
  const stats = computeUserStats(data);
  const insights = generateInsights(stats, data);

  return (
    <div className="space-y-6 animate-fade-up">
      <header className="space-y-1">
        <h1 className="font-display text-2xl font-semibold tracking-tight">Insights</h1>
        <p className="text-sm text-muted-foreground">
          Everything here comes from your own watch history.
        </p>
      </header>
      <InsightCards insights={insights} />
    </div>
  );
}
