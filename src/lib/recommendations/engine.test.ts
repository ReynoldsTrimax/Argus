import { describe, expect, it } from "vitest";

import type { MediaSummary } from "@/types/media";
import type { RecommendationRun } from "@/types/recommendations";

import { runRecommendationEngine } from "./engine";
import { describeDiversity } from "./diversify";
import {
  NOW,
  entry,
  facts,
  fakeCatalog,
  genreId,
  signalData,
  summary,
  type FakeCatalogConfig,
} from "./test-fixtures";

/* -------------------------------------------------------------------------- */
/* Catalog world                                                              */
/* -------------------------------------------------------------------------- */

function many(
  prefix: string,
  count: number,
  genres: string[],
  overrides: Partial<Parameters<typeof summary>[0]> = {},
): MediaSummary[] {
  // Years are spread across five decades: a real catalog is not all one era, and
  // the diversifier's decade cap would otherwise be the binding constraint on
  // every section for reasons that have nothing to do with the algorithm.
  const years = [1984, 1996, 2003, 2011, 2019];
  return Array.from({ length: count }, (_, i) =>
    summary({
      id: `${prefix}${i}`,
      title: `${prefix.toUpperCase()} ${i}`,
      genres,
      releaseDate: `${years[i % years.length]}-06-1${i % 9}`,
      ...overrides,
    }),
  );
}

/**
 * A small but complete catalog: two anchors with neighbours, discover results
 * for every fixture genre, a director filmography, and the generic lists.
 */
