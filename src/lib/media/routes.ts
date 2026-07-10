/**
 * Canonical media URL builders — keep routing out of provider mappers.
 */

export function mediaHref(
  kind: "movie" | "tv" | "person" | "collection" | "genre",
  id: string | number,
): string {
  switch (kind) {
    case "movie":
      return `/movie/${id}`;
    case "tv":
      return `/tv/${id}`;
    case "person":
      return `/person/${id}`;
    case "collection":
      return `/collection/${id}`;
    case "genre":
      return `/genre/${id}`;
    default:
      return "/discover";
  }
}
