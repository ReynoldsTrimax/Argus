import type { Transition, Variants } from "framer-motion";

/**
 * Shared variants — lively fades, lifts, and soft pops.
 */

export const EASE_OUT: Transition["ease"] = [0.16, 1, 0.3, 1];
export const EASE_IN_OUT: Transition["ease"] = [0.45, 0, 0.55, 1];
export const EASE_LUX: Transition["ease"] = [0.22, 1, 0.36, 1];

export const TRANSITION_FAST: Transition = {
  duration: 0.18,
  ease: EASE_OUT,
};

export const TRANSITION_NORMAL: Transition = {
  duration: 0.34,
  ease: EASE_OUT,
};

export const TRANSITION_SLOW: Transition = {
  duration: 0.52,
  ease: EASE_LUX,
};

export const TRANSITION_SPRING: Transition = {
  type: "spring",
  stiffness: 280,
  damping: 26,
  mass: 0.8,
};

export const TRANSITION_POP: Transition = {
  type: "spring",
  stiffness: 380,
  damping: 22,
  mass: 0.7,
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: TRANSITION_NORMAL },
  exit: { opacity: 0, transition: TRANSITION_FAST },
};

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20, scale: 0.985 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: TRANSITION_SLOW,
  },
  exit: { opacity: 0, y: 6, transition: TRANSITION_FAST },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.9, y: 12 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: TRANSITION_POP,
  },
  exit: { opacity: 0, scale: 0.96, transition: TRANSITION_FAST },
};

export const slideInFromLeft: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0, transition: TRANSITION_SLOW },
  exit: { opacity: 0, x: -8, transition: TRANSITION_FAST },
};

export const slideInFromRight: Variants = {
  hidden: { opacity: 0, x: 20 },
  visible: { opacity: 1, x: 0, transition: TRANSITION_SLOW },
  exit: { opacity: 0, x: 8, transition: TRANSITION_FAST },
};

export const card3d: Variants = {
  hidden: { opacity: 0, y: 18, rotateX: 8 },
  visible: {
    opacity: 1,
    y: 0,
    rotateX: 0,
    transition: TRANSITION_SPRING,
  },
};

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.06,
    },
  },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 14, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: TRANSITION_SLOW,
  },
};

export const gridContainer: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.05,
    },
  },
};

export const gridItem: Variants = {
  hidden: { opacity: 0, y: 18, scale: 0.94 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 260,
      damping: 24,
      mass: 0.8,
    },
  },
};

/** Hero content stagger */
export const heroContainer: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.12,
    },
  },
};

export const heroItem: Variants = {
  hidden: { opacity: 0, y: 22 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: EASE_LUX },
  },
};