function world(): FakeCatalogConfig {
  const thrillerMovies = many("thr", 12, ["Thriller"], { voteAverage: 7.6 });
  const dramaMovies = many("dra", 12, ["Drama"], { voteAverage: 7.4 });
  const horrorMovies = many("hor", 12, ["Horror"], { voteAverage: 7.5 });
  const comedyMovies = many("com", 12, ["Comedy"], { voteAverage: 7.3 });
  const scifiMovies = many("sci", 12, ["Science Fiction"], { voteAverage: 7.7 });
  const crimeMovies = many("cri", 12, ["Crime"], { voteAverage: 7.1 });
  const animMovies = many("ani", 12, ["Animation"], { voteAverage: 7.9 });
  const docMovies = many("doc", 12, ["Documentary"], { voteAverage: 7.5 });

  const thrillerShows = many("tvthr", 10, ["Thriller"], {
    mediaType: "tv",
    voteAverage: 8,
  });
  const dramaShows = many("tvdra", 10, ["Drama"], { mediaType: "tv", voteAverage: 7.8 });
  const crimeShows = many("tvcri", 10, ["Crime"], { mediaType: "tv", voteAverage: 7.6 });
  const scifiShows = many("tvsci", 10, ["Science Fiction"], {
    mediaType: "tv",
    voteAverage: 7.9,
  });
  const comedyShows = many("tvcom", 10, ["Comedy"], {
    mediaType: "tv",
    voteAverage: 7.2,
  });
  const horrorShows = many("tvhor", 10, ["Horror"], {
    mediaType: "tv",
    voteAverage: 7.4,
  });
  const animShows = many("tvani", 10, ["Animation"], {
    mediaType: "tv",
    voteAverage: 8.1,
  });
  const docShows = many("tvdoc", 10, ["Documentary"], {
    mediaType: "tv",
    voteAverage: 7.7,
  });

  const discoverByGenre = new Map<string, MediaSummary[]>([
    [genreId("Thriller"), [...thrillerMovies, ...thrillerShows]],
    [genreId("Drama"), [...dramaMovies, ...dramaShows]],
    [genreId("Horror"), [...horrorMovies, ...horrorShows]],
    [genreId("Comedy"), [...comedyMovies, ...comedyShows]],
    [genreId("Science Fiction"), [...scifiMovies, ...scifiShows]],
    [genreId("Crime"), [...crimeMovies, ...crimeShows]],
    [genreId("Animation"), [...animMovies, ...animShows]],
    [genreId("Documentary"), [...docMovies, ...docShows]],
  ]);

  return {
    configured: true,
    discoverByGenre,
    factsByKey: new Map([
      [
        "movie:500",
        facts({
          externalId: "500",
          title: "Blade Runner 2049",
          genres: ["Thriller", "Science Fiction"],
          keywords: ["dystopia", "artificial intelligence"],
          directors: [{ id: "p-denis", name: "Denis Villeneuve" }],
          collectionId: "col-blade",
          similar: [
            summary({ id: "sim1", title: "Arrival", genres: ["Science Fiction"] }),
            summary({ id: "sim2", title: "Sicario", genres: ["Thriller", "Crime"] }),
            summary({ id: "sim3", title: "Dune", genres: ["Science Fiction"] }),
            summary({ id: "sim4", title: "Enemy", genres: ["Thriller"] }),
            summary({ id: "sim5", title: "Prisoners", genres: ["Crime", "Thriller"] }),
          ],
          recommended: [
            summary({ id: "rec1", title: "Ex Machina", genres: ["Science Fiction"] }),
            summary({ id: "rec2", title: "Annihilation", genres: ["Science Fiction"] }),
            summary({ id: "rec3", title: "Under the Skin", genres: ["Horror"] }),
          ],
        }),
      ],
      [
        "tv:600",
        facts({
          mediaType: "tv",
          externalId: "600",
          title: "Severance",
          genres: ["Drama", "Thriller"],
          keywords: ["workplace", "memory"],
          similar: [
            summary({ id: "tsim1", title: "Dark", mediaType: "tv", genres: ["Drama"] }),
            summary({
              id: "tsim2",
              title: "Devs",
              mediaType: "tv",
              genres: ["Thriller"],
            }),
            summary({
              id: "tsim3",
              title: "Silo",
              mediaType: "tv",
              genres: ["Science Fiction"],
            }),
            summary({
              id: "tsim4",
              title: "Fringe",
              mediaType: "tv",
              genres: ["Thriller"],
            }),
          ],
          recommended: [
            summary({
              id: "trec1",
              title: "Mr Robot",
              mediaType: "tv",
              genres: ["Crime"],
            }),
          ],
        }),
      ],
    ]),
    personCredits: new Map([
      [
        "p-denis",
        {
          name: "Denis Villeneuve",
          credits: [
            summary({ id: "dv1", title: "Incendies", genres: ["Drama"] }),
            summary({ id: "dv2", title: "Polytechnique", genres: ["Drama"] }),
          ],
        },
      ],
    ]),
    collections: new Map([
      [
        "col-blade",
        [
          summary({ id: "bl1", title: "Blade Runner", genres: ["Science Fiction"] }),
          // Already in the library in the tests below — must be filtered out.
          summary({ id: "500", title: "Blade Runner 2049", genres: ["Thriller"] }),
        ],
      ],
    ]),
    lists: {
      trending: many("trend", 14, ["Drama"], { voteAverage: 7, popularity: 300 }),
      top_rated_movies: many("top", 14, ["Crime"], { voteAverage: 8.4, popularity: 90 }),
      top_rated_tv: many("toptv", 14, ["Drama"], {
        mediaType: "tv",
        voteAverage: 8.6,
        popularity: 80,
      }),
      now_playing_movies: many("new", 14, ["Comedy"], {
        voteAverage: 6.9,
        releaseDate: "2025-04-01",
        popularity: 200,
      }),
      popular_movies: many("pop", 14, ["Comedy"], { voteAverage: 6.6, popularity: 500 }),
      popular_tv: many("poptv", 14, ["Drama"], {
        mediaType: "tv",
        voteAverage: 7,
        popularity: 400,
      }),
    },
  };
}

