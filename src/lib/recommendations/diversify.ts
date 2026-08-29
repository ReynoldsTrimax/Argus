/**
 * Diversification.
 *
 * Ranking by score alone produces a correct and useless feed: the top of a
 * content-based recommender is almost always twenty variations of the same
 * anchor, genre and decade. This is a greedy maximal-marginal-relevance pass —
 * at each step it picks the candidate with the best combination of score and
 * dissimilarity to what has already been picked, plus hard caps that no amount
 * of score can buy past.
 *
 * Pure and deterministic: ties break on candidate key.
 */

import type { ScoredCandidate } from "@/types/recommendations";

import { DIVERSITY } from "./config";
import { round } from "./rating";

interface SelectionState {
  genreCounts: Map<string, number>;
  anchorCounts: Map<string, number>;
  franchiseCounts: Map<string, number>;
  decadeCounts: Map<string, number>;
  languageCounts: Map<string, number>;
  /** Length of the current run of one media type at the tail of the selection. */
  mediaTypeRun: { type: string | null; length: number };
}

function newState(): SelectionState {
  return {
    genreCounts: new Map(),
    anchorCounts: new Map(),
    franchiseCounts: new Map(),
    decadeCounts: new Map(),
    languageCounts: new Map(),
    mediaTypeRun: { type: null, length: 0 },
  };
}

function decadeOf(item: ScoredCandidate): string | null {
  const year = Number(item.candidate.media.releaseDate?.slice(0, 4));
  if (!Number.isFinite(year)) return null;
  return `${Math.floor(year / 10) * 10}s`;
}

function anchorsOf(item: ScoredCandidate): string[] {
  const out = new Set<string>();
  for (const provenance of item.candidate.provenance) {
    if (provenance.anchorExternalId) out.add(provenance.anchorExternalId);
  }
  return [...out];
}

function franchiseOf(item: ScoredCandidate): string | null {
  return item.candidate.collectionId ?? null;
}

/** Hard caps. A cap being hit removes the candidate from this section entirely. */
function violatesCap(item: ScoredCandidate, state: SelectionState): boolean {
  for (const genre of item.candidate.genreNames) {
    if ((state.genreCounts.get(genre) ?? 0) >= DIVERSITY.maxPerGenre) return true;
  }
  for (const anchor of anchorsOf(item)) {
    if ((state.anchorCounts.get(anchor) ?? 0) >= DIVERSITY.maxPerAnchor) return true;
  }
  const franchise = franchiseOf(item);
  if (
    franchise &&
    (state.franchiseCounts.get(franchise) ?? 0) >= DIVERSITY.maxPerFranchise
  ) {
    return true;
  }
  const decade = decadeOf(item);
  if (decade && (state.decadeCounts.get(decade) ?? 0) >= DIVERSITY.maxPerDecade) {
    return true;
  }
  return false;
}

/** Soft redundancy — how much this candidate repeats what is already selected. */
function redundancy(item: ScoredCandidate, state: SelectionState): number {
  let penalty = 0;

  for (const genre of item.candidate.genreNames) {
    penalty += (state.genreCounts.get(genre) ?? 0) * DIVERSITY.sharedGenrePenalty;
  }
  for (const anchor of anchorsOf(item)) {
    penalty += (state.anchorCounts.get(anchor) ?? 0) * DIVERSITY.sharedAnchorPenalty;
  }
  const decade = decadeOf(item);
  if (decade) {
    penalty += (state.decadeCounts.get(decade) ?? 0) * DIVERSITY.sharedDecadePenalty;
  }
  const language = item.candidate.media.originalLanguage;
  if (language) {
    penalty +=
      (state.languageCounts.get(language) ?? 0) * DIVERSITY.sharedLanguagePenalty;
  }
  if (
    state.mediaTypeRun.type === item.candidate.media.mediaType &&
    state.mediaTypeRun.length >= DIVERSITY.mediaTypeRunLength
  ) {
    penalty +=
      (state.mediaTypeRun.length - DIVERSITY.mediaTypeRunLength + 1) *
      DIVERSITY.sameMediaTypeRunPenalty;
  }

  return penalty;
}

