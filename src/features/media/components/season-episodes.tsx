"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Skeleton } from "@/components/ui/skeleton";
import { WatchedToggle } from "@/components/ui/watched-toggle";
import { stillUrl } from "@/lib/media/image";
import { formatDate, formatRuntime, formatVote } from "@/lib/media/format";
import {
  actionToggleEpisode,
  actionSetSeasonWatched,
  actionSetAllEpisodesWatched,
} from "@/features/library/actions/library-actions";
import {
  allEpisodesToggleState,
  episodeKey,
  episodeNumbersForSeason,
  seasonToggleState,
  trackedSeasons as filterTrackable,
  type ChecklistSeason,
} from "@/lib/library/episode-checklist";
import type { EpisodeProgress, MediaIdentity } from "@/types/library";
import type { TvSeason } from "@/types/media";
import { cn } from "@/lib/utils";

interface SeasonEpisodesProps {
  showId: string;
  seasons: TvSeason[];
  /**
   * Enables tracking. Absent for signed-out visitors, who get the same list
   * without checkboxes rather than controls that cannot save anything.
   */
  identity?: MediaIdentity;
  episodeProgress?: EpisodeProgress[];
}

async function fetchSeason(showId: string, season: number): Promise<TvSeason> {
  const res = await fetch(`/api/media/tv/${showId}/season/${season}`);
  if (!res.ok) throw new Error("Failed to load season");
  return res.json() as Promise<TvSeason>;
}

/**
 * Season list with expandable episodes, and per-episode watched tracking.
 *
 * Progress is recorded here, beside the episode it belongs to, rather than in a
 * separate sidebar form — the control sits on the thing it affects, so marking
 * an episode needs no translation into season and episode numbers.
 *
 * Each season fetches its own episodes only once expanded, so a ten-season show
 * costs one request per season the user actually opens.
 */
