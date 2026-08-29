import { describe, expect, it } from "vitest";

import { inferScale, normalizeRating } from "./rating";
import { buildEntrySignals, buildRatingContext } from "./signals";
import {
  affinityOf,
  buildTasteProfile,
  fingerprintSignals,
  selectAnchors,
  selectEnrichmentTargets,
} from "./taste-profile";
import { NOW, entry, facts, signalData } from "./test-fixtures";

/* -------------------------------------------------------------------------- */
/* Rating normalization                                                       */
/* -------------------------------------------------------------------------- */

describe("normalizeRating", () => {
  it("maps every supported scale onto the same internal value", () => {
    expect(normalizeRating(4, "five")).toBe(0.8);
    expect(normalizeRating(8, "ten")).toBe(0.8);
    expect(normalizeRating(80, "hundred")).toBe(0.8);
  });

  it("treats 4/5, 8/10 and 80/100 as equal enthusiasm", () => {
    const five = normalizeRating(4, "five");
    const ten = normalizeRating(8, "ten");
    const hundred = normalizeRating(80, "hundred");
    expect(five).toBe(ten);
    expect(ten).toBe(hundred);
  });

  it("returns null for missing or negative values", () => {
    expect(normalizeRating(null, "ten")).toBeNull();
    expect(normalizeRating(undefined, "ten")).toBeNull();
    expect(normalizeRating(-1, "ten")).toBeNull();
  });

  it("clamps values above the scale maximum", () => {
    expect(normalizeRating(12, "ten")).toBe(1);
  });

  it("infers a scale only when magnitude makes it unambiguous", () => {
    // A stored 80 cannot be a 10-point rating.
    expect(inferScale(80)).toBe("hundred");
    // 4 is ambiguous, so it falls back to the write-path default.
    expect(inferScale(4)).toBe("ten");
    expect(normalizeRating(85, null)).toBe(0.85);
  });
});

describe("buildRatingContext", () => {
  it("uses a fixed midpoint until there are enough ratings for a personal one", () => {
    const context = buildRatingContext([entry({ title: "One", rating: 10 })]);
    expect(context.referenceMean).toBe(0.6);
    expect(context.count).toBe(1);
  });

  it("centres on the user's own mean once enough ratings exist", () => {
    const entries = [8, 8, 9, 9].map((rating, i) => entry({ title: `T${i}`, rating }));
    const context = buildRatingContext(entries);
    expect(context.referenceMean).toBeCloseTo(0.85, 5);
  });

  it("records every scale the user has mixed", () => {
    const context = buildRatingContext([
      entry({ title: "A", rating: 4, scale: "five" }),
      entry({ title: "B", rating: 90, scale: "hundred" }),
    ]);
    expect(context.scalesUsed).toEqual(["five", "hundred"]);
  });
});

/* -------------------------------------------------------------------------- */
/* Status weighting                                                           */
/* -------------------------------------------------------------------------- */

