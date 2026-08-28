"use client";

import { useRef } from "react";
import { useInView } from "framer-motion";

import { cn } from "@/lib/utils";

type RevealMotion = "rise" | "charge" | "fade";

interface RevealProps {
  children?: React.ReactNode;
  className?: string;
  /** `charge` = masked + blur-resolving reveal, for headlines. */
  motion?: RevealMotion;
  /** ms — keep group staggers in the 30–80ms range. */
  delay?: number;
  /** Fraction of the element that must be visible. */
  amount?: number;
}

function useRevealed(amount: number) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, {
    once: true,
    amount,
    margin: "0px 0px -10% 0px",
  });
  return { ref, revealed: inView };
}

/**
 * Scroll reveal. `framer-motion`'s `useInView` only flips a data attribute —
 * the animation itself is a CSS keyframe, so it runs off the main thread and
 * costs nothing per frame.
 *
 * Reduced motion is handled globally in `globals.css`: content lands instantly
 * instead of travelling.
 */
export function Reveal({
  children,
  className,
  motion = "rise",
  delay = 0,
  amount = 0.2,
}: RevealProps) {
  const { ref, revealed } = useRevealed(amount);

  return (
    <div
      ref={ref}
      className={cn("lx-reveal", className)}
      data-motion={motion}
      data-visible={revealed ? "true" : "false"}
      style={delay ? { animationDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}

/**
 * Hairline separator that draws itself left → right when scrolled into view.
 */
export function Hairline({
  className,
  electric = false,
  delay = 0,
}: {
  className?: string;
  electric?: boolean;
  delay?: number;
}) {
  const { ref, revealed } = useRevealed(0.6);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className={cn("lx-hairline", electric && "lx-hairline-electric", className)}
      data-visible={revealed ? "true" : "false"}
      style={delay ? { animationDelay: `${delay}ms` } : undefined}
    />
  );
}
