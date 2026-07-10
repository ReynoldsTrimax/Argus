import type { Metadata } from "next";
import Link from "next/link";
import { WifiOff, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";

export const metadata: Metadata = {
  title: "Offline",
  robots: { index: false, follow: false },
};

/**
 * Offline shell page — cached by the service worker for standalone PWA use.
 */
export default function OfflinePage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
        <WifiOff className="h-7 w-7 text-muted-foreground" aria-hidden="true" />
      </div>
      <h1 className="font-display text-2xl font-semibold tracking-tight">
        You&apos;re offline
      </h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground text-pretty">
        Argus needs a connection for catalog and account features. Previously visited
        pages may still be available from cache.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button asChild>
          <Link href={ROUTES.dashboard}>
            <RefreshCw className="h-4 w-4" />
            Try dashboard
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={ROUTES.home}>Home</Link>
        </Button>
      </div>
    </div>
  );
}
