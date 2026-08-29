"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { cn } from "@/lib/utils";

export type CommandMenuItemDef = {
  /** Display label */
  label: string;
  /** Lucide or any icon component */
  icon?: React.ComponentType<{ className?: string }>;
  /** Route to navigate to (uses next/navigation router.push) */
  href?: string;
  /** Custom action — used instead of href when provided */
  action?: () => void;
  /** Extra keywords for matching */
  keywords?: string[];
};

export type CommandMenuGroupDef = {
  /** Heading rendered above the group */
  heading: string;
  items: CommandMenuItemDef[];
};

export interface CommandMenuTriggerProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Label text inside the trigger button */
  label?: string;
  /** Keyboard shortcut hint shown on the right */
  shortcut?: string;
  /** Whether to show the keyboard shortcut badge */
  showShortcut?: boolean;
  /** Icon-only compact mode */
  compact?: boolean;
}

export interface CommandMenuProps {
  /** CommandGroup definitions rendered in the dialog */
  groups?: CommandMenuGroupDef[];
  /** Custom list body — when set, replaces default groups rendering */
  children?: React.ReactNode;
  /** Controlled open state */
  open?: boolean;
  /** Controlled open change handler */
  onOpenChange?: (open: boolean) => void;
  /** Placeholder text inside the search input */
  placeholder?: string;
  /** Controlled input value (for external search) */
  inputValue?: string;
  /** Controlled input change handler */
  onInputValueChange?: (value: string) => void;
  /** Pass-through to cmdk shouldFilter */
  shouldFilter?: boolean;
  /** Key portion of the keyboard shortcut (⌘ / Ctrl + key) */
  shortcutKey?: string;
  /** Register the global ⌘+key listener (disable when parent already handles it) */
  bindShortcut?: boolean;
  /** @deprecated No longer used — shell fades as a unit */
  contentDelay?: number;
  /** Custom trigger element. When provided the default button is NOT rendered. */
  trigger?: React.ReactNode;
  /** Hide the trigger entirely (dialog opened only via open/onOpenChange) */
  hideTrigger?: boolean;
  /** Props forwarded to the default trigger button */
  triggerProps?: CommandMenuTriggerProps;
  /** Extra className on the root CommandDialog */
  className?: string;
}

function CommandMenuTrigger({
  label = "Search…",
  shortcut = "K",
  showShortcut = true,
  compact = false,
  className,
  onClick,
  ...props
}: CommandMenuTriggerProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group inline-flex items-center gap-2 text-sm",
        "rounded-xl border-0 bg-muted/40 text-muted-foreground shadow-none backdrop-blur-md",
        "ring-1 ring-border/40 dark:bg-white/[0.08] dark:ring-white/10",
        "transition-colors duration-200",
        "hover:bg-muted/65 hover:text-foreground dark:hover:bg-white/[0.14]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        compact
          ? "h-9 w-9 justify-center px-0"
          : "h-9 w-full max-w-sm px-3 pr-1.5",
        className,
      )}
      aria-label={props["aria-label"] ?? "Open search"}
      {...props}
    >
      <Search
        className={cn(
          "size-4 shrink-0 text-muted-foreground group-hover:text-foreground",
        )}
      />
      {compact ? null : (
        <>
          <span className="flex-1 truncate text-left tracking-tight">{label}</span>
          {showShortcut ? (
            <KbdGroup className="hidden sm:inline-flex">
              <Kbd>⌘</Kbd>
              <Kbd>{shortcut}</Kbd>
            </KbdGroup>
          ) : null}
        </>
      )}
    </button>
  );
}

function CommandMenu({
  groups = [],
  children,
  open: openProp,
  onOpenChange,
  placeholder = "Search components, pages, actions…",
  inputValue,
  onInputValueChange,
  shouldFilter = true,
  shortcutKey = "k",
  bindShortcut = true,
  trigger,
  hideTrigger = false,
  triggerProps,
  className,
}: CommandMenuProps) {
  const router = useRouter();

  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
  const isControlled = openProp !== undefined;
  const open = isControlled ? Boolean(openProp) : uncontrolledOpen;
  const setOpen = React.useCallback(
    (next: boolean | ((prev: boolean) => boolean)) => {
      if (isControlled) {
        const value = typeof next === "function" ? next(Boolean(openProp)) : next;
        onOpenChange?.(value);
        return;
      }
      setUncontrolledOpen((prev) => {
        const value = typeof next === "function" ? next(prev) : next;
        onOpenChange?.(value);
        return value;
      });
    },
    [isControlled, onOpenChange, openProp],
  );

  React.useEffect(() => {
    if (!bindShortcut) return;
    const down = (e: KeyboardEvent) => {
      if (
        e.key.toLowerCase() === shortcutKey.toLowerCase() &&
        (e.metaKey || e.ctrlKey)
      ) {
        e.preventDefault();
        e.stopPropagation();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", down, { capture: true });
    return () =>
      document.removeEventListener("keydown", down, { capture: true });
  }, [bindShortcut, setOpen, shortcutKey]);

  const run = React.useCallback((fn: () => void) => {
    setOpen(false);
    fn();
  }, [setOpen]);

  const handleItemSelect = React.useCallback(
    (item: CommandMenuItemDef) => {
      if (item.action) {
        run(item.action);
      } else if (item.href) {
        run(() => router.push(item.href!));
      }
    },
    [run, router],
  );

  const defaultList = (
    <>
      <CommandEmpty>
        <span className="text-sm text-muted-foreground">No results found.</span>
      </CommandEmpty>

      {groups.map((group, gi) => (
        <React.Fragment key={`g-${gi}`}>
          {gi > 0 && <CommandSeparator />}
          <CommandGroup heading={group.heading}>
            {group.items.map((item, ii) => (
              <CommandItem
                key={`i-${gi}-${ii}`}
                keywords={item.keywords}
                onSelect={() => handleItemSelect(item)}
              >
                {item.icon && <item.icon className="mr-2 size-4 shrink-0" />}
                {item.label}
              </CommandItem>
            ))}
          </CommandGroup>
        </React.Fragment>
      ))}
    </>
  );

  return (
    <>
      {hideTrigger ? null : trigger ? (
        <span
          onClick={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setOpen(true);
            }
          }}
          role="button"
          tabIndex={0}
          className="cursor-pointer"
        >
          {trigger}
        </span>
      ) : (
        <CommandMenuTrigger
          shortcut={shortcutKey.toUpperCase()}
          {...triggerProps}
          onClick={() => setOpen(true)}
        />
      )}

      <CommandDialog
        open={open}
        onOpenChange={(next) => setOpen(next)}
        className={cn("sm:rounded-2xl", className)}
        shouldFilter={shouldFilter}
      >
        <CommandInput
          placeholder={placeholder}
          value={inputValue}
          onValueChange={onInputValueChange}
        />

        <CommandList className="max-h-[min(60vh,420px)]">
          {children ?? defaultList}
        </CommandList>
      </CommandDialog>
    </>
  );
}

export { CommandMenu, CommandMenuTrigger };
