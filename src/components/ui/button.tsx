import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Translucent product buttons — frosted fills with soft rings.
 */
const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium",
    "backdrop-blur-md",
    "transition-[color,background-color,border-color,box-shadow,transform,opacity,backdrop-filter] duration-250 ease-[cubic-bezier(0.22,1,0.36,1)]",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    "disabled:pointer-events-none disabled:opacity-45",
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
    "active:scale-[0.96] motion-reduce:active:scale-100",
    "motion-reduce:transition-colors",
  ].join(" "),
  {
    variants: {
      variant: {
        default: [
          "border-0 bg-primary/65 text-primary-foreground shadow-sm",
          "ring-1 ring-primary/35",
          "hover:bg-primary/80 hover:shadow-glow hover:-translate-y-0.5 motion-reduce:hover:translate-y-0",
        ].join(" "),
        destructive: [
          "border-0 bg-destructive/65 text-destructive-foreground shadow-sm",
          "ring-1 ring-destructive/35",
          "hover:bg-destructive/80 hover:-translate-y-0.5 motion-reduce:hover:translate-y-0",
        ].join(" "),
        outline: [
          "border-0 bg-muted/40 text-foreground dark:bg-white/[0.08]",
          "ring-1 ring-border/50 dark:ring-white/10",
          "hover:bg-muted/65 dark:hover:bg-white/[0.14] hover:-translate-y-0.5 motion-reduce:hover:translate-y-0",
        ].join(" "),
        secondary: [
          "border-0 bg-secondary/55 text-secondary-foreground dark:bg-white/[0.08]",
          "ring-1 ring-border/40 dark:ring-white/10",
          "hover:bg-secondary/75 dark:hover:bg-white/[0.14] hover:-translate-y-0.5 motion-reduce:hover:translate-y-0",
        ].join(" "),
        ghost: [
          "border-0 bg-transparent text-muted-foreground backdrop-blur-none",
          "hover:bg-muted/50 hover:text-foreground hover:backdrop-blur-md hover:-translate-y-px motion-reduce:hover:translate-y-0",
          "dark:hover:bg-white/[0.08]",
        ].join(" "),
        link: "border-0 bg-transparent text-primary underline-offset-4 backdrop-blur-none hover:underline active:scale-100",
        glass: [
          "border-0 bg-background/45 text-foreground dark:bg-white/[0.08]",
          "ring-1 ring-border/40 dark:ring-white/12",
          "hover:bg-background/65 dark:hover:bg-white/[0.14] hover:-translate-y-0.5 motion-reduce:hover:translate-y-0",
        ].join(" "),
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-lg px-3 text-xs",
        lg: "h-11 rounded-xl px-6 text-base",
        xl: "h-12 rounded-xl px-8 text-base",
        icon: "h-10 w-10 rounded-xl",
        "icon-sm": "h-8 w-8 rounded-lg",
        "icon-lg": "h-11 w-11 rounded-xl",
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
