import { CommandTrigger } from "@/components/layout/command-trigger";
import { MobileNav } from "@/components/layout/mobile-nav";
import { UserMenu, type UserMenuUser } from "@/components/layout/user-menu";

interface AppHeaderProps {
  user: UserMenuUser;
}

/**
 * App top bar — search + profile (dark-only product, no theme toggle).
 */
export function AppHeader({ user }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-[var(--header-height)] items-center gap-3 border-b border-border bg-black/95 px-3 sm:px-5 backdrop-blur-sm">
      <MobileNav />
      <div className="hidden flex-1 md:block">
        <CommandTrigger />
      </div>
      <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
        <CommandTrigger compact className="md:hidden" />
        <UserMenu user={user} />
      </div>
    </header>
  );
}
