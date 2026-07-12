import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  [
    "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium",
    "backdrop-blur-md transition-colors duration-200",
    "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  ].join(" "),
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary/65 text-primary-foreground shadow-xs ring-1 ring-primary/30",
        secondary:
          "border-transparent bg-secondary/55 text-secondary-foreground ring-1 ring-border/35 dark:bg-white/[0.1] dark:ring-white/10",
        destructive:
          "border-transparent bg-destructive/65 text-destructive-foreground shadow-xs ring-1 ring-destructive/30",
        outline:
          "border-transparent bg-muted/45 text-foreground ring-1 ring-border/40 dark:bg-white/[0.08] dark:ring-white/10",
        success:
          "border-transparent bg-success/20 text-success ring-1 ring-success/25",
        warning:
          "border-transparent bg-warning/20 text-warning ring-1 ring-warning/25",
        muted:
          "border-transparent bg-muted/50 text-muted-foreground ring-1 ring-border/30 dark:bg-white/[0.08] dark:ring-white/8",
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
