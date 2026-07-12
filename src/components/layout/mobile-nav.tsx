"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";

import { cn } from "@/lib/utils";
import { MAIN_NAV, SECONDARY_NAV } from "@/constants/navigation";
import { useUI } from "@/providers/ui-provider";
import { Logo } from "@/components/layout/logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ROUTES } from "@/constants/routes";

/**
 * Mobile navigation drawer for screens below the md breakpoint.
 */
export function MobileNav() {
  const pathname = usePathname();
  const { mobileNavOpen, setMobileNavOpen } = useUI();

  return (
    <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className="md:hidden"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[min(100%,20rem)] p-0">
        <SheetHeader className="border-0 px-4 py-4 text-left">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <Logo href={ROUTES.dashboard} />
        </SheetHeader>
        <nav className="flex flex-col gap-1 p-3" aria-label="Mobile navigation">
          {[...MAIN_NAV, ...SECONDARY_NAV].map((item, index) => {
            const showSeparator = index === MAIN_NAV.length;
            const active =
              !item.comingSoon &&
              (pathname === item.href || pathname.startsWith(`${item.href}/`));
            const Icon = item.icon;

            return (
              <div key={item.href}>
                {showSeparator ? <Separator className="my-2 opacity-25" /> : null}
                <Link
                  href={item.comingSoon ? "#" : item.href}
                  aria-disabled={item.comingSoon}
                  aria-current={active ? "page" : undefined}
                  onClick={(e) => {
                    if (item.comingSoon) {
                      e.preventDefault();
                      return;
                    }
                    setMobileNavOpen(false);
                  }}
                  className={cn(
                    "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                    active
                      ? "nav-pill-active text-foreground"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                    item.comingSoon && "cursor-not-allowed opacity-60",
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
                      "relative z-[1] h-4 w-4",
                      active && "text-foreground",
                    )}
                    aria-hidden="true"
                  />
                  <span
                    className={cn(
                      "relative z-[1] flex-1",
                      active && "text-foreground",
                    )}
                  >
                    {item.title}
                  </span>
                  {item.comingSoon ? (
                    <Badge variant="muted" className="relative z-[1] text-[10px]">
                      Soon
                    </Badge>
                  ) : null}
                </Link>
              </div>
            );
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
