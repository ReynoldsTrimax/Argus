import Link from "next/link";

import { cn } from "@/lib/utils";

interface ShelfTab {
  label: string;
  href: string;
  active: boolean;
}

/**
 * Switches between the filterable catalog and the fixed top-rated shelf.
 *
 * Links rather than buttons: each shelf is a distinct URL, so it should be
 * shareable and survive a reload. A Server Component for the same reason —
 * there is no state to hold.
 */
export function MediaShelfTabs({ tabs }: { tabs: ShelfTab[] }) {
  return (
    <nav className="flex flex-wrap gap-1.5" aria-label="Shelf">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          aria-current={tab.active ? "page" : undefined}
          className={cn(
            "focus-visible:ring-ring inline-flex items-center rounded-sm border px-3 py-1.5",
            "text-xs font-medium transition-colors duration-200",
            "focus-visible:ring-2 focus-visible:outline-none",
            tab.active
              ? "border-primary/55 bg-primary/15 text-foreground"
              : "border-border text-muted-foreground hover:border-primary/40 hover:bg-accent hover:text-foreground dark:border-white/12",
          )}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
