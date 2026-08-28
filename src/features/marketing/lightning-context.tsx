"use client";

import { createContext, useContext } from "react";

/**
 * Strike phase shared by the hero background and anything that should
 * catch the same flash (artwork tiles, panel edges).
 *
 * - `load` — the one-shot page-load sequence (darkness → strike → calm)
 * - `idle` — a much weaker ambient burst, fired rarely
 */
export interface LightningState {
  phase: "load" | "idle";
  /** Increments on every burst so CSS animations can be restarted via `key`. */
  burst: number;
}

const LightningContext = createContext<LightningState>({ phase: "load", burst: 0 });

export const LightningProvider = LightningContext.Provider;

export function useLightning(): LightningState {
  return useContext(LightningContext);
}
