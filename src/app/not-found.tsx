import Link from "next/link";
import { Film } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";

/**
 * Global 404 page — cinematic empty state.
 */
export default function NotFound() {
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-4 text-center">
      <div
        className="pointer-events-none absolute inset-0 gradient-mesh dark:gradient-mesh-dark opacity-60"
        aria-hidden
      />
      <div className="relative">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
          <Film className="h-6 w-6" aria-hidden />
        </div>
        <p className="text-sm font-medium text-primary">404</p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">
          Page not found
        </h1>
        <p className="mt-2 max-w-md text-sm text-muted-foreground text-pretty">
          That page doesn&apos;t exist, or it hasn&apos;t been built yet. Try search with
          ⌘K.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button asChild>
            <Link href={ROUTES.dashboard}>Go to home</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={ROUTES.discover}>Discover</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
