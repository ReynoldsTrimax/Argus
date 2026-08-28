"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { Button, type ButtonProps } from "@/components/ui/button";

/**
 * How long the user must hold before the action commits.
 *
 * This constant is the single source of truth: it drives the commit timer and
 * is handed to CSS as `--hold-duration`, so the fill bar and the action can
 * never disagree — including under `prefers-reduced-motion`, where the global
 * transition kill in globals.css would otherwise collapse a transition-driven
 * implementation to ~0ms and fire a destructive action on touch.
 */
const HOLD_MS = 2000;

interface HoldToConfirmButtonProps extends Omit<ButtonProps, "onClick"> {
  /** Runs only after a completed hold. */
  onConfirm: () => void;
  /** Visible label, e.g. "Delete". */
  children: React.ReactNode;
  /** Announced instruction, e.g. "Hold to delete this collection". */
  holdLabel: string;
}

export function HoldToConfirmButton({
  onConfirm,
  children,
  holdLabel,
  className,
  disabled,
  variant = "destructive",
  ...props
}: HoldToConfirmButtonProps) {
  const [holding, setHolding] = React.useState(false);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const clear = React.useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  // Never leave a pending destructive timer behind on unmount.
  React.useEffect(() => clear, [clear]);

  const start = () => {
    if (disabled || timer.current) return;
    setHolding(true);
    timer.current = setTimeout(() => {
      timer.current = null;
      setHolding(false);
      onConfirm();
    }, HOLD_MS);
  };

  const cancel = () => {
    clear();
    setHolding(false);
  };

  return (
    <>
      <Button
        {...props}
        type="button"
        variant={variant}
        disabled={disabled}
        data-holding={holding ? "true" : undefined}
        aria-describedby="hold-to-confirm-hint"
        style={{ ["--hold-duration" as string]: `${HOLD_MS}ms` }}
        className={cn("hold-confirm relative overflow-hidden", className)}
        onPointerDown={start}
        onPointerUp={cancel}
        onPointerLeave={cancel}
        onPointerCancel={cancel}
        onBlur={cancel}
        onKeyDown={(e) => {
          // `repeat` guards the auto-repeat stream from restarting the hold.
          if ((e.key === " " || e.key === "Enter") && !e.repeat) {
            e.preventDefault();
            start();
          }
        }}
        onKeyUp={(e) => {
          if (e.key === " " || e.key === "Enter") cancel();
        }}
      >
        <span className="hold-confirm__fill" aria-hidden="true" />
        <span className="relative z-[1]">{children}</span>
      </Button>

      <span id="hold-to-confirm-hint" className="sr-only">
        {holdLabel}. This cannot be undone.
      </span>
    </>
  );
}
