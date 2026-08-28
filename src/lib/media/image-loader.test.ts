import { describe, expect, it } from "vitest";

import imageLoader from "./image-loader";

const POSTER = "https://image.tmdb.org/t/p/w342/xTZuh9ziUjIyHBWO9OvqNIPqVWe.jpg";

/**
 * TMDB rejects any size segment outside this list with
 * `400 <h1>Image size not supported</h1>`, so the loader must only ever emit
 * one of these.
 */
const SUPPORTED = [45, 92, 154, 185, 300, 342, 500, 780, 1280];

describe("imageLoader", () => {
  it("snaps a requested width up to the next supported TMDB bucket", () => {
    expect(imageLoader({ src: POSTER, width: 40 })).toContain("/t/p/w45/");
    expect(imageLoader({ src: POSTER, width: 100 })).toContain("/t/p/w154/");
    expect(imageLoader({ src: POSTER, width: 185 })).toContain("/t/p/w185/");
    expect(imageLoader({ src: POSTER, width: 400 })).toContain("/t/p/w500/");
  });

  it("never emits a size TMDB does not serve", () => {
    for (let width = 1; width <= 4000; width += 7) {
      const out = imageLoader({ src: POSTER, width });
      const size = out.match(/\/t\/p\/w(\d+)\//)?.[1];
      expect(size, `width ${width} produced ${out}`).toBeDefined();
      expect(SUPPORTED).toContain(Number(size));
    }
  });

  it("caps at w1280 rather than falling back to original", () => {
    expect(imageLoader({ src: POSTER, width: 1281 })).toContain("/t/p/w1280/");
    expect(imageLoader({ src: POSTER, width: 4000 })).toContain("/t/p/w1280/");
    expect(imageLoader({ src: POSTER, width: 4000 })).not.toContain("original");
  });

  it("replaces the incoming size segment instead of appending to it", () => {
    const out = imageLoader({ src: POSTER, width: 800 });
    expect(out).toBe("https://image.tmdb.org/t/p/w1280/xTZuh9ziUjIyHBWO9OvqNIPqVWe.jpg");
    expect(out).not.toContain("w342");
  });

  it("differs from the input so Next does not flag a width-ignoring loader", () => {
    // Next probes the loader with the real src at width 400 and warns when the
    // result is byte-identical. See get-img-props.ts.
    expect(imageLoader({ src: POSTER, width: 400 })).not.toBe(POSTER);
  });

  it("passes through sources with no resizing origin", () => {
    const supabase =
      "https://abc.supabase.co/storage/v1/object/public/avatars/user.png";
    expect(imageLoader({ src: supabase, width: 200 })).toBe(supabase);
    expect(imageLoader({ src: "/icons/icon-192.png", width: 192 })).toBe(
      "/icons/icon-192.png",
    );
  });

  it("leaves non-width TMDB segments alone when the URL shape does not match", () => {
    const other = "https://example.com/t/p/w342/x.jpg";
    expect(imageLoader({ src: other, width: 400 })).toBe(other);
  });
});
