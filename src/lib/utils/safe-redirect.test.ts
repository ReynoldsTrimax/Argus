import { describe, expect, it } from "vitest";

import { safeNextPath, safeRedirectUrl } from "./safe-redirect";

/**
 * These are the payloads the previous `next.startsWith("/")` check let through.
 * Each one is a real open-redirect vector, not a hypothetical.
 */
describe("safeNextPath — rejects off-origin targets", () => {
  it("rejects protocol-relative URLs", () => {
    // The bug this replaces: "//evil.com" starts with "/" but a Location header
    // of "//evil.com" keeps the scheme and swaps the host.
    expect(safeNextPath("//evil.com")).toBe("/dashboard");
    expect(safeNextPath("//evil.com/login")).toBe("/dashboard");
    expect(safeNextPath("///evil.com")).toBe("/dashboard");
  });

  it("rejects backslash variants browsers normalise to slashes", () => {
    expect(safeNextPath("/\\evil.com")).toBe("/dashboard");
    expect(safeNextPath("\\\\evil.com")).toBe("/dashboard");
    expect(safeNextPath("/\\/evil.com")).toBe("/dashboard");
  });

  it("rejects absolute URLs", () => {
    expect(safeNextPath("https://evil.com")).toBe("/dashboard");
    expect(safeNextPath("http://evil.com")).toBe("/dashboard");
    expect(safeNextPath("HTTPS://evil.com")).toBe("/dashboard");
  });

  it("rejects non-http schemes", () => {
    expect(safeNextPath("javascript:alert(1)")).toBe("/dashboard");
    expect(safeNextPath("data:text/html,<script>alert(1)</script>")).toBe("/dashboard");
    expect(safeNextPath("/javascript:alert(1)")).toBe("/dashboard");
  });

  it("rejects a scheme smuggled into the first path segment", () => {
    expect(safeNextPath("/mailto:a@b.c")).toBe("/dashboard");
  });

  it("strips control characters used for header injection", () => {
    // searchParams.get() percent-decodes, so real CR/LF can arrive here. After
    // stripping them the residue contains a colon in the first segment, so the
    // target is rejected outright rather than forwarded as a mangled path.
    expect(safeNextPath("/dashboard\r\nSet-Cookie: a=b")).toBe("/dashboard");
    expect(safeNextPath("//evil.com\r\n")).toBe("/dashboard");
    // A control character inside an otherwise valid path is simply removed.
    expect(safeNextPath("/lib\u0000rary")).toBe("/library");
  });

  it("rejects empty, blank and non-string input", () => {
    expect(safeNextPath("")).toBe("/dashboard");
    expect(safeNextPath("   ")).toBe("/dashboard");
    expect(safeNextPath(null)).toBe("/dashboard");
    expect(safeNextPath(undefined)).toBe("/dashboard");
    expect(safeNextPath(42 as unknown as string)).toBe("/dashboard");
  });

  it("rejects bare relative paths that are not rooted", () => {
    expect(safeNextPath("dashboard")).toBe("/dashboard");
    expect(safeNextPath("evil.com")).toBe("/dashboard");
  });
});

describe("safeNextPath — preserves legitimate targets", () => {
  it("keeps ordinary in-app paths", () => {
    expect(safeNextPath("/library")).toBe("/library");
    expect(safeNextPath("/tv/1396")).toBe("/tv/1396");
    expect(safeNextPath("/u/someone")).toBe("/u/someone");
    expect(safeNextPath("/recommendations")).toBe("/recommendations");
  });

  it("keeps query strings and fragments, which carry real state", () => {
    expect(safeNextPath("/movies?section=top_rated")).toBe("/movies?section=top_rated");
    expect(safeNextPath("/tv?sort=vote_average.desc&genre=99")).toBe(
      "/tv?sort=vote_average.desc&genre=99",
    );
    expect(safeNextPath("/settings#privacy")).toBe("/settings#privacy");
  });

  it("honours a caller-supplied fallback", () => {
    expect(safeNextPath("//evil.com", "/login")).toBe("/login");
    expect(safeNextPath(null, "/")).toBe("/");
  });
});

describe("safeRedirectUrl", () => {
  it("keeps a sanitised path on the supplied origin", () => {
    expect(safeRedirectUrl("https://argus.app", "/library")).toBe(
      "https://argus.app/library",
    );
  });

  it("cannot be pushed off the origin", () => {
    expect(safeRedirectUrl("https://argus.app", "//evil.com")).toBe(
      "https://argus.app/dashboard",
    );
    expect(safeRedirectUrl("https://argus.app", "https://evil.com")).toBe(
      "https://argus.app/dashboard",
    );
    expect(safeRedirectUrl("https://argus.app", "/\\evil.com")).toBe(
      "https://argus.app/dashboard",
    );
  });

  it("never produces a URL whose host differs from the origin", () => {
    const payloads = [
      "//evil.com",
      "/\\evil.com",
      "https://evil.com",
      "\\\\evil.com",
      "///evil.com",
      "javascript:alert(1)",
    ];
    for (const payload of payloads) {
      const result = safeRedirectUrl("https://argus.app", payload);
      expect(new URL(result).host).toBe("argus.app");
    }
  });
});
