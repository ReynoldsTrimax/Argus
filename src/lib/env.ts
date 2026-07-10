import { z } from "zod";

/**
 * Environment variable validation.
 *
 * Client-safe vars must be prefixed with NEXT_PUBLIC_.
 * Server-only vars are never bundled into the client.
 *
 * Validation is lazy so build-time static analysis does not fail when
 * env files are absent (e.g. CI typecheck without secrets).
 */

const clientSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY is required"),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_APP_NAME: z.string().default("Argus"),
});

const serverSchema = clientSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  /** TMDB v3 API key (query param). Prefer READ_ACCESS_TOKEN when available. */
  TMDB_API_KEY: z.string().min(1).optional(),
  /** TMDB v4 read access token (Bearer). */
  TMDB_READ_ACCESS_TOKEN: z.string().min(1).optional(),
  /** OMDb API key — IMDb / Rotten Tomatoes / Metacritic (https://www.omdbapi.com/apikey.aspx). */
  OMDB_API_KEY: z.string().min(1).optional(),
  /** ISO country for JustWatch/TMDB streaming offers (e.g. US, IN, GB). */
  WATCH_REGION: z.string().min(2).max(2).optional(),
});

export type ClientEnv = z.infer<typeof clientSchema>;
export type ServerEnv = z.infer<typeof serverSchema>;

let cachedClientEnv: ClientEnv | null = null;
let cachedServerEnv: ServerEnv | null = null;

/**
 * Returns validated public environment variables.
 * Safe to call from Client Components.
 */
export function getClientEnv(): ClientEnv {
  if (cachedClientEnv) return cachedClientEnv;

  const parsed = clientSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
  });

  if (!parsed.success) {
    const message = parsed.error.issues.map((i) => i.message).join("; ");
    throw new Error(`Invalid client environment: ${message}`);
  }

  cachedClientEnv = parsed.data;
  return cachedClientEnv;
}

/**
 * Returns validated server environment variables.
 * Must only be called from Server Components, Route Handlers, or middleware.
 */
export function getServerEnv(): ServerEnv {
  if (cachedServerEnv) return cachedServerEnv;

  const parsed = serverSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    NODE_ENV: process.env.NODE_ENV,
    TMDB_API_KEY: process.env.TMDB_API_KEY,
    TMDB_READ_ACCESS_TOKEN: process.env.TMDB_READ_ACCESS_TOKEN,
    OMDB_API_KEY: process.env.OMDB_API_KEY,
    WATCH_REGION: process.env.WATCH_REGION,
  });

  if (!parsed.success) {
    const message = parsed.error.issues.map((i) => i.message).join("; ");
    throw new Error(`Invalid server environment: ${message}`);
  }

  cachedServerEnv = parsed.data;
  return cachedServerEnv;
}

/**
 * Soft check used during bootstrap when env may be missing
 * (e.g. first-run without .env.local). Returns null instead of throwing.
 */
export function tryGetClientEnv(): ClientEnv | null {
  try {
    return getClientEnv();
  } catch {
    return null;
  }
}
