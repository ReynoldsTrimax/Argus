/**
 * Timeout-bounded `fetch` for every Supabase client, with a circuit breaker.
 *
 * Supabase's SDK inherits the platform `fetch`, which has no default timeout.
 * If a project's Auth (GoTrue) container is wedged it accepts the TLS
 * connection and then never sends a byte, so a sign-in request stays open
 * indefinitely and the form spins forever with no way to tell the user why.
 *
 * Bounding each request fixes the hang, but on its own it still makes every
 * attempt pay the full deadline and makes the dev server log a raw
 * `DOMException` per rejected request. So the first timeout also opens a
 * short-lived circuit: while it is open, calls fail immediately instead of
 * waiting, and nothing reaches `fetch` to be logged.
 *
 * The circuit is scoped to the auth path deliberately. When GoTrue is down,
 * PostgREST usually still answers normally, and tripping data reads because
 * sign-in failed would turn one outage into two.
 */

/**
 * Requests slower than this are treated as failures.
 *
 * Healthy Supabase auth answers in ~150–400ms from the nearest region, so six
 * seconds is more than an order of magnitude of headroom while keeping the
 * worst case short enough that a person waits once rather than giving up.
 */
const DEFAULT_TIMEOUT_MS = 6_000;

/** How long to fail fast after a confirmed auth timeout. */
const CIRCUIT_COOLDOWN_MS = 30_000;

/** Only auth traffic trips the breaker; data reads are judged independently. */
const AUTH_PATH = "/auth/v1/";

/** Raised instead of touching the network while the circuit is open. */
export class SupabaseUnreachableError extends Error {
  constructor(message = "Supabase auth is not responding.") {
    super(message);
    this.name = "SupabaseUnreachableError";
  }
}

/**
 * Recognises a transport failure, whether it arrives as our own error, an
 * `AbortSignal` timeout, or a Supabase `AuthRetryableFetchError` wrapping one.
 */
export function isTimeoutError(error: unknown): boolean {
  if (!error) return false;

  if (typeof error === "object" && "name" in error) {
    const name = (error as { name?: unknown }).name;
    if (
      name === "SupabaseUnreachableError" ||
      name === "TimeoutError" ||
      name === "AbortError"
    ) {
      return true;
    }
  }

  const message = error instanceof Error ? error.message : String(error);
  return /timed out|timeout|aborted|not responding|fetch failed|failed to fetch/i.test(
    message,
  );
}

let circuitOpenUntil = 0;

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

/** True while auth is known-unreachable, so callers can skip work entirely. */
export function isAuthCircuitOpen(): boolean {
  return Date.now() < circuitOpenUntil;
}

/**
 * Wraps `fetch` with an abort deadline, preserving any caller-supplied signal.
 */
export function createTimeoutFetch(timeoutMs: number = DEFAULT_TIMEOUT_MS): typeof fetch {
  return async function timeoutFetch(input, init) {
    const isAuthRequest = requestUrl(input).includes(AUTH_PATH);

    if (isAuthRequest && isAuthCircuitOpen()) {
      throw new SupabaseUnreachableError();
    }

    const deadline = AbortSignal.timeout(timeoutMs);
    const signal = init?.signal ? AbortSignal.any([init.signal, deadline]) : deadline;

    try {
      const response = await fetch(input, { ...init, signal });
      // A single success closes the circuit again.
      if (isAuthRequest) circuitOpenUntil = 0;
      return response;
    } catch (error) {
      if (isAuthRequest && isTimeoutError(error)) {
        // Log only on the transition, not once per blocked request.
        if (!isAuthCircuitOpen()) {
          console.warn(
            `[auth] Supabase auth did not respond within ${timeoutMs}ms. ` +
              `Failing fast for ${CIRCUIT_COOLDOWN_MS / 1000}s. ` +
              `If this persists the project is likely paused — check the Supabase dashboard.`,
          );
        }
        circuitOpenUntil = Date.now() + CIRCUIT_COOLDOWN_MS;
        throw new SupabaseUnreachableError();
      }
      throw error;
    }
  };
}

/** Shared instance — Supabase clients are created per request, the fetch is not. */
export const supabaseFetch = createTimeoutFetch();

/**
 * Default ceiling for a whole auth check, including SDK-internal retries.
 *
 * The circuit breaker above stops doomed requests from reaching the network,
 * but supabase-js still *sleeps* between its retry attempts (exponential
 * backoff), so a single `getUser()` can occupy 20–30s even when every fetch
 * fails instantly. Only an explicit deadline around the whole operation bounds
 * that, which is what keeps a render path from stalling during an outage.
 */
export const AUTH_BUDGET_MS = 2_500;

/**
 * Runs an auth operation under a total-time budget, resolving to `fallback`
 * if it fails or overruns. Never throws.
 */
export async function withAuthBudget<T>(
  operation: () => Promise<T>,
  fallback: T,
  budgetMs: number = AUTH_BUDGET_MS,
): Promise<T> {
  // Once auth is known-unreachable, don't spend the budget rediscovering it.
  // Without this, independent checks on one request (middleware, then a layout)
  // each wait their full deadline and the delays stack.
  if (isAuthCircuitOpen()) return fallback;

  let timer: ReturnType<typeof setTimeout> | undefined;

  const budget = new Promise<T>((resolve) => {
    timer = setTimeout(() => resolve(fallback), budgetMs);
  });

  try {
    return await Promise.race([operation().catch(() => fallback), budget]);
  } finally {
    clearTimeout(timer);
  }
}
