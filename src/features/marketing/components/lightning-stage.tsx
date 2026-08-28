"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import { ElectricBranches } from "./electric-branches";
import { LightningProvider, type LightningState } from "../lightning-context";

const IDLE_MIN_MS = 15_000;
const IDLE_JITTER_MS = 9_000;

/**
 * The hero stage: ambient darkness, horizon glow, branching traces, and the
 * flash sheet.
 *
 * The load sequence is authored entirely in CSS (`data-strike="load"` is in the
 * server-rendered markup) so it plays off the main thread and starts before
 * hydration — no JS timing, no layout shift. After that, this component only
 * schedules rare, much weaker idle bursts, and only while the stage is visible
 * and the tab is focused.
 */
export function LightningStage({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<LightningState>({ phase: "load", burst: 0 });

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;

    const calm =
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      window.matchMedia("(max-width: 767px)").matches;
    if (calm) return;

    let visible = true;
    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry?.isIntersecting ?? false;
      },
      { threshold: 0.25 },
    );
    observer.observe(el);

    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      timer = setTimeout(
        () => {
          if (visible && document.visibilityState === "visible") {
            setState((prev) => ({ phase: "idle", burst: prev.burst + 1 }));
          }
          schedule();
        },
        IDLE_MIN_MS + Math.random() * IDLE_JITTER_MS,
      );
    };
    schedule();

    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, []);

  const strike = state.phase;
  const key = `${state.phase}-${state.burst}`;

  return (
    <div ref={stageRef} className={cn("relative isolate overflow-hidden", className)}>
      {/* Ambient depth — always on, almost imperceptible drift */}
      <div
        className="stage-horizon pointer-events-none absolute inset-0 -z-10"
        aria-hidden="true"
      />

      {/* Branching traces — only illuminated during a strike */}
      <div
        key={`branches-${key}`}
        data-strike={strike}
        className="stage-branches pointer-events-none absolute inset-x-0 -top-24 bottom-0 -z-10"
        aria-hidden="true"
      >
        <ElectricBranches className="h-full w-full" />
      </div>

      {/* Flash sheet */}
      <div
        key={`flash-${key}`}
        data-strike={strike}
        className="stage-flash pointer-events-none absolute inset-0 -z-10"
        aria-hidden="true"
      />

      <LightningProvider value={state}>{children}</LightningProvider>
    </div>
  );
}
