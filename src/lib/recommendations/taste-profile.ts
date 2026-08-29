/**
 * Taste profile — aggregates behavioural signals into per-attribute affinities.
 *
 * Pure. Attribute evidence that only TMDB knows (keywords, credits, franchise)
 * arrives as `TitleFacts` gathered by the engine and passed in, so this module
 * stays free of I/O and the tests can hand it fixed facts.
 */

import type { LibraryEntry } from "@/types/library";
import type {
  Affinity,
  AnchorTitle,
  CompletionBehaviour,
  RuntimePreference,
  SignalStrength,
  TasteProfile,
} from "@/types/recommendations";

import { CANDIDATES, PROFILE } from "./config";
import type { TitleFacts } from "./catalog-port";
import { clamp, mean, round, stdDev } from "./rating";
import {
  buildEntrySignals,
  buildRatingContext,
  candidateKey,
  type EntrySignal,
  type RecommendationSignalData,
} from "./signals";

/* -------------------------------------------------------------------------- */
/* Affinity aggregation                                                       */
/* -------------------------------------------------------------------------- */

interface AffinityAccumulator {
  key: string;
  id?: string;
  positive: number;
  negative: number;
  titles: number;
}

class AffinityBuilder {
  private readonly map = new Map<string, AffinityAccumulator>();

  add(key: string, weight: number, id?: string): void {
    if (!key) return;
    const existing = this.map.get(key);
    const positive = Math.max(weight, 0);
    const negative = Math.max(-weight, 0);

    if (existing) {
      existing.positive += positive;
      existing.negative += negative;
      existing.titles += 1;
      if (!existing.id && id) existing.id = id;
      return;
    }
    this.map.set(key, { key, id, positive, negative, titles: 1 });
  }

  /**
   * Direction × shrinkage.
   *
   * Direction is the signed share of support, so it is scale-free: watching ten
   * dramas and one comedy does not make comedy negative, it makes it thin.
   * Shrinkage then pulls thin evidence toward zero, which is what keeps a single
   * 5★ rating from creating a fake obsession.
   */
  build(limit: number): Affinity[] {
    const out: Affinity[] = [];

    for (const acc of this.map.values()) {
      const support = acc.positive + acc.negative;
      if (support < PROFILE.minSupportForAffinity) continue;

      const direction = (acc.positive - acc.negative) / support;
      const shrink = support / (support + PROFILE.affinitySupportHalf);

      out.push({
        key: acc.key,
        id: acc.id,
        score: round(direction * shrink, 3),
        support: round(support, 3),
        titles: acc.titles,
        positiveShare: round(acc.positive / support, 3),
      });
    }

    // Strongest magnitude first so both loves and aversions survive the cap;
    // ties break on key so ordering is deterministic across runs.
    out.sort((a, b) => {
      const delta = Math.abs(b.score) - Math.abs(a.score);
      if (Math.abs(delta) > 1e-9) return delta;
      const support = b.support - a.support;
      if (Math.abs(support) > 1e-9) return support;
      return a.key.localeCompare(b.key);
    });

    return out.slice(0, limit);
  }
}

/** Look up an affinity score by key. Absent keys are neutral, not negative. */
export function affinityScore(list: Affinity[], key: string): number {
  const found = list.find((a) => a.key.toLowerCase() === key.toLowerCase());
  return found ? found.score : 0;
}

export function affinityOf(list: Affinity[], key: string): Affinity | null {
  return list.find((a) => a.key.toLowerCase() === key.toLowerCase()) ?? null;
}

/* -------------------------------------------------------------------------- */
/* Anchors and enrichment targets                                             */
/* -------------------------------------------------------------------------- */

function toAnchor(signal: EntrySignal): AnchorTitle | null {
  if (!signal.basis) return null;
  const entry = signal.entry;
  return {
    entryId: entry.id,
    externalId: entry.external_id,
    provider: entry.provider,
    mediaType: entry.media_type,
    title: entry.title,
    posterPath: entry.poster_path,
    releaseDate: entry.release_date,
    status: entry.status,
    rating: signal.rating,
    weight: signal.weight,
    basis: signal.basis,
  };
}

/**
 * Highest-weight titles that qualify as anchors, strongest first.
 * One anchor per franchise is not enforced here — the diversifier handles
 * franchise saturation downstream, and dropping anchors early would lose the
 * "because you watched" cluster for a user whose favourites are all one series.
 */
export function selectAnchors(signals: EntrySignal[]): AnchorTitle[] {
  return signals
    .filter((s) => s.basis != null && s.weight >= PROFILE.minAnchorWeight)
    .sort((a, b) => {
      const delta = b.weight - a.weight;
      if (Math.abs(delta) > 1e-9) return delta;
      return a.entry.id.localeCompare(b.entry.id);
    })
    .slice(0, PROFILE.maxAnchors)
    .map(toAnchor)
    .filter((a): a is AnchorTitle => a != null);
}

