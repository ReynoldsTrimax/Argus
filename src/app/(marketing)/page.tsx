import { CapabilitiesSection } from "@/features/marketing/components/capabilities-section";
import { FinalCtaSection } from "@/features/marketing/components/final-cta-section";
import { IntelligenceSection } from "@/features/marketing/components/intelligence-section";
import { LandingHero } from "@/features/marketing/components/landing-hero";
import { LibrarySection } from "@/features/marketing/components/library-section";
import { LightningStage } from "@/features/marketing/components/lightning-stage";
import { PremiseSection } from "@/features/marketing/components/premise-section";
import { getLandingShowcase } from "@/features/marketing/showcase";

/** Public page — cache the TMDB artwork for an hour instead of per visitor. */
export const revalidate = 3600;

/**
 * Landing page — cinematic, near-black, lightning as the design system.
 *
 * Rhythm: one reveal moment per section. Electricity is confined to the hero
 * load sequence, hover feedback, and the closing convergence; everything in
 * between stays calm.
 */
export default async function LandingPage() {
  const showcase = await getLandingShowcase();

  return (
    <>
      <LightningStage>
        <LandingHero posters={showcase.hero} />
      </LightningStage>
      <PremiseSection />
      <CapabilitiesSection />
      <IntelligenceSection />
      <LibrarySection posters={showcase.library} />
      <FinalCtaSection />
    </>
  );
}
