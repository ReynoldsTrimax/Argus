import { cn } from "@/lib/utils";

/**
 * Loading skeleton with optional shimmer for perceived performance.
 */
function Skeleton({
  className,
  shimmer = true,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { shimmer?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-xl bg-muted/60",
        shimmer && "skeleton-shimmer",
        !shimmer && "animate-pulse",
        className,
      )}
      aria-hidden="true"
      {...props}
    />
  );
}

export { Skeleton };
