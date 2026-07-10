import { describe, expect, it } from "vitest";

import {
  formatRuntime,
  formatVote,
  formatYear,
  youtubeBackgroundEmbedUrl,
  youtubeEmbedUrl,
} from "@/lib/media/format";

describe("media formatters", () => {
  it("formats runtime", () => {
    expect(formatRuntime(125)).toBe("2h 5m");
    expect(formatRuntime(45)).toBe("45m");
    expect(formatRuntime(null)).toBeNull();
  });

  it("formats year and vote", () => {
    expect(formatYear("2014-11-07")).toBe("2014");
    expect(formatVote(8.456)).toBe("8.5");
  });

  it("builds youtube embed urls", () => {
    expect(youtubeEmbedUrl("abc123")).toContain("abc123");
  });

  it("builds muted looping background embed urls", () => {
    const url = youtubeBackgroundEmbedUrl("trailerKey");
    expect(url).toContain("trailerKey");
    expect(url).toContain("autoplay=1");
    expect(url).toContain("mute=1");
    expect(url).toContain("loop=1");
    expect(url).toContain("playlist=trailerKey");
  });
});

