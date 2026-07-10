import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Solid product buttons — clean elevation, no glass frost.
 */
const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium",
    "transition-[color,background-color,border-color,box-shadow,transform,opacity] duration-250 ease-[cubic-bezier(0.22,1,0.36,1)]",
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
          "bg-primary text-primary-foreground shadow-sm",
          "border border-primary/20",
          "hover:bg-primary/90 hover:shadow-glow hover:-translate-y-0.5 motion-reduce:hover:translate-y-0",
        ].join(" "),
        destructive: [
          "bg-destructive text-destructive-foreground shadow-sm",
          "hover:bg-destructive/90 hover:-translate-y-0.5 motion-reduce:hover:translate-y-0",
        ].join(" "),
        outline: [
          "border border-border bg-card text-foreground shadow-xs",
          "hover:bg-muted hover:border-primary/30 hover:shadow-md hover:-translate-y-0.5 motion-reduce:hover:translate-y-0",
        ].join(" "),
        secondary: [
          "border border-transparent bg-secondary text-secondary-foreground shadow-xs",
          "hover:bg-secondary/80 hover:shadow-sm hover:-translate-y-0.5 motion-reduce:hover:translate-y-0",
        ].join(" "),
        ghost: [
          "text-muted-foreground",
          "hover:bg-muted hover:text-foreground hover:-translate-y-px motion-reduce:hover:translate-y-0",
        ].join(" "),
        link: "text-primary underline-offset-4 hover:underline active:scale-100",
        glass: [
          "border border-border bg-card text-foreground shadow-sm",
          "hover:bg-muted hover:shadow-md hover:-translate-y-0.5 motion-reduce:hover:translate-y-0",
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
