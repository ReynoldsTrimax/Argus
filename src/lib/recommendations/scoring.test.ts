import { describe, expect, it } from "vitest";

import type {
  Candidate,
  CandidateProvenance,
  TasteProfile,
} from "@/types/recommendations";

import { describeDiversity, diversify } from "./diversify";
import { explain } from "./explain";
import { scoreCandidate, scorePool, stableJitter } from "./scoring";
import { buildTasteProfile } from "./taste-profile";
import {
  GENRE_MAP,
  NOW,
  entry,
  facts,
  signalData,
  summary,
  type SummaryOptions,
} from "./test-fixtures";

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function candidate(
  options: SummaryOptions,
  provenance: CandidateProvenance[] = [{ source: "genre_discovery", rank: 0 }],
  collectionId?: string,
): Candidate {
  const media = summary(options);
  return {
    key: `${media.mediaType}:${media.id}`,
    media,
    provenance,
    genreNames: (media.genreIds ?? [])
      .map((id) => GENRE_MAP.get(id)?.name)
      .filter((n): n is string => Boolean(n)),
    ...(collectionId ? { collectionId } : {}),
  };
}

/** A profile that likes thrillers, avoids horror, and has one strong anchor. */
function thrillerProfile(): TasteProfile {
  const entries = [
    entry({
      id: "a1",
      externalId: "500",
      title: "Blade Runner 2049",
      rating: 10,
      genres: ["Thriller", "Science Fiction"],
    }),
    entry({ title: "T2", genres: ["Thriller"], rating: 9 }),
    entry({ title: "T3", genres: ["Thriller"], rating: 9 }),
    entry({ title: "T4", genres: ["Thriller"], rating: 8 }),
    entry({ title: "H1", genres: ["Horror"], status: "dropped" }),
    entry({ title: "H2", genres: ["Horror"], status: "dropped" }),
    entry({ title: "H3", genres: ["Horror"], status: "dropped" }),
  ];

  return buildTasteProfile(signalData(entries), {
    now: NOW,
    facts: new Map([
      [
        "movie:500",
        facts({
          externalId: "500",
          title: "Blade Runner 2049",
          genres: ["Thriller", "Science Fiction"],
          keywords: ["dystopia", "artificial intelligence"],
          directors: [{ id: "p1", name: "Denis Villeneuve" }],
        }),
      ],
    ]),
  });
}

/* -------------------------------------------------------------------------- */
/* Scoring                                                                    */
/* -------------------------------------------------------------------------- */

