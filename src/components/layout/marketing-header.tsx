import { Logo } from "@/components/layout/logo";
import { ROUTES } from "@/constants/routes";
import { ElectricCta } from "@/features/marketing/components/electric-cta";
import { LANDING_SECTIONS } from "@/features/marketing/sections";

interface MarketingHeaderProps {
  isAuthenticated?: boolean;
}

/**
 * Public marketing header — hairline chrome over the dark stage.
 */
export function MarketingHeader({ isAuthenticated }: MarketingHeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-white/[0.07] bg-[hsl(0_0%_2%/0.72)] backdrop-blur-xl">
      <div className="content-container flex h-[var(--header-height)] items-center justify-between gap-6">
        <Logo />

        <nav aria-label="Sections" className="hidden items-center gap-8 lg:flex">
          {LANDING_SECTIONS.map((section) => (
            <a
              key={section.href}
              href={section.href}
              className="landing-mono transition-colors duration-200 hover:text-white/80"
            >
              {section.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <ElectricCta href={ROUTES.dashboard} size="sm">
              Open app
            </ElectricCta>
          ) : (
            <>
              <ElectricCta href={ROUTES.login} variant="secondary" size="sm">
                Sign in
              </ElectricCta>
              <ElectricCta href={ROUTES.signup} size="sm">
                Get started
              </ElectricCta>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
