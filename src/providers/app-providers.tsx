"use client";

import * as React from "react";

import { ThemeProvider } from "@/providers/theme-provider";
import { QueryProvider } from "@/providers/query-provider";
import { UIProvider } from "@/providers/ui-provider";
import { MotionProvider } from "@/providers/motion-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";

/**
 * Composes all client providers in a single tree.
 * Order: theme → motion → query → UI chrome → tooltips → toasts.
 */
export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <MotionProvider>
        <QueryProvider>
          <UIProvider>
            <TooltipProvider delayDuration={180} skipDelayDuration={80}>
              {children}
              <Toaster position="bottom-right" richColors closeButton />
            </TooltipProvider>
          </UIProvider>
        </QueryProvider>
      </MotionProvider>
    </ThemeProvider>
  );
}
