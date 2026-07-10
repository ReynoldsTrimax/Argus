"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { WATCH_STATUS_LABELS, WATCH_STATUSES } from "@/types/library";
import * as React from "react";

/**
 * URL-driven library list filters.
 */
export function LibraryFilters({ showSearch = true }: { showSearch?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [q, setQ] = React.useState(searchParams.get("q") ?? "");

  const update = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === "all") params.delete(key);
    else params.set(key, value);
    params.delete("page");
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  React.useEffect(() => {
    const t = window.setTimeout(() => {
      const current = searchParams.get("q") ?? "";
      if (q === current) return;
      update("q", q.trim() || null);
    }, 300);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      {showSearch ? (
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search your library…"
          className="sm:max-w-xs"
          aria-label="Search library"
        />
      ) : null}

      <Select
        value={searchParams.get("status") ?? "all"}
        onValueChange={(v) => update("status", v)}
      >
        <SelectTrigger className="w-full sm:w-[11rem]" aria-label="Status">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          <SelectItem value="favorites">Favorites</SelectItem>
          <SelectItem value="pinned">Pinned</SelectItem>
          {WATCH_STATUSES.map((s) => (
            <SelectItem key={s} value={s}>
              {WATCH_STATUS_LABELS[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={searchParams.get("type") ?? "all"}
        onValueChange={(v) => update("type", v)}
      >
        <SelectTrigger className="w-full sm:w-[9rem]" aria-label="Type">
          <SelectValue placeholder="Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Movies & TV</SelectItem>
          <SelectItem value="movie">Movies</SelectItem>
          <SelectItem value="tv">TV Shows</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={searchParams.get("sort") ?? "last_watched"}
        onValueChange={(v) => update("sort", v)}
      >
        <SelectTrigger className="w-full sm:w-[11rem]" aria-label="Sort">
          <SelectValue placeholder="Sort" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="last_watched">Last watched</SelectItem>
          <SelectItem value="added">Recently added</SelectItem>
          <SelectItem value="title">Title A–Z</SelectItem>
          <SelectItem value="rating">Your rating</SelectItem>
          <SelectItem value="progress">Progress</SelectItem>
          <SelectItem value="release">Release date</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