/** Library of a thriller/sci-fi watcher who abandons horror. */
function thrillerLibrary() {
  return signalData([
    entry({
      id: "a1",
      externalId: "500",
      title: "Blade Runner 2049",
      rating: 10,
      favorite: true,
      genres: ["Thriller", "Science Fiction"],
      releaseDate: "2017-10-04",
    }),
    entry({
      id: "a2",
      externalId: "600",
      title: "Severance",
      mediaType: "tv",
      rating: 9,
      genres: ["Drama", "Thriller"],
      totalEpisodes: 18,
      releaseDate: "2022-02-18",
    }),
    entry({
      id: "a3",
      externalId: "601",
      title: "Sicario 2",
      rating: 8,
      genres: ["Thriller"],
    }),
    entry({
      id: "a4",
      externalId: "602",
      title: "Heat",
      rating: 9,
      genres: ["Crime", "Thriller"],
    }),
    entry({
      id: "a5",
      externalId: "603",
      title: "Hereditary",
      status: "dropped",
      genres: ["Horror"],
    }),
    entry({
      id: "a6",
      externalId: "604",
      title: "Midsommar",
      status: "dropped",
      genres: ["Horror"],
    }),
    entry({
      id: "a7",
      externalId: "605",
      title: "It Follows",
      status: "dropped",
      genres: ["Horror"],
    }),
    entry({
      id: "a8",
      externalId: "606",
      title: "Watching Now",
      status: "watching",
      genres: ["Drama"],
    }),
    entry({
      id: "a9",
      externalId: "607",
      title: "On The List",
      status: "plan_to_watch",
      genres: ["Crime"],
    }),
  ]);
}

/** Library of a comedy/animation watcher — deliberately disjoint from above. */
function comedyLibrary() {
  return signalData([
    entry({
      id: "b1",
      externalId: "800",
      title: "Paddington",
      rating: 10,
      favorite: true,
      genres: ["Comedy", "Animation"],
      userId: "user-b",
    }),
    entry({
      id: "b2",
      externalId: "801",
      title: "Superbad",
      rating: 9,
      genres: ["Comedy"],
      userId: "user-b",
    }),
    entry({
      id: "b3",
      externalId: "802",
      title: "Spirited Away",
      rating: 9,
      genres: ["Animation"],
      userId: "user-b",
    }),
    entry({
      id: "b4",
      externalId: "803",
      title: "The Office",
      mediaType: "tv",
      rating: 9,
      genres: ["Comedy"],
      userId: "user-b",
    }),
    entry({
      id: "b5",
      externalId: "804",
      title: "Sicario",
      status: "dropped",
      genres: ["Thriller"],
      userId: "user-b",
    }),
    entry({
      id: "b6",
      externalId: "805",
      title: "Prisoners",
      status: "dropped",
      genres: ["Thriller"],
      userId: "user-b",
    }),
  ]);
}

function allItems(run: RecommendationRun) {
  return run.sections.flatMap((s) => s.items);
}

/* -------------------------------------------------------------------------- */
/* Personalized run                                                           */
/* -------------------------------------------------------------------------- */

