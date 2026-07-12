"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeft, PanelLeftClose } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";
import { MAIN_NAV, SECONDARY_NAV } from "@/constants/navigation";
import { useUI } from "@/providers/ui-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";

/**
 * Icon rail that expands in place with labels on the same icons.
 * Width is part of layout — content shifts over (no overlap).
 */
export function Sidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed, setSidebarCollapsed } = useUI();
  const reduce = useReducedMotion();
  const expanded = !sidebarCollapsed;

  React.useEffect(() => {
    if (!expanded) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setSidebarCollapsed(true);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded, setSidebarCollapsed]);

  const renderLink = (
    item: (typeof MAIN_NAV)[number] | (typeof SECONDARY_NAV)[number],
  ) => {
    const comingSoon = "comingSoon" in item ? Boolean(item.comingSoon) : false;
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
        aria-label={item.title}
        onClick={(e) => {
          if (comingSoon) e.preventDefault();
        }}
        className={cn(
          "nav-pill group relative flex h-10 w-full items-center rounded-xl text-sm font-medium",
          expanded ? "gap-3 px-2.5" : "justify-center px-0",
          active
            ? "nav-pill-active"
            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground dark:hover:bg-white/[0.06]",
          comingSoon && "cursor-not-allowed opacity-55",
        )}
      >
        {active ? (
          <span
            className="nav-pill-active-bg absolute inset-0 rounded-xl"
            aria-hidden
          />
        ) : null}
        <Icon
          className={cn(
            "relative z-[1] h-[1.1rem] w-[1.1rem] shrink-0",
            active ? "text-foreground" : "group-hover:text-foreground",
          )}
          aria-hidden="true"
        />
        {expanded ? (
          <span
            className={cn(
              "relative z-[1] min-w-0 flex-1 truncate tracking-tight",
              active && "text-foreground",
            )}
          >
            {item.title}
          </span>
        ) : null}
        {expanded && comingSoon ? (
          <Badge variant="muted" className="relative z-[1] shrink-0 text-[10px]">
            Soon
          </Badge>
        ) : null}
      </Link>
    );

    if (!expanded) {
      return (
        <Tooltip key={item.href} delayDuration={200}>
          <TooltipTrigger asChild>{link}</TooltipTrigger>
          <TooltipContent side="right">{item.title}</TooltipContent>
        </Tooltip>
      );
    }

    return <React.Fragment key={item.href}>{link}</React.Fragment>;
  };

  return (
    <motion.aside
      className={cn(
        "sticky top-0 z-40 hidden h-dvh shrink-0 flex-col self-start overflow-hidden md:flex",
        "bg-background text-sidebar-foreground",
      )}
      aria-label="Main navigation"
      initial={false}
      animate={{ width: expanded ? 240 : 64 }}
      transition={
        reduce
          ? { duration: 0 }
          : { type: "spring", stiffness: 420, damping: 38, mass: 0.75 }
      }
    >
      <div
        className={cn(
          "flex h-[var(--header-height)] shrink-0 items-center",
          expanded ? "justify-between gap-2 px-3" : "justify-center",
        )}
      >
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="rounded-xl text-muted-foreground hover:text-foreground"
          onClick={() => setSidebarCollapsed((c) => !c)}
          aria-label={expanded ? "Collapse menu" : "Expand menu"}
          aria-expanded={expanded}
        >
          {expanded ? (
            <PanelLeftClose className="h-4 w-4" />
          ) : (
            <PanelLeft className="h-4 w-4" />
          )}
        </Button>
        <AnimatePresence initial={false}>
          {expanded ? (
            <motion.span
              key="menu-label"
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
            >
              Menu
            </motion.span>
          ) : null}
        </AnimatePresence>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <nav
          className={cn(
            "flex flex-col gap-1 py-2",
            expanded ? "px-2.5" : "items-stretch px-3",
          )}
        >
          {MAIN_NAV.map((item) => renderLink(item))}
        </nav>

        <div
          className={cn(
            "my-2 h-px bg-border/40",
            expanded ? "mx-3" : "mx-auto w-8",
          )}
        />

        <nav
          className={cn(
            "flex flex-col gap-1 pb-3",
            expanded ? "px-2.5" : "items-stretch px-3",
          )}
        >
          {SECONDARY_NAV.map((item) => renderLink(item))}
        </nav>
      </ScrollArea>
    </motion.aside>
  );
}
