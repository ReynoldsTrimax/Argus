"use client";

import { MotionConfig, useReducedMotion } from "framer-motion";

import { defaultTransition } from "@/animations/motion";

/**
 * Global motion defaults. Poster hover pop uses CSS portals and is independent.
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion();

  return (
    <MotionConfig
      reducedMotion="user"
      transition={
        reduce
          ? { duration: 0.01 }
          : defaultTransition
      }
    >
      {children}
    </MotionConfig>
  );
}
