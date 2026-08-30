/**
 * Guards for route handlers.
 *
 * The three media route handlers exist to serve authenticated UI — the command
 * palette and the season list on a title page — but nothing stopped an anonymous
 * caller from using them as a free, uncapped proxy onto Argus's TMDB quota. One
 * `/api/media/search` request fans out into several upstream calls, so the
 * amplification factor is well above one.
 *
 * Two cheap guardrails, no new infrastructure:
 *   1. require a session, matching the surfaces that actually call these routes
 *   2. cap per-account request rate
 *
 * ## What the rate limiter is and is not
 *
 * It is an in-process fixed window. On a single long-lived server it is a real
 * cap. On Vercel each instance keeps its own counter, so the effective limit is
 * `limit × instances` — a speed bump against casual scripting, not a control
 * that survives a determined distributed attacker. Making it authoritative would
 * mean adding Redis/KV, which is a new external dependency and out of scope
 * here. Limits are therefore set well above real usage: the goal is to remove
 * the *unbounded* case, not to police normal traffic.
 *
 * Keyed by user id rather than IP on purpose. The session is already verified
 * server-side, whereas a client IP behind a proxy comes from headers a caller
 * can set.
 */

import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/services/user-service";

/**
 * Resolve the signed-in user, or produce a 401.
 *
 * The body is deliberately contentless — an unauthenticated caller learns only
 * that authentication is required, not whether a resource exists.
 */
export async function requireApiUser(): Promise<
  { ok: true; userId: string } | { ok: false; response: NextResponse }
> {
  const user = await getCurrentUser();

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Authentication required" },
        { status: 401, headers: { "Cache-Control": "no-store" } },
      ),
    };
  }

  return { ok: true, userId: user.id };
}

/* -------------------------------------------------------------------------- */
/* Rate limiting                                                              */
/* -------------------------------------------------------------------------- */

interface Window {
  count: number;
  resetAt: number;
}

/** Bounded so a burst of distinct keys cannot grow this without limit. */
const MAX_TRACKED_KEYS = 5_000;
const windows = new Map<string, Window>();

function prune(now: number): void {
  for (const [key, window] of windows) {
    if (window.resetAt <= now) windows.delete(key);
  }
  // Still oversized after dropping expired entries: evict oldest-inserted.
  if (windows.size >= MAX_TRACKED_KEYS) {
    const excess = windows.size - MAX_TRACKED_KEYS + 1;
    let removed = 0;
    for (const key of windows.keys()) {
      windows.delete(key);
      if (++removed >= excess) break;
    }
  }
}

export interface RateLimitResult {
  ok: boolean;
  /** Seconds until the window resets. Sent as `Retry-After` on rejection. */
  retryAfterSeconds: number;
}

/**
 * Fixed-window counter for `bucket:key`.
 *
 * Fixed window rather than sliding: it costs one map entry and one integer per
 * caller, and the burst it permits at a window edge is irrelevant at these
 * limits.
 */
export function checkRateLimit(
  bucket: string,
  key: string,
  limit: number,
  windowMs: number,
  now: number = Date.now(),
): RateLimitResult {
  if (windows.size >= MAX_TRACKED_KEYS) prune(now);

  const id = `${bucket}:${key}`;
  const existing = windows.get(id);

  if (!existing || existing.resetAt <= now) {
    windows.set(id, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSeconds: 0 };
  }

  existing.count += 1;

  if (existing.count > limit) {
    return {
      ok: false,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  return { ok: true, retryAfterSeconds: 0 };
}

/** 429 with `Retry-After`, so a well-behaved client can back off. */
export function rateLimitedResponse(retryAfterSeconds: number): NextResponse {
  return NextResponse.json(
    { error: "Too many requests" },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSeconds),
        "Cache-Control": "no-store",
      },
    },
  );
}

/**
 * Per-route budgets, in requests per minute per account.
 *
 * Sized against real client behaviour rather than guessed. The palette debounces
 * at 220ms and caches for 30s, so sustained human typing lands an order of
 * magnitude below `search`; the season list fires once per season the user
 * opens.
 */
export const RATE_LIMITS = {
  search: { limit: 60, windowMs: 60_000 },
  trending: { limit: 30, windowMs: 60_000 },
  season: { limit: 90, windowMs: 60_000 },
} as const;
