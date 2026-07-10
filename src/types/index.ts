/**
 * Shared application types.
 */

export type {
  Database,
  Profile,
  UserSettings,
  UserPreferences,
  ThemePreference,
  DensityPreference,
  Json,
} from "./database";

export type * from "./media";

/** Result type for server actions and service methods. */
export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };

/** Async status for UI feedback. */
export type AsyncStatus = "idle" | "loading" | "success" | "error";

/** Generic option shape for selects / command palette. */
export interface SelectOption<T extends string = string> {
  label: string;
  value: T;
  description?: string;
  disabled?: boolean;
}

/** Auth provider identifiers supported by Supabase OAuth. */
export type OAuthProvider = "google" | "github";
