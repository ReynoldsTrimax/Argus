"use client";

import { Search } from "lucide-react";

import { useUI } from "@/providers/ui-provider";
import { cn } from "@/lib/utils";

interface CommandTriggerProps {
  className?: string;
  compact?: boolean;
}

/**
 * Compact search button with shortcut — opens the spotlight palette.
 */
export function CommandTrigger({ className, compact }: CommandTriggerProps) {
  const { setCommandOpen } = useUI();

  return (
    <button
      type="button"
      onClick={() => setCommandOpen(true)}
      className={cn(
        "group inline-flex h-9 items-center gap-2 rounded-xl px-2.5 text-sm",
        "border-0 bg-muted/40 text-muted-foreground shadow-none backdrop-blur-md",
        "ring-1 ring-border/40 dark:bg-white/[0.08] dark:ring-white/10",
        "transition-colors duration-200",
        "hover:bg-muted/65 hover:text-foreground dark:hover:bg-white/[0.14]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        compact ? "h-9 w-9 justify-center px-0" : "pr-1.5",
        className,
      )}
      aria-label="Open search"
    >
      <Search
        className={cn(
          "h-4 w-4 shrink-0 text-muted-foreground group-hover:text-foreground",
          !compact && "ml-0.5",
        )}
        aria-hidden="true"
      />
      {compact ? null : (
        <>
          <span className="hidden tracking-tight sm:inline">Search</span>
          <kbd className="pointer-events-none ml-0.5 hidden h-6 select-none items-center gap-0.5 rounded-md border-0 bg-background/60 px-1.5 font-mono text-[10px] font-medium text-muted-foreground dark:bg-black/35 sm:inline-flex">
            <span className="text-xs leading-none">⌘</span>K
          </kbd>
        </>
      )}
    </button>
  );
}
