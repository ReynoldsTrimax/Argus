import { describe, expect, it } from "vitest";

import { TtlCache } from "./cache";

describe("TtlCache", () => {
  it("calls the loader once for repeated hits inside the TTL", async () => {
    const cache = new TtlCache();
    let calls = 0;

    const load = async () => {
      calls += 1;
      return "value";
    };

    expect(await cache.resolve("k", 1000, load)).toBe("value");
    expect(await cache.resolve("k", 1000, load)).toBe("value");
    expect(calls).toBe(1);
  });

  it("shares one in-flight request between concurrent callers", async () => {
    const cache = new TtlCache();
    let calls = 0;

    const load = async () => {
      calls += 1;
      await new Promise((resolve) => setTimeout(resolve, 5));
      return calls;
    };

    const [a, b, c] = await Promise.all([
      cache.resolve("k", 1000, load),
      cache.resolve("k", 1000, load),
      cache.resolve("k", 1000, load),
    ]);

    expect(calls).toBe(1);
    expect([a, b, c]).toEqual([1, 1, 1]);
  });

  it("reloads once the TTL has passed", async () => {
    const cache = new TtlCache();
    let calls = 0;
    const load = async () => {
      calls += 1;
      return calls;
    };

    expect(await cache.resolve("k", 1, load)).toBe(1);
    await new Promise((resolve) => setTimeout(resolve, 5));
    expect(await cache.resolve("k", 1, load)).toBe(2);
  });

  it("does not cache a failure — a transient timeout must not blank a lane", async () => {
    const cache = new TtlCache();
    let calls = 0;

    const load = async () => {
      calls += 1;
      if (calls === 1) throw new Error("timeout");
      return "recovered";
    };

    await expect(cache.resolve("k", 1000, load)).rejects.toThrow("timeout");
    expect(await cache.resolve("k", 1000, load)).toBe("recovered");
  });

  it("evicts the least recently used entry when full", async () => {
    const cache = new TtlCache(2);

    await cache.resolve("a", 1000, async () => 1);
    await cache.resolve("b", 1000, async () => 2);
    // Touch "a" so "b" becomes the eviction target.
    await cache.resolve("a", 1000, async () => 1);
    await cache.resolve("c", 1000, async () => 3);

    expect(cache.size()).toBe(2);

    let bReloads = 0;
    await cache.resolve("b", 1000, async () => {
      bReloads += 1;
      return 2;
    });
    expect(bReloads).toBe(1);
  });
});
