"use client";

import { useEffect } from "react";
import Link from "next/link";

import { ErrorState } from "@/components/feedback/error-state";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";

/**
 * Global error boundary — graceful recovery with retry.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[argus]", error.digest ?? error.message, error);
  }, [error]);

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center px-4">
      <div
        className="pointer-events-none absolute inset-0 gradient-mesh dark:gradient-mesh-dark opacity-40"
        aria-hidden
      />
      <div className="relative w-full max-w-md space-y-4">
        <ErrorState
          title="Something went wrong"
          description={
            error.message ||
            "An unexpected error occurred. You can retry or return home."
          }
          reset={reset}
        />
        {error.digest ? (
          <p className="text-center text-[11px] text-muted-foreground">
            Reference: {error.digest}
          </p>
        ) : null}
        <div className="flex justify-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href={ROUTES.dashboard}>Dashboard</Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href={ROUTES.home}>Marketing home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