function commit(item: ScoredCandidate, state: SelectionState): void {
  for (const genre of item.candidate.genreNames) {
    state.genreCounts.set(genre, (state.genreCounts.get(genre) ?? 0) + 1);
  }
  for (const anchor of anchorsOf(item)) {
    state.anchorCounts.set(anchor, (state.anchorCounts.get(anchor) ?? 0) + 1);
  }
  const franchise = franchiseOf(item);
  if (franchise) {
    state.franchiseCounts.set(franchise, (state.franchiseCounts.get(franchise) ?? 0) + 1);
  }
  const decade = decadeOf(item);
  if (decade) state.decadeCounts.set(decade, (state.decadeCounts.get(decade) ?? 0) + 1);
  const language = item.candidate.media.originalLanguage;
  if (language) {
    state.languageCounts.set(language, (state.languageCounts.get(language) ?? 0) + 1);
  }

  const type = item.candidate.media.mediaType;
  if (state.mediaTypeRun.type === type) state.mediaTypeRun.length += 1;
  else state.mediaTypeRun = { type, length: 1 };
}

export interface DiversifyOptions {
  limit: number;
  /**
   * Relevance vs novelty. Defaults to the configured value; sections that are
   * meant to be tightly on-theme (an anchor cluster) pass a higher number.
   */
  relevanceWeight?: number;
  /** Skip hard caps — used by anchor clusters, which are one anchor by design. */
  ignoreCaps?: boolean;
}

/**
 * Greedy selection balancing score against redundancy.
 *
 * Scores are normalized against the pool's own best score first, so the mix is
 * consistent whether the pool tops out at 90 or at 55.
 */
export function diversify(
  pool: ScoredCandidate[],
  options: DiversifyOptions,
): ScoredCandidate[] {
  const { limit, ignoreCaps = false } = options;
  const relevanceWeight = options.relevanceWeight ?? DIVERSITY.relevanceWeight;
  if (limit <= 0 || pool.length === 0) return [];

  const best = Math.max(...pool.map((p) => p.score), 1);
  const state = newState();
  const remaining = [...pool];
  const selected: ScoredCandidate[] = [];

  while (selected.length < limit && remaining.length > 0) {
    let bestIndex = -1;
    let bestValue = -Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const item = remaining[i]!;
      if (!ignoreCaps && violatesCap(item, state)) continue;

      const relevance = item.score / best;
      const value =
        relevanceWeight * relevance - (1 - relevanceWeight) * redundancy(item, state);

      if (
        value > bestValue + 1e-9 ||
        (Math.abs(value - bestValue) <= 1e-9 &&
          bestIndex >= 0 &&
          item.candidate.key.localeCompare(remaining[bestIndex]!.candidate.key) < 0)
      ) {
        bestValue = value;
        bestIndex = i;
      }
    }

    // Everything left is capped out — the section ends short rather than
    // padding itself with twenty near-identical titles.
    if (bestIndex < 0) break;

    const [picked] = remaining.splice(bestIndex, 1);
    if (!picked) break;
    commit(picked, state);
    selected.push(picked);
  }

  return selected;
}

/** Composition report for the debug panel and the diversity tests. */
export interface DiversityReport {
  count: number;
  genres: number;
  decades: number;
  languages: number;
  movieShare: number;
  /** Largest share held by any single genre, 0…1. */
  topGenreShare: number;
  /** Largest share attributable to any single anchor, 0…1. */
  topAnchorShare: number;
}

export function describeDiversity(items: ScoredCandidate[]): DiversityReport {
  if (items.length === 0) {
    return {
      count: 0,
      genres: 0,
      decades: 0,
      languages: 0,
      movieShare: 0,
      topGenreShare: 0,
      topAnchorShare: 0,
    };
  }

  const genres = new Map<string, number>();
  const decades = new Set<string>();
  const languages = new Set<string>();
  const anchors = new Map<string, number>();
  let movies = 0;

  for (const item of items) {
    for (const genre of item.candidate.genreNames) {
      genres.set(genre, (genres.get(genre) ?? 0) + 1);
    }
    const decade = decadeOf(item);
    if (decade) decades.add(decade);
    const language = item.candidate.media.originalLanguage;
    if (language) languages.add(language);
    for (const anchor of anchorsOf(item)) {
      anchors.set(anchor, (anchors.get(anchor) ?? 0) + 1);
    }
    if (item.candidate.media.mediaType === "movie") movies += 1;
  }

  const maxGenre = Math.max(0, ...genres.values());
  const maxAnchor = Math.max(0, ...anchors.values());

  return {
    count: items.length,
    genres: genres.size,
    decades: decades.size,
    languages: languages.size,
    movieShare: round(movies / items.length, 2),
    topGenreShare: round(maxGenre / items.length, 2),
    topAnchorShare: round(maxAnchor / items.length, 2),
  };
}
