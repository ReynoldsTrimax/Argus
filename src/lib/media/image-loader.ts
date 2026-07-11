/**
 * Custom Next.js image loader — serves remote URLs directly.
 * Avoids Vercel Image Optimization (which can return 402 on free/usage limits
 * and break every poster/backdrop on production).
 */
export default function imageLoader({
  src,
}: {
  src: string;
  width: number;
  quality?: number;
}): string {
  return src;
}
