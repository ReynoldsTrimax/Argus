import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { ROUTES } from "@/constants/routes";

/**
 * OAuth / email confirmation callback.
 * Exchanges the auth code for a session and redirects into the app.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? ROUTES.dashboard;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const safeNext = next.startsWith("/") ? next : ROUTES.dashboard;
      return NextResponse.redirect(`${origin}${safeNext}`);
    }
  }

  return NextResponse.redirect(`${origin}${ROUTES.login}?error=auth_callback`);
}
