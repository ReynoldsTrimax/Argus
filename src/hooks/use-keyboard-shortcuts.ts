"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { SHORTCUTS } from "@/constants/shortcuts";
import { useUI } from "@/providers/ui-provider";

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return Boolean(target.closest("[role='textbox'], [contenteditable='true']"));
}

/**
 * Global keyboard shortcuts: ⌘K, /, g then d/l/c/… sequences.
 */
export function useKeyboardShortcuts() {
  const router = useRouter();
  const { setCommandOpen, commandOpen } = useUI();
  const chordRef = React.useRef<string | null>(null);
  const chordTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    function clearChord() {
      chordRef.current = null;
      if (chordTimer.current) {
        clearTimeout(chordTimer.current);
        chordTimer.current = null;
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      // ⌘K / Ctrl+K always toggles command palette (even from inputs, Raycast-style)
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen((open) => !open);
        clearChord();
        return;
      }

      if (isTypingTarget(event.target) || commandOpen) {
        clearChord();
        return;
      }

      // "/" opens search
      if (event.key === "/" && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        setCommandOpen(true);
        clearChord();
        return;
      }

      const key = event.key.toLowerCase();

      // Sequence chords: g then x
      if (chordRef.current === "g") {
        event.preventDefault();
        const match = SHORTCUTS.find(
          (s) => s.sequence?.[0] === "g" && s.sequence?.[1] === key && s.href,
        );
        if (match?.href) {
          router.push(match.href);
        }
        clearChord();
        return;
      }

      if (key === "g" && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        chordRef.current = "g";
        chordTimer.current = setTimeout(clearChord, 900);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      clearChord();
    };
  }, [commandOpen, router, setCommandOpen]);
}
