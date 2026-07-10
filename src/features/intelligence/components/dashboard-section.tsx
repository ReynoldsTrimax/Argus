"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";
import { sectionReveal } from "@/animations/motion";

interface DashboardSectionProps {
  title: string;
  href?: string;
  children: React.ReactNode;
  className?: string;
  description?: string;
}

export function DashboardSection({
  title,
  href,
  children,
  className,
  description,
}: DashboardSectionProps) {
  const reduce = useReducedMotion();
  const [ready, setReady] = React.useState(false);
  React.useEffect(() => setReady(true), []);

  const header = (
    <div className="flex items-end justify-between gap-3 px-0.5">
      <div>
        {href ? (
          <Link
            href={href}
            className="group inline-flex items-center gap-1 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <h2 className="text-section-title transition-colors duration-300 group-hover:text-primary">
              {title}
            </h2>
            <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform duration-300 ease-out group-hover:translate-x-1 group-hover:text-primary" />
          </Link>
        ) : (
          <h2 className="text-section-title">{title}</h2>
        )}
        {description ? (
          <p className="text-meta mt-1 text-muted-foreground">{description}</p>
        ) : null}
      </div>
    </div>
  );

  // SSR + reduced motion: static markup (avoids opacity:0 hydration stuck state)
  if (!ready || reduce) {
    return (
      <section className={cn("space-y-4", className)} aria-label={title}>
        {header}
        {children}
      </section>
    );
  }

  return (
    <motion.section
      className={cn("space-y-4", className)}
      aria-label={title}
      variants={sectionReveal}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.12, margin: "0px 0px -24px 0px" }}
    >
      {header}
      {children}
    </motion.section>
  );
}
