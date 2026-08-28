import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

/**
 * Reusable empty state for lists, libraries, and future feature placeholders.
 *
 * Uses the shared `stagger-children` utility (fade-up, 45ms steps) rather than
 * a bespoke entrance — an empty state is a first-run surface, which is where the
 * delight budget belongs. CSS-only, so this stays a Server Component.
 */
export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "stagger-children bg-muted/35 flex flex-col items-center justify-center rounded-2xl border-0 px-6 py-16 text-center dark:bg-white/[0.04]",
        className,
      )}
      role="status"
    >
      <div className="bg-muted mb-4 flex h-12 w-12 items-center justify-center rounded-2xl">
        <Icon className="text-muted-foreground h-6 w-6" aria-hidden="true" />
      </div>
      <h3 className="text-base font-semibold tracking-tight">{title}</h3>
      {description ? (
        <p className="text-muted-foreground mt-1.5 max-w-sm text-sm text-pretty">
          {description}
        </p>
      ) : null}
      {actionLabel && onAction ? (
        <Button className="mt-5" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
