/**
 * Lightweight formatting helpers for presentation layer.
 * Keep domain-specific formatters in feature modules.
 */

/**
 * Formats an ISO date string into a short relative label (e.g. "2 days ago").
 * Falls back to a locale date when the value is invalid.
 */
export function formatRelativeDate(iso: string | Date): string {
  const date = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  const now = Date.now();
  const diffMs = now - date.getTime();
  const abs = Math.abs(diffMs);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  const minutes = Math.round(diffMs / 60_000);
  const hours = Math.round(diffMs / 3_600_000);
  const days = Math.round(diffMs / 86_400_000);

  if (abs < 60_000) return "just now";
  if (abs < 3_600_000) return rtf.format(-minutes, "minute");
  if (abs < 86_400_000) return rtf.format(-hours, "hour");
  if (abs < 30 * 86_400_000) return rtf.format(-days, "day");

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

/**
 * Prefer display name, then username, then a short id fallback.
 */
export function formatDisplayName(input: {
  displayName?: string | null;
  username?: string | null;
  email?: string | null;
  id?: string | null;
}): string {
  if (input.displayName?.trim()) return input.displayName.trim();
  if (input.username?.trim()) return `@${input.username.trim()}`;
  if (input.email?.trim()) return input.email.split("@")[0] ?? "User";
  if (input.id) return `User ${input.id.slice(0, 6)}`;
  return "User";
}
