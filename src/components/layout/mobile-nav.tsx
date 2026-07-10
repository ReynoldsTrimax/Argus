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
        <SheetHeader className="border-b border-border px-4 py-4 text-left">
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
                {showSeparator ? <Separator className="my-2" /> : null}
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
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent/70 hover:text-accent-foreground",
                    item.comingSoon && "cursor-not-allowed opacity-60",
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  <span className="flex-1">{item.title}</span>
                  {item.comingSoon ? (
                    <Badge variant="muted" className="text-[10px]">
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
