"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";

import { sectionReveal } from "@/animations/motion";
import { cn } from "@/lib/utils";

interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  once?: boolean;
  amount?: number;
  /** Alternate motion flavor */
  variant?: "section" | "fade" | "scale" | "slide";
}

const VARIANT_MAP: Record<NonNullable<ScrollRevealProps["variant"]>, Variants> = {
  section: sectionReveal,
  fade: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
    },
  },
  scale: {
    hidden: { opacity: 0, scale: 0.92, y: 16 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: { type: "spring", stiffness: 280, damping: 24 },
    },
  },
  slide: {
    hidden: { opacity: 0, x: -24 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
    },
  },
};

/**
 * In-view reveal for sections / rails.
 * Skips animation when reduced motion is preferred.
 */
export function ScrollReveal({
  children,
  className,
  delay = 0,
  once = true,
  amount = 0.12,
  variant = "section",
}: ScrollRevealProps) {
  const reduce = useReducedMotion();

  if (reduce) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={cn("will-change-transform", className)}
      variants={VARIANT_MAP[variant]}
      initial="hidden"
      whileInView="visible"
      viewport={{ once, amount, margin: "0px 0px -48px 0px" }}
      transition={{ delay }}
    >
      {children}
    </motion.div>
  );
}
