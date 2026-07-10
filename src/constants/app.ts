/**
 * Application-level constants.
 */
export const APP_NAME = "Argus";
export const APP_TAGLINE = "See everything you watch";
export const APP_DESCRIPTION =
  "Discover, organize, track, and understand every movie, show, and series — in one calm, cinematic place.";

/** Default metadata for SEO and social sharing. */
export const APP_METADATA = {
  name: APP_NAME,
  tagline: APP_TAGLINE,
  description: APP_DESCRIPTION,
  locale: "en_US",
} as const;

/** Layout measurements (mirrored in CSS variables). */
export const LAYOUT = {
  headerHeight: 56,
  sidebarWidth: 240,
  sidebarCollapsedWidth: 64,
  contentMaxWidth: 1440,
} as const;

/** Local storage keys for client-persisted preferences. */
export const STORAGE_KEYS = {
  sidebarCollapsed: "argus:sidebar-collapsed",
  commandRecent: "argus:command-recent",
  animationIntensity: "argus:animation-intensity",
  posterDensity: "argus:poster-density",
  pinnedSearches: "argus:pinned-searches",
} as const;
