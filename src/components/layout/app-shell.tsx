import { Sidebar } from "@/components/layout/sidebar";
import { AppHeader } from "@/components/layout/app-header";
import { PageTransition } from "@/components/layout/page-transition";
import { KeyboardShortcutsProvider } from "@/components/layout/keyboard-shortcuts-provider";
import { CommandPalette } from "@/features/command/command-palette";
import type { UserMenuUser } from "@/components/layout/user-menu";

interface AppShellProps {
  user: UserMenuUser;
  children: React.ReactNode;
}

/**
 * Authenticated application chrome — floating glass layers over ambient depth.
 */
export function AppShell({ user, children }: AppShellProps) {
  return (
    <KeyboardShortcutsProvider>
      <div className="relative flex min-h-dvh w-full bg-black">
        <div
          className="pointer-events-none absolute inset-0 overflow-hidden opacity-40"
          style={{
            background:
              "radial-gradient(ellipse 60% 40% at 10% 0%, hsl(210 100% 56% / 0.12), transparent 55%)",
          }}
          aria-hidden
        />

        <div className="relative z-[1] flex min-h-dvh w-full">
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col border-l border-border bg-black">
            <AppHeader user={user} />
            <main
              id="main-content"
              className="min-w-0 flex-1 overflow-y-auto scroll-smooth bg-black"
            >
              <div className="content-container min-w-0 py-6 sm:py-8 lg:py-10">
                <PageTransition>{children}</PageTransition>
              </div>
            </main>
          </div>
        </div>
        <CommandPalette />
      </div>
    </KeyboardShortcutsProvider>
  );
}
