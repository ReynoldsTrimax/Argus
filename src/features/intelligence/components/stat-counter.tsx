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
}

/**
 * Animated numeric counter for dashboard stats.
 */
export function StatCounter({
  value,
  label,
  hint,
  suffix = "",
  className,
  decimals = 0,
}: StatCounterProps) {
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(value);
  const displayRef = useRef(value);

  useEffect(() => {
    if (reduce) {
      displayRef.current = value;
      // Use rAF so we don't setState synchronously at effect start.
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
        "hover-lift rounded-2xl border border-border bg-card/80 p-4 shadow-xs",
        "transition-[border-color,background-color] duration-300 hover:border-primary/30 hover:bg-card",
        className,
      )}
    >
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 font-display text-2xl font-semibold tabular-nums tracking-tight sm:text-3xl">
        {decimals > 0 ? display.toFixed(decimals) : Math.round(display).toLocaleString()}
        {suffix}
      </p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
