"use client";

import { useRef } from "react";
import { ArrowRight } from "lucide-react";
import { useInView } from "framer-motion";

import { APP_TAGLINE } from "@/constants/app";
import { ROUTES } from "@/constants/routes";
import { ElectricCta } from "./electric-cta";

/**
 * Closing section — the only other place on the page allowed a flash.
 *
 * Two hairlines converge and spark at the meeting point, the tagline charges in
 * at the same scale as the hero headline (the page's two poles), then it
 * settles. Fires once.
 */
export function FinalCtaSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const visible = inView ? "true" : "false";

  return (
    <section className="relative overflow-hidden border-t border-white/[0.07]">
      <div
        ref={ref}
        data-visible={visible}
        className="content-container relative py-28 text-center sm:py-36"
      >
        <div
          key={visible}
          data-strike={inView ? "idle" : undefined}
          className="stage-flash stage-flash--center pointer-events-none absolute inset-0 -z-10"
          aria-hidden="true"
        />

        <div className="mx-auto flex max-w-xl items-center gap-4" aria-hidden="true">
          <span className="lx-converge flex-1" data-from="right" />
          <span className="lx-node shrink-0" />
          <span className="lx-converge flex-1" />
        </div>

        <div
          className="lx-reveal mx-auto mt-12 max-w-4xl"
          data-motion="charge"
          data-visible={visible}
          style={{ animationDelay: "300ms" }}
        >
          <h2 className="landing-display text-silver">{APP_TAGLINE}</h2>
        </div>

        <div
          className="lx-reveal mx-auto mt-8 max-w-xl"
          data-visible={visible}
          style={{ animationDelay: "420ms" }}
        >
          <p className="landing-lead">
            One account, one library, one clear picture of everything you have watched and
            everything you still want to.
          </p>
        </div>

        <div
          className="lx-reveal mt-12 flex flex-col items-center justify-center gap-3 sm:flex-row"
          data-visible={visible}
          style={{ animationDelay: "520ms" }}
        >
          <ElectricCta href={ROUTES.signup}>
            Create your account
            <ArrowRight className="lx-cta__arrow h-4 w-4" aria-hidden="true" />
          </ElectricCta>
          <ElectricCta href={ROUTES.login} variant="secondary">
            Sign in
          </ElectricCta>
        </div>
      </div>
    </section>
  );
}
