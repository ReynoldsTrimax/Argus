"use client";

import * as React from "react";

/**
 * Subscribe to a CSS media query. SSR-safe (returns false on the server).
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = React.useCallback(
    (onStoreChange: () => void) => {
      const media = window.matchMedia(query);
      media.addEventListener("change", onStoreChange);
      return () => media.removeEventListener("change", onStoreChange);
    },
    [query],
  );

  const getSnapshot = React.useCallback(() => window.matchMedia(query).matches, [query]);

  const getServerSnapshot = React.useCallback(() => false, []);

  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function useIsMobile() {
  return useMediaQuery("(max-width: 767px)");
}

export function useIsDesktop() {
  return useMediaQuery("(min-width: 1024px)");
}
