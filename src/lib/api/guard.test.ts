import { describe, expect, it } from "vitest";

import { RATE_LIMITS, checkRateLimit } from "./guard";

/**
 * `checkRateLimit` takes `now` so these are exact rather than timing-dependent.
 * Keys are unique per test because the window map is module-level state.
 */
describe("checkRateLimit", () => {
  it("allows requests up to the limit and rejects the next one", () => {
    const key = "user-a";
    for (let i = 0; i < 3; i++) {
      expect(checkRateLimit("t1", key, 3, 60_000, 1_000).ok).toBe(true);
    }
    const blocked = checkRateLimit("t1", key, 3, 60_000, 1_000);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("keeps separate counters per user, so one account cannot lock out another", () => {
    for (let i = 0; i < 3; i++) {
      checkRateLimit("t2", "noisy", 3, 60_000, 1_000);
    }
    expect(checkRateLimit("t2", "noisy", 3, 60_000, 1_000).ok).toBe(false);
    // A different account is unaffected.
    expect(checkRateLimit("t2", "quiet", 3, 60_000, 1_000).ok).toBe(true);
  });

  it("keeps separate counters per bucket, so routes do not share a budget", () => {
    checkRateLimit("bucketA", "user-c", 1, 60_000, 1_000);
    expect(checkRateLimit("bucketA", "user-c", 1, 60_000, 1_000).ok).toBe(false);
    expect(checkRateLimit("bucketB", "user-c", 1, 60_000, 1_000).ok).toBe(true);
  });

  it("resets once the window has elapsed", () => {
    checkRateLimit("t3", "user-d", 1, 60_000, 1_000);
    expect(checkRateLimit("t3", "user-d", 1, 60_000, 1_000).ok).toBe(false);
    // One millisecond past the window boundary.
    expect(checkRateLimit("t3", "user-d", 1, 60_000, 61_001).ok).toBe(true);
  });

  it("reports a retry delay bounded by the window", () => {
    checkRateLimit("t4", "user-e", 1, 60_000, 0);
    const blocked = checkRateLimit("t4", "user-e", 1, 60_000, 30_000);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
    expect(blocked.retryAfterSeconds).toBeLessThanOrEqual(60);
  });
});

describe("RATE_LIMITS", () => {
  it("sits far above real client behaviour", () => {
    // The palette debounces at 220ms and caches for 30s, so sustained human
    // typing cannot approach these. A limit low enough to interrupt a real user
    // would be worse than the abuse it prevents.
    expect(RATE_LIMITS.search.limit).toBeGreaterThanOrEqual(30);
    expect(RATE_LIMITS.trending.limit).toBeGreaterThanOrEqual(10);
    expect(RATE_LIMITS.season.limit).toBeGreaterThanOrEqual(30);

    for (const config of Object.values(RATE_LIMITS)) {
      expect(config.windowMs).toBeGreaterThan(0);
      expect(config.limit).toBeGreaterThan(0);
    }
  });
});
