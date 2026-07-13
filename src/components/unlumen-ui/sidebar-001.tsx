"use client";

import * as React from "react";
import {
  createContext,
  memo,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const MotionChevron = motion.create(ChevronRight);

const EFFECTS_KEY = "sidebar-001-effects";

const EffectsContext = createContext<{ enabled: boolean; toggle: () => void }>({
  enabled: true,
  toggle: () => {},
});

function EffectsProvider({
  children,
  defaultEnabled = true,
}: {
  children: React.ReactNode;
  defaultEnabled?: boolean;
}) {
  const [enabled, setEnabled] = useState(() => {
    if (typeof window === "undefined") return defaultEnabled;
    const stored = localStorage.getItem(EFFECTS_KEY);
    return stored !== null ? stored === "true" : defaultEnabled;
  });

  const toggle = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev;
      localStorage.setItem(EFFECTS_KEY, String(next));
      return next;
    });
  }, []);

  const value = useMemo(() => ({ enabled, toggle }), [enabled, toggle]);
  return (
    <EffectsContext.Provider value={value}>{children}</EffectsContext.Provider>
  );
}

export function useSidebar001Effects() {
  return useContext(EffectsContext);
}

// ─── Hover context ────────────────────────────────────────────────────────────

interface HoverRect {
  top: number;
  height: number;
  left: number;
  width?: number;
}

const HoverContext = createContext<{
  hovered: string | null;
  hoverRect: HoverRect | null;
  containerRef: React.RefObject<HTMLDivElement | null>;
  setHovered: (id: string | null, rect?: HoverRect | null) => void;
}>({
  hovered: null,
  hoverRect: null,
  containerRef: { current: null },
  setHovered: () => {},
});

function HoverProvider({
  children,
  containerRef,
}: {
  children: React.ReactNode;
  containerRef: React.RefObject<HTMLDivElement | null>;
}) {
  const [hovered, setHoveredId] = useState<string | null>(null);
  const [hoverRect, setHoverRect] = useState<HoverRect | null>(null);

  const setHovered = useCallback(
    (id: string | null, rect?: HoverRect | null) => {
      setHoveredId(id);
      setHoverRect(rect ?? null);
    },
    [],
  );

  const value = useMemo(
    () => ({ hovered, hoverRect, containerRef, setHovered }),
    [hovered, hoverRect, containerRef, setHovered],
  );

  return (
    <HoverContext.Provider value={value}>{children}</HoverContext.Provider>
  );
}

// ─── Scroll to active ─────────────────────────────────────────────────────────

function useScrollToActive<T extends HTMLElement = HTMLElement>(active: boolean) {
  const ref = useRef<T | null>(null);
  const scrolled = useRef(false);

  useEffect(() => {
    if (!active || scrolled.current || !ref.current) return;
    scrolled.current = true;
    const el = ref.current;
    const schedule =
      typeof requestIdleCallback !== "undefined"
        ? (cb: () => void) => requestIdleCallback(cb)
        : (cb: () => void) => setTimeout(cb, 100);
    const cancel =
      typeof cancelIdleCallback !== "undefined"
        ? cancelIdleCallback
        : clearTimeout;
    const id = schedule(() => {
      const viewport = el.closest("[data-scroll-viewport]");
      if (!(viewport instanceof HTMLElement)) return;
      const vpRect = viewport.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      const offset =
        elRect.top - vpRect.top - vpRect.height / 2 + elRect.height / 2;
      if (Math.abs(offset) > 40)
        viewport.scrollBy({ top: offset, behavior: "smooth" });
    });
    return () => cancel(id as number);
  }, [active]);

  useEffect(() => {
    if (!active) scrolled.current = false;
  }, [active]);

  return ref;
}

// ─── HoverHighlight ───────────────────────────────────────────────────────────

/**
 * Sliding hover capsule — content-width, sharper squircle (not full pill).
 * Matches Unlumen: soft charcoal fill + hairline, sits after the tick gutter.
 */
