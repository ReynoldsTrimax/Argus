import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/types/database";
import { getClientEnv } from "@/lib/env";
import { supabaseFetch } from "@/lib/supabase/fetch";

/**
 * Browser Supabase client for Client Components.
 * Uses the public anon key; RLS enforces data access.
 */
export function createClient() {
  const env = getClientEnv();

  return createBrowserClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { global: { fetch: supabaseFetch } },
  );
}
