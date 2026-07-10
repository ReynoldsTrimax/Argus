"use client";

import { motion, useReducedMotion } from "framer-motion";

import { heroContainer, heroItem } from "@/animations/variants";
import { cn } from "@/lib/utils";

interface PageHeaderMotionProps {
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: React.ReactNode;
  className?: string;
}

/**
 * Animated page title block — DM Serif hierarchy (eyebrow / title / lead).
 */
export function PageHeaderMotion({
  title,
  description,
  eyebrow,
  actions,
  className,
}: PageHeaderMotionProps) {
  const reduce = useReducedMotion();

  if (reduce) {
    return (
      <header
        className={cn(
          "flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between",
          className,
        )}
      >
        <div className="space-y-2">
          {eyebrow ? (
            <p className="text-eyebrow text-muted-foreground">{eyebrow}</p>
          ) : null}
          <h1 className="text-page-title text-balance">{title}</h1>
          {description ? (
            <p className="text-lead max-w-xl text-muted-foreground text-pretty">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </header>
    );
  }

  return (
    <motion.header
      className={cn(
        "flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between",
        className,
      )}
      variants={heroContainer}
      initial="hidden"
      animate="visible"
    >
      <div className="space-y-2">
        {eyebrow ? (
          <motion.p variants={heroItem} className="text-eyebrow text-muted-foreground">
            {eyebrow}
          </motion.p>
        ) : null}
        <motion.h1 variants={heroItem} className="text-page-title text-balance">
          {title}
        </motion.h1>
        {description ? (
          <motion.p
            variants={heroItem}
            className="text-lead max-w-xl text-muted-foreground text-pretty"
          >
            {description}
          </motion.p>
        ) : null}
      </div>
      {actions ? (
        <motion.div variants={heroItem} className="flex flex-wrap gap-2">
          {actions}
        </motion.div>
      ) : null}
    </motion.header>
  );
}