function HoverHighlight() {
  const { hoverRect, hovered } = useContext(HoverContext);
  const { enabled } = useContext(EffectsContext);

  return (
    <AnimatePresence>
      {enabled && hovered && hoverRect && (
        <motion.div
          key="sb001-hover-bg"
          className={cn(
            "pointer-events-none absolute z-0",
            /* Sharper squircle — ~10px, not stadium pill */
            "rounded-[10px]",
            "bg-black/[0.04] dark:bg-white/[0.075]",
            "shadow-[inset_0_0_0_1px_rgba(0,0,0,0.05)]",
            "dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.07)]",
          )}
          initial={false}
          animate={{
            top: hoverRect.top,
            height: hoverRect.height,
            left: hoverRect.left,
            width: hoverRect.width ?? 0,
            opacity: 1,
          }}
          exit={{ opacity: 0, transition: { duration: 0.1 } }}
          transition={{ type: "spring", stiffness: 480, damping: 38 }}
        />
      )}
    </AnimatePresence>
  );
}

// ─── Collapsed context ────────────────────────────────────────────────────────

const CollapsedContext = createContext(false);

export function useSidebar001Collapsed() {
  return useContext(CollapsedContext);
}

// ─── Sidebar001Item ───────────────────────────────────────────────────────────

export interface Sidebar001ItemProps {
  href: string;
  label: React.ReactNode;
  isActive: boolean;
  isNew?: boolean;
  /** Shown when the rail is collapsed (icon-only mode). */
  icon?: React.ReactNode;
  className?: string;
  onClick?: React.MouseEventHandler<HTMLAnchorElement>;
}

export const Sidebar001Item = memo(function Sidebar001Item({
  href,
  label,
  isActive,
  isNew,
  icon,
  className,
  onClick,
}: Sidebar001ItemProps) {
  const collapsed = useContext(CollapsedContext);
  const { hovered, setHovered, containerRef } = useContext(HoverContext);
  const isHovered = hovered === href;
  const itemRef = useScrollToActive<HTMLAnchorElement>(isActive);

  if (collapsed) {
    return (
      <div className="relative flex justify-center py-0.5">
        <Link
          href={href}
          onClick={onClick}
          title={typeof label === "string" ? label : undefined}
          aria-label={typeof label === "string" ? label : undefined}
          aria-current={isActive ? "page" : undefined}
          className={cn(
            "relative flex h-9 w-9 items-center justify-center rounded-[10px]",
            "text-muted-foreground transition-colors",
            isActive
              ? "bg-black/[0.06] text-foreground dark:bg-white/[0.1]"
              : "hover:bg-black/[0.05] hover:text-foreground dark:hover:bg-white/[0.08]",
            className,
          )}
        >
          <span className="[&_svg]:size-[1.05rem]">{icon}</span>
        </Link>
      </div>
    );
  }

  const updateHoverRect = useCallback(() => {
    const measure = () => {
      const el = itemRef.current;
      const container = containerRef.current;
      if (!el || !container) {
        setHovered(href);
        return;
      }
      const elRect = el.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      /* Capsule hugs the label (inline-flex width), not the full rail */
      setHovered(href, {
        top: elRect.top - containerRect.top,
        height: elRect.height,
        left: elRect.left - containerRect.left,
        width: elRect.width,
      });
    };
    measure();
    /* Remeasure after spring x/scale so the capsule tracks the label */
    requestAnimationFrame(() => requestAnimationFrame(measure));
  }, [containerRef, href, setHovered]);

  const x = isActive ? 6 : isHovered ? 4 : 0;
  const scale = isActive || isHovered ? 1.03 : 1;

  return (
    <div className="relative">
      {/* Active pin — Argus primary blue */}
      {isActive && (
        <motion.span
          layoutId="sb001-active-bar"
          className="pointer-events-none absolute z-10 left-0 top-1/2 h-[1.5px] -translate-y-1/2 rounded-full bg-primary"
          animate={{ width: 16 }}
          transition={{ type: "spring", stiffness: 800, damping: 40 }}
        />
      )}

      {/* Tick-mark gutter — dense rail like reference */}
      <span className="pointer-events-none absolute left-0 top-[18%] h-px w-[11px] bg-foreground/[0.18]" />
      <span className="pointer-events-none absolute left-0 top-[38%] h-px w-[14px] bg-foreground/[0.16]" />
      <motion.span
        className="pointer-events-none absolute left-0 top-1/2 h-px -translate-y-1/2 bg-foreground/35"
        animate={{
          width: isActive ? 0 : isHovered ? 18 : 12,
          opacity: isActive ? 0 : 1,
        }}
        transition={{ type: "spring", stiffness: 600, damping: 32 }}
      />
      <span className="pointer-events-none absolute left-0 top-[62%] h-px w-[14px] bg-foreground/[0.16]" />
      <span className="pointer-events-none absolute left-0 top-[82%] h-px w-[11px] bg-foreground/[0.18]" />

      <div className="relative ml-[1.35rem]">
        <motion.div
          animate={{ x, scale }}
          transition={{ type: "spring", stiffness: 700, damping: 32 }}
          style={{ transformOrigin: "left center" }}
          className="inline-flex max-w-full"
        >
          <Link
            ref={itemRef}
            href={href}
            onClick={onClick}
            aria-current={isActive ? "page" : undefined}
            onMouseEnter={updateHoverRect}
            onMouseLeave={() => setHovered(null)}
            className={cn(
              "relative z-[1] inline-flex max-w-full items-center gap-2",
              "rounded-[10px] px-3 py-[0.4rem] select-none",
              "text-[0.9rem] font-medium tracking-[-0.01em] leading-snug",
              "transition-colors duration-150",
              isActive || isHovered
                ? "text-foreground"
                : "text-foreground/45",
              className,
            )}
          >
            {icon ? (
              <span
                className={cn(
                  "relative z-1 shrink-0 [&_svg]:size-[0.95rem]",
                  isActive || isHovered
                    ? "text-foreground/70"
                    : "text-foreground/35",
                )}
              >
                {icon}
              </span>
            ) : null}
            <span className="relative z-1 min-w-0 truncate">{label}</span>
            {isNew && (
              <span className="size-1.5 shrink-0 rounded-full bg-primary/80" />
            )}
          </Link>
        </motion.div>
      </div>
    </div>
  );
});

