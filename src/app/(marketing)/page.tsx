"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import { ArrowRight, Clapperboard, Layers, Sparkles, Eye } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { APP_DESCRIPTION, APP_NAME, APP_TAGLINE } from "@/constants/app";
import { ROUTES } from "@/constants/routes";
import { card3d, fadeUp, staggerContainer, staggerItem } from "@/animations/variants";
import { springSoft } from "@/animations/motion";

/**
 * Landing page — calm, cinematic, Argus-branded.
 */
export default function LandingPage() {
  const reduce = useReducedMotion();

  return (
    <div className="relative overflow-hidden bg-background">
      <section className="content-container relative z-[1] flex flex-col items-center px-4 pb-20 pt-16 text-center sm:pt-24 lg:pt-28">
        <motion.div
          className="mb-6 inline-flex items-center gap-2 rounded-full border-0 bg-muted/50 dark:bg-white/[0.07] px-3 py-1 text-xs font-medium text-muted-foreground shadow-xs"
          initial={reduce ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <Eye className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
          Your calm entertainment companion
        </motion.div>

        <motion.h1
          className="font-display max-w-3xl text-balance text-[clamp(2.25rem,1.4rem+3.2vw,3.75rem)] font-bold leading-[1.06] tracking-[-0.03em]"
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: 0.05 }}
        >
          One clear view of everything you watch
        </motion.h1>
        <motion.p
          className="text-lead mt-5 max-w-2xl text-muted-foreground text-pretty"
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.12 }}
        >
          {APP_DESCRIPTION}
        </motion.p>

        <motion.div
          className="mt-8 flex flex-col items-center gap-3 sm:flex-row"
          initial={reduce ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.18 }}
        >
          <Button asChild size="lg" className="min-w-[10rem] shadow-glow">
            <Link href={ROUTES.signup}>
              Get started
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="min-w-[10rem]">
            <Link href={ROUTES.login}>Sign in</Link>
          </Button>
        </motion.div>
      </section>

      <section className="content-container relative z-[1] pb-24">
        <motion.div
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          variants={reduce ? undefined : staggerContainer}
          initial={reduce ? false : "hidden"}
          whileInView="visible"
          viewport={{ once: true, margin: "-40px" }}
        >
          <FeatureCard
            icon={Clapperboard}
            title="Poster-first design"
            description="A cinematic UI language inspired by premium streamers — soft depth, not another generic grid."
          />
          <FeatureCard
            icon={Layers}
            title="Built to scale with you"
            description="Library, watchlist, reviews, stats, and insights — all in one comfortable place."
          />
          <FeatureCard
            icon={Sparkles}
            title="Command-driven"
            description="A global command palette for lightning-fast navigation and title search."
          />
        </motion.div>

        <motion.div
          className="mt-16 rounded-[2rem] border-0 bg-muted/40 dark:bg-white/[0.05] p-8 text-center sm:p-12"
          variants={reduce ? undefined : fadeUp}
          initial={reduce ? false : "hidden"}
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
        >
          <p className="text-sm font-medium uppercase tracking-wider text-primary">
            {APP_NAME}
          </p>
          <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            {APP_TAGLINE}
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground text-pretty sm:text-base">
            Discover what to watch next, track what you love, and understand your
            taste — with a calm blue-tinted interface that stays out of your way.
          </p>
          <Button asChild className="mt-6 shadow-glow" size="lg">
            <Link href={ROUTES.signup}>Create your account</Link>
          </Button>
        </motion.div>
      </section>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      variants={reduce ? undefined : staggerItem}
      whileHover={
        reduce
          ? undefined
          : { y: -4, transition: springSoft }
      }
      style={{ transformStyle: "preserve-3d" }}
      className="perspective-soft"
    >
      <Card className="h-full transition-all duration-500 hover:shadow-glow-soft hover:border-primary/25">
        <CardHeader>
          <motion.div
            className="mb-2 flex h-11 w-11 items-center justify-center rounded-2xl glass text-primary"
            variants={reduce ? undefined : card3d}
            whileHover={reduce ? undefined : { scale: 1.08, rotate: -4 }}
            transition={springSoft}
          >
            <Icon className="h-5 w-5" aria-hidden="true" />
          </motion.div>
          <CardTitle className="text-base">{title}</CardTitle>
          <CardDescription className="text-pretty">{description}</CardDescription>
        </CardHeader>
        <CardContent className="pt-0" />
      </Card>
    </motion.div>
  );
}
