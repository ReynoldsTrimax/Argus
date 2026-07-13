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
        "pointer-events-none inline-flex h-6 min-w-6 select-none items-center justify-center rounded-md border-0 bg-muted/70 px-1.5 font-mono text-[11px] font-medium text-muted-foreground dark:bg-white/[0.08]",
        className,
      )}
      {...props}
    />
  );
}

/** Groups adjacent kbd chips (e.g. ⌘ K). */
export function KbdGroup({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn("inline-flex items-center gap-0.5", className)}
      {...props}
    />
  );
}
