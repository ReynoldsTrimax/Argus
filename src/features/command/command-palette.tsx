"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Building2,
  Clapperboard,
  Compass,
  Film,
  FolderOpen,
  History,
  LayoutDashboard,
  Library,
  Loader2,
  Settings,
  TrendingUp,
  Tv,
  User,
  Users,
} from "lucide-react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { Skeleton } from "@/components/ui/skeleton";
import { useUI } from "@/providers/ui-provider";
import { ROUTES } from "@/constants/routes";
import { posterUrl, profileUrl, logoUrl } from "@/lib/media/image";
import {
  pushRecentSearch,
  readRecentSearches,
  useMediaSearch,
} from "@/features/search/hooks/use-media-search";
import { recordSearchHistory } from "@/features/search/actions/search-history";
import type { SearchResultItem } from "@/types/media";

const RECENT_EVENT = "argus:search-recent-changed";

function subscribeRecent(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(RECENT_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(RECENT_EVENT, onStoreChange);
  };
}

function getRecentSnapshot() {
  return JSON.stringify(readRecentSearches());
}

function getRecentServerSnapshot() {
  return "[]";
}

function notifyRecentChanged() {
  window.dispatchEvent(new Event(RECENT_EVENT));
}

/**
 * Global Spotlight-style command palette with media search.
 *
 * Architecture:
 * - Navigation / theme remain local static actions
 * - Media results via TanStack Query → /api/media/search
 * - AI search can append to SearchResponse.aiResults later
 */