// ─── Sidebar001Separator ──────────────────────────────────────────────────────

export function Sidebar001Separator({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  const collapsed = useContext(CollapsedContext);

  if (collapsed) {
    return (
      <div
        className={cn("mx-auto my-3 h-px w-6 bg-border/40", className)}
        aria-hidden
      />
    );
  }

  if (!children) {
    return (
      <div
        className={cn("my-3.5 h-px w-full bg-border/25", className)}
        aria-hidden
      />
    );
  }

  return (
    <div
      className={cn(
        "px-0 pt-4 pb-2 text-[0.75rem] font-medium tracking-wide text-foreground/40",
        className,
      )}
    >
      {children}
    </div>
  );
}

// ─── Sidebar001Group ──────────────────────────────────────────────────────────

export interface Sidebar001GroupProps {
  label: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  icon?: React.ReactNode;
  className?: string;
}

export function Sidebar001Group({
  label,
  children,
  defaultOpen = false,
  icon,
  className,
}: Sidebar001GroupProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const id = useId();
  const { setHovered, containerRef } = useContext(HoverContext);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Keep the section open when its route becomes active (client navigations).
  useEffect(() => {
    if (defaultOpen) setIsOpen(true);
  }, [defaultOpen]);

  const handleMouseEnter = useCallback(() => {
    const el = buttonRef.current;
    const container = containerRef.current;
    if (el && container) {
      const elRect = el.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      setHovered(id, {
        top: elRect.top - containerRect.top,
        height: elRect.height,
        left: 0,
      });
    } else {
      setHovered(id);
    }
  }, [id, setHovered, containerRef]);

  const handleMouseLeave = useCallback(() => {
    setHovered(null);
  }, [setHovered]);

  return (
    <div className={cn("flex flex-col", className)}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="relative z-1 flex items-center gap-1.5 py-1.5 pr-2 select-none text-left w-full group"
      >
        {icon ? (
          <>
            <span className="shrink-0 text-foreground/35 [&_svg]:size-3.5">
              {icon}
            </span>
            <span className="text-sm text-foreground/45 group-hover:text-foreground/70 transition-colors duration-150 flex-1">
              {label}
            </span>
            <MotionChevron
              size={14}
              strokeWidth={2.5}
              className="shrink-0 text-foreground/25 mr-1"
              animate={{ rotate: isOpen ? 90 : 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          </>
        ) : (
          <>
            <MotionChevron
              size={11}
              strokeWidth={2.5}
              className="shrink-0 text-foreground/35"
              animate={{ rotate: isOpen ? 90 : 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
            <span className="text-sm text-foreground/45 group-hover:text-foreground/70 transition-colors duration-150">
              {label}
            </span>
          </>
        )}
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 420, damping: 34 }}
            style={{ overflow: "hidden" }}
          >
            <div className="flex flex-col pl-3">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Sidebar001Section ────────────────────────────────────────────────────────

export function Sidebar001Section({
  label,
  children,
  className,
}: {
  label?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col", className)}>
      {label && <Sidebar001Separator>{label}</Sidebar001Separator>}
      {children}
    </div>
  );
}

// ─── Sidebar001Content ────────────────────────────────────────────────────────

export function Sidebar001Content({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const containerRef = useContext(HoverContext).containerRef;
  const collapsed = useContext(CollapsedContext);

  return (
    <div
      className={cn(
        "flex-1 overflow-y-auto no-scrollbar",
        collapsed ? "py-2" : "py-3",
        className,
      )}
      data-scroll-viewport
    >
      <div
        ref={containerRef}
        className={cn(
          "relative",
          /* Pull list away from the rail edge — Unlumen inset */
          collapsed ? "px-1.5" : "px-5 sm:px-6",
        )}
      >
        <HoverHighlight />
        {children}
      </div>
    </div>
  );
}

// ─── Sidebar001 (with resize) ─────────────────────────────────────────────────

export interface Sidebar001Props extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
  className?: string;
  defaultEffectsEnabled?: boolean;
  /** When true, rail shrinks to collapsedWidth and shows icon-only items. */
  collapsed?: boolean;
  /** Width used while collapsed. Default: 64 */
  collapsedWidth?: number;
  /** Initial expanded width in px. Default: 240 */
  defaultWidth?: number;
  /** Min resize width in px. Default: 160 */
  minWidth?: number;
  /** Max resize width in px. Default: 400 */
  maxWidth?: number;
}

export function Sidebar001({
  children,
  className,
  defaultEffectsEnabled = true,
  collapsed = false,
  collapsedWidth = 64,
  defaultWidth = 240,
  minWidth = 160,
  maxWidth = 400,
  ...asideProps
}: Sidebar001Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [expandedWidth, setExpandedWidth] = useState(defaultWidth);
  const dragging = useRef(false);
  const startX = useRef(0);
  const startW = useRef(0);

  const width = collapsed ? collapsedWidth : expandedWidth;

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (collapsed) return;
      e.preventDefault();
      dragging.current = true;
      startX.current = e.clientX;
      startW.current = expandedWidth;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [collapsed, expandedWidth],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging.current || collapsed) return;
      const next = Math.min(
        maxWidth,
        Math.max(minWidth, startW.current + e.clientX - startX.current),
      );
      setExpandedWidth(next);
    },
    [collapsed, minWidth, maxWidth],
  );

  const onPointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  return (
    <EffectsProvider defaultEnabled={defaultEffectsEnabled}>
      <CollapsedContext.Provider value={collapsed}>
        <HoverProvider containerRef={containerRef}>
          <aside
            {...asideProps}
            data-collapsed={collapsed || undefined}
            className={cn(
              "relative flex flex-col h-full shrink-0 bg-background",
              "transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
              "motion-reduce:transition-none",
              className,
            )}
            style={{ width }}
            aria-label={asideProps["aria-label"] ?? "Main navigation"}
          >
            {children}

            {/* Resize handle (expanded only) */}
            {!collapsed ? (
              <div
                className="absolute top-0 right-0 h-full w-1 cursor-col-resize group/handle z-20"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
              >
                <div className="absolute right-0 top-0 h-full w-px bg-border/50 group-hover/handle:bg-border transition-colors duration-150" />
              </div>
            ) : null}
          </aside>
        </HoverProvider>
      </CollapsedContext.Provider>
    </EffectsProvider>
  );
}

// ─── Sidebar001Header ─────────────────────────────────────────────────────────

export function Sidebar001Header({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("shrink-0 px-5 pt-4 pb-2 sm:px-6", className)}>
      {children}
    </div>
  );
}

// ─── Sidebar001Footer ─────────────────────────────────────────────────────────

export function Sidebar001Footer({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "shrink-0 border-t border-border/30 px-5 pb-4 pt-2.5 sm:px-6",
        className,
      )}
    >
      {children}
    </div>
  );
}