/** Titles whose detail data is worth an API call. */
export function selectEnrichmentTargets(signals: EntrySignal[]): {
  anchors: EntrySignal[];
  detractors: EntrySignal[];
} {
  const sorted = [...signals].sort((a, b) => {
    const delta = b.weight - a.weight;
    if (Math.abs(delta) > 1e-9) return delta;
    return a.entry.id.localeCompare(b.entry.id);
  });

  const anchors = sorted
    .filter((s) => s.basis != null && s.weight >= PROFILE.minAnchorWeight)
    .slice(0, CANDIDATES.maxEnrichedAnchors);

  const detractors = [...sorted]
    .reverse()
    .filter((s) => s.weight <= -CANDIDATES.minDetractorWeight)
    .slice(0, CANDIDATES.maxEnrichedDetractors);

  return { anchors, detractors };
}

/* -------------------------------------------------------------------------- */
/* Behavioural sub-profiles                                                   */
/* -------------------------------------------------------------------------- */

function buildRuntimePreference(
  signals: EntrySignal[],
  facts: Map<string, TitleFacts>,
): RuntimePreference {
  const runtimes: number[] = [];

  for (const signal of signals) {
    if (signal.weight <= 0) continue;
    if (signal.entry.media_type !== "movie") continue;

    const stored = signal.entry.runtime_minutes;
    const enriched = facts.get(
      candidateKey("movie", signal.entry.external_id),
    )?.runtimeMinutes;
    const runtime = stored && stored > 0 ? stored : (enriched ?? null);
    if (runtime && runtime > 30 && runtime < 400) runtimes.push(runtime);
  }

  const avg = mean(runtimes);
  if (avg == null) {
    return { meanMinutes: null, minMinutes: null, maxMinutes: null, support: 0 };
  }

  const spread = clamp(
    stdDev(runtimes),
    PROFILE.runtimeWindowMinSpread,
    PROFILE.runtimeWindowMaxSpread,
  );

  return {
    meanMinutes: Math.round(avg),
    minMinutes: Math.max(40, Math.round(avg - spread)),
    maxMinutes: Math.round(avg + spread),
    support: runtimes.length,
  };
}

function buildCompletionBehaviour(entries: LibraryEntry[]): CompletionBehaviour {
  const completed = entries.filter(
    (e) => e.status === "completed" || e.status === "rewatching",
  );
  const dropped = entries.filter((e) => e.status === "dropped");

  const droppedSeries = dropped
    .filter((e) => e.media_type === "tv" && (e.total_episodes ?? 0) > 0)
    .map((e) => e.total_episodes as number);
  const completedSeries = completed
    .filter((e) => e.media_type === "tv" && (e.total_episodes ?? 0) > 0)
    .map((e) => e.total_episodes as number);

  const droppedMean = mean(droppedSeries);
  const completedMean = mean(completedSeries);

  const finished = completed.length + dropped.length;

  return {
    completionRate: finished > 0 ? round(completed.length / finished, 3) : 0,
    droppedCount: dropped.length,
    completedCount: completed.length,
    droppedSeriesMeanEpisodes: droppedMean != null ? Math.round(droppedMean) : null,
    completedSeriesMeanEpisodes: completedMean != null ? Math.round(completedMean) : null,
    // Requires repetition, absolute length, and a contrast with what they do
    // finish — any one of those alone is noise.
    avoidsLongSeries:
      droppedSeries.length >= 2 &&
      droppedMean != null &&
      droppedMean >= PROFILE.longSeriesEpisodes &&
      (completedMean == null || droppedMean > completedMean * 1.25),
  };
}

function signalStrengthOf(signalTitles: number): SignalStrength {
  if (signalTitles === 0) return "empty";
  if (signalTitles <= PROFILE.sparseLibraryMax) return "sparse";
  if (signalTitles <= PROFILE.moderateLibraryMax) return "moderate";
  return "rich";
}

/**
 * Stable digest of the inputs that decide a run.
 *
 * Not a security hash — it exists so an unchanged library reuses a cached run
 * and a changed one does not, and so tests can assert that two different
 * libraries never collide.
 */
export function fingerprintSignals(data: RecommendationSignalData): string {
  const parts = data.entries
    .map(
      (e) =>
        `${e.media_type}${e.external_id}${e.status}${e.user_rating ?? ""}${
          e.rating_scale ?? ""
        }${e.rewatch_count}${e.is_favorite ? 1 : 0}${e.updated_at}`,
    )
    .sort();

  parts.push(
    `s${data.sessions.length}`,
    `r${data.reviews.length}`,
    `n${data.notes.length}`,
    `t${data.tagAssignments.length}`,
    `c${data.collectionItems.length}`,
    `h${data.statusHistory.length}`,
    `v${data.recentlyViewed.length}`,
  );

  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  const joined = parts.join("|");
  for (let i = 0; i < joined.length; i++) {
    const c = joined.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 + c + i, 0x85ebca6b) >>> 0;
  }
  return `${h1.toString(36)}${h2.toString(36)}`;
}

