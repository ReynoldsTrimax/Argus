import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Glass-aware text input.
 */
const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-xl border border-input bg-card px-3.5 py-2 text-sm",
          "shadow-xs",
          "transition-[border-color,box-shadow,background-color] duration-250 ease-out",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
          "placeholder:text-muted-foreground",
          "focus-visible:outline-none focus-visible:border-primary/40",
          "focus-visible:ring-2 focus-visible:ring-ring/35",
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
