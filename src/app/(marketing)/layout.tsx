import Link from "next/link";

import { MarketingHeader } from "@/components/layout/marketing-header";
import { APP_NAME } from "@/constants/app";
import { ROUTES } from "@/constants/routes";
import { LANDING_SECTIONS } from "@/features/marketing/sections";
import { getCurrentUser } from "@/lib/services/user-service";

/**
 * Public marketing layout.
 *
 * The landing page is a deliberately dark stage regardless of the visitor's OS
 * theme, so `dark` and `landing-stage` are scoped here: the product UI still
 * follows the system theme, only this route group is pinned.
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
    <div
      className="dark landing-stage stage-grain flex min-h-dvh flex-col"
      style={{ colorScheme: "dark" }}
    >
      <MarketingHeader isAuthenticated={isAuthenticated} />

      <main id="main-content" className="flex-1">
        {children}
      </main>

      <footer className="border-t border-white/[0.07]">
        <div className="content-container flex flex-col gap-6 py-10 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1.5">
            <p className="landing-mono">
              © {new Date().getFullYear()} {APP_NAME}
            </p>

            {/*
              Credit line. Same mono treatment as the copyright rather than a
              styled signature block — on a page this quiet, a byline that asks
              for attention is the one thing that would look out of place.
            */}
            <p className="landing-mono">By Ishaan &amp; Paarth</p>
          </div>

          {/*
            The header nav collapses below `lg`, so the footer is the only place
            small screens can jump between sections. It also keeps the footer
            from simply repeating the tagline the closing headline just said.
          */}
          <div className="flex flex-col gap-3 sm:items-end">
            <nav aria-label="Sections" className="flex flex-wrap gap-x-6 gap-y-2">
              {LANDING_SECTIONS.map((section) => (
                <a
                  key={section.href}
                  href={section.href}
                  className="landing-mono rounded-sm transition-colors duration-200 hover:text-white/80"
                >
                  {section.label}
                </a>
              ))}
            </nav>

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
        </div>
      </footer>
    </div>
  );
}
