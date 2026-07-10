"use client";

import Link from "next/link";

import { cn } from "@/lib/utils";
import { APP_NAME } from "@/constants/app";
import { ROUTES } from "@/constants/routes";

interface LogoProps {
  href?: string;
  className?: string;
  showWordmark?: boolean;
}

/**
 * Argus mark + DM Serif Display brand wordmark.
 */
export function Logo({ href = ROUTES.home, className, showWordmark = true }: LogoProps) {
  return (
    <Link
      href={href}
      className={cn(
        "group inline-flex items-center gap-2.5 rounded-xl outline-none",
        "focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
      aria-label={`${APP_NAME} home`}
    >
      <span
        className={cn(
          "relative flex h-8 w-8 items-center justify-center rounded-xl",
          "bg-primary shadow-sm",
          "transition-transform duration-300 ease-out",
          "group-hover:scale-105 group-active:scale-95",
          "motion-reduce:transition-none motion-reduce:group-hover:scale-100",
        )}
        aria-hidden="true"
      >
        <span className="absolute inset-[5px] rounded-md border border-primary-foreground/30" />
        <span className="relative h-2.5 w-2.5 rounded-full bg-primary-foreground/95" />
      </span>
      {showWordmark ? (
        <span className="text-brand transition-colors duration-300 group-hover:text-primary">
          {APP_NAME}
        </span>
      ) : null}
    </Link>
  );
}
