"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * Argus is dark-only. The theme is force-pinned to `dark`, so there is no
 * light mode, no system following, and no persisted preference.
 * `next-themes` stays in the tree purely so `useTheme()` consumers
 * (e.g. Sonner) resolve to a real value.
 */
export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      forcedTheme="dark"
      enableSystem={false}
      enableColorScheme={false}
      disableTransitionOnChange
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