export function SeasonEpisodes({
  showId,
  seasons,
  identity,
  episodeProgress = [],
}: SeasonEpisodesProps) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const canTrack = Boolean(identity);

  const [expanded, setExpanded] = React.useState<Set<number>>(() => {
    // Open the first real season by default so the list is never a wall of
    // collapsed rows with nothing to act on.
    const first = seasons.find((s) => (s.episodeCount ?? 0) > 0 && s.seasonNumber > 0);
    return new Set(first ? [first.seasonNumber] : []);
  });

  const checklistSeasons = React.useMemo<ChecklistSeason[]>(
    () =>
      seasons.map((s) => ({
        seasonNumber: s.seasonNumber,
        name: s.name,
        episodeCount: s.episodeCount ?? null,
      })),
    [seasons],
  );

  const serverWatched = React.useMemo(() => {
    const set = new Set<string>();
    for (const row of episodeProgress) {
      if (row.is_watched) set.add(episodeKey(row.season_number, row.episode_number));
    }
    return set;
  }, [episodeProgress]);

  // Optimistic overlay, discarded once the server payload catches up.
  const [overlay, setOverlay] = React.useState<Map<string, boolean>>(new Map());
  const [prevServer, setPrevServer] = React.useState(serverWatched);
  if (prevServer !== serverWatched) {
    setPrevServer(serverWatched);
    setOverlay(new Map());
  }

  const isWatched = React.useCallback(
    (seasonNumber: number, episodeNumber: number): boolean => {
      const k = episodeKey(seasonNumber, episodeNumber);
      return overlay.get(k) ?? serverWatched.has(k);
    },
    [overlay, serverWatched],
  );

  /** Applies an optimistic patch, writes, and rolls that patch back on failure. */
  const commit = React.useCallback(
    (
      patch: Map<string, boolean>,
      write: () => Promise<{ success: boolean; error?: string }>,
      describe: string,
    ) => {
      setOverlay((prev) => {
        const next = new Map(prev);
        patch.forEach((value, k) => next.set(k, value));
        return next;
      });

      startTransition(async () => {
        const rollback = () =>
          setOverlay((prev) => {
            const next = new Map(prev);
            patch.forEach((_, k) => next.delete(k));
            return next;
          });

        try {
          const res = await write();
          if (!res.success) {
            rollback();
            toast.error(res.error ?? `Couldn't update ${describe}`);
            return;
          }
          router.refresh();
        } catch (e) {
          rollback();
          toast.error(e instanceof Error ? e.message : `Couldn't update ${describe}`);
        }
      });
    },
    [router],
  );

  const toggleEpisode = React.useCallback(
    (seasonNumber: number, episodeNumber: number) => {
      if (!identity) return;
      const next = !isWatched(seasonNumber, episodeNumber);
      commit(
        new Map([[episodeKey(seasonNumber, episodeNumber), next]]),
        () => actionToggleEpisode(identity, seasonNumber, episodeNumber, next),
        `episode ${episodeNumber}`,
      );
    },
    [identity, isWatched, commit],
  );

  const toggleSeason = React.useCallback(
    (season: ChecklistSeason) => {
      if (!identity) return;
      // A partly-watched season fills in rather than clears: the tap after
      // "some of this is watched" is far more often "I finished it".
      const next = seasonToggleState(season, isWatched) !== true;
      const numbers = episodeNumbersForSeason(season);
      commit(
        new Map(numbers.map((n) => [episodeKey(season.seasonNumber, n), next])),
        () => actionSetSeasonWatched(identity, season.seasonNumber, numbers, next),
        season.name,
      );
    },
    [identity, isWatched, commit],
  );

  const trackable = React.useMemo(
    () => filterTrackable(checklistSeasons),
    [checklistSeasons],
  );

  const allState = React.useMemo(
    () => allEpisodesToggleState(trackable, isWatched),
    [trackable, isWatched],
  );

  const toggleAll = React.useCallback(() => {
    if (!identity) return;
    const next = allState !== true;
    const patch = new Map<string, boolean>();
    for (const season of trackable) {
      for (const n of episodeNumbersForSeason(season)) {
        patch.set(episodeKey(season.seasonNumber, n), next);
      }
    }
    commit(
      patch,
      () =>
        actionSetAllEpisodesWatched(
          identity,
          trackable.map((s) => ({
            seasonNumber: s.seasonNumber,
            episodeCount: s.episodeCount,
          })),
          next,
        ),
      "all episodes",
    );
  }, [identity, allState, trackable, commit]);

  if (!seasons.length) {
    return <p className="text-sm text-muted-foreground">No seasons available.</p>;
  }

  return (
    <section
      className="min-w-0 w-full max-w-full space-y-3"
      aria-label="Seasons and episodes"
      aria-busy={pending}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-section-title">Episodes</h2>
        {canTrack && trackable.length > 0 ? (
          <div className="flex items-center gap-2.5">
            {pending ? (
              <Loader2
                className="text-muted-foreground h-3.5 w-3.5 animate-spin"
                aria-hidden="true"
              />
            ) : null}
            <span className="text-muted-foreground text-[11px] font-medium tracking-[0.04em] uppercase">
              All episodes
            </span>
            <WatchedToggle
              state={allState}
              onClick={toggleAll}
              disabled={pending}
              label="all episodes"
            />
          </div>
        ) : null}
      </div>

      <ul className="min-w-0 w-full max-w-full space-y-2">
        {seasons.map((season) => (
          <SeasonRow
            key={season.id}
            showId={showId}
            season={season}
            open={expanded.has(season.seasonNumber)}
            onOpenChange={(open) =>
              setExpanded((prev) => {
                const next = new Set(prev);
                if (open) next.add(season.seasonNumber);
                else next.delete(season.seasonNumber);
                return next;
              })
            }
            canTrack={canTrack}
            pending={pending}
            isWatched={isWatched}
            onToggleEpisode={toggleEpisode}
            onToggleSeason={toggleSeason}
          />
        ))}
      </ul>
    </section>
  );
}

