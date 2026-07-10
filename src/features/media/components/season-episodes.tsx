"use client";

import * as React from "react";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { stillUrl } from "@/lib/media/image";
import { formatDate, formatRuntime, formatVote } from "@/lib/media/format";
import type { TvSeason } from "@/types/media";

interface SeasonEpisodesProps {
  showId: string;
  seasons: TvSeason[];
}

async function fetchSeason(showId: string, season: number): Promise<TvSeason> {
  const res = await fetch(`/api/media/tv/${showId}/season/${season}`);
  if (!res.ok) throw new Error("Failed to load season");
  return res.json() as Promise<TvSeason>;
}

/**
 * Season selector + episode list with lazy season loading.
 */
export function SeasonEpisodes({ showId, seasons }: SeasonEpisodesProps) {
  const defaultSeason = seasons[0]?.seasonNumber ?? 1;
  const [seasonNumber, setSeasonNumber] = React.useState(defaultSeason);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["tv-season", showId, seasonNumber],
    queryFn: () => fetchSeason(showId, seasonNumber),
    staleTime: 60 * 60 * 1000,
  });

  if (!seasons.length) {
    return <p className="text-sm text-muted-foreground">No seasons available.</p>;
  }

  return (
    <section className="min-w-0 w-full max-w-full space-y-4" aria-label="Seasons and episodes">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-section-title">Episodes</h2>
        <Select
          value={String(seasonNumber)}
          onValueChange={(v) => setSeasonNumber(Number(v))}
        >
          <SelectTrigger className="w-[11rem] shrink-0" aria-label="Select season">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {seasons.map((s) => (
              <SelectItem key={s.id} value={String(s.seasonNumber)}>
                {s.name}
                {s.episodeCount != null ? ` (${s.episodeCount})` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {data?.overview ? (
        <p className="text-sm text-muted-foreground text-pretty">{data.overview}</p>
      ) : null}

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[4.5rem] w-full max-w-full rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <p className="text-sm text-destructive">Could not load episodes.</p>
      ) : (
        <ul className="min-w-0 w-full max-w-full space-y-2">
          {(data?.episodes ?? []).map((ep) => {
            const still = stillUrl(ep.stillPath, "w300");
            return (
              <li
                key={ep.id}
                className="flex min-w-0 max-w-full gap-2.5 overflow-hidden rounded-xl border border-border bg-card p-2 shadow-xs sm:gap-3 sm:p-2.5"
              >
                <div className="relative aspect-video w-[5.5rem] shrink-0 overflow-hidden rounded-md bg-muted sm:w-28">
                  {still ? (
                    <Image
                      src={still}
                      alt=""
                      fill
                      sizes="112px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[11px] text-muted-foreground">
                      E{ep.episodeNumber}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1 space-y-0.5 overflow-hidden py-0.5">
                  <div className="flex min-w-0 items-start justify-between gap-2">
                    <p className="min-w-0 truncate text-sm font-semibold leading-snug">
                      <span className="text-muted-foreground">
                        {ep.episodeNumber}.
                      </span>{" "}
                      {ep.name}
                    </p>
                    <div className="flex shrink-0 items-center gap-1.5 text-[11px] text-muted-foreground">
                      {ep.runtime ? <span>{formatRuntime(ep.runtime)}</span> : null}
                      {ep.voteAverage != null && ep.voteAverage > 0 ? (
                        <span className="text-primary">★ {formatVote(ep.voteAverage)}</span>
                      ) : null}
                    </div>
                  </div>
                  {ep.airDate ? (
                    <p className="truncate text-[11px] text-muted-foreground">
                      {formatDate(ep.airDate)}
                    </p>
                  ) : null}
                  {ep.overview ? (
                    <p className="text-prose-soft line-clamp-2 text-[0.8rem] text-muted-foreground">
                      {ep.overview}
                    </p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
