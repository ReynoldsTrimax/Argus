/**
 * In-page anchors for the landing page, shared by the marketing header (large
 * screens) and the footer (every screen — the header nav collapses below `lg`,
 * so the footer is where small screens get section navigation).
 */
export const LANDING_SECTIONS = [
  { href: "#premise", label: "Premise" },
  { href: "#capabilities", label: "Capabilities" },
  { href: "#intelligence", label: "Intelligence" },
  { href: "#library", label: "Library" },
] as const;
