"use client";

import * as React from "react";
import Image, { type ImageProps } from "next/image";
import { motion, useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";

type ProgressiveImageProps = Omit<ImageProps, "onLoad"> & {
  containerClassName?: string;
};

/**
 * Image with soft blur-up reveal — reduced-motion safe.
 */
export function ProgressiveImage({
  className,
  containerClassName,
  alt,
  ...props
}: ProgressiveImageProps) {
  const [loaded, setLoaded] = React.useState(false);
  const reduce = useReducedMotion();

  return (
    <div className={cn("relative overflow-hidden bg-muted", containerClassName)}>
      <motion.div
        initial={reduce ? false : { opacity: 0 }}
        animate={{
          opacity: loaded ? 1 : 0,
        }}
        transition={{
          duration: reduce ? 0 : 0.45,
          ease: [0.22, 1, 0.36, 1],
        }}
        className="absolute inset-0"
      >
        <Image
          alt={alt}
          className={cn("object-cover", className)}
          onLoad={() => setLoaded(true)}
          {...props}
        />
      </motion.div>
      {!loaded ? (
        <div className="absolute inset-0 skeleton-shimmer" aria-hidden />
      ) : null}
    </div>
  );
}
