"use client";

import * as React from "react";

import { STORAGE_KEYS } from "@/constants/app";

/**
 * UI state: sidebar, command palette, and other client-only chrome.
 * Separated from auth and server state intentionally.
 */

interface UIContextValue {
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (value: boolean | ((prev: boolean) => boolean)) => void;
  mobileNavOpen: boolean;
  setMobileNavOpen: (value: boolean | ((prev: boolean) => boolean)) => void;
  commandOpen: boolean;
  setCommandOpen: (value: boolean | ((prev: boolean) => boolean)) => void;
}

const UIContext = React.createContext<UIContextValue | null>(null);

function subscribeSidebar(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  return () => window.removeEventListener("storage", onStoreChange);
}

function getSidebarSnapshot(): boolean {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.sidebarCollapsed);
    // Default collapsed (true) so the rail never eats content on first visit
    if (raw === null) return true;
    return raw === "true";
  } catch {
    return true;
  }
}

function getSidebarServerSnapshot(): boolean {
  return true;
}

export function UIProvider({ children }: { children: React.ReactNode }) {
  const storedCollapsed = React.useSyncExternalStore(
    subscribeSidebar,
    getSidebarSnapshot,
    getSidebarServerSnapshot,
  );

  const [sidebarOverride, setSidebarOverride] = React.useState<boolean | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);
  const [commandOpen, setCommandOpen] = React.useState(false);

  const sidebarCollapsed = sidebarOverride ?? storedCollapsed;

  const setSidebarCollapsed = React.useCallback(
    (value: boolean | ((prev: boolean) => boolean)) => {
      // Compute next value outside setState so we never dispatch events during render.
      const current = sidebarOverride ?? storedCollapsed;
      const next = typeof value === "function" ? value(current) : value;
      setSidebarOverride(next);
      try {
        window.localStorage.setItem(STORAGE_KEYS.sidebarCollapsed, String(next));
        // Notify other tabs via storage event; same-tab uses override state.
        queueMicrotask(() => {
          window.dispatchEvent(new Event("storage"));
        });
      } catch {
        // Ignore quota / private mode errors.
      }
    },
    [sidebarOverride, storedCollapsed],
  );

  // ⌘K is also handled by useKeyboardShortcuts; keep a lightweight fallback
  // for marketing pages that mount UIProvider without the shell provider.
  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen((open) => !open);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const value = React.useMemo(
    () => ({
      sidebarCollapsed,
      setSidebarCollapsed,
      mobileNavOpen,
      setMobileNavOpen,
      commandOpen,
      setCommandOpen,
    }),
    [sidebarCollapsed, setSidebarCollapsed, mobileNavOpen, commandOpen],
  );

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

export function useUI() {
  const ctx = React.useContext(UIContext);
  if (!ctx) {
    throw new Error("useUI must be used within UIProvider");
  }
  return ctx;
}
