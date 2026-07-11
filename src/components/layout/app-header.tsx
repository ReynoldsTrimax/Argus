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
    <header className="sticky top-0 z-40 flex h-[var(--header-height)] items-center gap-2.5 border-b border-border/20 bg-background/70 px-3 sm:gap-3 sm:px-5 backdrop-blur-xl supports-[backdrop-filter]:bg-background/55">
      <div className="md:hidden">
        <MobileNav />
      </div>

      {/* Logo merges into the transparent top bar (desktop; rail sits left) */}
      <div className="hidden min-w-0 md:block">
        <Logo href={ROUTES.dashboard} showWordmark />
      </div>

      <div className="min-w-0 flex-1">
        <div className="hidden md:block">
          <CommandTrigger />
        </div>
      </div>

      <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
        <CommandTrigger compact className="md:hidden" />
        <UserMenu user={user} />
      </div>
    </header>
  );
}
