/**
 * Supabase client entry points.
 * Prefer the environment-specific factory over constructing clients ad hoc.
 */
export { createClient as createBrowserClient } from "./client";
export { createClient as createServerClient } from "./server";
