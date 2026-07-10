import Link from "next/link";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PaginationControlsProps {
  page: number;
  totalPages: number;
  basePath: string;
  searchParams?: Record<string, string | undefined>;
  className?: string;
}

function hrefFor(
  basePath: string,
  page: number,
  searchParams?: Record<string, string | undefined>,
) {
  const params = new URLSearchParams();
  Object.entries(searchParams ?? {}).forEach(([k, v]) => {
    if (v && k !== "page") params.set(k, v);
  });
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

/**
 * Simple previous / next pagination for browse pages.
 */
export function PaginationControls({
  page,
  totalPages,
  basePath,
  searchParams,
  className,
}: PaginationControlsProps) {
  if (totalPages <= 1) return null;
  const capped = Math.min(totalPages, 500);

  return (
    <nav
      className={cn("flex items-center justify-center gap-3 pt-4", className)}
      aria-label="Pagination"
    >
      <Button asChild variant="outline" size="sm" disabled={page <= 1}>
        <Link
          href={hrefFor(basePath, Math.max(1, page - 1), searchParams)}
          aria-disabled={page <= 1}
          className={page <= 1 ? "pointer-events-none opacity-50" : undefined}
        >
          Previous
        </Link>
      </Button>
      <span className="text-sm text-muted-foreground tabular-nums">
        Page {page} of {capped}
      </span>
      <Button asChild variant="outline" size="sm" disabled={page >= capped}>
        <Link
          href={hrefFor(basePath, Math.min(capped, page + 1), searchParams)}
          aria-disabled={page >= capped}
          className={page >= capped ? "pointer-events-none opacity-50" : undefined}
        >
          Next
        </Link>
      </Button>
    </nav>
  );
}
