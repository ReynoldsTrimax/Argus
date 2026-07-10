"use client";

import * as React from "react";

/**
 * Registers the service worker in production for offline shell support.
 */
export function RegisterServiceWorker() {
  React.useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.warn("[pwa] SW registration failed", err);
    });
  }, []);

  return null;
}
