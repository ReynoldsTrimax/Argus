"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { settingsUpdateSchema } from "@/lib/validations/settings";
import { ROUTES } from "@/constants/routes";
import type { ActionResult } from "@/types";

/**
 * Update authenticated user settings.
 */
export async function updateSettings(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = settingsUpdateSchema.safeParse({
    theme: "dark",
    density: formData.get("density"),
    language: formData.get("language"),
    emailNotifications: formData.get("emailNotifications") === "true",
    marketingEmails: formData.get("marketingEmails") === "true",
    reducedMotion: formData.get("reducedMotion") === "true",
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
    .from("user_settings")
    .update({
      theme: "dark",
      density: parsed.data.density,
      language: parsed.data.language,
      email_notifications: parsed.data.emailNotifications,
      marketing_emails: parsed.data.marketingEmails,
      reduced_motion: parsed.data.reducedMotion,
    })
    .eq("user_id", user.id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(ROUTES.settings);
  return { success: true, data: undefined };
}
