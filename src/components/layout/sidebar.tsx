"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronsLeft, ChevronsRight } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";
import { MAIN_NAV, SECONDARY_NAV } from "@/constants/navigation";
import { ROUTES } from "@/constants/routes";
import { useUI } from "@/providers/ui-provider";
import { Logo } from "@/components/layout/logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { springSnappy } from "@/animations/motion";

/**
 * App sidebar with animated active pill + soft nav motion.
 */
export function Sidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed, setSidebarCollapsed } = useUI();
  const reduce = useReducedMotion();

  const renderLink = (
    item: (typeof MAIN_NAV)[number] | (typeof SECONDARY_NAV)[number],
    opts?: { comingSoon?: boolean },
  ) => {
    const comingSoon = "comingSoon" in item ? Boolean(item.comingSoon) : Boolean(opts?.comingSoon);
    const active =
      !comingSoon &&
      (pathname === item.href || pathname.startsWith(`${item.href}/`));
    const Icon = item.icon;

    const link = (
      <Link
        key={item.href}
        href={comingSoon ? "#" : item.href}
        aria-disabled={comingSoon}
        aria-current={active ? "page" : undefined}
        onClick={(e) => {
          if (comingSoon) e.preventDefault();
        }}
        className={cn(
          "nav-pill group relative flex items-center gap-3 px-2.5 py-2.5 text-sm font-medium",
          active
            ? "text-primary"
            : "text-muted-foreground hover:bg-white/8 hover:text-foreground dark:hover:bg-white/6",
          comingSoon && "cursor-not-allowed opacity-55",
          sidebarCollapsed && "justify-center px-0",
        )}
      >
        {active && !reduce ? (
          <motion.span
            layoutId="sidebar-active-pill"
            className="absolute inset-0 rounded-[var(--radius-lg)] bg-primary/12 shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.22)]"
            transition={{ type: "spring", stiffness: 380, damping: 32, mass: 0.7 }}
            aria-hidden
          />
        ) : active ? (
          <span
            className="absolute inset-0 rounded-[var(--radius-lg)] bg-primary/12 shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.22)]"
            aria-hidden
          />
        ) : null}
        <Icon
          className={cn(
            "relative z-[1] h-[1.05rem] w-[1.05rem] shrink-0 transition-transform duration-300",
            !active && "group-hover:scale-110 group-hover:text-primary",
            active && "text-primary",
          )}
          aria-hidden="true"
        />
        {!sidebarCollapsed ? (
          <>
            <span className="relative z-[1] flex-1 truncate tracking-tight">
              {item.title}
            </span>
            {comingSoon ? (
              <Badge variant="muted" className="relative z-[1] text-[10px]">
                Soon
              </Badge>
            ) : null}
          </>
        ) : null}
      </Link>
    );

    if (sidebarCollapsed) {
      return (
        <Tooltip key={item.href} delayDuration={0}>
          <TooltipTrigger asChild>{link}</TooltipTrigger>
          <TooltipContent side="right">
            {item.title}
            {comingSoon ? " (coming soon)" : ""}
          </TooltipContent>
        </Tooltip>
      );
    }
    return link;
  };

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-dvh shrink-0 flex-col self-start",
        "border-r border-sidebar-border bg-sidebar text-sidebar-foreground",
        "transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
        "md:flex",
        sidebarCollapsed ? "w-16" : "w-60",
      )}
      aria-label="Main navigation"
    >
      <div
        className={cn(
          "flex h-[var(--header-height)] items-center border-b border-sidebar-border px-3",
          sidebarCollapsed ? "justify-center" : "justify-between gap-2",
        )}
      >
        <Logo
          href={ROUTES.dashboard}
          showWordmark={!sidebarCollapsed}
          className={sidebarCollapsed ? "justify-center" : undefined}
        />
        {!sidebarCollapsed ? (
          <motion.div whileTap={reduce ? undefined : { scale: 0.9 }} transition={springSnappy}>
            <Button
              variant="ghost"
              size="icon-sm"
              className="rounded-xl text-muted-foreground hover:text-foreground"
              onClick={() => setSidebarCollapsed(true)}
              aria-label="Collapse sidebar"
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
          </motion.div>
        ) : null}
      </div>

      <ScrollArea className="flex-1 px-2.5 py-4">
        <nav className="flex flex-col gap-1">
          {MAIN_NAV.map((item) => renderLink(item))}
        </nav>

        <Separator className="my-4 opacity-40" />

        <nav className="flex flex-col gap-1">
          {SECONDARY_NAV.map((item) => renderLink(item))}
        </nav>
      </ScrollArea>

      {sidebarCollapsed ? (
        <div className="border-t border-sidebar-border p-2">
          <motion.div whileTap={reduce ? undefined : { scale: 0.92 }} transition={springSnappy}>
            <Button
              variant="ghost"
              size="icon-sm"
              className="w-full rounded-xl"
              onClick={() => setSidebarCollapsed(false)}
              aria-label="Expand sidebar"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </motion.div>
        </div>
      ) : null}
    </aside>
  );
}
