/**
 * Rating normalization.
 *
 * `library_entries.user_rating` stores whatever number the user typed and
 * `rating_scale` records which scale they typed it on, so the same enthusiasm
 * is persisted as 4, 8 or 80. Everything downstream of this file works in a
 * single 0…1 space.
 *
 * The existing stats engine buckets `user_rating` as if it were always a
 * 10-point value. That is left exactly as it is — this module is additive and
 * only the recommendation engine reads it.
 */

import type { RatingScale } from "@/types/library";

const SCALE_MAX: Record<RatingScale, number> = {
  five: 5,
  ten: 10,
  hundred: 100,
};

/**
 * Infer the scale of a rating stored without one.
 *
 * `setRating` defaults to `"ten"`, so a missing scale most likely means a
 * 10-point value — but a stored 80 cannot be a 10-point rating and a stored
 * 4.5 cannot be a 5-point one, so magnitude decides those cases. Values in
 * 0…5 stay ambiguous (4 could be 4/5 or 4/10) and fall back to the write-path
 * default rather than guessing the more flattering reading.
 */
export function inferScale(value: number): RatingScale {
  if (value > 10) return "hundred";
  return "ten";
}

/**
 * Normalize a stored rating to 0…1, or `null` when it cannot be interpreted.
 * Out-of-range values are clamped rather than dropped: a 12/10 is still praise.
 */
export function normalizeRating(
  value: number | null | undefined,
  scale: RatingScale | null | undefined,
): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  if (value < 0) return null;

  const resolved = scale ?? inferScale(value);
  const max = SCALE_MAX[resolved] ?? 10;
  if (max <= 0) return null;

  return clamp01(value / max);
}

/** Convert a normalized 0…1 rating back to a 10-point display value. */
export function toTenPoint(normalized: number): number {
  return Math.round(clamp01(normalized) * 100) / 10;
}

export function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

export function clamp(n: number, min: number, max: number): number {
  if (Number.isNaN(n)) return min;
  if (n < min) return min;
  if (n > max) return max;
  return n;
}

/** Mean of a non-empty list, or `null`. */
export function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/** Population standard deviation. 0 for lists shorter than two. */
export function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + (v - m) * (v - m), 0) / values.length;
  return Math.sqrt(variance);
}

/** Round to `places` decimals — keeps snapshots and score output stable. */
export function round(n: number, places = 2): number {
  const factor = 10 ** places;
  return Math.round(n * factor) / factor;
}
