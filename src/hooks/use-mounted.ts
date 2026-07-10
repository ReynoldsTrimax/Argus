"use client";

import * as React from "react";

/**
 * Returns true after the component has mounted on the client.
 * Useful for avoiding hydration mismatches with theme / localStorage.
 *
 * Uses useSyncExternalStore so the server snapshot (false) and client
 * snapshot (true) stay consistent without setState-in-effect.
 */
export function useMounted(): boolean {
  return React.useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
}
