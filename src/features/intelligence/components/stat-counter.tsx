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
        "surface-card panel-corner relative flex h-full min-h-[8.5rem] flex-col p-4",
        className,
      )}
    >
      {header ? <div className="mb-2 shrink-0">{header}</div> : null}
      <p className="text-eyebrow">{label}</p>
      <p className="text-numeric mt-2 text-2xl sm:text-3xl">
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
