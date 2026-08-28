"use client";

import Link from "next/link";

import { cn } from "@/lib/utils";
import { bostone } from "@/lib/fonts/bostone";
import { APP_NAME } from "@/constants/app";
import { ROUTES } from "@/constants/routes";

interface LogoProps {
  href?: string;
  className?: string;
  /** Kept for API compatibility — the wordmark *is* the mark. */
  showWordmark?: boolean;
  /**
   * Trailing vertical hairline, as on the product panel header.
   * Use when the logo sits directly beside other chrome.
   */
  divider?: boolean;
}

/** "ARGUS" → "A R G U S" — a literal single space between each letter. */
const SPACED_NAME = APP_NAME.toUpperCase().split("").join(" ");

/**
 * Argus wordmark — set in Bostone, one letter at a time with a single space
 * between each. This is the only place Bostone is used in the app.
 */
export function Logo({
  href = ROUTES.home,
  className,
  divider = false,
}: LogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-3.5", className)}>
      <Link
        href={href}
        className="group relative inline-flex items-center outline-none"
        aria-label={`${APP_NAME} home`}
      >
        <span
          className={cn(
            bostone.className,
            // Larger and set tighter: as a wordmark grows, the single spaces
            // between letters read as gaps, so negative tracking pulls it back
            // into one mark instead of five letters.
            "relative text-[1.5rem] leading-none tracking-[-0.015em] text-foreground",
          )}
        >
          {SPACED_NAME}
          {/* Hairline that draws itself under the wordmark on hover / focus */}
          <span
            className={cn(
              "absolute -bottom-1.5 left-0 h-px w-full origin-left scale-x-0 bg-primary",
              "transition-transform duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]",
              "group-hover:scale-x-100 group-focus-visible:scale-x-100",
              "motion-reduce:transition-none motion-reduce:group-hover:scale-x-0",
            )}
            aria-hidden="true"
          />
        </span>
      </Link>

      {divider ? (
        <span className="h-3.5 w-px bg-border dark:bg-white/12" aria-hidden="true" />
      ) : null}
    </span>
  );
}
