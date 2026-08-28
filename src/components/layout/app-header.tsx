"use client";

import { CommandTrigger } from "@/components/layout/command-trigger";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Logo } from "@/components/layout/logo";
import { UserMenu, type UserMenuUser } from "@/components/layout/user-menu";
import { ROUTES } from "@/constants/routes";

interface AppHeaderProps {
  user: UserMenuUser;
}

/**
 * Frosted top bar: Argus logo + name + search + profile.
 * Nav expand lives on the icon rail.
 */
export function AppHeader({ user }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-40 flex h-[var(--header-height)] items-center gap-2.5 border-b border-border bg-background/85 px-3 backdrop-blur-xl sm:gap-3 sm:px-5 dark:border-white/[0.08]">
      <div className="md:hidden">
        <MobileNav />
      </div>

      {/* Logo + hairline divider, matching the product panel header */}
      <div className="hidden min-w-0 md:block">
        <Logo href={ROUTES.dashboard} divider />
      </div>

      <div className="min-w-0 flex-1" aria-hidden />

      <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
        <CommandTrigger className="hidden md:inline-flex" />
        <CommandTrigger compact className="md:hidden" />
        <UserMenu user={user} />
      </div>
    </header>
  );
}
