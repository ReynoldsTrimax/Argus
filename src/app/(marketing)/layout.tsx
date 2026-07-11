import { MarketingHeader } from "@/components/layout/marketing-header";
import { getCurrentUser } from "@/lib/services/user-service";

/**
 * Public marketing layout — header + main + minimal footer.
 */
export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let isAuthenticated = false;
  try {
    const user = await getCurrentUser();
    isAuthenticated = Boolean(user);
  } catch {
    // Env may be unset during first boot.
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <MarketingHeader isAuthenticated={isAuthenticated} />
      <main id="main-content" className="flex-1">
        {children}
      </main>
      <footer className="border-t border-border/30 bg-muted/30 py-10 dark:bg-white/[0.03]">
        <div className="content-container flex flex-col items-center justify-between gap-3 text-sm text-muted-foreground sm:flex-row">
          <p>&copy; {new Date().getFullYear()} Argus. Built for long sessions.</p>
          <p className="text-xs tracking-wide">Your calm cinematic hub</p>
        </div>
      </footer>
    </div>
  );
}
