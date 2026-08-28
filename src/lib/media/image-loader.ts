/**
 * Custom Next.js image loader.
 *
 * Vercel Image Optimization is bypassed deliberately: on free/hobby plans it
 * can return 402 (OPTIMIZED_IMAGE_REQUEST_PAYMENT_REQUIRED) and break every
 * poster and backdrop in production. TMDB's own CDN already resizes, so we ask
 * it for the width Next actually needs.
 *
 * TMDB only serves a fixed set of size segments — anything else returns
 * `400 <h1>Image size not supported</h1>` — so a requested width is snapped up
 * to the next supported bucket rather than passed through.
 *
 * Verified against https://image.tmdb.org/t/p/<size>/<file>.jpg: w45, w92,
 * w154, w185, w300, w342, w500 and w780 all serve image/jpeg; w1280 does too.
 * Sizes outside this list (w96, w256, w640, w828, w1080, w3840) return 400.
 */

const TMDB_PATH = /^(https?:\/\/image\.tmdb\.org\/t\/p\/)[^/]+(\/.+)$/;

/** Supported TMDB width buckets, ascending. */
const TMDB_WIDTHS = [45, 92, 154, 185, 300, 342, 500, 780, 1280] as const;

/**
 * Largest bucket we will ever request. `original` is deliberately never used —
 * source files run to several megabytes and no layout on the site needs them.
 */
const TMDB_MAX_WIDTH = 1280;

export default function imageLoader({
  src,
  width,
}: {
  src: string;
  width: number;
  quality?: number;
}): string {
  const match = TMDB_PATH.exec(src);

  // Non-TMDB sources (Supabase storage, local /public) have no resizing origin
  // to talk to, so they are served exactly as given.
  if (!match) return src;

  const [, base, filePath] = match;
  const bucket = TMDB_WIDTHS.find((w) => w >= width) ?? TMDB_MAX_WIDTH;

  return `${base}w${bucket}${filePath}`;
}
