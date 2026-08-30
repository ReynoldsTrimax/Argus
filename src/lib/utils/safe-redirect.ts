/**
 * Post-authentication redirect sanitising.
 *
 * Sign-in carries a `next` parameter so people land back where they were. That
 * parameter is attacker-supplied — anyone can send a victim a link to
 * `/login?next=<somewhere>` — so it has to be reduced to a path on this origin
 * before it reaches `redirect()`.
 *
 * `next.startsWith("/")` is *not* sufficient, which is what this replaces.
 * `//evil.com` starts with a slash, and a `Location` header of `//evil.com` is a
 * protocol-relative URL: the browser keeps the current scheme and swaps the
 * host, landing the user on `https://evil.com` straight after a genuine login.
 * That is the most convincing phishing pivot there is — the victim really did
 * just authenticate, so a "your session expired, sign in again" page on the
 * attacker's host is entirely plausible.
 *
 * Backslashes matter for the same reason: browsers normalise `\` to `/`, so
 * `/\evil.com` becomes `//evil.com` after normalisation.
 */

/** Where to send someone when the requested target cannot be trusted. */
const DEFAULT_PATH = "/dashboard";

/**
 * Reduce an untrusted redirect target to a safe same-origin path.
 *
 * Returns `fallback` unless the input is a single-slash-rooted relative path.
 * Query string and fragment are preserved, since they carry legitimate state.
 */
export function safeNextPath(
  next: string | null | undefined,
  fallback: string = DEFAULT_PATH,
): string {
  if (typeof next !== "string") return fallback;

  // Control characters would be stripped or reinterpreted downstream; a target
  // containing them is malformed regardless of intent.
  const raw = next.trim().replace(/[\u0000-\u001f\u007f]/g, "");
  if (!raw) return fallback;

  // Treat backslashes as the forward slashes browsers will turn them into, so
  // the checks below cannot be stepped around with `/\`.
  const normalised = raw.replace(/\\/g, "/");

  // Must be rooted, and must not begin a second slash (protocol-relative).
  if (!normalised.startsWith("/") || normalised.startsWith("//")) return fallback;

  // A scheme anywhere at the start means it is not a plain path. Checking for
  // ":" before the first "/" would miss `/..;/`-style tricks, so reject any
  // colon in the first path segment instead.
  const firstSegment = normalised.slice(1).split("/")[0] ?? "";
  if (firstSegment.includes(":")) return fallback;

  return normalised;
}

/**
 * Absolute URL for a redirect, built from a trusted origin and an untrusted path.
 *
 * Used by the OAuth callback, which must emit an absolute `Location`. The origin
 * is supplied by the caller from the request rather than from user input.
 */
export function safeRedirectUrl(
  origin: string,
  next: string | null | undefined,
  fallback: string = DEFAULT_PATH,
): string {
  return `${origin}${safeNextPath(next, fallback)}`;
}