describe("scoreCandidate", () => {
  const profile = thrillerProfile();

  it("ranks a liked genre above an unremarkable one", () => {
    const liked = scoreCandidate(
      candidate({ id: "1", title: "Thriller pick", genres: ["Thriller"] }),
      profile,
      { now: NOW },
    );
    const neutral = scoreCandidate(
      candidate({ id: "2", title: "Doc pick", genres: ["Documentary"] }),
      profile,
      { now: NOW },
    );
    expect(liked.score).toBeGreaterThan(neutral.score);
  });

  it("penalizes a genre the user repeatedly drops without eliminating it", () => {
    const horror = scoreCandidate(
      candidate({ id: "3", title: "Horror pick", genres: ["Horror"] }),
      profile,
      { now: NOW },
    );
    const neutral = scoreCandidate(
      candidate({ id: "4", title: "Doc pick", genres: ["Documentary"] }),
      profile,
      { now: NOW },
    );

    expect(horror.score).toBeLessThan(neutral.score);
    expect(horror.score).toBeGreaterThan(0);
    expect(horror.factors.some((f) => f.key === "avoided_genre")).toBe(true);
  });

  it("records the anchor that produced a similarity candidate", () => {
    const scored = scoreCandidate(
      candidate({ id: "5", title: "Neighbour", genres: ["Thriller"] }, [
        {
          source: "anchor_similar",
          anchorTitle: "Blade Runner 2049",
          anchorExternalId: "500",
          rank: 0,
        },
      ]),
      profile,
      { now: NOW },
    );

    const anchor = scored.factors.find((f) => f.key === "anchor_similarity");
    expect(anchor).toBeDefined();
    expect(anchor!.evidence).toContain("Blade Runner 2049");
    expect(anchor!.contribution).toBeGreaterThan(0);
  });

  it("does not trust a high vote average backed by almost no votes", () => {
    const trusted = scoreCandidate(
      candidate({ id: "6", title: "Trusted", voteAverage: 8.4, voteCount: 4000 }),
      profile,
      { now: NOW },
    );
    const untrusted = scoreCandidate(
      candidate({ id: "7", title: "Untrusted", voteAverage: 8.4, voteCount: 5 }),
      profile,
      { now: NOW },
    );

    expect(trusted.score).toBeGreaterThan(untrusted.score);
    expect(untrusted.factors.some((f) => f.key === "obscurity_risk")).toBe(true);
  });

  it("penalizes titles audiences rated poorly", () => {
    const bad = scoreCandidate(
      candidate({ id: "8", title: "Bad", voteAverage: 4.1, voteCount: 900 }),
      profile,
      { now: NOW },
    );
    expect(bad.factors.some((f) => f.key === "low_quality")).toBe(true);
  });

  it("credits a franchise continuation", () => {
    const scored = scoreCandidate(
      candidate(
        { id: "9", title: "Sequel", genres: ["Thriller"] },
        [{ source: "anchor_collection", anchorTitle: "Blade Runner 2049", rank: 0 }],
        "c-1",
      ),
      profile,
      { now: NOW },
    );
    expect(scored.factors.some((f) => f.key === "franchise_continuation")).toBe(true);
  });

  it("only credits themes that appear in the candidate's own overview", () => {
    const matching = scoreCandidate(
      candidate({
        id: "10",
        title: "Themed",
        overview:
          "In a dystopia governed by artificial intelligence, a detective questions everything.",
      }),
      profile,
      { now: NOW },
    );
    const unrelated = scoreCandidate(
      candidate({ id: "11", title: "Unrelated", overview: "A gentle romance in Paris." }),
      profile,
      { now: NOW },
    );

    const themed = matching.factors.find((f) => f.key === "theme_overlap");
    expect(themed).toBeDefined();
    expect(themed!.evidence).toContain("dystopia");
    expect(unrelated.factors.some((f) => f.key === "theme_overlap")).toBe(false);
  });

  it("scales personalization down for a thin profile", () => {
    const thin = buildTasteProfile(
      signalData([entry({ title: "Only", genres: ["Thriller"], rating: 10 })]),
      { now: NOW },
    );
    const rich = thrillerProfile();
    const pick = candidate({ id: "12", title: "Thriller pick", genres: ["Thriller"] });

    const thinGenre = scoreCandidate(pick, thin, { now: NOW }).factors.find(
      (f) => f.key === "genre_affinity",
    );
    const richGenre = scoreCandidate(pick, rich, { now: NOW }).factors.find(
      (f) => f.key === "genre_affinity",
    );

    expect(thinGenre!.contribution).toBeLessThan(richGenre!.contribution);
  });

  it("never produces a factor with a zero contribution", () => {
    const scored = scoreCandidate(candidate({ id: "13", title: "Anything" }), profile, {
      now: NOW,
    });
    expect(scored.factors.every((f) => f.contribution !== 0)).toBe(true);
  });

  it("keeps scores inside 0…100", () => {
    const extreme = scoreCandidate(
      candidate(
        {
          id: "14",
          title: "Everything at once",
          genres: ["Thriller", "Science Fiction"],
          voteAverage: 9.5,
          voteCount: 90000,
          releaseDate: "2025-05-01",
          overview: "A dystopia ruled by artificial intelligence.",
        },
        [
          {
            source: "anchor_similar",
            anchorTitle: "Blade Runner 2049",
            anchorExternalId: "500",
            rank: 0,
          },
          {
            source: "anchor_recommended",
            anchorTitle: "Blade Runner 2049",
            anchorExternalId: "500",
            rank: 0,
          },
        ],
      ),
      profile,
      { now: NOW },
    );
    expect(extreme.score).toBeLessThanOrEqual(100);
    expect(extreme.score).toBeGreaterThanOrEqual(0);
  });
});

