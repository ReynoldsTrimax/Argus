"use client";

import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * A hairline charge that travels along an element's top and bottom edges.
 * Purely decorative; gated to fine pointers and removed under reduced motion
 * (see `globals.css`).
 */
export function EdgeTraces() {
  return (
    <>
      <span aria-hidden="true" className="lx-trace inset-x-0 top-0 h-px">
        <i />
      </span>
      <span
        aria-hidden="true"
        data-dir="reverse"
        className="lx-trace inset-x-0 bottom-0 h-px"
      >
        <i />
      </span>
    </>
  );
}

/**
 * Landing CTA — sharp 2px corners, electric edge charge on hover, tactile press.
 * Focus ring is explicit so keyboard users get the same affordance without the
 * hover-only motion.
 */
export function ElectricCta({
  href,
  children,
  variant = "primary",
  size = "default",
  className,
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary";
  size?: "default" | "sm";
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "lx-cta",
        variant === "primary" ? "lx-cta--primary" : "lx-cta--secondary",
        size === "sm" && "h-9 px-4 text-[0.8125rem]",
        className,
      )}
    >
      <span className="relative z-10 inline-flex items-center gap-2.5">{children}</span>
      <EdgeTraces />
    </Link>
  );
}
