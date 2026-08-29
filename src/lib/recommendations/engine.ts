/**
 * Engine — the one function that runs the whole pipeline.
 *
 *   signals → taste profile → enrichment → candidates → scoring → diversify → sections
 *
 * Takes the catalog as an argument rather than importing the TMDB adapter, so
 * the tests drive the entire pipeline end to end against a fake catalog. It
 * performs no authentication and never sees a user id: `service.ts` resolves the
 * user and hands this function that user's data. Keeping the boundary there is
 * what makes per-account isolation a property of the code rather than a promise.
 */

import type {
  RecommendationRun,
  RecommendationSection,
  ScoredCandidate,
} from "@/types/recommendations";

import type { CatalogPort, TitleFacts } from "./catalog-port";
import { generateCandidates, generateColdStartCandidates } from "./candidates";
import { scorePool } from "./scoring";
import { assembleColdStartSections, assembleSections } from "./sections";
import {
  buildTasteProfile,
  fingerprintSignals,
  selectEnrichmentTargets,
} from "./taste-profile";
import { buildEntrySignals, type RecommendationSignalData } from "./signals";

export interface RunOptions {
  /** Attach the full factor breakdown to every item. Development only. */
  includeFactors?: boolean;
  /** Injected clock — the tests need a fixed `now` for recency and freshness. */
  now?: number;
}

export interface EngineDebugInfo {
  laneCounts: Record<string, number>;
  enrichedTitles: string[];
  poolSize: number;
  scoredSize: number;
}

export interface EngineResult {
  run: RecommendationRun;
  debug: EngineDebugInfo;
}

/**
 * Fetch detail data for the titles worth an API call.
 *
 * Two passes over the library are not needed: `selectEnrichmentTargets` reads
 * the same signals the profile will be built from, so the profile is built
 * twice — once without facts to find the targets, once with them. The first
 * build is pure in-memory arithmetic over at most a few thousand rows; paying
 * it avoids guessing which titles to enrich.
 */
async function enrichTargets(
  data: RecommendationSignalData,
  catalog: CatalogPort,
  now: number,
): Promise<Map<string, TitleFacts>> {
  const signals = buildEntrySignals(data, now);
  const { anchors, detractors } = selectEnrichmentTargets(signals);
  const targets = [...anchors, ...detractors];

  const facts = new Map<string, TitleFacts>();
  const results = await Promise.all(
    targets.map((signal) =>
      catalog.getTitleFacts(signal.entry.media_type, signal.entry.external_id),
    ),
  );

  for (const fact of results) {
    if (fact) facts.set(fact.key, fact);
  }
  return facts;
}

export async function runRecommendationEngine(
  data: RecommendationSignalData,
  catalog: CatalogPort,
  options: RunOptions = {},
): Promise<EngineResult> {
  const now = options.now ?? Date.now();
  const includeFactors = options.includeFactors ?? false;
  const fingerprint = fingerprintSignals(data);

  const emptyDebug: EngineDebugInfo = {
    laneCounts: {},
    enrichedTitles: [],
    poolSize: 0,
    scoredSize: 0,
  };

  if (!catalog.isConfigured()) {
    return {
      run: {
        mode: "unavailable",
        generatedAt: new Date(now).toISOString(),
        fingerprint,
        profile: buildTasteProfile(data, { now }),
        sections: [],
        candidateCount: 0,
        notice:
          "The catalog provider is not configured, so no titles can be suggested yet.",
      },
      debug: emptyDebug,
    };
  }

  /* Cold start — decided from behaviour, not from row count. --------------- */
  const provisional = buildTasteProfile(data, { now });
  if (provisional.signalStrength === "empty") {
    const candidates = await generateColdStartCandidates(
      catalog,
      provisional.excludedKeys,
    );
    const scored = scorePool(candidates, provisional, { now });
    return {
      run: {
        mode: "cold_start",
        generatedAt: new Date(now).toISOString(),
        fingerprint,
        profile: provisional,
        sections: assembleColdStartSections(scored, provisional, { includeFactors }),
        candidateCount: candidates.length,
        notice:
          "Argus has no viewing history to learn from yet, so these are general picks rather than personal ones.",
      },
      debug: { ...emptyDebug, poolSize: candidates.length, scoredSize: scored.length },
    };
  }

  /* Personalized path. ----------------------------------------------------- */
  const facts = await enrichTargets(data, catalog, now);
  const profile = buildTasteProfile(data, { facts, now });

  const { candidates, laneCounts } = await generateCandidates(profile, facts, catalog);
  const scored: ScoredCandidate[] = scorePool(candidates, profile, { now });
  let sections: RecommendationSection[] = assembleSections(scored, profile, {
    includeFactors,
  });

  // The catalog answered but nothing survived exclusion and scoring — a small
  // library of very obscure titles can do this. Generic picks are more useful
  // than an empty page, and are labelled as such.
  let notice: string | undefined;
  if (sections.length === 0) {
    const fallback = await generateColdStartCandidates(catalog, profile.excludedKeys);
    const fallbackScored = scorePool(fallback, profile, { now });
    sections = assembleColdStartSections(fallbackScored, profile, { includeFactors });
    notice =
      "Not enough catalog matches for your library yet — showing general picks while Argus fills in.";
  }

  return {
    run: {
      mode: "personalized",
      generatedAt: new Date(now).toISOString(),
      fingerprint,
      profile,
      sections,
      candidateCount: candidates.length,
      ...(notice ? { notice } : {}),
    },
    debug: {
      laneCounts,
      enrichedTitles: [...facts.values()].map((f) => f.title).sort(),
      poolSize: candidates.length,
      scoredSize: scored.length,
    },
  };
}
