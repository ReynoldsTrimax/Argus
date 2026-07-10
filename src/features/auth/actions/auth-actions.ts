"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { createClient } from "@/lib/supabase/server";
import { loginSchema, signupSchema } from "@/lib/validations/auth";
import { ROUTES } from "@/constants/routes";
import type { ActionResult, OAuthProvider } from "@/types";

function getOriginFromHeaders(headerStore: Headers): string {
  const origin = headerStore.get("origin");
  if (origin) return origin;
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
  const proto = headerStore.get("x-forwarded-proto") ?? "http";
  return host ? `${proto}://${host}` : "http://localhost:3000";
}

/**
 * Email + password sign in.
 */
export async function signInWithPassword(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      success: false,
      error: "Please check your credentials.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  const next = (formData.get("next") as string) || ROUTES.dashboard;
  revalidatePath("/", "layout");
  redirect(next.startsWith("/") ? next : ROUTES.dashboard);
}

/**
 * Email + password registration. Profile rows are created by DB trigger.
 */
export async function signUpWithPassword(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = signupSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
    displayName: formData.get("displayName"),
  });

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const headerStore = await headers();
  const origin = getOriginFromHeaders(headerStore);
  const supabase = await createClient();

  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${origin}${ROUTES.authCallback}`,
      data: {
        full_name: parsed.data.displayName,
        name: parsed.data.displayName,
      },
    },
  });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/", "layout");
  redirect(ROUTES.dashboard);
}

/**
 * OAuth sign-in (Google / GitHub). Returns the provider URL for client redirect.
 */
export async function signInWithOAuth(
  provider: OAuthProvider,
): Promise<ActionResult<{ url: string }>> {
  const headerStore = await headers();
  const origin = getOriginFromHeaders(headerStore);
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${origin}${ROUTES.authCallback}`,
    },
  });

  if (error || !data.url) {
    return { success: false, error: error?.message ?? "Unable to start OAuth flow." };
  }

  return { success: true, data: { url: data.url } };
}

/**
 * Sign out and return to the marketing home page.
 */
export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect(ROUTES.home);
}
