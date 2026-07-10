/**
 * Deterministic personal insights (no AI).
 */

import type { Insight, UserStats } from "@/types/intelligence";
import type { IntelligenceRawData } from "@/lib/intelligence/load-profile";
import { formatWatchHours } from "@/lib/intelligence/stats-engine";

export function generateInsights(
  stats: UserStats,
  data: IntelligenceRawData,
): Insight[] {
  const insights: Insight[] = [];
  const { totals, rates, streaks, distributions, mostActiveMonth } = stats;

  if (totals.totalWatchMinutes > 0) {
    insights.push({
      id: "hours-total",
      title: "Time invested",
      body: `You've logged about ${formatWatchHours(totals.totalWatchMinutes)} of entertainment.`,
      severity: "positive",
      category: "time",
    });
  }

  if (streaks.current > 0) {
    insights.push({
      id: "streak-current",
      title: "You're on a roll",
      body: `Current watch streak: ${streaks.current} day${streaks.current === 1 ? "" : "s"}. Longest ever: ${streaks.longest}.`,
      severity: "positive",
      category: "streak",
    });
  } else if (streaks.longest > 0) {
    insights.push({
      id: "streak-best",
      title: "Your best streak",
      body: `Your longest watch streak is ${streaks.longest} days. One session today restarts the fire.`,
      severity: "neutral",
      category: "streak",
    });
  }

  const topGenre = distributions.genres[0];
  if (topGenre && topGenre.count >= 2) {
    insights.push({
      id: "genre-fav",
      title: "Taste signal",
      body: `${topGenre.name} leads your library with ${topGenre.count} titles — your clearest genre affinity.`,
      severity: "info",
      category: "taste",
    });
  }

  const fri = distributions.weekdays.find((w) => w.label === "Fri");
  const sat = distributions.weekdays.find((w) => w.label === "Sat");
  const peakDay = [...distributions.weekdays].sort((a, b) => b.value - a.value)[0];
  if (peakDay && peakDay.value > 0) {
    insights.push({
      id: "weekday",
      title: "Habit clock",
      body: `You watch most on ${peakDay.label}s (${peakDay.value} sessions).${
        (fri?.value ?? 0) + (sat?.value ?? 0) > peakDay.value * 0.8
          ? " Weekends are peak cinema for you."
          : ""
      }`,
      severity: "info",
      category: "habits",
    });
  }

  const midRuntime = distributions.runtimes.find((r) => r.name === "90–130m");
  if (midRuntime && midRuntime.count >= 3) {
    insights.push({
      id: "runtime",
      title: "Sweet-spot runtime",
      body: `You gravitate toward 90–130 minute films (${midRuntime.count} titles).`,
      severity: "info",
      category: "taste",
    });
  }

  if (rates.completionRate >= 70) {
    insights.push({
      id: "completion-high",
      title: "Finisher energy",
      body: `You complete ${rates.completionRate}% of series you commit to. Strong follow-through.`,
      severity: "positive",
      category: "completion",
    });
  } else if (rates.droppedSeriesPercent >= 30) {
    insights.push({
      id: "drop-rate",
      title: "Selective tastes",
      body: `${rates.droppedSeriesPercent}% of your shows are dropped — you don't force mediocre TV.`,
      severity: "neutral",
      category: "completion",
    });
  }

  // Month-over-month if enough data
  const months = distributions.months;
  if (months.length >= 2) {
    const last = months[months.length - 1]!;
    const prev = months[months.length - 2]!;
    if (prev.value > 0) {
      const delta = Math.round(((last.value - prev.value) / prev.value) * 100);
      if (Math.abs(delta) >= 15) {
        insights.push({
          id: "mom",
          title: delta > 0 ? "Picking up" : "Cooling down",
          body:
            delta > 0
              ? `You were ${delta}% more active this month vs last.`
              : `Activity is ${Math.abs(delta)}% lower than last month.`,
          severity: delta > 0 ? "positive" : "neutral",
          category: "habits",
        });
      }
    }
  }

  if (totals.averageRating != null && totals.ratingsCount >= 5) {
    insights.push({
      id: "avg-rating",
      title: "Critical baseline",
      body: `Your average personal rating is ${totals.averageRating}/10 across ${totals.ratingsCount} titles.`,
      severity: "info",
      category: "taste",
    });
  }

  const highRated = data.entries.filter((e) => (e.user_rating ?? 0) >= 9).length;
  if (highRated > 0) {
    insights.push({
      id: "nines",
      title: "Hall of fame",
      body: `You've given ${highRated} title${highRated === 1 ? "" : "s"} a 9+ rating.`,
      severity: "positive",
      category: "taste",
    });
  }

  if (mostActiveMonth) {
    insights.push({
      id: "peak-month",
      title: "Peak month",
      body: `Your most active viewing month is ${mostActiveMonth}.`,
      severity: "info",
      category: "time",
    });
  }

  if (totals.rewatchCount > 0) {
    insights.push({
      id: "rewatch",
      title: "Comfort rewatches",
      body: `You've logged ${totals.rewatchCount} rewatch${totals.rewatchCount === 1 ? "" : "es"} — comfort cinema is part of your rhythm.`,
      severity: "info",
      category: "habits",
    });
  }

  if (insights.length === 0) {
    insights.push({
      id: "empty",
      title: "Start your journal",
      body: "Watch, rate, and review a few titles — insights appear as your library grows.",
      severity: "neutral",
      category: "habits",
    });
  }

  return insights.slice(0, 12);
}
