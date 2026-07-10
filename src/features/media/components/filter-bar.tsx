"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import * as React from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { Genre, MediaSortBy } from "@/types/media";

interface FilterBarProps {
  genres?: Genre[];
  showRuntime?: boolean;
}

const SORT_OPTIONS: { value: MediaSortBy; label: string }[] = [
  { value: "popularity.desc", label: "Popularity" },
  { value: "vote_average.desc", label: "Highest rated" },
  { value: "release_date.desc", label: "Newest" },
  { value: "release_date.asc", label: "Oldest" },
  { value: "title.asc", label: "A–Z" },
  { value: "title.desc", label: "Z–A" },
  { value: "runtime.desc", label: "Longest" },
  { value: "runtime.asc", label: "Shortest" },
];

const YEARS = Array.from({ length: 50 }, (_, i) => new Date().getFullYear() - i);

/**
 * URL-driven filters for browse / genre pages.
 */
export function FilterBar({ genres = [], showRuntime }: FilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const update = React.useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (!value || value === "all") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
      params.delete("page");
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    },
    [pathname, router, searchParams],
  );

  const clear = () => router.push(pathname);

  const hasFilters = [...searchParams.keys()].some((k) => k !== "page");

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      {genres.length ? (
        <Select
          value={searchParams.get("genre") ?? "all"}
          onValueChange={(v) => update("genre", v)}
        >
          <SelectTrigger className="w-full sm:w-[11rem]" aria-label="Genre">
            <SelectValue placeholder="Genre" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All genres</SelectItem>
            {genres.map((g) => (
              <SelectItem key={g.id} value={g.id}>
                {g.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}

      <Select
        value={searchParams.get("year") ?? "all"}
        onValueChange={(v) => update("year", v)}
      >
        <SelectTrigger className="w-full sm:w-[8rem]" aria-label="Year">
          <SelectValue placeholder="Year" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Any year</SelectItem>
          {YEARS.map((y) => (
            <SelectItem key={y} value={String(y)}>
              {y}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={searchParams.get("language") ?? "all"}
        onValueChange={(v) => update("language", v)}
      >
        <SelectTrigger className="w-full sm:w-[9rem]" aria-label="Language">
          <SelectValue placeholder="Language" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Any language</SelectItem>
          <SelectItem value="en">English</SelectItem>
          <SelectItem value="ja">Japanese</SelectItem>
          <SelectItem value="ko">Korean</SelectItem>
          <SelectItem value="es">Spanish</SelectItem>
          <SelectItem value="fr">French</SelectItem>
          <SelectItem value="de">German</SelectItem>
          <SelectItem value="hi">Hindi</SelectItem>
          <SelectItem value="zh">Chinese</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={searchParams.get("rating") ?? "all"}
        onValueChange={(v) => update("rating", v)}
      >
        <SelectTrigger className="w-full sm:w-[9rem]" aria-label="Minimum rating">
          <SelectValue placeholder="Rating" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Any rating</SelectItem>
          <SelectItem value="5">5+</SelectItem>
          <SelectItem value="6">6+</SelectItem>
          <SelectItem value="7">7+</SelectItem>
          <SelectItem value="8">8+</SelectItem>
        </SelectContent>
      </Select>

      {showRuntime ? (
        <Select
          value={searchParams.get("runtime") ?? "all"}
          onValueChange={(v) => update("runtime", v)}
        >
          <SelectTrigger className="w-full sm:w-[9rem]" aria-label="Runtime">
            <SelectValue placeholder="Runtime" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any runtime</SelectItem>
            <SelectItem value="short">Under 90m</SelectItem>
            <SelectItem value="medium">90–150m</SelectItem>
            <SelectItem value="long">Over 150m</SelectItem>
          </SelectContent>
        </Select>
      ) : null}

      <Select
        value={(searchParams.get("sort") as MediaSortBy) ?? "popularity.desc"}
        onValueChange={(v) => update("sort", v)}
      >
        <SelectTrigger className="w-full sm:w-[11rem]" aria-label="Sort by">
          <SelectValue placeholder="Sort" />
        </SelectTrigger>
        <SelectContent>
          {SORT_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasFilters ? (
        <Button type="button" variant="ghost" size="sm" onClick={clear}>
          Clear
        </Button>
      ) : null}
    </div>
  );
}
