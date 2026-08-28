"use client";

import { Check, Minus } from "lucide-react";

import { cn } from "@/lib/utils";

/** Three-way watched state: none, some, all. */
export type WatchedToggleState = boolean | "mixed";

interface WatchedToggleProps {
  state: WatchedToggleState;
  onClick: () => void;
  disabled?: boolean;
  /** Describes the thing being toggled, e.g. "Season 1 episode 3". */
  label: string;
  size?: "sm" | "md";
  className?: string;
}

/**
 * Circular watched toggle used by the episode checklist.
 *
 * A real `role="checkbox"` rather than a styled button, so assistive tech gets
 * the tri-state directly: `aria-checked="mixed"` is what communicates "some of
 * this season" without needing a visible count.
 *
 * The press scale fires on pointer-down rather than on completion, because the
 * write plus refresh takes longer than the tap feels like it should.
 */
export function WatchedToggle({
  state,
  onClick,
  disabled,
  label,
  size = "md",
  className,
}: WatchedToggleProps) {
  const checked = state === true;
  const mixed = state === "mixed";

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={mixed ? "mixed" : checked}
      aria-label={checked ? `Mark ${label} as not watched` : `Mark ${label} as watched`}
      title={checked ? "Watched" : mixed ? "Partly watched" : "Not watched"}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "focus-visible:ring-ring flex shrink-0 items-center justify-center rounded-full border transition-[background-color,border-color,transform] duration-150 ease-out focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none disabled:opacity-50",
        "active:scale-[0.88] motion-reduce:transition-none motion-reduce:active:scale-100",
        size === "sm" ? "h-[1.125rem] w-[1.125rem]" : "h-5 w-5",
        checked
          ? "border-primary bg-primary text-primary-foreground"
          : mixed
            ? "border-primary text-primary"
            : "border-muted-foreground/35 text-transparent hover:border-muted-foreground/70",
        className,
      )}
    >
      {checked ? (
        <Check className={size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3"} aria-hidden="true" />
      ) : mixed ? (
        <Minus className={size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3"} aria-hidden="true" />
      ) : null}
    </button>
  );
}
