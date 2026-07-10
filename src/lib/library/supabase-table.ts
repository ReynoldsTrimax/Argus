/**
 * Untyped table access for Phase 3 tables until `supabase gen types` is run.
 * Keeps Domain types in `src/types/library.ts` as the source of truth for app code.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

export type AppSupabase = SupabaseClient<Database>;

/** Access a Phase 3 table with the authenticated server/browser client. */
export function table(client: AppSupabase, name: string) {
  // Phase 3 tables are defined in migration 003; hand types live in types/library.ts
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (client as any).from(name);
}
