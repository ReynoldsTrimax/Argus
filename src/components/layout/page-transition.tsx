"use client";

import { motion, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { pageFade } from "@/animations/motion";

/**
 * Soft page enter on route change — fade, lift, and soft scale.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const reduce = useReducedMotion();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  if (!ready || reduce) {
    return <div className="min-w-0 w-full max-w-full">{children}</div>;
  }

  return (
    <motion.div
      key={pathname}
      variants={pageFade}
      initial="initial"
      animate="animate"
      className="min-w-0 w-full max-w-full"
    >
      {children}
    </motion.div>
  );
}
