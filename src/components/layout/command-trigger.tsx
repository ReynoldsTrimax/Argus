"use client";

import { useUI } from "@/providers/ui-provider";
import { CommandMenuTrigger } from "@/components/unlumen-ui/command-menu";
import { cn } from "@/lib/utils";

interface CommandTriggerProps {
  className?: string;
  compact?: boolean;
}

/**
 * Search trigger — Unlumen CommandMenu chrome, opens Argus media palette.
 */
export function CommandTrigger({ className, compact }: CommandTriggerProps) {
  const { setCommandOpen } = useUI();

  return (
    <CommandMenuTrigger
      label="Search"
      shortcut="K"
      showShortcut={!compact}
      compact={compact}
      className={cn(compact ? undefined : "w-auto min-w-[11rem]", className)}
      onClick={() => setCommandOpen(true)}
    />
  );
}