describe("scorePool", () => {
  it("is deterministic across repeated runs", () => {
    const profile = thrillerProfile();
    const pool = [
      candidate({ id: "a", title: "A", genres: ["Thriller"] }),
      candidate({ id: "b", title: "B", genres: ["Drama"] }),
      candidate({ id: "c", title: "C", genres: ["Horror"] }),
    ];

    const first = scorePool(pool, profile, { now: NOW }).map((s) => s.candidate.key);
    const second = scorePool([...pool].reverse(), profile, { now: NOW }).map(
      (s) => s.candidate.key,
    );
    expect(first).toEqual(second);
  });

  it("breaks score ties on a stable key, not on input order", () => {
    const profile = thrillerProfile();
    const identical = [
      candidate({ id: "zzz", title: "Z", genres: ["Drama"] }),
      candidate({ id: "aaa", title: "A", genres: ["Drama"] }),
    ];
    const ranked = scorePool(identical, profile, { now: NOW });
    expect(ranked[0]!.candidate.key).toBe("movie:aaa");
  });
});

describe("stableJitter", () => {
  it("returns the same value for the same key", () => {
    expect(stableJitter("movie:42")).toBe(stableJitter("movie:42"));
  });

  it("spreads different keys across the range", () => {
    const values = ["a", "b", "c", "d", "e"].map(stableJitter);
    expect(new Set(values).size).toBeGreaterThan(1);
    expect(Math.min(...values)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...values)).toBeLessThan(1);
  });
});

/* -------------------------------------------------------------------------- */
/* Diversity                                                                  */
/* -------------------------------------------------------------------------- */

describe("diversify", () => {
  const profile = thrillerProfile();

  it("refuses to fill a section with one genre", () => {
    const pool = scorePool(
      Array.from({ length: 20 }, (_, i) =>
        candidate({ id: `t${i}`, title: `Thriller ${i}`, genres: ["Thriller"] }),
      ),
      profile,
      { now: NOW },
    );

    const selected = diversify(pool, { limit: 18 });
    expect(selected.length).toBeLessThanOrEqual(4);
    expect(describeDiversity(selected).topGenreShare).toBe(1);
  });

  it("spreads a mixed pool across genres instead of taking the top scores", () => {
    const pool = scorePool(
      [
        ...Array.from({ length: 10 }, (_, i) =>
          candidate({ id: `t${i}`, title: `Thriller ${i}`, genres: ["Thriller"] }),
        ),
        ...Array.from({ length: 6 }, (_, i) =>
          candidate({ id: `d${i}`, title: `Drama ${i}`, genres: ["Drama"] }),
        ),
        ...Array.from({ length: 6 }, (_, i) =>
          candidate({ id: `s${i}`, title: `SciFi ${i}`, genres: ["Science Fiction"] }),
        ),
      ],
      profile,
      { now: NOW },
    );

    const report = describeDiversity(diversify(pool, { limit: 12 }));
    expect(report.genres).toBeGreaterThanOrEqual(3);
    expect(report.topGenreShare).toBeLessThan(0.6);
  });

  it("caps how much of a section one anchor may own", () => {
    const pool = scorePool(
      Array.from({ length: 12 }, (_, i) =>
        candidate(
          {
            id: `a${i}`,
            title: `Anchored ${i}`,
            genres: i % 2 === 0 ? ["Drama"] : ["Crime"],
          },
          [
            {
              source: "anchor_similar",
              anchorTitle: "Blade Runner 2049",
              anchorExternalId: "500",
              rank: i,
            },
          ],
        ),
      ),
      profile,
      { now: NOW },
    );

    const selected = diversify(pool, { limit: 10 });
    expect(selected.length).toBeLessThanOrEqual(3);
  });

  it("caps franchise repetition", () => {
    const pool = scorePool(
      Array.from({ length: 8 }, (_, i) =>
        candidate(
          {
            id: `f${i}`,
            title: `Franchise ${i}`,
            genres: i % 2 === 0 ? ["Drama"] : ["Crime"],
          },
          [{ source: "genre_discovery", rank: i }],
          "collection-9",
        ),
      ),
      profile,
      { now: NOW },
    );
    expect(diversify(pool, { limit: 8 }).length).toBeLessThanOrEqual(2);
  });

  it("lets an anchor cluster ignore caps, since it is one anchor by definition", () => {
    const pool = scorePool(
      Array.from({ length: 8 }, (_, i) =>
        candidate({ id: `c${i}`, title: `Cluster ${i}`, genres: ["Thriller"] }, [
          {
            source: "anchor_similar",
            anchorTitle: "Blade Runner 2049",
            anchorExternalId: "500",
            rank: i,
          },
        ]),
      ),
      profile,
      { now: NOW },
    );

    expect(diversify(pool, { limit: 8, ignoreCaps: true }).length).toBe(8);
  });

  it("is deterministic for the same pool", () => {
    const pool = scorePool(
      Array.from({ length: 15 }, (_, i) =>
        candidate({
          id: `x${i}`,
          title: `X ${i}`,
          genres: [["Drama"], ["Crime"], ["Comedy"]][i % 3]!,
        }),
      ),
      profile,
      { now: NOW },
    );

    const a = diversify(pool, { limit: 9 }).map((s) => s.candidate.key);
    const b = diversify(pool, { limit: 9 }).map((s) => s.candidate.key);
    expect(a).toEqual(b);
  });

  it("returns nothing for an empty pool", () => {
    expect(diversify([], { limit: 10 })).toEqual([]);
  });
});

