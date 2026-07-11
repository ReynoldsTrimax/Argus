import Link from "next/link";

import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";

interface MarketingHeaderProps {
  isAuthenticated?: boolean;
}

/**
 * Public marketing header — dark-only product chrome.
 */
export function MarketingHeader({ isAuthenticated }: MarketingHeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-border/40 bg-background/70 backdrop-blur-xl">
      <div className="content-container flex h-[var(--header-height)] items-center justify-between gap-4">
        <Logo />
        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <Button asChild size="sm">
              <Link href={ROUTES.dashboard}>Open app</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                <Link href={ROUTES.login}>Sign in</Link>
              </Button>
              <Button asChild size="sm">
                <Link href={ROUTES.signup}>Get started</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
