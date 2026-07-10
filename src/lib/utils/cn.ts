import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind class names with conflict resolution.
 * Prefer this over string concatenation for all conditional styles.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
