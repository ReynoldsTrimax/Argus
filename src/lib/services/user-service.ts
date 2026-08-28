import { createClient } from "@/lib/supabase/server";
import { withAuthBudget } from "@/lib/supabase/fetch";
import type { Profile, UserPreferences, UserSettings } from "@/types";

/**
 * Server-side user data access.
 * Keeps Supabase queries out of page components for cleaner composition.
 */

/**
 * The signed-in user, or `null`.
 *
 * Bounded by a total-time budget: this runs in ~20 render paths (including the
 * public marketing layout), and an unresponsive auth service would otherwise
 * stall each of them for as long as the Supabase SDK keeps retrying. Treating a
 * stalled check as "signed out" degrades to the public view instead of hanging.
 */
export async function getCurrentUser() {
  return withAuthBudget(async () => {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    return user;
  }, null);
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("getProfile error:", error.message);
    return null;
  }

  return data;
}

export async function getUserSettings(userId: string): Promise<UserSettings | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("getUserSettings error:", error.message);
    return null;
  }

  return data;
}

export async function getUserPreferences(
  userId: string,
): Promise<UserPreferences | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_preferences")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("getUserPreferences error:", error.message);
    return null;
  }

  return data;
}

/**
 * Bundled load for app shell hydration.
 */
export async function getSessionContext() {
  const user = await getCurrentUser();
  if (!user) {
    return { user: null, profile: null, settings: null, preferences: null };
  }

  const [profile, settings, preferences] = await Promise.all([
    getProfile(user.id),
    getUserSettings(user.id),
    getUserPreferences(user.id),
  ]);

  return { user, profile, settings, preferences };
}
