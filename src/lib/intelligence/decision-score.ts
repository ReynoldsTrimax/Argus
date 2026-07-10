/**
 * Decision Score — modular, explainable recommendation score for a single title.
 */

import type { DecisionReason, DecisionScore, UserStats } from "@/types/intelligence";
import type { LibraryEntry } from "@/types/library";
import type { Genre, PersonCredit } from "@/types/media";

export interface DecisionTitleInput {
  title: string;
  mediaType: "movie" | "tv";
  genres: Genre[];
  voteAverage?: number | null;
  popularity?: number | null;
  runtime?: number | null;
  episodeRunTime?: number[];
  releaseDate?: string | null;
  overview?: string | null;
  crew?: PersonCredit[];
  cast?: PersonCredit[];
}

export function computeDecisionScore(
  title: DecisionTitleInput,
  stats: UserStats,
  library: LibraryEntry[],
): DecisionScore {
  const reasons: DecisionReason[] = [];
  let score = 40;

  if (title.voteAverage != null) {
    if (title.voteAverage >= 8) {
      score += 12;
      reasons.push({
        label: `Strong audience score (${title.voteAverage.toFixed(1)})`,
        positive: true,
        weight: 12,
      });
    } else if (title.voteAverage >= 7) {
      score += 7;
      reasons.push({
        label: `Solid audience score (${title.voteAverage.toFixed(1)})`,
        positive: true,
        weight: 7,
      });
    } else if (title.voteAverage < 5.5) {
      score -= 8;
      reasons.push({
        label: `Lower audience score (${title.voteAverage.toFixed(1)})`,
        positive: false,
        weight: 8,
      });
    }
  }

  if ((title.popularity ?? 0) > 50) {
    score += 5;
    reasons.push({ label: "Currently popular", positive: true, weight: 5 });
  }

  const favGenres = new Set(stats.favorites.genres.map((g) => g.name.toLowerCase()));
  const titleGenres = title.genres.map((g) => g.name);
  const genreHits = titleGenres.filter((g) => favGenres.has(g.toLowerCase()));
  if (genreHits.length > 0) {
    const boost = Math.min(18, genreHits.length * 9);
    score += boost;
    reasons.push({
      label:
        genreHits.length === 1
          ? `One of your favorite genres (${genreHits[0]})`
          : `Matches your genres: ${genreHits.slice(0, 3).join(", ")}`,
      positive: true,
      weight: boost,
    });
  } else if (favGenres.size > 0) {
    score -= 3;
    reasons.push({
      label: "Outside your usual genres",
      positive: false,
      weight: 3,
    });
  }

  const runtime: number | null =
    title.mediaType === "movie"
      ? (title.runtime ?? null)
      : (title.episodeRunTime?.[0] ?? title.runtime ?? null);
  const runtimePref = stats.distributions.runtimes[0]?.name;
  if (runtime != null && runtimePref) {
    const inSweet =
      (runtimePref === "90–130m" && runtime >= 90 && runtime <= 130) ||
      (runtimePref === "Under 90m" && runtime < 90) ||
      (runtimePref === "130–160m" && runtime > 130 && runtime <= 160) ||
      (runtimePref === "Over 160m" && runtime > 160);
    if (inSweet) {
      score += 8;
      reasons.push({
        label: "Runtime matches your preference",
        positive: true,
        weight: 8,
      });
    }
  }

  const year = title.releaseDate?.slice(0, 4);
  if (year) {
    const decade = `${Math.floor(Number(year) / 10) * 10}s`;
    const topDecade = stats.distributions.decades[0]?.name;
    if (topDecade && decade === topDecade) {
      score += 6;
      reasons.push({
        label: `From your favorite decade (${decade})`,
        positive: true,
        weight: 6,
      });
    }
  }

  const high = stats.favorites.highRated.slice(0, 8);
  if (high.length && title.overview) {
    const tokens = new Set(
      title.overview
        .toLowerCase()
        .split(/\W+/)
        .filter((t) => t.length > 4),
    );
    let best: { entry: LibraryEntry; overlap: number } | null = null;
    for (const e of high) {
      const text = `${e.title} ${e.overview ?? ""}`.toLowerCase();
      const words = text.split(/\W+/).filter((t) => t.length > 4);
      const overlap = words.filter((w) => tokens.has(w)).length;
      if (!best || overlap > best.overlap) best = { entry: e, overlap };
    }
    if (best && best.overlap >= 6) {
      score += 10;
      reasons.push({
        label: `Similar to ${best.entry.title}`,
        positive: true,
        weight: 10,
      });
    }
  }

  const directors = (title.crew ?? [])
    .filter((c) => (c.job ?? "").split(" · ").includes("Director"))
    .map((c) => c.name);
  if (directors[0]) {
    score += 4;
    reasons.push({
      label: `Directed by ${directors[0]}`,
      positive: true,
      weight: 4,
    });
  }

  const existing = library.find(
    (e) =>
      e.title.toLowerCase() === title.title.toLowerCase() &&
      e.media_type === title.mediaType,
  );
  if (existing) {
    if (existing.status === "completed") {
      score -= 15;
      reasons.push({
        label: "Already completed in your library",
        positive: false,
        weight: 15,
      });
    } else if (
      existing.status === "plan_to_watch" ||
      existing.status === "wishlist"
    ) {
      score += 5;
      reasons.push({
        label: "Already on your watchlist",
        positive: true,
        weight: 5,
      });
    }
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  const summary =
    score >= 85
      ? "Strong match for your taste"
      : score >= 70
        ? "Likely worth your time"
        : score >= 50
          ? "Mixed signals — sample carefully"
          : "Below your usual preferences";

  const sorted = [...reasons].sort((a, b) => b.weight - a.weight).slice(0, 6);

  return {
    score,
    max: 100,
    reasons: sorted,
    summary,
  };
}