/* -------------------------------------------------------------------------- */
/* Profile                                                                    */
/* -------------------------------------------------------------------------- */

export interface BuildProfileOptions {
  /** Detail data for enrichment targets, keyed by `mediaType:externalId`. */
  facts?: Map<string, TitleFacts>;
  now?: number;
}

export function buildTasteProfile(
  data: RecommendationSignalData,
  options: BuildProfileOptions = {},
): TasteProfile {
  const now = options.now ?? Date.now();
  const facts = options.facts ?? new Map<string, TitleFacts>();
  const signals = buildEntrySignals(data, now);
  const ratingContext = buildRatingContext(data.entries);

  const genres = new AffinityBuilder();
  const languages = new AffinityBuilder();
  const decades = new AffinityBuilder();
  const creators = new AffinityBuilder();
  const cast = new AffinityBuilder();
  const themes = new AffinityBuilder();

  let movieWeight = 0;
  let tvWeight = 0;
  let signalTitles = 0;
  const popularity: number[] = [];

  for (const signal of signals) {
    const weight = signal.weight;
    if (Math.abs(weight) > 0.1) signalTitles += 1;

    const key = candidateKey(signal.entry.media_type, signal.entry.external_id);
    const fact = facts.get(key);

    // Library rows only carry genre names when the title was added from a
    // detail page; enrichment fills the gap for anything added from a poster.
    const genreNames = signal.genres.length > 0 ? signal.genres : (fact?.genres ?? []);
    for (const genre of genreNames) genres.add(genre, weight);

    const language = signal.language ?? fact?.originalLanguage ?? null;
    if (language) languages.add(language, weight);

    if (signal.decade) decades.add(signal.decade, weight);

    if (fact) {
      for (const person of [...fact.directors, ...fact.creators]) {
        creators.add(person.name, weight, person.id);
      }
      for (const person of fact.cast) cast.add(person.name, weight, person.id);
      for (const keyword of fact.keywords) themes.add(keyword, weight);
      if (weight > 0 && fact.popularity != null) popularity.push(fact.popularity);
    }

    if (weight > 0) {
      if (signal.entry.media_type === "movie") movieWeight += weight;
      else tvWeight += weight;
    }
  }

  const genreList = genres.build(PROFILE.maxGenres);
  const totalTypeWeight = movieWeight + tvWeight;
  const popularityMean = mean(popularity);

  const ratingValues = signals.map((s) => s.rating).filter((r): r is number => r != null);

  const anchors = selectAnchors(signals);

  const avoidedGenres = genreList.filter(
    (genre) =>
      genre.titles >= PROFILE.minTitlesForAvoidance &&
      genre.positiveShare <= 1 - PROFILE.avoidanceNegativeShare,
  );

  // Hidden titles carry no behavioural weight above — they are absent from
  // `entries` — but the user has still seen them, and hiding something from the
  // library is not an invitation to suggest it back.
  const excludedKeys = [
    ...data.entries.map((e) => candidateKey(e.media_type, e.external_id)),
    ...data.hiddenTitles.map((e) => candidateKey(e.media_type, e.external_id)),
  ];
  const droppedKeys = data.entries
    .filter((e) => e.status === "dropped")
    .map((e) => candidateKey(e.media_type, e.external_id));

  return {
    generatedAt: new Date(now).toISOString(),
    signalStrength: signalStrengthOf(signalTitles),
    confidence: round(clamp(signalTitles / PROFILE.confidenceSaturationTitles, 0, 1), 2),
    librarySize: data.entries.length,
    signalTitles,

    genres: genreList,
    languages: languages.build(PROFILE.maxLanguages),
    decades: decades.build(PROFILE.maxDecades),
    creators: creators.build(PROFILE.maxCreators),
    cast: cast.build(PROFILE.maxCast),
    themes: themes.build(PROFILE.maxThemes),

    runtime: buildRuntimePreference(signals, facts),
    ratings: {
      count: ratingContext.count,
      mean: mean(ratingValues) != null ? round(mean(ratingValues) as number, 3) : null,
      spread: round(ratingContext.spread, 3),
      isNarrowRater: ratingContext.boost > 1,
      scalesUsed: ratingContext.scalesUsed,
    },
    completion: buildCompletionBehaviour(data.entries),

    mediaTypeBias:
      totalTypeWeight > 0
        ? {
            movie: round(movieWeight / totalTypeWeight, 3),
            tv: round(tvWeight / totalTypeWeight, 3),
          }
        : { movie: 0, tv: 0 },
    popularityComfort: popularityMean != null ? round(popularityMean, 1) : null,

    anchors,
    avoidedGenres,
    excludedKeys,
    droppedKeys,
  };
}
