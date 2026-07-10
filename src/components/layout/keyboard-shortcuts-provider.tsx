"use client";

import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";

/**
 * Mounts global keyboard shortcuts inside the authenticated shell.
 */
export function KeyboardShortcutsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useKeyboardShortcuts();
  return children;
}