describe("buildEntrySignals", () => {
  it("orders statuses from strongest positive to strongest negative", () => {
    const signals = buildEntrySignals(
      signalData([
        entry({ id: "c", title: "Completed", status: "completed" }),
        entry({ id: "w", title: "Watching", status: "watching" }),
        entry({ id: "p", title: "Planned", status: "plan_to_watch" }),
        entry({ id: "pa", title: "Paused", status: "paused" }),
        entry({ id: "d", title: "Dropped", status: "dropped" }),
      ]),
      NOW,
    );

    const weight = (id: string) => signals.find((s) => s.entry.id === id)!.weight;

    expect(weight("c")).toBeGreaterThan(weight("w"));
    expect(weight("w")).toBeGreaterThan(weight("p"));
    expect(weight("p")).toBeGreaterThan(0);
    expect(weight("pa")).toBeLessThan(0);
    expect(weight("d")).toBeLessThan(weight("pa"));
  });

  it("treats a rewatched title as a stronger signal than a single completion", () => {
    const signals = buildEntrySignals(
      signalData([
        entry({ id: "once", title: "Once", status: "completed" }),
        entry({ id: "again", title: "Again", status: "completed", rewatchCount: 2 }),
      ]),
      NOW,
    );
    const once = signals.find((s) => s.entry.id === "once")!.weight;
    const again = signals.find((s) => s.entry.id === "again")!.weight;
    expect(again).toBeGreaterThan(once);
  });

  it("lets a low rating turn a completed title negative", () => {
    const entries = [
      entry({ id: "hated", title: "Hated", status: "completed", rating: 2 }),
      entry({ title: "A", rating: 8 }),
      entry({ title: "B", rating: 9 }),
      entry({ title: "C", rating: 8 }),
      entry({ title: "D", rating: 9 }),
    ];
    const signals = buildEntrySignals(signalData(entries), NOW);
    expect(signals.find((s) => s.entry.id === "hated")!.weight).toBeLessThan(0);
  });

  it("amplifies rather than reverses the sign when a dropped title got attention", () => {
    const plain = entry({ id: "d1", title: "Dropped plain", status: "dropped" });
    const noted = entry({ id: "d2", title: "Dropped noted", status: "dropped" });

    const signals = buildEntrySignals(
      signalData([plain, noted], {
        reviews: [{ entry_id: "d2" }],
        notes: [{ entry_id: "d2" }, { entry_id: "d2" }],
      }),
      NOW,
    );

    const plainWeight = signals.find((s) => s.entry.id === "d1")!.weight;
    const notedWeight = signals.find((s) => s.entry.id === "d2")!.weight;
    expect(notedWeight).toBeLessThan(plainWeight);
    expect(notedWeight).toBeLessThan(0);
  });

  it("deepens the negative for a title dropped more than once", () => {
    const once = entry({ id: "x", title: "X", status: "dropped" });
    const twice = entry({ id: "y", title: "Y", status: "dropped" });

    const signals = buildEntrySignals(
      signalData([once, twice], {
        statusHistory: [
          {
            entry_id: "y",
            from_status: "watching",
            to_status: "dropped",
            created_at: "2024-01-01",
          },
          {
            entry_id: "y",
            from_status: "watching",
            to_status: "dropped",
            created_at: "2024-06-01",
          },
          {
            entry_id: "x",
            from_status: "watching",
            to_status: "dropped",
            created_at: "2024-01-01",
          },
        ],
      }),
      NOW,
    );

    expect(signals.find((s) => s.entry.id === "y")!.weight).toBeLessThan(
      signals.find((s) => s.entry.id === "x")!.weight,
    );
  });

  it("decays old enthusiasm but not old aversion", () => {
    const recent = entry({
      id: "r",
      title: "Recent",
      lastWatchedAt: "2025-05-01T00:00:00.000Z",
    });
    const old = entry({
      id: "o",
      title: "Old",
      lastWatchedAt: "2015-05-01T00:00:00.000Z",
    });
    const oldDrop = entry({
      id: "od",
      title: "Old drop",
      status: "dropped",
      lastWatchedAt: "2015-05-01T00:00:00.000Z",
    });
    const newDrop = entry({
      id: "nd",
      title: "New drop",
      status: "dropped",
      lastWatchedAt: "2025-05-01T00:00:00.000Z",
    });

    const signals = buildEntrySignals(signalData([recent, old, oldDrop, newDrop]), NOW);
    const get = (id: string) => signals.find((s) => s.entry.id === id)!.weight;

    expect(get("o")).toBeLessThan(get("r"));
    expect(get("od")).toBe(get("nd"));
  });
});

/* -------------------------------------------------------------------------- */
/* Profile                                                                    */
/* -------------------------------------------------------------------------- */

