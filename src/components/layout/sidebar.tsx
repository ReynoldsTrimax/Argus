"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronsLeft } from "lucide-react";

import { cn } from "@/lib/utils";
import { MAIN_NAV, SECONDARY_NAV, type NavItem } from "@/constants/navigation";
import { LAYOUT } from "@/constants/app";
import { useUI } from "@/providers/ui-provider";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/*
 * Rail geometry — the reason expanding feels calm.
 *
 * The icon column is a fixed 40px box and the rail's own padding is 12px, so
 * `12 + 40/2 = 32` — dead centre of the 64px collapsed rail. The icon column is
 * identical in both states, which means no icon, and not the selected row's
 * fill, ever changes x. Expanding only widens the rail and reveals the labels.
 */

function isNavActive(pathname: string, href: string, comingSoon?: boolean) {
  if (comingSoon) return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}

interface NavRowProps {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
}

/**
 * One rail row. Labels stay mounted in both states — clipped and transparent
 * while collapsed — so they can cross-fade instead of popping, and so the
 * accessible name is always the row's own text.
 */
function NavRow({ item, active, collapsed }: NavRowProps) {
  const comingSoon = Boolean(item.comingSoon);
  const Icon = item.icon;

  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <Link
          href={comingSoon ? "#" : item.href}
          aria-current={active ? "page" : undefined}
          onClick={(event) => {
            if (comingSoon) event.preventDefault();
          }}
          className={cn(
            "flex h-9 w-full items-center overflow-hidden rounded-sm",
            "text-sm font-medium transition-colors duration-150",
            active
              ? "bg-foreground/10 text-foreground"
              : "text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground",
            comingSoon && "cursor-not-allowed opacity-50",
          )}
        >
          <span className="grid w-10 shrink-0 place-items-center">
            <Icon className="size-[1.05rem]" aria-hidden />
          </span>
          <span
            className={cn(
              "min-w-0 flex-1 truncate pr-3 text-left",
              // Expanding: labels arrive just after the rail has opened.
              "transition-opacity delay-[90ms] duration-[120ms] ease-[var(--ease-out)]",
              // Collapsing: they leave first, so the rail never guillotines text.
              "group-data-[collapsed]/rail:opacity-0",
              "group-data-[collapsed]/rail:delay-0",
              "group-data-[collapsed]/rail:duration-[80ms]",
              "motion-reduce:delay-0",
            )}
          >
            {item.title}
          </span>
        </Link>
      </TooltipTrigger>
      {/* Only worth a tooltip while the label is hidden. */}
      {collapsed ? (
        <TooltipContent side="right">{item.title}</TooltipContent>
      ) : null}
    </Tooltip>
  );
}

function NavList({
  items,
  label,
  collapsed,
  pathname,
}: {
  items: readonly NavItem[];
  label: string;
  collapsed: boolean;
  pathname: string;
}) {
  return (
    <nav className="flex flex-col gap-0.5" aria-label={label}>
      {items.map((item) => (
        <NavRow
          key={item.href}
          item={item}
          collapsed={collapsed}
          active={isNavActive(pathname, item.href, item.comingSoon)}
        />
      ))}
    </nav>
  );
}

/**
 * Desktop navigation — a minimal icon rail that widens to show labels.
 * The toggle is the only control, and it sits in the icon column so it
 * doesn't move when the rail does.
 */
export function Sidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed, setSidebarCollapsed } = useUI();

  return (
    <aside
      data-collapsed={sidebarCollapsed || undefined}
      aria-label="Main navigation"
      className={cn(
        "group/rail sticky top-0 z-40 hidden h-dvh shrink-0 flex-col overflow-hidden",
        "border-r border-white/[0.08] bg-background md:flex",
        // Width is layout, not transform — the content pane is a sibling and
        // has to reflow with it. Kept short so it costs few frames.
        "transition-[width] duration-[var(--duration-fast)] ease-[var(--ease-out)]",
        "motion-reduce:transition-none",
      )}
      style={{
        width: sidebarCollapsed
          ? LAYOUT.sidebarCollapsedWidth
          : LAYOUT.sidebarWidth,
      }}
    >
      <div className="flex h-[var(--header-height)] shrink-0 items-center px-3">
        <span className="grid w-10 place-items-center">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="rounded-sm text-muted-foreground hover:text-foreground"
            onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}
            aria-label={sidebarCollapsed ? "Expand menu" : "Collapse menu"}
            aria-expanded={!sidebarCollapsed}
          >
            {/* One glyph that turns, rather than two that swap: the rotation
                rides the same curve and duration as the rail. */}
            <ChevronsLeft
              className={cn(
                "h-4 w-4 transition-transform",
                "duration-[var(--duration-fast)] ease-[var(--ease-out)]",
                "group-data-[collapsed]/rail:rotate-180",
                "motion-reduce:transition-none",
              )}
              aria-hidden
            />
          </Button>
        </span>
      </div>

      <div className="no-scrollbar flex-1 overflow-y-auto px-3 pb-4">
        <NavList
          items={MAIN_NAV}
          label="Primary"
          collapsed={sidebarCollapsed}
          pathname={pathname}
        />

        <div className="my-2 h-px w-full bg-white/[0.08]" aria-hidden />

        <NavList
          items={SECONDARY_NAV}
          label="Secondary"
          collapsed={sidebarCollapsed}
          pathname={pathname}
        />
      </div>
    </aside>
  );
}
