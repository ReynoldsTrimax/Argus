/**
 * Shared motion language — lively but polished.
 * Consumers respect prefers-reduced-motion via useReducedMotion().
 */

import type { Transition, Variants } from "framer-motion";

/** Soft settle — primary interactive spring. */
export const springSoft: Transition = {
  type: "spring",
  stiffness: 240,
  damping: 26,
  mass: 0.85,
};

/** Snappy chrome — small controls only. */
export const springSnappy: Transition = {
  type: "spring",
  stiffness: 420,
  damping: 32,
  mass: 0.65,
};

/** Float — ambient motion. */
export const springFloat: Transition = {
  type: "spring",
  stiffness: 160,
  damping: 24,
  mass: 1,
};

/** Poster tilt — very damped for sleek tracking. */
export const springTilt: Transition = {
  type: "spring",
  stiffness: 150,
  damping: 20,
  mass: 0.8,
};

/** Bouncy pop — hover previews, badges. */
export const springPop: Transition = {
  type: "spring",
  stiffness: 380,
  damping: 22,
  mass: 0.7,
};

export const easeOut: Transition = {
  duration: 0.38,
  ease: [0.16, 1, 0.3, 1],
};

export const easeLux: Transition = {
  duration: 0.55,
  ease: [0.22, 1, 0.36, 1],
};

/** Overlay / dialog enter — fade + lift + slight scale. */
export const overlayIn: Transition = {
  duration: 0.36,
  ease: [0.22, 1, 0.36, 1],
};

/**
 * Page enter — opacity + travel + soft scale.
 */
export const pageFade: Variants = {
  initial: {
    opacity: 0,
    y: 16,
    scale: 0.985,
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.48,
      ease: [0.22, 1, 0.36, 1],
    },
  },
  exit: {
    opacity: 0,
    y: -8,
    scale: 0.99,
    transition: { duration: 0.2, ease: [0.4, 0, 1, 1] },
  },
};

export const posterHover = {
  rest: { y: 0, scale: 1 },
  hover: { y: -8, scale: 1.04 },
};

export const fadeReveal: Variants = {
  hidden: { opacity: 0, y: 16, scale: 0.98 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1],
      delay: Math.min(i * 0.045, 0.4),
    },
  }),
};

export const scalePop: Variants = {
  hidden: { opacity: 0, scale: 0.9, y: 12 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: "spring", stiffness: 320, damping: 24, mass: 0.75 },
  },
};

export const floatDrift: Variants = {
  animate: {
    y: [0, -10, 0],
    x: [0, 4, 0],
    transition: { duration: 10, repeat: Infinity, ease: "easeInOut" },
  },
};

export const glowPulse: Variants = {
  animate: {
    opacity: [0.28, 0.6, 0.28],
    scale: [1, 1.08, 1],
    transition: { duration: 6, repeat: Infinity, ease: "easeInOut" },
  },
};

/** Section reveal — soft fade/slide with scale. */
export const sectionReveal: Variants = {
  hidden: { opacity: 0, y: 22, scale: 0.985 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.55,
      ease: [0.22, 1, 0.36, 1],
      when: "beforeChildren",
      staggerChildren: 0.055,
    },
  },
};

export const railItem: Variants = {
  hidden: { opacity: 0, y: 16, scale: 0.94 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 280,
      damping: 24,
      mass: 0.8,
    },
  },
};

export const defaultTransition: Transition = {
  type: "spring",
  stiffness: 260,
  damping: 28,
  mass: 0.8,
};
