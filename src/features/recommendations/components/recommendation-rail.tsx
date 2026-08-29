"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { sectionReveal } from "@/animations/motion";
import type { RecommendationSection } from "@/types/recommendations";

import { RecommendationCard } from "./recommendation-card";

interface RecommendationRailProps {
  section: RecommendationSection;
  /** Cards in the first rail get image priority. */
  priorityCount?: number;
  debug?: boolean;
  className?: string;
}

/**
 * One horizontal rail per section.
 *
 * Structured like the catalog's `MediaRow` — same scroll affordances, same
 * snap behaviour — but the header carries the section's `reason`, because a
 * recommendation rail without its rationale is just another popular row.
 *
 * The section reveal is a single animation on the container: staggering every
 * card independently reads as decoration at this density, and a full page of
 * rails would spend several seconds settling.
 */
export function RecommendationRail({
  section,
  priorityCount = 0,
  debug = false,
  className,
}: RecommendationRailProps) {
  const scrollerRef = React.useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  const scroll = (direction: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({
      left: direction * Math.min(el.clientWidth * 0.82, 560),
      behavior: reduce ? "auto" : "smooth",
    });
  };

  if (section.items.length === 0) return null;

  const header = (
    <div className="flex items-end justify-between gap-4 px-1">
      <div className="min-w-0">
        <h2 className="text-section-title truncate">{section.title}</h2>
        <p className="text-meta text-muted-foreground mt-1 line-clamp-2">
          {section.reason}
        </p>
      </div>
      <div className="hidden shrink-0 items-center gap-1.5 sm:flex">
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          className="rounded-xl"
          onClick={() => scroll(-1)}
          aria-label={`Scroll ${section.title} left`}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          className="rounded-xl"
          onClick={() => scroll(1)}
          aria-label={`Scroll ${section.title} right`}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  const rail = (
    <div
      ref={scrollerRef}
      // Vertical padding leaves room for the card lift and the hover detail
      // panel, which would otherwise be clipped by overflow-x.
      className="flex snap-x snap-mandatory scroll-pr-4 scroll-pl-4 scrollbar-thin gap-4 overflow-x-auto px-4 pt-3 pb-28"
      tabIndex={0}
      role="list"
      aria-label={section.title}
    >
      {section.items.map((item, index) => (
        <div key={item.key} className="shrink-0 snap-start" role="listitem">
          <RecommendationCard
            item={item}
            priority={index < priorityCount}
            debug={debug}
          />
        </div>
      ))}
    </div>
  );

  if (reduce) {
    return (
      <section className={cn("min-w-0 space-y-1", className)}>
        {header}
        {rail}
      </section>
    );
  }

  return (
    <motion.section
      className={cn("min-w-0 space-y-1", className)}
      variants={sectionReveal}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.1, margin: "0px 0px -40px 0px" }}
    >
      {header}
      {rail}
    </motion.section>
  );
}
