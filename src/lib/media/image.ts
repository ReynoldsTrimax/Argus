/**
 * Media image URL helpers.
 * Paths are provider-relative; currently resolved against TMDB CDN.
 * Swap IMAGE_BASE if another CDN becomes primary.
 */

const IMAGE_BASE = "https://image.tmdb.org/t/p";

export type PosterSize = "w92" | "w154" | "w185" | "w342" | "w500" | "w780" | "original";
export type BackdropSize = "w300" | "w780" | "w1280" | "original";
export type ProfileSize = "w45" | "w185" | "h632" | "original";
export type LogoSize = "w45" | "w92" | "w154" | "w185" | "w300" | "w500" | "original";
export type StillSize = "w92" | "w185" | "w300" | "original";

export function mediaImageUrl(
  path: string | null | undefined,
  size: string = "w500",
): string | null {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${IMAGE_BASE}/${size}${path.startsWith("/") ? path : `/${path}`}`;
}

export function posterUrl(path: string | null | undefined, size: PosterSize = "w342") {
  return mediaImageUrl(path, size);
}

export function backdropUrl(
  path: string | null | undefined,
  size: BackdropSize = "w1280",
) {
  return mediaImageUrl(path, size);
}

export function profileUrl(path: string | null | undefined, size: ProfileSize = "w185") {
  return mediaImageUrl(path, size);
}

export function logoUrl(path: string | null | undefined, size: LogoSize = "w300") {
  return mediaImageUrl(path, size);
}

export function stillUrl(path: string | null | undefined, size: StillSize = "w300") {
  return mediaImageUrl(path, size);
}
