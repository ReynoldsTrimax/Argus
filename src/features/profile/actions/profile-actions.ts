"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { profileUpdateSchema } from "@/lib/validations/profile";
import { ROUTES } from "@/constants/routes";
import type { ActionResult } from "@/types";

/**
 * Update the authenticated user's profile.
 */
export async function updateProfile(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = profileUpdateSchema.safeParse({
    username: formData.get("username"),
    displayName: formData.get("displayName"),
    bio: formData.get("bio") || "",
    website: formData.get("website") || "",
    isPublic: formData.get("isPublic") === "true",
  });

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be signed in." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      username: parsed.data.username,
      display_name: parsed.data.displayName,
      bio: parsed.data.bio || null,
      website: parsed.data.website || null,
      is_public: parsed.data.isPublic,
    })
    .eq("id", user.id);

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "That username is already taken." };
    }
    return { success: false, error: error.message };
  }

  revalidatePath(ROUTES.profile);
  revalidatePath(ROUTES.dashboard);
  return { success: true, data: undefined };
}
