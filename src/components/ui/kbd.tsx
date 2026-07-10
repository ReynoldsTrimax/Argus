import { cn } from "@/lib/utils";

/**
 * Keyboard key visual for shortcut documentation.
 */
export function Kbd({
  className,
  ...props
}: React.HTMLAttributes<HTMLElement>) {
  return (
    <kbd
      className={cn(
        "pointer-events-none inline-flex h-6 min-w-6 select-none items-center justify-center rounded-md border border-border bg-muted px-1.5 font-mono text-[11px] font-medium text-muted-foreground shadow-xs",
        className,
      )}
      {...props}
    />
  );
}
