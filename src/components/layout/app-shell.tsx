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
 * Icon rail + content side by side. Expanding the menu grows the rail and
 * pushes the main column over — nothing stacks on top of posters.
 */
export function AppShell({ user, children }: AppShellProps) {
  return (
    <KeyboardShortcutsProvider>
      <div className="relative flex min-h-dvh w-full bg-background">
        <div
          className="pointer-events-none absolute inset-0 overflow-hidden opacity-50 dark:opacity-40"
          style={{
            background:
              "radial-gradient(ellipse 60% 40% at 10% 0%, hsl(210 100% 56% / 0.1), transparent 55%)",
          }}
          aria-hidden
        />

        <div className="relative z-[1] flex min-h-dvh w-full">
          <Sidebar />
          <div className="relative z-0 flex min-w-0 flex-1 flex-col bg-background">
            <AppHeader user={user} />
            <main
              id="main-content"
              className="relative z-0 min-w-0 flex-1 isolate overflow-y-auto scroll-smooth bg-background"
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
