"use client";

import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useUI } from "@/providers/ui-provider";
import { cn } from "@/lib/utils";

interface CommandTriggerProps {
  className?: string;
  compact?: boolean;
}

/**
 * Spotlight-style search trigger — visual only.
 */
export function CommandTrigger({ className, compact }: CommandTriggerProps) {
  const { setCommandOpen } = useUI();

  if (compact) {
    return (
      <Button
        type="button"
        variant="glass"
        size="icon-sm"
        className={className}
        onClick={() => setCommandOpen(true)}
        aria-label="Open search"
      >
        <Search className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setCommandOpen(true)}
      className={cn(
        "group inline-flex h-10 w-full max-w-md items-center gap-2.5 rounded-xl px-3.5 text-sm",
        "border-0 bg-muted/50 text-muted-foreground shadow-none backdrop-blur-md dark:bg-white/[0.06]",
        "transition-colors duration-200",
        "hover:bg-muted/80 hover:text-foreground dark:hover:bg-white/[0.1]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        className,
      )}
      aria-label="Open command menu"
    >
      <Search
        className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary"
        aria-hidden="true"
      />
      <span className="flex-1 truncate text-left tracking-tight">
        Search movies, shows, people…
      </span>
      <kbd className="pointer-events-none hidden h-6 select-none items-center gap-1 rounded-md border-0 bg-background/50 px-1.5 font-mono text-[10px] font-medium text-muted-foreground dark:bg-white/[0.08] sm:inline-flex">
        <span className="text-xs">⌘</span>K
      </kbd>
    </button>
  );
}
