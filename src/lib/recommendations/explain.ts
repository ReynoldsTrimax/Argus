/**
 * Explanations.
 *
 * Rule for this whole file: a sentence may only be produced from a `ScoreFactor`
 * that is present on the scored candidate, and it may only name values listed in
 * that factor's `evidence`. There is no fallback prose pool and no template that
 * fires "because it looks good on a card" — if nothing scored, the headline says
 * so plainly.
 *
 * That constraint is why explanations are generated here from the score output
 * rather than written alongside the candidate sources: the ranking is the only
 * thing that knows what actually moved the needle.
 */

import type {
  RecommendationExplanation,
  ScoreFactor,
  ScoreFactorKey,
  ScoredCandidate,
  TasteProfile,
} from "@/types/recommendations";

/** Priority when choosing the headline. Concrete beats abstract. */
const HEADLINE_PRIORITY: ScoreFactorKey[] = [
  "franchise_continuation",
  "anchor_similarity",
  "people_affinity",
  "genre_affinity",
  "theme_overlap",
  "discovery",
  "era_fit",
  "quality",
  "freshness",
  "language_fit",
  "media_type_fit",
];

/** Human names for the language codes the catalog reports. */
const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  ja: "Japanese",
  ko: "Korean",
  es: "Spanish",
  fr: "French",
  de: "German",
  it: "Italian",
  pt: "Portuguese",
  zh: "Chinese",
  cn: "Chinese",
  hi: "Hindi",
  ta: "Tamil",
  te: "Telugu",
  ml: "Malayalam",
  kn: "Kannada",
  bn: "Bengali",
  mr: "Marathi",
  ru: "Russian",
  sv: "Swedish",
  da: "Danish",
  no: "Norwegian",
  fi: "Finnish",
  nl: "Dutch",
  pl: "Polish",
  tr: "Turkish",
  th: "Thai",
  fa: "Persian",
  ar: "Arabic",
  he: "Hebrew",
  id: "Indonesian",
};

function languageName(code: string): string {
  return LANGUAGE_NAMES[code.toLowerCase()] ?? code.toUpperCase();
}

function list(values: string[], max = 2): string {
  const items = values.slice(0, max);
  if (items.length === 0) return "";
  if (items.length === 1) return items[0]!;
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/** Best available word for how the user related to an anchor title. */
function anchorVerb(profile: TasteProfile, title: string): string {
  const anchor = profile.anchors.find(
    (a) => a.title.toLowerCase() === title.toLowerCase(),
  );
  if (!anchor) return "watched";
  switch (anchor.basis) {
    case "rated_high":
      return "rated highly";
    case "rewatched":
      return "rewatched";
    case "favorite":
      return "favourited";
    case "deeply_engaged":
      return "wrote about";
    case "completed":
    default:
      return "watched";
  }
}

/**
 * One sentence per factor.
 *
 * Returns null when the factor has no evidence to name — a factor without
 * evidence can still be legitimate in the score (media-type bias, for example,
 * is derived from library composition), but it cannot become a specific claim.
 */
function sentenceFor(factor: ScoreFactor, profile: TasteProfile): string | null {
  const evidence = factor.evidence.filter(Boolean);

  switch (factor.key) {
    case "franchise_continuation":
      return evidence[0] ? `Continues ${evidence[0]}` : null;

    case "anchor_similarity": {
      if (!evidence[0]) return null;
      const verb = anchorVerb(profile, evidence[0]);
      return evidence.length > 1
        ? `Close to ${list(evidence, 2)}, which you ${verb}`
        : `Because you ${verb} ${evidence[0]}`;
    }

    case "people_affinity": {
      if (!evidence[0]) return null;
      const creator = profile.creators.find(
        (c) => c.key.toLowerCase() === evidence[0]!.toLowerCase(),
      );
      if (creator) {
        return creator.score > 0
          ? `From ${list(evidence, 2)}, whose work you rate well`
          : `From ${evidence[0]}, whose work has not landed for you`;
      }
      return `Features ${list(evidence, 2)}, who keeps showing up in your library`;
    }

    case "genre_affinity": {
      if (evidence.length === 0) return null;
      return factor.value > 0
        ? `Matches your taste for ${list(evidence, 2)}`
        : `Leans on ${list(evidence, 2)}, which you watch less of`;
    }

    case "theme_overlap":
      return evidence.length > 0
        ? `Covers ${list(evidence, 2)} — themes that run through your library`
        : null;

    case "era_fit":
      return evidence[0] ? `From the ${evidence[0]}, an era you return to` : null;

    case "language_fit": {
      if (!evidence[0]) return null;
      return factor.value > 0
        ? `${languageName(evidence[0])}-language, like much of your library`
        : null;
    }

    case "quality":
      return evidence[0] ? `Strong audience score — ${evidence[0]}` : null;

    case "freshness":
      return evidence[0] ? `Released ${evidence[0]}` : null;

    case "discovery":
      return evidence[0] === "Low popularity"
        ? "A quieter title than your usual picks"
        : evidence[0]
          ? `A change of pace — ${evidence[0]} sits outside your usual genres`
          : null;

    case "media_type_fit":
      return null;

    case "avoided_genre":
      return evidence.length > 0
        ? `Note: ${list(evidence, 2)} is a genre you often drop`
        : null;

    case "long_series_risk":
      return "Heads up: long-running series are the ones you tend to abandon";

    case "low_quality":
      return evidence[0] ? `Mixed audience reception (${evidence[0]})` : null;

    case "obscurity_risk":
      return evidence[0] ? `Very little audience data yet (${evidence[0]})` : null;

    default:
      return null;
  }
}

/**
 * Headline plus up to three supporting sentences.
 *
 * Penalties are included in the details deliberately. A recommender that only
 * ever says positive things is not explaining a ranking, it is advertising —
 * and the user is better served knowing that a title sits in a genre they
 * usually abandon.
 */
export function explain(
  scored: ScoredCandidate,
  profile: TasteProfile,
): RecommendationExplanation {
  const positives = scored.factors.filter((f) => f.contribution > 0);
  const negatives = scored.factors.filter((f) => f.contribution < 0);

  const ordered = [...positives].sort((a, b) => {
    const priority = HEADLINE_PRIORITY.indexOf(a.key) - HEADLINE_PRIORITY.indexOf(b.key);
    const aKnown = HEADLINE_PRIORITY.includes(a.key);
    const bKnown = HEADLINE_PRIORITY.includes(b.key);
    if (aKnown && bKnown && priority !== 0) return priority;
    if (aKnown !== bKnown) return aKnown ? -1 : 1;
    return b.contribution - a.contribution;
  });

  const sentences: string[] = [];
  for (const factor of ordered) {
    const sentence = sentenceFor(factor, profile);
    if (sentence && !sentences.includes(sentence)) sentences.push(sentence);
  }

  // Warnings come before the remaining positives. Details are capped, and
  // "this is a genre you usually abandon" is worth more to the decision than a
  // third reason to be optimistic.
  const details: string[] = [];
  for (const factor of negatives) {
    const sentence = sentenceFor(factor, profile);
    if (sentence && !details.includes(sentence)) details.push(sentence);
  }
  for (const sentence of sentences.slice(1)) {
    if (!details.includes(sentence)) details.push(sentence);
  }

  const headline =
    sentences[0] ??
    // No factor produced a nameable reason. Say that, rather than inventing one.
    (profile.signalStrength === "empty"
      ? "Popular pick while Argus learns your taste"
      : "Broadly matches your library");

  return { headline, details: details.slice(0, 3) };
}
