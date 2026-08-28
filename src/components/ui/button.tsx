import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Boxy product buttons — solid fills, hairline borders, razor corners.
 * Matches the landing page CTA language.
 */
const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm text-sm font-medium",
    "transition-[color,background-color,border-color,box-shadow,transform,opacity] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    "disabled:pointer-events-none disabled:opacity-45",
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
    "active:scale-[0.97] motion-reduce:active:scale-100",
    "motion-reduce:transition-colors",
  ].join(" "),
  {
    variants: {
      variant: {
        default: [
          "border border-primary/55 bg-primary/15 text-foreground",
          "shadow-[inset_0_1px_0_hsl(0_0%_100%/0.1)]",
          "hover:border-primary hover:bg-primary/25 hover:shadow-glow",
        ].join(" "),
        destructive: [
          "border border-destructive/55 bg-destructive/15 text-foreground",
          "hover:border-destructive hover:bg-destructive/25",
        ].join(" "),
        outline: [
          "border border-border bg-transparent text-foreground dark:border-white/12",
          "hover:border-primary/50 hover:bg-primary/10",
        ].join(" "),
        secondary: [
          "border border-border bg-secondary text-secondary-foreground dark:border-white/10",
          "hover:border-primary/40 hover:bg-accent",
        ].join(" "),
        ghost: [
          "border border-transparent bg-transparent text-muted-foreground",
          "hover:border-border hover:bg-accent hover:text-foreground",
          "dark:hover:border-white/10",
        ].join(" "),
        link: "border-0 bg-transparent text-primary underline-offset-4 hover:underline active:scale-100",
        glass: [
          "border border-border bg-card text-foreground dark:border-white/10",
          "hover:border-primary/45 hover:bg-accent",
        ].join(" "),
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-11 px-6 text-base",
        xl: "h-12 px-8 text-base",
        icon: "h-10 w-10",
        "icon-sm": "h-8 w-8",
        "icon-lg": "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
