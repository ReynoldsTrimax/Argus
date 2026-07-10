"use client";

import * as React from "react";
import { toast } from "sonner";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { STORAGE_KEYS } from "@/constants/app";
import { useMounted } from "@/hooks/use-mounted";

function read(key: string, fallback: string) {
  if (typeof window === "undefined") return fallback;
  try {
    return window.localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

/**
 * Device-local UX preferences (poster density, animation intensity).
 */
export function LocalPreferences() {
  const mounted = useMounted();
  const [density, setDensity] = React.useState("comfortable");
  const [animation, setAnimation] = React.useState("full");
  const [hydrated, setHydrated] = React.useState(false);

  // Hydrate once after mount without setState-in-effect lint trip via queueMicrotask
  React.useEffect(() => {
    const id = requestAnimationFrame(() => {
      setDensity(read(STORAGE_KEYS.posterDensity, "comfortable"));
      setAnimation(read(STORAGE_KEYS.animationIntensity, "full"));
      setHydrated(true);
    });
    return () => cancelAnimationFrame(id);
  }, []);

  if (!mounted || !hydrated) {
    return (
      <div className="h-28 animate-pulse rounded-xl bg-muted/40" aria-hidden />
    );
  }

  const persist = (key: string, value: string, label: string) => {
    try {
      window.localStorage.setItem(key, value);
      if (key === STORAGE_KEYS.posterDensity) {
        document.documentElement.dataset.posterDensity = value;
      }
      if (key === STORAGE_KEYS.animationIntensity) {
        document.documentElement.dataset.animation = value;
      }
      toast.success(`${label} updated`);
    } catch {
      toast.error("Could not save preference");
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold tracking-tight">Display & motion</h2>
        <p className="text-sm text-muted-foreground">
          Device-only preferences for density and animation intensity.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Poster density</Label>
          <Select
            value={density}
            onValueChange={(v) => {
              setDensity(v);
              persist(STORAGE_KEYS.posterDensity, v, "Poster density");
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="comfortable">Comfortable</SelectItem>
              <SelectItem value="compact">Compact</SelectItem>
              <SelectItem value="spacious">Spacious</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Animation intensity</Label>
          <Select
            value={animation}
            onValueChange={(v) => {
              setAnimation(v);
              persist(STORAGE_KEYS.animationIntensity, v, "Animation intensity");
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="full">Full</SelectItem>
              <SelectItem value="subtle">Subtle</SelectItem>
              <SelectItem value="none">Minimal</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
