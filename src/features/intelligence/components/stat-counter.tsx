"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";

interface StatCounterProps {
  value: number;
  label: string;
  hint?: string;
  suffix?: string;
  className?: string;
  decimals?: number;
  /** Optional control slot (e.g. Episodes / Series tabs) above the label. */
  header?: React.ReactNode;
}

/**
 * Animated numeric counter for dashboard stats — fixed min height for grid alignment.
 */
export function StatCounter({
  value,
  label,
  hint,
  suffix = "",
  className,
  decimals = 0,
  header,
}: StatCounterProps) {
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(value);
  const displayRef = useRef(value);

  useEffect(() => {
    if (reduce) {
      displayRef.current = value;
      const id = requestAnimationFrame(() => setDisplay(value));
      return () => cancelAnimationFrame(id);
    }

    const from = displayRef.current;
    const start = performance.now();
    const duration = 700;
    let frame = 0;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const next = from + (value - from) * eased;
      displayRef.current = next;
      setDisplay(next);
      if (t < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, reduce]);

  return (
    <div
      className={cn(
        "hover-lift flex h-full min-h-[8.5rem] flex-col rounded-2xl border-0 bg-muted/40 p-4 dark:bg-white/[0.05]",
        "transition-colors duration-300 hover:bg-muted/60 dark:hover:bg-white/[0.08]",
        className,
      )}
    >
      {header ? <div className="mb-2 shrink-0">{header}</div> : null}
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 font-display text-2xl font-semibold tabular-nums tracking-tight sm:text-3xl">
        {decimals > 0
          ? display.toFixed(decimals)
          : new Intl.NumberFormat("en-US").format(Math.round(display))}
        {suffix}
      </p>
      {hint ? (
        <p className="mt-auto pt-1 text-xs leading-snug text-muted-foreground line-clamp-2">
          {hint}
        </p>
      ) : (
        <div className="mt-auto" aria-hidden />
      )}
    </div>
  );
}
