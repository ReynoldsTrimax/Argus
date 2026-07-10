/**
 * Canonical keyboard shortcuts for Argus.
 * Documented in docs/keyboard-shortcuts.md and Settings UI.
 */

import { ROUTES } from "@/constants/routes";

export interface ShortcutDefinition {
  id: string;
  keys: string[];
  description: string;
  /** Chord sequence like g then d */
  sequence?: string[];
  href?: string;
  action?: "command" | "search" | "theme" | "sidebar";
}

export const SHORTCUTS: readonly ShortcutDefinition[] = [
  {
    id: "command",
    keys: ["⌘", "K"],
    description: "Open command palette / search",
    action: "command",
  },
  {
    id: "search",
    keys: ["/"],
    description: "Focus search (command palette)",
    action: "search",
  },
  {
    id: "dashboard",
    keys: ["G", "D"],
    description: "Go to Home dashboard",
    sequence: ["g", "d"],
    href: ROUTES.dashboard,
  },
  {
    id: "library",
    keys: ["G", "L"],
    description: "Go to Library",
    sequence: ["g", "l"],
    href: ROUTES.library,
  },
  {
    id: "collections",
    keys: ["G", "C"],
    description: "Go to Collections",
    sequence: ["g", "c"],
    href: ROUTES.collections,
  },
  {
    id: "discover",
    keys: ["G", "X"],
    description: "Go to Discover",
    sequence: ["g", "x"],
    href: ROUTES.discover,
  },
  {
    id: "stats",
    keys: ["G", "S"],
    description: "Go to Statistics",
    sequence: ["g", "s"],
    href: ROUTES.stats,
  },
  {
    id: "settings",
    keys: ["G", ","],
    description: "Go to Settings",
    sequence: ["g", ","],
    href: ROUTES.settings,
  },
  {
    id: "profile",
    keys: ["G", "P"],
    description: "Go to Profile",
    sequence: ["g", "p"],
    href: ROUTES.profile,
  },
  {
    id: "watchlist",
    keys: ["G", "W"],
    description: "Go to Watchlist",
    sequence: ["g", "w"],
    href: ROUTES.watchlist,
  },
  {
    id: "escape",
    keys: ["Esc"],
    description: "Close modal / command palette",
  },
] as const;