describe("runRecommendationEngine — personalized", () => {
  it("produces a personalized feed from library behaviour", async () => {
    const { run, debug } = await runRecommendationEngine(
      thrillerLibrary(),
      fakeCatalog(world()),
      { now: NOW },
    );

    expect(run.mode).toBe("personalized");
    expect(run.notice).toBeUndefined();
    expect(run.sections.length).toBeGreaterThan(2);
    expect(debug.poolSize).toBeGreaterThan(50);
    expect(allItems(run).length).toBeGreaterThan(20);
  });

  it("never recommends a title already in the library, whatever its status", async () => {
    const data = thrillerLibrary();
    const { run } = await runRecommendationEngine(data, fakeCatalog(world()), {
      now: NOW,
    });

    const excluded = new Set(data.entries.map((e) => `${e.media_type}:${e.external_id}`));
    for (const item of allItems(run)) {
      expect(excluded.has(item.key)).toBe(false);
    }
    // Specifically: the franchise lane offered Blade Runner 2049 back.
    expect(allItems(run).map((i) => i.key)).not.toContain("movie:500");
  });

  it("never recommends a hidden title back to the user", async () => {
    const data = thrillerLibrary();
    data.hiddenTitles = [{ media_type: "movie", external_id: "hidden1" }];

    const { run } = await runRecommendationEngine(
      data,
      fakeCatalog({
        ...world(),
        lists: {
          trending: [
            summary({ id: "hidden1", title: "Hidden Away", genres: ["Thriller"] }),
            summary({ id: "visible1", title: "Still Visible", genres: ["Thriller"] }),
          ],
        },
      }),
      { now: NOW },
    );

    const keys = allItems(run).map((i) => i.key);
    expect(keys).not.toContain("movie:hidden1");
    expect(keys).toContain("movie:visible1");
  });

  it("never repeats a title across sections", async () => {
    const { run } = await runRecommendationEngine(
      thrillerLibrary(),
      fakeCatalog(world()),
      { now: NOW },
    );
    const keys = allItems(run).map((i) => i.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("gives two different libraries meaningfully different feeds", async () => {
    const catalog = fakeCatalog(world());

    const a = await runRecommendationEngine(thrillerLibrary(), catalog, { now: NOW });
    const b = await runRecommendationEngine(comedyLibrary(), catalog, { now: NOW });

    const aTop = a.run.sections[0]!.items.map((i) => i.key);
    const bTop = b.run.sections[0]!.items.map((i) => i.key);

    const overlap = aTop.filter((key) => bTop.includes(key));
    expect(overlap.length / aTop.length).toBeLessThan(0.34);
    expect(a.run.fingerprint).not.toBe(b.run.fingerprint);
    expect(a.run.profile.genres[0]!.key).not.toBe(b.run.profile.genres[0]!.key);
  });

  it("keeps each user's library out of the other's profile", async () => {
    const catalog = fakeCatalog(world());
    const a = await runRecommendationEngine(thrillerLibrary(), catalog, { now: NOW });
    const b = await runRecommendationEngine(comedyLibrary(), catalog, { now: NOW });

    // User B has never seen Blade Runner 2049; it must not anchor their feed.
    expect(b.run.profile.anchors.map((x) => x.title)).not.toContain("Blade Runner 2049");
    expect(a.run.profile.anchors.map((x) => x.title)).not.toContain("Paddington");

    const bText = allItems(b.run)
      .map((i) => [i.explanation.headline, ...i.explanation.details].join(" "))
      .join(" ");
    expect(bText).not.toContain("Blade Runner 2049");
    expect(bText).not.toContain("Severance");
  });

  it("ranks a dropped genre below a liked one inside the same run", async () => {
    const { run } = await runRecommendationEngine(
      thrillerLibrary(),
      fakeCatalog(world()),
      { now: NOW },
    );

    const items = allItems(run);
    const horror = items.filter((i) => i.key.includes("hor"));
    const thriller = items.filter((i) => i.key.includes("thr"));

    expect(thriller.length).toBeGreaterThan(0);
    if (horror.length > 0) {
      const bestHorror = Math.max(...horror.map((i) => i.score));
      const bestThriller = Math.max(...thriller.map((i) => i.score));
      expect(bestHorror).toBeLessThan(bestThriller);
    }
  });

  it("builds a because-you-watched cluster around a real anchor", async () => {
    const { run } = await runRecommendationEngine(
      thrillerLibrary(),
      fakeCatalog(world()),
      { now: NOW },
    );

    const cluster = run.sections.find((s) => s.kind === "because_you_watched");
    expect(cluster).toBeDefined();
    expect(cluster!.title).toContain("Blade Runner 2049");
    expect(cluster!.items.length).toBeGreaterThanOrEqual(4);
    for (const item of cluster!.items) {
      expect(item.explanation.headline.length).toBeGreaterThan(0);
    }
  });

  it("includes discovery alongside high-confidence picks", async () => {
    const { run } = await runRecommendationEngine(
      thrillerLibrary(),
      fakeCatalog(world()),
      { now: NOW },
    );

    const kinds = run.sections.map((s) => s.kind);
    expect(kinds).toContain("top_picks");
    expect(kinds.some((k) => k === "discover_different" || k === "hidden_gems")).toBe(
      true,
    );

    const tiers = new Set(allItems(run).map((i) => i.tier));
    expect(tiers.size).toBeGreaterThan(1);
  });

  it("keeps the top section diverse across genres and media types", async () => {
    const { run } = await runRecommendationEngine(
      thrillerLibrary(),
      fakeCatalog(world()),
      { now: NOW },
    );

    const top = run.sections.find((s) => s.kind === "top_picks")!;
    const genres = new Set(top.items.flatMap((i) => i.media.genreIds ?? []));
    expect(genres.size).toBeGreaterThanOrEqual(3);

    const types = new Set(top.items.map((i) => i.media.mediaType));
    expect(types.size).toBe(2);
  });

  it("gives every recommendation a non-empty explanation", async () => {
    const { run } = await runRecommendationEngine(
      thrillerLibrary(),
      fakeCatalog(world()),
      { now: NOW },
    );

    for (const item of allItems(run)) {
      expect(item.explanation.headline.trim().length).toBeGreaterThan(0);
      expect(item.explanation.details.length).toBeLessThanOrEqual(3);
    }
  });

  it("is deterministic — identical input yields an identical ranking", async () => {
    const first = await runRecommendationEngine(thrillerLibrary(), fakeCatalog(world()), {
      now: NOW,
    });
    const second = await runRecommendationEngine(
      thrillerLibrary(),
      fakeCatalog(world()),
      { now: NOW },
    );

    const flatten = (run: RecommendationRun) =>
      run.sections.map(
        (s) => `${s.id}:${s.items.map((i) => `${i.key}@${i.score}`).join(",")}`,
      );

    expect(flatten(first.run)).toEqual(flatten(second.run));
    expect(first.run.fingerprint).toBe(second.run.fingerprint);
  });

  it("omits factor breakdowns unless debug is requested", async () => {
    const plain = await runRecommendationEngine(thrillerLibrary(), fakeCatalog(world()), {
      now: NOW,
    });
    expect(allItems(plain.run).every((i) => i.factors === undefined)).toBe(true);

    const debugged = await runRecommendationEngine(
      thrillerLibrary(),
      fakeCatalog(world()),
      { now: NOW, includeFactors: true },
    );
    expect(allItems(debugged.run).every((i) => (i.factors?.length ?? 0) > 0)).toBe(true);
  });

  it("spends at most one detail call per enriched title", async () => {
    const catalog = fakeCatalog(world());
    await runRecommendationEngine(thrillerLibrary(), catalog, { now: NOW });

    const factCalls = catalog.calls.filter((c) => c.startsWith("facts:"));
    expect(new Set(factCalls).size).toBe(factCalls.length);
    // 8 anchors + 3 detractors is the configured ceiling.
    expect(factCalls.length).toBeLessThanOrEqual(11);
  });

  it("looks up a person only when the affinity justifies it", async () => {
    const catalog = fakeCatalog(world());
    await runRecommendationEngine(thrillerLibrary(), catalog, { now: NOW });
    expect(
      catalog.calls.filter((c) => c.startsWith("person:")).length,
    ).toBeLessThanOrEqual(4);
  });
});

/* -------------------------------------------------------------------------- */
/* Small and empty libraries                                                  */
/* -------------------------------------------------------------------------- */

describe("runRecommendationEngine — sparse and empty", () => {
  it("falls back to labelled generic discovery for an empty library", async () => {
    const { run } = await runRecommendationEngine(signalData([]), fakeCatalog(world()), {
      now: NOW,
    });

    expect(run.mode).toBe("cold_start");
    expect(run.profile.signalStrength).toBe("empty");
    expect(run.notice).toContain("no viewing history");
    expect(run.sections.every((s) => s.kind === "cold_start")).toBe(true);
    expect(allItems(run).length).toBeGreaterThan(0);

    // It must not claim to know the user.
    const text = run.sections.map((s) => s.reason).join(" ");
    expect(text).toContain("Not personalized");
  });

  it("still personalizes a one-title library, with low confidence", async () => {
    const { run } = await runRecommendationEngine(
      signalData([
        entry({
          externalId: "500",
          title: "Blade Runner 2049",
          rating: 10,
          genres: ["Thriller"],
        }),
      ]),
      fakeCatalog(world()),
      { now: NOW },
    );

    expect(run.mode).toBe("personalized");
    expect(run.profile.signalStrength).toBe("sparse");
    expect(run.profile.confidence).toBeLessThan(0.2);
    expect(allItems(run).length).toBeGreaterThan(0);
  });

  it("reports unavailability instead of failing when no catalog is configured", async () => {
    const { run } = await runRecommendationEngine(
      thrillerLibrary(),
      fakeCatalog({ configured: false }),
      { now: NOW },
    );

    expect(run.mode).toBe("unavailable");
    expect(run.sections).toEqual([]);
    expect(run.notice).toContain("not configured");
  });

  it("degrades to a labelled notice when every catalog title is already watched", async () => {
    // A catalog whose entire content is in the library: the personalized lanes
    // and the generic fallback both come back empty after exclusion, which is
    // the honest answer rather than recommending titles back to the user.
    const data = thrillerLibrary();
    const owned = data.entries.map((e) =>
      summary({ id: e.external_id, title: e.title, mediaType: e.media_type }),
    );

    const { run } = await runRecommendationEngine(
      data,
      fakeCatalog({ configured: true, lists: { trending: owned } }),
      { now: NOW },
    );

    expect(run.mode).toBe("personalized");
    expect(run.notice).toContain("general picks");
    expect(allItems(run)).toEqual([]);
  });

  it("still excludes owned titles when the library produces no signal at all", async () => {
    // Every entry archived: no behavioural weight, so the run is cold start —
    // but the user has still seen these titles.
    const archived = [
      entry({ externalId: "900", title: "Archived One", status: "archived" }),
      entry({ externalId: "901", title: "Archived Two", status: "archived" }),
    ];

    const { run } = await runRecommendationEngine(
      signalData(archived),
      fakeCatalog({
        configured: true,
        lists: {
          trending: [
            summary({ id: "900", title: "Archived One" }),
            summary({ id: "902", title: "Something New" }),
          ],
        },
      }),
      { now: NOW },
    );

    expect(run.mode).toBe("cold_start");
    const keys = allItems(run).map((i) => i.key);
    expect(keys).not.toContain("movie:900");
    expect(keys).toContain("movie:902");
  });

  it("survives a library whose rows carry no genre metadata", async () => {
    const bare = entry({ externalId: "500", title: "Blade Runner 2049", rating: 10 });
    bare.metadata = {};

    const { run } = await runRecommendationEngine(
      signalData([bare]),
      fakeCatalog(world()),
      { now: NOW },
    );

    // Genres came from the enrichment call, not from the library row.
    expect(run.profile.genres.map((g) => g.key)).toContain("Thriller");
  });
});

/* -------------------------------------------------------------------------- */
/* Diversity of the assembled feed                                            */
/* -------------------------------------------------------------------------- */

describe("feed composition", () => {
  it("does not let one franchise or genre dominate the top section", async () => {
    const { run } = await runRecommendationEngine(
      thrillerLibrary(),
      fakeCatalog(world()),
      { now: NOW },
    );

    const top = run.sections.find((s) => s.kind === "top_picks")!;
    const counts = new Map<string, number>();
    for (const item of top.items) {
      for (const id of item.media.genreIds ?? []) {
        counts.set(id, (counts.get(id) ?? 0) + 1);
      }
    }
    const largest = Math.max(...counts.values());
    expect(largest / top.items.length).toBeLessThanOrEqual(0.6);
  });

  it("reports diversity for an assembled selection", () => {
    expect(describeDiversity([])).toEqual({
      count: 0,
      genres: 0,
      decades: 0,
      languages: 0,
      movieShare: 0,
      topGenreShare: 0,
      topAnchorShare: 0,
    });
  });
});
