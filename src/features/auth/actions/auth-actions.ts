"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { createClient } from "@/lib/supabase/server";
import { isAuthCircuitOpen, isTimeoutError } from "@/lib/supabase/fetch";
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

/** Message shown when the auth service accepts a connection but never replies. */
const AUTH_UNREACHABLE =
  "Can't reach the authentication service. It may be paused or restarting — check your Supabase project status, then try again.";

/**
 * Runs a Supabase auth call and normalises transport failures.
 *
 * Two shapes have to be handled. A bare `fetch` rejection propagates as a throw,
 * but supabase-js catches most of them and *returns* `AuthRetryableFetchError`
 * instead — so checking only for thrown errors silently lets a raw
 * "The operation was aborted due to timeout" reach the user. Both paths collapse
 * to one actionable message here.
 */
async function withAuthTransport<T extends { error: unknown }>(
  operation: () => Promise<T>,
): Promise<{ ok: true; value: T } | { ok: false; error: string }> {
  let result: T;

  try {
    result = await operation();
  } catch (error) {
    // The circuit breaker in lib/supabase/fetch already logged the outage once.
    if (isTimeoutError(error)) {
      return { ok: false, error: AUTH_UNREACHABLE };
    }
    throw error;
  }

  if (result.error && isTimeoutError(result.error)) {
    return { ok: false, error: AUTH_UNREACHABLE };
  }

  return { ok: true, value: result };
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
  const attempt = await withAuthTransport(() =>
    supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    }),
  );

  if (!attempt.ok) {
    return { success: false, error: attempt.error };
  }

  const { error } = attempt.value;

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

  const attempt = await withAuthTransport(() =>
    supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${origin}${ROUTES.authCallback}`,
        data: {
          full_name: parsed.data.displayName,
          name: parsed.data.displayName,
        },
      },
    }),
  );

  if (!attempt.ok) {
    return { success: false, error: attempt.error };
  }

  const { error } = attempt.value;

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/", "layout");
  redirect(ROUTES.dashboard);
}

/**
 * OAuth sign-in. Returns the provider URL for client redirect.
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

  if (error) {
    return {
      success: false,
      error: isTimeoutError(error) ? AUTH_UNREACHABLE : error.message,
    };
  }

  if (!data.url) {
    return { success: false, error: "Unable to start OAuth flow." };
  }

  // The generated URL points at the same auth service. Sending the browser
  // there while it is unresponsive would replace a readable error with a blank
  // hanging tab, so refuse early instead.
  if (isAuthCircuitOpen()) {
    return { success: false, error: AUTH_UNREACHABLE };
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