/* -------------------------------------------------------------------------- */
/* Explanations                                                               */
/* -------------------------------------------------------------------------- */

describe("explain", () => {
  const profile = thrillerProfile();

  it("names the anchor and how the user related to it", () => {
    const scored = scoreCandidate(
      candidate({ id: "e1", title: "Neighbour", genres: ["Thriller"] }, [
        {
          source: "anchor_similar",
          anchorTitle: "Blade Runner 2049",
          anchorExternalId: "500",
          rank: 0,
        },
      ]),
      profile,
      { now: NOW },
    );

    const explanation = explain(scored, profile);
    // The anchor qualified through a 10/10 rating, so the wording must say so.
    expect(explanation.headline).toBe("Because you rated highly Blade Runner 2049");
  });

  it("names the genres it actually matched", () => {
    const scored = scoreCandidate(
      candidate({ id: "e2", title: "Genre pick", genres: ["Thriller"] }),
      profile,
      { now: NOW },
    );
    const explanation = explain(scored, profile);
    expect([explanation.headline, ...explanation.details].join(" ")).toContain(
      "Thriller",
    );
  });

  it("surfaces the avoidance warning rather than hiding it", () => {
    const scored = scoreCandidate(
      candidate({ id: "e3", title: "Horror pick", genres: ["Horror"] }),
      profile,
      { now: NOW },
    );
    const explanation = explain(scored, profile);
    expect(explanation.details.join(" ").toLowerCase()).toContain("often drop");
  });

  it("only mentions values that appear in a scored factor's evidence", () => {
    const scored = scoreCandidate(
      candidate({ id: "e4", title: "Plain", genres: ["Documentary"] }),
      profile,
      { now: NOW },
    );
    const explanation = explain(scored, profile);
    const text = [explanation.headline, ...explanation.details].join(" ");
    const evidence = scored.factors.flatMap((f) => f.evidence);

    // Nothing from the profile may leak into the copy unless it was evidence.
    expect(text).not.toContain("Blade Runner 2049");
    if (text.includes("Thriller")) {
      expect(evidence).toContain("Thriller");
    }
  });

  it("says plainly that it has nothing personal to go on", () => {
    const empty = buildTasteProfile(signalData([]), { now: NOW });
    const scored = scoreCandidate(
      candidate({
        id: "e5",
        title: "Cold",
        genres: ["Drama"],
        voteAverage: 0,
        voteCount: 0,
      }),
      empty,
      { now: NOW },
    );
    const explanation = explain(scored, empty);
    expect(explanation.headline).toBe("Popular pick while Argus learns your taste");
  });
});