export function CommandPalette() {
  const router = useRouter();
  const { commandOpen, setCommandOpen } = useUI();
  const [query, setQuery] = React.useState("");

  const recentJson = React.useSyncExternalStore(
    subscribeRecent,
    getRecentSnapshot,
    getRecentServerSnapshot,
  );
  const recent = React.useMemo(
    () => JSON.parse(recentJson) as string[],
    [recentJson],
  );

  const { results, isLoading, isError, error, trending } = useMediaSearch(
    query,
    commandOpen,
  );

  const handleOpenChange = React.useCallback(
    (open: boolean) => {
      setCommandOpen(open);
      if (!open) setQuery("");
    },
    [setCommandOpen],
  );

  const rememberQuery = React.useCallback((q: string) => {
    const trimmed = q.trim();
    if (trimmed.length < 2) return;
    pushRecentSearch(trimmed);
    notifyRecentChanged();
    void recordSearchHistory(trimmed);
  }, []);

  const run = React.useCallback(
    (fn: () => void) => {
      handleOpenChange(false);
      fn();
    },
    [handleOpenChange],
  );

  const go = React.useCallback(
    (href: string, searchQuery?: string) => {
      if (searchQuery) rememberQuery(searchQuery);
      run(() => router.push(href));
    },
    [rememberQuery, run, router],
  );

  const showMedia = query.trim().length >= 1;

  return (
    <CommandDialog open={commandOpen} onOpenChange={handleOpenChange}>
      <CommandInput
        placeholder="Search movies, shows, people, genres…"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {showMedia ? (
          <>
            {isLoading ? (
              <div className="space-y-2 p-3" aria-busy="true" aria-label="Searching">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-10 w-8 rounded-md" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3.5 w-2/3" />
                      <Skeleton className="h-3 w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : isError ? (
              <div className="px-4 py-8 text-center text-sm text-destructive">
                {(error as Error)?.message ?? "Search failed. Try again."}
              </div>
            ) : results.length === 0 ? (
              <CommandEmpty>No results for “{query.trim()}”.</CommandEmpty>
            ) : (
              <CommandGroup heading="Results">
                {results.map((item) => (
                  <SearchResultRow
                    key={`${item.kind}-${item.id}`}
                    item={item}
                    onSelect={() => go(item.href, query)}
                  />
                ))}
              </CommandGroup>
            )}
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 py-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Searching…
              </div>
            ) : null}
          </>
        ) : (
          <>
            {recent.length > 0 ? (
              <CommandGroup heading="Recent searches">
                {recent.map((q) => (
                  <CommandItem key={q} value={`recent ${q}`} onSelect={() => setQuery(q)}>
                    <History className="text-muted-foreground" />
                    {q}
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}

            {trending.length > 0 ? (
              <CommandGroup heading="Trending">
                {trending.map((item) => (
                  <SearchResultRow
                    key={`trend-${item.kind}-${item.id}`}
                    item={item}
                    onSelect={() => go(item.href)}
                    icon={<TrendingUp className="text-muted-foreground" />}
                  />
                ))}
              </CommandGroup>
            ) : null}

            <CommandSeparator />

            <CommandGroup heading="Navigation">
              <CommandItem onSelect={() => go(ROUTES.dashboard)}>
                <LayoutDashboard />
                Home
                <CommandShortcut>G D</CommandShortcut>
              </CommandItem>
              <CommandItem onSelect={() => go(ROUTES.discover)}>
                <Compass />
                Discover
                <CommandShortcut>G X</CommandShortcut>
              </CommandItem>
              <CommandItem onSelect={() => go(ROUTES.library)}>
                <Library />
                Library
                <CommandShortcut>G L</CommandShortcut>
              </CommandItem>
              <CommandItem onSelect={() => go(ROUTES.collections)}>
                <FolderOpen />
                Collections
                <CommandShortcut>G C</CommandShortcut>
              </CommandItem>
              <CommandItem onSelect={() => go(ROUTES.watchlist)}>
                <Clapperboard />
                Watchlist
                <CommandShortcut>G W</CommandShortcut>
              </CommandItem>
              <CommandItem onSelect={() => go(ROUTES.stats)}>
                <TrendingUp />
                Statistics
                <CommandShortcut>G S</CommandShortcut>
              </CommandItem>
              <CommandItem onSelect={() => go(ROUTES.movies)}>
                <Film />
                Movies
              </CommandItem>
              <CommandItem onSelect={() => go(ROUTES.tv)}>
                <Tv />
                TV Shows
              </CommandItem>
              <CommandItem onSelect={() => go(ROUTES.profile)}>
                <User />
                Profile
                <CommandShortcut>G P</CommandShortcut>
              </CommandItem>
              <CommandItem onSelect={() => go(ROUTES.settings)}>
                <Settings />
                Settings
                <CommandShortcut>G ,</CommandShortcut>
              </CommandItem>
            </CommandGroup>

          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}

function SearchResultRow({
  item,
  onSelect,
  icon,
}: {
  item: SearchResultItem;
  onSelect: () => void;
  icon?: React.ReactNode;
}) {
  const image =
    item.kind === "person"
      ? profileUrl(item.imagePath, "w45")
      : item.kind === "company"
        ? logoUrl(item.imagePath, "w45")
        : posterUrl(item.imagePath, "w92");

  const KindIcon =
    item.kind === "movie"
      ? Film
      : item.kind === "tv"
        ? Tv
        : item.kind === "person"
          ? Users
          : item.kind === "collection"
            ? FolderOpen
            : item.kind === "company"
              ? Building2
              : Clapperboard;

  return (
    <CommandItem
      value={`${item.kind} ${item.title} ${item.subtitle ?? ""}`}
      onSelect={onSelect}
      className="gap-3"
    >
      {icon ??
        (image ? (
          <span className="relative h-10 w-7 shrink-0 overflow-hidden rounded-md bg-muted">
            <Image src={image} alt="" fill sizes="28px" className="object-cover" />
          </span>
        ) : (
          <KindIcon className="text-muted-foreground" />
        ))}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-medium">{item.title}</span>
        {item.subtitle ? (
          <span className="truncate text-xs text-muted-foreground">{item.subtitle}</span>
        ) : null}
      </span>
    </CommandItem>
  );
}
