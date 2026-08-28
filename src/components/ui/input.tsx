import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Boxy text input — hairline border, razor corners, electric focus edge.
 */
const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-sm border border-border bg-card px-3.5 py-2 text-sm dark:border-white/10",
          "transition-[border-color,box-shadow,background-color] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
          "placeholder:text-muted-foreground",
          "hover:border-border/80 dark:hover:border-white/20",
          "focus-visible:border-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "aria-invalid:border-destructive aria-invalid:ring-destructive/30",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
