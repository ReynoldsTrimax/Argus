import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import type { Database } from "@/types/database";
import { getServerEnv } from "@/lib/env";

/**
 * Server Supabase client for Server Components, Route Handlers, and Server Actions.
 * Cookie-based session — do not cache this client across requests.
 */
export async function createClient() {
  const cookieStore = await cookies();
  const env = getServerEnv();

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // setAll can throw in Server Components where cookies are read-only.
            // Middleware is responsible for session refresh in those cases.
          }
        },
      },
    },
  );
}