describe("buildTasteProfile", () => {
  it("reports an empty profile for an empty library without inventing taste", () => {
    const profile = buildTasteProfile(signalData([]), { now: NOW });
    expect(profile.signalStrength).toBe("empty");
    expect(profile.confidence).toBe(0);
    expect(profile.genres).toEqual([]);
    expect(profile.anchors).toEqual([]);
    expect(profile.excludedKeys).toEqual([]);
    expect(profile.mediaTypeBias).toEqual({ movie: 0, tv: 0 });
  });

  it("keeps a one-title library sparse and low-confidence", () => {
    const profile = buildTasteProfile(
      signalData([entry({ title: "Solo", rating: 10, genres: ["Horror"] })]),
      { now: NOW },
    );
    expect(profile.signalStrength).toBe("sparse");
    expect(profile.confidence).toBeLessThan(0.15);
    // Present, but shrunk — one rating must not look like an obsession.
    expect(affinityOf(profile.genres, "Horror")!.score).toBeLessThan(0.5);
  });

  it("ranks a repeatedly-loved genre above an incidental one", () => {
    const entries = [
      entry({ title: "T1", genres: ["Thriller"], rating: 9 }),
      entry({ title: "T2", genres: ["Thriller"], rating: 9 }),
      entry({ title: "T3", genres: ["Thriller"], rating: 8, favorite: true }),
      entry({ title: "C1", genres: ["Comedy"], rating: 6 }),
      entry({ title: "C2", genres: ["Comedy"], rating: 6 }),
    ];
    const profile = buildTasteProfile(signalData(entries), { now: NOW });

    expect(affinityOf(profile.genres, "Thriller")!.score).toBeGreaterThan(
      affinityOf(profile.genres, "Comedy")!.score,
    );
  });

  it("drops an attribute with too little supporting weight rather than guessing", () => {
    // One mildly-below-average rating is not evidence of a genre preference.
    const entries = [
      entry({ title: "T1", genres: ["Thriller"], rating: 9 }),
      entry({ title: "T2", genres: ["Thriller"], rating: 9 }),
      entry({ title: "T3", genres: ["Thriller"], rating: 9 }),
      entry({ title: "T4", genres: ["Thriller"], rating: 9 }),
      entry({ title: "C1", genres: ["Comedy"], rating: 7 }),
    ];
    const profile = buildTasteProfile(signalData(entries), { now: NOW });
    expect(affinityOf(profile.genres, "Comedy")).toBeNull();
  });

  it("marks a repeatedly dropped genre as avoided", () => {
    const entries = [
      entry({ title: "H1", genres: ["Horror"], status: "dropped" }),
      entry({ title: "H2", genres: ["Horror"], status: "dropped" }),
      entry({ title: "H3", genres: ["Horror"], status: "dropped" }),
      entry({ title: "D1", genres: ["Drama"], rating: 9 }),
      entry({ title: "D2", genres: ["Drama"], rating: 8 }),
    ];
    const profile = buildTasteProfile(signalData(entries), { now: NOW });

    expect(profile.avoidedGenres.map((g) => g.key)).toContain("Horror");
    expect(affinityOf(profile.genres, "Horror")!.score).toBeLessThan(0);
    expect(profile.avoidedGenres.map((g) => g.key)).not.toContain("Drama");
  });

  it("does not call a genre avoided on the strength of one drop", () => {
    const profile = buildTasteProfile(
      signalData([
        entry({ title: "H1", genres: ["Horror"], status: "dropped" }),
        entry({ title: "D1", genres: ["Drama"], rating: 9 }),
      ]),
      { now: NOW },
    );
    expect(profile.avoidedGenres.map((g) => g.key)).not.toContain("Horror");
  });

  it("infers a runtime window from the films that were actually enjoyed", () => {
    const entries = [
      entry({ title: "A", runtime: 100, rating: 9 }),
      entry({ title: "B", runtime: 110, rating: 9 }),
      entry({ title: "C", runtime: 105, rating: 8 }),
      entry({ title: "Long", runtime: 220, status: "dropped" }),
    ];
    const profile = buildTasteProfile(signalData(entries), { now: NOW });

    expect(profile.runtime.meanMinutes).toBe(105);
    expect(profile.runtime.minMinutes).toBeLessThan(105);
    expect(profile.runtime.maxMinutes).toBeGreaterThan(105);
    // The dropped 220-minute film must not drag the window upward.
    expect(profile.runtime.maxMinutes!).toBeLessThan(200);
  });

  it("detects avoidance of long series only with repetition and contrast", () => {
    const entries = [
      entry({ title: "Long A", mediaType: "tv", status: "dropped", totalEpisodes: 120 }),
      entry({ title: "Long B", mediaType: "tv", status: "dropped", totalEpisodes: 90 }),
      entry({ title: "Short", mediaType: "tv", status: "completed", totalEpisodes: 8 }),
    ];
    const profile = buildTasteProfile(signalData(entries), { now: NOW });
    expect(profile.completion.avoidsLongSeries).toBe(true);

    const single = buildTasteProfile(
      signalData([
        entry({
          title: "Long A",
          mediaType: "tv",
          status: "dropped",
          totalEpisodes: 120,
        }),
      ]),
      { now: NOW },
    );
    expect(single.completion.avoidsLongSeries).toBe(false);
  });

  it("derives people and themes only from enriched titles", () => {
    const anchor = entry({
      id: "a1",
      externalId: "500",
      title: "Anchor",
      rating: 10,
      favorite: true,
    });
    const factMap = new Map([
      [
        "movie:500",
        facts({
          externalId: "500",
          title: "Anchor",
          keywords: ["dystopia", "time travel"],
          directors: [{ id: "p1", name: "Denis Villeneuve" }],
          cast: [{ id: "c1", name: "Ryan Gosling" }],
        }),
      ],
    ]);

    const withFacts = buildTasteProfile(signalData([anchor]), {
      now: NOW,
      facts: factMap,
    });
    expect(withFacts.creators.map((c) => c.key)).toContain("Denis Villeneuve");
    expect(withFacts.cast.map((c) => c.key)).toContain("Ryan Gosling");
    expect(withFacts.themes.map((t) => t.key)).toContain("dystopia");

    const withoutFacts = buildTasteProfile(signalData([anchor]), { now: NOW });
    expect(withoutFacts.creators).toEqual([]);
    expect(withoutFacts.themes).toEqual([]);
  });

  it("fills genres from enrichment when the library row never stored any", () => {
    const bare = entry({ id: "b1", externalId: "700", title: "Bare" });
    bare.metadata = { originalLanguage: "en" };

    const profile = buildTasteProfile(signalData([bare]), {
      now: NOW,
      facts: new Map([
        ["movie:700", facts({ externalId: "700", title: "Bare", genres: ["Crime"] })],
      ]),
    });

    expect(affinityOf(profile.genres, "Crime")).not.toBeNull();
  });

  it("excludes every library title, whatever its status", () => {
    const profile = buildTasteProfile(
      signalData([
        entry({ externalId: "1", title: "Done", status: "completed" }),
        entry({ externalId: "2", title: "Planned", status: "plan_to_watch" }),
        entry({ externalId: "3", title: "Gone", status: "dropped" }),
      ]),
      { now: NOW },
    );

    expect(profile.excludedKeys).toContain("movie:1");
    expect(profile.excludedKeys).toContain("movie:2");
    expect(profile.excludedKeys).toContain("movie:3");
    expect(profile.droppedKeys).toEqual(["movie:3"]);
  });

  it("excludes hidden titles without letting them shape the profile", () => {
    const profile = buildTasteProfile(
      signalData([entry({ externalId: "1", title: "Visible", genres: ["Drama"] })], {
        hiddenTitles: [{ media_type: "tv", external_id: "77" }],
      }),
      { now: NOW },
    );

    expect(profile.excludedKeys).toContain("tv:77");
    // Hidden titles contribute no weight — only the visible entry counted.
    expect(profile.signalTitles).toBe(1);
    expect(profile.librarySize).toBe(1);
  });

  it("reports the media type the library leans toward", () => {
    const profile = buildTasteProfile(
      signalData([
        entry({ title: "M1", mediaType: "movie", rating: 9 }),
        entry({ title: "M2", mediaType: "movie", rating: 9 }),
        entry({ title: "M3", mediaType: "movie", rating: 8 }),
        entry({ title: "S1", mediaType: "tv", status: "plan_to_watch" }),
      ]),
      { now: NOW },
    );
    expect(profile.mediaTypeBias.movie).toBeGreaterThan(profile.mediaTypeBias.tv);
  });
});

