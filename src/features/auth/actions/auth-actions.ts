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

/** Message shown when Supabase credentials are absent or malformed. */
const AUTH_UNCONFIGURED =
  "Authentication isn't configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local, then restart the dev server.";

/**
 * Builds a Supabase client, converting a configuration failure into a value.
 *
 * `getServerEnv()` throws when the Supabase keys are missing. Inside a Server
 * Action that throw becomes a 500, and the root error boundary replaces the
 * whole sign-in card — so the single piece of information the person needs
 * (which variable is unset) is the one thing they cannot see, and the failure
 * looks identical to a wrong password. Returning it instead keeps them on the
 * form with an actionable message.
 */
async function createAuthClient(): Promise<
  { ok: true; client: Awaited<ReturnType<typeof createClient>> } | { ok: false; error: string }
> {
  try {
    return { ok: true, client: await createClient() };
  } catch (error) {
    console.error(
      "[auth] Supabase client could not be created — check .env.local:",
      error instanceof Error ? error.message : error,
    );
    return { ok: false, error: AUTH_UNCONFIGURED };
  }
}

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

  const client = await createAuthClient();
  if (!client.ok) {
    return { success: false, error: client.error };
  }

  const attempt = await withAuthTransport(() =>
    client.client.auth.signInWithPassword({
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

  const client = await createAuthClient();
  if (!client.ok) {
    return { success: false, error: client.error };
  }

  const attempt = await withAuthTransport(() =>
    client.client.auth.signUp({
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

  const client = await createAuthClient();
  if (!client.ok) {
    return { success: false, error: client.error };
  }

  const { data, error } = await client.client.auth.signInWithOAuth({
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
  // A misconfigured or unreachable auth service must not trap the user inside
  // the app: clearing the session is best-effort, leaving is not. `redirect`
  // stays outside the guard because it signals via a thrown control-flow error.
  const client = await createAuthClient();
  if (client.ok) {
    await client.client.auth.signOut().catch((error: unknown) => {
      console.error("[auth] Sign-out call failed; redirecting anyway:", error);
    });
  }

  revalidatePath("/", "layout");
  redirect(ROUTES.home);
}