interface SeasonRowProps {
  showId: string;
  season: TvSeason;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canTrack: boolean;
  pending: boolean;
  isWatched: (seasonNumber: number, episodeNumber: number) => boolean;
  onToggleEpisode: (seasonNumber: number, episodeNumber: number) => void;
  onToggleSeason: (season: ChecklistSeason) => void;
}

/**
 * One season: a header row, and its episodes once expanded.
 *
 * This is its own component so each season can own a `useQuery` — calling one
 * per season inside a loop in the parent would be a conditional hook.
 */
function SeasonRow({
  showId,
  season,
  open,
  onOpenChange,
  canTrack,
  pending,
  isWatched,
  onToggleEpisode,
  onToggleSeason,
}: SeasonRowProps) {
  // Memoised so the watched-count memo below isn't invalidated every render.
  const checklistSeason = React.useMemo<ChecklistSeason>(
    () => ({
      seasonNumber: season.seasonNumber,
      name: season.name,
      episodeCount: season.episodeCount ?? null,
    }),
    [season.seasonNumber, season.name, season.episodeCount],
  );

  const { data, isLoading, isError } = useQuery({
    queryKey: ["tv-season", showId, season.seasonNumber],
    queryFn: () => fetchSeason(showId, season.seasonNumber),
    // Fetch on first expand, then keep it cached for the session.
    enabled: open,
    staleTime: 60 * 60 * 1000,
  });

  const episodes = data?.episodes ?? [];
  const trackableSeason = (season.episodeCount ?? 0) > 0;
  const state = seasonToggleState(checklistSeason, isWatched);

  const watchedCount = React.useMemo(() => {
    let n = 0;
    for (const e of episodeNumbersForSeason(checklistSeason)) {
      if (isWatched(season.seasonNumber, e)) n += 1;
    }
    return n;
  }, [checklistSeason, isWatched, season.seasonNumber]);

  return (
    <li className="min-w-0 overflow-hidden rounded-xl bg-muted/40 dark:bg-white/[0.05]">
      <div className="flex min-w-0 items-center gap-2 pr-3 pl-1.5">
        <button
          type="button"
          onClick={() => onOpenChange(!open)}
          aria-expanded={open}
          aria-controls={`season-panel-${season.seasonNumber}`}
          className="focus-visible:ring-ring flex min-w-0 flex-1 items-center gap-2 rounded-lg px-1.5 py-3 text-left transition-colors duration-100 hover:bg-foreground/[0.03] focus-visible:ring-2 focus-visible:outline-none motion-reduce:transition-none"
        >
          <ChevronRight
            className={cn(
              "text-muted-foreground h-4 w-4 shrink-0 transition-transform duration-200 ease-out motion-reduce:transition-none",
              open && "rotate-90",
            )}
            aria-hidden="true"
          />
          <span className="min-w-0 truncate text-sm font-semibold">{season.name}</span>
          {season.episodeCount != null ? (
            <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
              {canTrack && trackableSeason
                ? `${watchedCount}/${season.episodeCount}`
                : season.episodeCount}
            </span>
          ) : null}
        </button>

        {canTrack && trackableSeason ? (
          <WatchedToggle
            state={state}
            onClick={() => onToggleSeason(checklistSeason)}
            disabled={pending}
            label={season.name}
          />
        ) : null}
      </div>

      {open ? (
        <div
          id={`season-panel-${season.seasonNumber}`}
          className="border-border/40 border-t px-2 pt-2 pb-2"
        >
          {data?.overview ? (
            <p className="text-muted-foreground mb-2 px-1 text-xs text-pretty">
              {data.overview}
            </p>
          ) : null}

          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-[5.25rem] w-full max-w-full rounded-lg" />
              ))}
            </div>
          ) : isError ? (
            <p className="text-sm text-destructive">Could not load episodes.</p>
          ) : episodes.length === 0 ? (
            <p className="text-muted-foreground px-1 text-xs">No episodes listed.</p>
          ) : (
            <ul className="min-w-0 w-full space-y-1.5">
              {episodes.map((ep) => (
                <EpisodeRow
                  key={ep.id}
                  name={ep.name}
                  episodeNumber={ep.episodeNumber}
                  overview={ep.overview}
                  airDate={ep.airDate}
                  runtime={ep.runtime}
                  voteAverage={ep.voteAverage}
                  stillPath={ep.stillPath}
                  watched={isWatched(season.seasonNumber, ep.episodeNumber)}
                  canTrack={canTrack}
                  pending={pending}
                  seasonName={season.name}
                  onToggle={() =>
                    onToggleEpisode(season.seasonNumber, ep.episodeNumber)
                  }
                />
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </li>
  );
}

interface EpisodeRowProps {
  name: string;
  episodeNumber: number;
  overview?: string | null;
  airDate?: string | null;
  runtime?: number | null;
  voteAverage?: number | null;
  stillPath: string | null;
  watched: boolean;
  canTrack: boolean;
  pending: boolean;
  seasonName: string;
  onToggle: () => void;
}

/**
 * One episode: thumbnail, name, description, and its watched toggle.
 *
 * The toggle sits in the right-hand meta column directly beneath the runtime and
 * rating, so every row's control lands on the same vertical axis and the eye can
 * run straight down the column.
 *
 * A watched row is dimmed rather than restyled, which keeps the list scannable —
 * the unwatched episodes are the ones the user is looking for.
 */
function EpisodeRow({
  name,
  episodeNumber,
  overview,
  airDate,
  runtime,
  voteAverage,
  stillPath,
  watched,
  canTrack,
  pending,
  seasonName,
  onToggle,
}: EpisodeRowProps) {
  const still = stillUrl(stillPath, "w300");
  const hasRating = voteAverage != null && voteAverage > 0;

  return (
    <li
      className={cn(
        "flex min-w-0 max-w-full gap-2.5 overflow-hidden rounded-lg bg-background/40 p-2 transition-opacity duration-200 dark:bg-black/20 sm:gap-3 motion-reduce:transition-none",
        watched && "opacity-60",
      )}
    >
      <div className="relative aspect-video w-[5.5rem] shrink-0 overflow-hidden rounded-md bg-muted sm:w-28">
        {still ? (
          <Image src={still} alt="" fill sizes="112px" className="object-cover" />
        ) : (
          <div className="text-muted-foreground flex h-full items-center justify-center text-[11px]">
            E{episodeNumber}
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1 space-y-0.5 overflow-hidden py-0.5">
        <p className="min-w-0 text-sm leading-snug font-semibold">
          <span className="text-muted-foreground tabular-nums">{episodeNumber}.</span>{" "}
          {name}
        </p>
        {airDate ? (
          <p className="text-muted-foreground truncate text-[11px]">
            {formatDate(airDate)}
          </p>
        ) : null}
        {overview ? (
          <p className="text-prose-soft text-muted-foreground line-clamp-2 text-[0.8rem]">
            {overview}
          </p>
        ) : null}
      </div>

      {/* Meta column: runtime and rating, with the toggle directly below them. */}
      <div className="flex shrink-0 flex-col items-end gap-1.5 py-0.5">
        <div className="text-muted-foreground flex items-center gap-1.5 text-[11px] whitespace-nowrap">
          {runtime ? <span>{formatRuntime(runtime)}</span> : null}
          {hasRating ? (
            <span className="text-primary">★ {formatVote(voteAverage)}</span>
          ) : null}
        </div>
        {canTrack ? (
          <WatchedToggle
            state={watched}
            onClick={onToggle}
            disabled={pending}
            label={`${seasonName} episode ${episodeNumber}`}
            size="sm"
          />
        ) : null}
      </div>
    </li>
  );
}
