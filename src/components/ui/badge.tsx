import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Mono status chip — sharp, hairline, uppercase and tracked, matching the
 * "STRONG" / "12-DAY STREAK" tags on the product panels.
 */
const badgeVariants = cva(
  [
    "inline-flex items-center rounded-sm border px-2 py-0.5",
    "font-mono text-[0.625rem] font-medium uppercase tracking-[0.16em]",
    "transition-colors duration-200",
    "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  ].join(" "),
  {
    variants: {
      variant: {
        default: "border-primary/45 bg-primary/12 text-primary",
        secondary:
          "border-border bg-secondary text-secondary-foreground dark:border-white/10",
        destructive: "border-destructive/45 bg-destructive/12 text-destructive",
        outline: "border-border bg-transparent text-foreground dark:border-white/12",
        success: "border-success/40 bg-success/12 text-success",
        warning: "border-warning/40 bg-warning/12 text-warning",
        muted: "border-border/60 bg-transparent text-muted-foreground dark:border-white/8",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