describe("anchors", () => {
  it("prefers highly rated titles and labels why they qualified", () => {
    const signals = buildEntrySignals(
      signalData([
        entry({ id: "top", title: "Top", rating: 10 }),
        entry({ id: "fav", title: "Fav", favorite: true }),
        entry({ id: "meh", title: "Meh", status: "plan_to_watch" }),
      ]),
      NOW,
    );

    const anchors = selectAnchors(signals);
    const titles = anchors.map((a) => a.title);
    expect(titles).toContain("Top");
    expect(titles).not.toContain("Meh");
    expect(anchors.find((a) => a.title === "Top")!.basis).toBe("rated_high");
    expect(anchors.find((a) => a.title === "Fav")!.basis).toBe("favorite");
  });

  it("selects negative titles for enrichment so aversions can be learned", () => {
    const signals = buildEntrySignals(
      signalData([
        entry({ id: "good", title: "Good", rating: 10 }),
        entry({ id: "bad", title: "Bad", status: "dropped" }),
      ]),
      NOW,
    );

    const { anchors, detractors } = selectEnrichmentTargets(signals);
    expect(anchors.map((a) => a.entry.id)).toEqual(["good"]);
    expect(detractors.map((d) => d.entry.id)).toEqual(["bad"]);
  });
});

describe("fingerprintSignals", () => {
  it("is stable for identical input", () => {
    const data = signalData([entry({ externalId: "9", title: "Same" })]);
    expect(fingerprintSignals(data)).toBe(fingerprintSignals(data));
  });

  it("changes when a rating changes", () => {
    const before = fingerprintSignals(
      signalData([entry({ id: "e", externalId: "9", title: "Same", rating: 7 })]),
    );
    const after = fingerprintSignals(
      signalData([entry({ id: "e", externalId: "9", title: "Same", rating: 9 })]),
    );
    expect(before).not.toBe(after);
  });

  it("differs between two users with different libraries", () => {
    const a = fingerprintSignals(
      signalData([entry({ externalId: "1", title: "A", userId: "user-a" })]),
    );
    const b = fingerprintSignals(
      signalData([entry({ externalId: "2", title: "B", userId: "user-b" })]),
    );
    expect(a).not.toBe(b);
  });
});
