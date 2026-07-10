import * as React from "react";

import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[96px] w-full rounded-xl border border-input bg-card px-3.5 py-2.5 text-sm",
        "shadow-xs",
        "transition-[border-color,box-shadow,background-color] duration-250 ease-out",
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
});
Textarea.displayName = "Textarea";

export { Textarea };
