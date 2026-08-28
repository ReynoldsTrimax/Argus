import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import type { Database } from "@/types/database";
import { AUTH_ROUTES, PROTECTED_ROUTES, ROUTES } from "@/constants/routes";
import { createTimeoutFetch, withAuthBudget } from "@/lib/supabase/fetch";

/**
 * Hard ceiling for the whole session check, including any retries the Supabase
 * SDK performs internally.
 *
 * A per-request `fetch` timeout is not sufficient on its own: supabase-js
 * retries retryable transport failures with exponential backoff, so one
 * invocation can chain several attempts and blow past the platform's middleware
 * execution limit. On Vercel that surfaces as `MIDDLEWARE_INVOCATION_TIMEOUT`
 * (504) on *every* route, because this runs for every matched request — an auth
 * outage takes the whole site down, not just sign-in.
 */
const AUTH_CHECK_BUDGET_MS = 2_500;

/**
 * Refreshes the Supabase session and enforces route protection.
 * Invoked from the root proxy on every matched request.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Allow local boot without env (landing page still works).
  if (!url || !anonKey) {
    return supabaseResponse;
  }

  const supabase = createServerClient<Database>(url, anonKey, {
    // Kept below AUTH_CHECK_BUDGET_MS so a single attempt can fail and be
    // handled inside the budget rather than being cut off by it.
    global: { fetch: createTimeoutFetch(2_000) },
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  // IMPORTANT: avoid writing logic between createServerClient and getUser().
  // A simple getSession() is not enough for security — getUser() revalidates.
  //
  // A revalidation failure must not throw or stall: that would turn an auth
  // outage into a 504 on every route. It resolves to "no user" instead, which
  // keeps authorization failing *closed* (protected routes still redirect to
  // login) while leaving public and auth routes reachable so the UI can explain.
  const user = await withAuthBudget(
    async () => (await supabase.auth.getUser()).data.user,
    null,
    AUTH_CHECK_BUDGET_MS,
  );

  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
  const isAuthRoute = AUTH_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );

  if (isProtected && !user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = ROUTES.login;
    redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (isAuthRoute && user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = ROUTES.dashboard;
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  return supabaseResponse;
}
