"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { PanelLeft, PanelLeftClose } from "lucide-react";

import { MAIN_NAV, SECONDARY_NAV, type NavItem } from "@/constants/navigation";
import { LAYOUT } from "@/constants/app";
import { useUI } from "@/providers/ui-provider";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Sidebar001,
  Sidebar001Content,
  Sidebar001Footer,
  Sidebar001Header,
  Sidebar001Item,
  Sidebar001Separator,
  useSidebar001Collapsed,
} from "@/components/unlumen-ui/sidebar-001";

function isNavActive(pathname: string, href: string, comingSoon?: boolean) {
  if (comingSoon) return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavItems({ items }: { items: readonly NavItem[] }) {
  const pathname = usePathname();
  const collapsed = useSidebar001Collapsed();

  return (
    <>
      {items.map((item) => {
        const comingSoon = Boolean(item.comingSoon);
        const active = isNavActive(pathname, item.href, comingSoon);
        const Icon = item.icon;

        const itemNode = (
          <Sidebar001Item
            href={comingSoon ? "#" : item.href}
            label={item.title}
            icon={<Icon aria-hidden />}
            isActive={active}
            isNew={comingSoon}
            onClick={(e) => {
              if (comingSoon) e.preventDefault();
            }}
            className={
              comingSoon
                ? "pointer-events-auto cursor-not-allowed opacity-60"
                : undefined
            }
          />
        );

        if (collapsed) {
          return (
            <Tooltip key={item.href} delayDuration={200}>
              <TooltipTrigger asChild>
                <div className="flex justify-center">{itemNode}</div>
              </TooltipTrigger>
              <TooltipContent side="right">{item.title}</TooltipContent>
            </Tooltip>
          );
        }

        return <React.Fragment key={item.href}>{itemNode}</React.Fragment>;
      })}
    </>
  );
}

function SidebarChrome() {
  const { sidebarCollapsed, setSidebarCollapsed } = useUI();
  const collapsed = useSidebar001Collapsed();

  return (
    <Sidebar001Header
      className={
        collapsed
          ? "flex justify-center px-2 pt-3.5 pb-1.5"
          : "flex items-center justify-end px-5 pt-4 pb-1.5 sm:px-6"
      }
    >
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="rounded-[10px] text-muted-foreground hover:text-foreground"
        onClick={() => setSidebarCollapsed((c) => !c)}
        aria-label={sidebarCollapsed ? "Expand menu" : "Collapse menu"}
        aria-expanded={!sidebarCollapsed}
      >
        {sidebarCollapsed ? (
          <PanelLeft className="h-4 w-4" />
        ) : (
          <PanelLeftClose className="h-4 w-4" />
        )}
      </Button>
    </Sidebar001Header>
  );
}

/**
 * Desktop navigation — Unlumen list spacing & hover, collapsible.
 */
export function Sidebar() {
  const { sidebarCollapsed, setSidebarCollapsed } = useUI();

  React.useEffect(() => {
    if (sidebarCollapsed) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setSidebarCollapsed(true);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sidebarCollapsed, setSidebarCollapsed]);

  return (
    <Sidebar001
      className="sticky top-0 z-40 hidden h-dvh border-r border-border/30 md:flex"
      collapsed={sidebarCollapsed}
      collapsedWidth={LAYOUT.sidebarCollapsedWidth}
      defaultWidth={268}
      minWidth={228}
      maxWidth={340}
    >
      <SidebarChrome />

      <Sidebar001Content className={sidebarCollapsed ? "px-0" : undefined}>
        {/* Tight vertical stack — matches Unlumen rail density */}
        <nav className="flex flex-col gap-0" aria-label="Primary">
          <NavItems items={MAIN_NAV} />
        </nav>

        <Sidebar001Separator />

        <nav className="flex flex-col gap-0" aria-label="Secondary">
          <NavItems items={SECONDARY_NAV} />
        </nav>
      </Sidebar001Content>

      {!sidebarCollapsed ? (
        <Sidebar001Footer>
          <p className="px-1 text-[11px] leading-relaxed text-muted-foreground/55">
            Esc to collapse · drag edge to resize
          </p>
        </Sidebar001Footer>
      ) : null}
    </Sidebar001>
  );
}
