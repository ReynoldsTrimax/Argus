import { createClient } from "@/lib/supabase/server";
import type { Profile, UserPreferences, UserSettings } from "@/types";

/**
 * Server-side user data access.
 * Keeps Supabase queries out of page components for cleaner composition.
 */

export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
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
