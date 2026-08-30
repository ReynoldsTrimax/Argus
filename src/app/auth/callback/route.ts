import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { safeRedirectUrl } from "@/lib/utils/safe-redirect";
import { ROUTES } from "@/constants/routes";

/**
 * OAuth / email confirmation callback.
 * Exchanges the auth code for a session and redirects into the app.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Concatenating to `origin` already keeps this on-host, but `next` is
      // attacker-supplied and the same sanitiser is used here so both auth
      // redirect paths behave identically and neither can drift.
      return NextResponse.redirect(safeRedirectUrl(origin, next, ROUTES.dashboard));
    }
  }

  return NextResponse.redirect(`${origin}${ROUTES.login}?error=auth_callback`);
}
