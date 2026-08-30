import Link from "next/link";

import { Logo } from "@/components/layout/logo";
import { APP_NAME } from "@/constants/app";
import { ROUTES } from "@/constants/routes";

/**
 * Public layout for the legal documents.
 *
 * Deliberately not the marketing layout: that header and footer navigate with
 * in-page anchors (#premise and friends) which exist only on the landing page,
 * so reusing it here would ship links that go nowhere. Same dark stage and same
 * wordmark, reduced to what a legal page needs.
 *
 * These routes are absent from PROTECTED_ROUTES, so they stay readable without
 * an account, which is the point of publishing them.
 */
export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="dark landing-stage stage-grain flex min-h-dvh flex-col"
      style={{ colorScheme: "dark" }}
    >
      <header className="sticky top-0 z-30 border-b border-white/[0.07] bg-[hsl(0_0%_2%/0.72)] backdrop-blur-xl">
        <div className="content-container flex h-[var(--header-height)] items-center justify-between gap-6">
          <Logo />
          <Link
            href={ROUTES.home}
            className="landing-mono rounded-sm transition-colors duration-200 hover:text-white/80"
          >
            Back to site
          </Link>
        </div>
      </header>

      <main id="main-content" className="flex-1">
        {children}
      </main>

      <footer className="border-t border-white/[0.07]">
        <div className="content-container flex flex-col gap-4 py-10 sm:flex-row sm:items-center sm:justify-between">
          <p className="landing-mono">
            © {new Date().getFullYear()} {APP_NAME}
          </p>
          <nav aria-label="Legal" className="flex flex-wrap gap-x-6 gap-y-2">
            <Link
              href={ROUTES.privacy}
              className="landing-mono rounded-sm transition-colors duration-200 hover:text-white/80"
            >
              Privacy Policy
            </Link>
            <Link
              href={ROUTES.terms}
              className="landing-mono rounded-sm transition-colors duration-200 hover:text-white/80"
            >
              Terms of Service
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
