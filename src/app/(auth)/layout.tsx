import Link from "next/link";

import { Logo } from "@/components/layout/logo";
import { ROUTES } from "@/constants/routes";

/**
 * Auth layout — centered card (dark-only product).
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="flex items-center justify-between border-b border-border bg-card px-4 py-4 sm:px-6">
        <Logo href={ROUTES.home} />
      </header>
      <main
        id="main-content"
        className="flex flex-1 items-center justify-center px-4 py-8"
      >
        <div className="w-full max-w-md">{children}</div>
      </main>
      <footer className="pb-6 text-center text-xs text-muted-foreground">
        <Link href={ROUTES.home} className="hover:text-foreground hover:underline">
          Back to home
        </Link>
      </footer>
    </div>
  );
}
