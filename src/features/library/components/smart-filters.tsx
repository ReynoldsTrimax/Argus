"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * Smart library filters — answer questions like "rated above 8", "sci-fi", year range.
 */
export function SmartFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [minRating, setMinRating] = React.useState(searchParams.get("minRating") ?? "");
  const [yearFrom, setYearFrom] = React.useState(searchParams.get("yearFrom") ?? "");
  const [yearTo, setYearTo] = React.useState(searchParams.get("yearTo") ?? "");
  const [genre, setGenre] = React.useState(searchParams.get("genre") ?? "");
  const [maxRuntime, setMaxRuntime] = React.useState(searchParams.get("maxRuntime") ?? "");

  const apply = () => {
    const params = new URLSearchParams(searchParams.toString());
    const setOrDel = (k: string, v: string) => {
      if (!v) params.delete(k);
      else params.set(k, v);
    };
    setOrDel("minRating", minRating);
    setOrDel("yearFrom", yearFrom);
    setOrDel("yearTo", yearTo);
    setOrDel("genre", genre);
    setOrDel("maxRuntime", maxRuntime);
    params.delete("page");
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  const clear = () => {
    setMinRating("");
    setYearFrom("");
    setYearTo("");
    setGenre("");
    setMaxRuntime("");
    router.push(pathname);
  };

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-card/40 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">Smart filters</p>
        <Button type="button" variant="ghost" size="sm" onClick={clear}>
          Clear
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="space-y-1.5">
          <Label htmlFor="minRating">Min rating</Label>
          <Input
            id="minRating"
            type="number"
            min={0}
            max={10}
            step={0.5}
            placeholder="e.g. 8"
            value={minRating}
            onChange={(e) => setMinRating(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="yearFrom">Year from</Label>
          <Input
            id="yearFrom"
            type="number"
            placeholder="1995"
            value={yearFrom}
            onChange={(e) => setYearFrom(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="yearTo">Year to</Label>
          <Input
            id="yearTo"
            type="number"
            placeholder="2005"
            value={yearTo}
            onChange={(e) => setYearTo(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="genre">Genre contains</Label>
          <Input
            id="genre"
            placeholder="Thriller"
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Max runtime</Label>
          <Select value={maxRuntime || "all"} onValueChange={(v) => setMaxRuntime(v === "all" ? "" : v)}>
            <SelectTrigger>
              <SelectValue placeholder="Any" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any</SelectItem>
              <SelectItem value="90">Under 90m</SelectItem>
              <SelectItem value="120">Under 2h</SelectItem>
              <SelectItem value="150">Under 2.5h</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <Button type="button" size="sm" onClick={apply}>
        Apply filters
      </Button>
    </div>
  );
}
