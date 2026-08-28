import { ArrowRight } from "lucide-react";

import { APP_DESCRIPTION } from "@/constants/app";
import { ROUTES } from "@/constants/routes";
import { ElectricCta } from "./electric-cta";
import { ProductComposition } from "./product-composition";
import type { ShowcasePoster } from "../showcase";

/**
 * Hero — darkness → tension → illumination → calm.
 *
 * The whole load sequence is CSS keyframes with staggered delays (see
 * `.lx-charge` / `.lx-rise` in globals.css). It is present in the server HTML,
 * so it starts before hydration and cannot be starved by JS work on load.
 * The headline leads; nothing is placed above it. Total runtime ~1.2s.
 */
export function LandingHero({ posters = [] }: { posters?: ShowcasePoster[] }) {
  return (
    <section className="relative flex min-h-[calc(100svh-var(--header-height))] flex-col justify-center pt-16 pb-24 sm:pb-28 lg:pt-20 lg:pb-32">
      <div className="content-container relative z-[1]">
        <div className="grid items-center gap-16 lg:grid-cols-12 lg:gap-8">
          {/* —— Copy —— */}
          <div className="lg:col-span-6">
            <h1 className="landing-display text-silver">
              <span className="lx-charge block" style={{ animationDelay: "220ms" }}>
                One clear view
              </span>
              <span className="lx-charge block" style={{ animationDelay: "300ms" }}>
                of <span className="charged-word">everything</span>
              </span>
              <span className="lx-charge block" style={{ animationDelay: "380ms" }}>
                you watch
              </span>
            </h1>

            <p
              className="landing-lead lx-charge mt-8 max-w-xl"
              style={{ animationDelay: "460ms" }}
            >
              {APP_DESCRIPTION}
            </p>

            <div
              className="lx-rise mt-10 flex flex-col gap-3 sm:flex-row sm:items-center"
              style={{ animationDelay: "540ms" }}
            >
              <ElectricCta href={ROUTES.signup}>
                Get started
                <ArrowRight className="lx-cta__arrow h-4 w-4" aria-hidden="true" />
              </ElectricCta>
              <ElectricCta href={ROUTES.login} variant="secondary">
                Sign in
              </ElectricCta>
            </div>

            <div className="lx-rise mt-14" style={{ animationDelay: "620ms" }}>
              <div
                className="h-px w-full max-w-md bg-[linear-gradient(90deg,hsl(0_0%_100%/0.16),transparent)]"
                aria-hidden="true"
              />
              <p className="landing-mono mt-4">
                Movies · Series · Anime · Documentaries · Limited series
              </p>
            </div>
          </div>

          {/* —— Product —— */}
          <div className="lg:col-span-6 lg:-mr-6 xl:-mr-14">
            <ProductComposition posters={posters} />
          </div>
        </div>
      </div>

      {/* Explore cue — keyboard reachable, smooth-scrolls via global CSS */}
      <div className="absolute bottom-8 left-1/2 hidden -translate-x-1/2 lg:block">
        <a
          href="#premise"
          className="lx-rise group flex flex-col items-center gap-2 rounded-sm px-2 py-1"
          style={{ animationDelay: "780ms" }}
        >
          <span className="landing-mono transition-colors duration-200 group-hover:text-white/75">
            Explore
          </span>
          <span
            className="h-8 w-px bg-[linear-gradient(180deg,hsl(0_0%_100%/0.34),transparent)]"
            aria-hidden="true"
          />
        </a>
      </div>
    </section>
  );
}
