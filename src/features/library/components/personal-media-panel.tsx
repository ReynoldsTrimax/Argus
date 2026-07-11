"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Bookmark,
  Check,
  Heart,
  Loader2,
  Pause,
  Play,
  Star,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  actionUpsertAndSetStatus,
  actionToggleFavorite,
  actionSetRating,
  actionSaveReview,
  actionAddNote,
  actionDeleteNote,
  actionCreateTag,
  actionAssignTag,
  actionRemoveTag,
  actionAddToCollection,
  actionCreateCollection,
  actionLogSession,
  actionSetMovieProgress,
  actionSetTvProgress,
} from "@/features/library/actions/library-actions";
import {
  WATCH_STATUS_LABELS,
  WATCH_STATUSES,
  type MediaIdentity,
  type PersonalMediaState,
  type WatchStatus,
  type Tag,
  type Collection,
} from "@/types/library";
import { cn } from "@/lib/utils";

export interface TvSeasonOption {
  seasonNumber: number;
  name: string;
  episodeCount: number | null;
}

interface PersonalMediaPanelProps {
  identity: MediaIdentity;
  initial: PersonalMediaState;
  allTags: Tag[];
  allCollections: Collection[];
  ratingScale?: "five" | "ten" | "hundred";
  /** Season list for TV progress picker (episode counts). */
  seasons?: TvSeasonOption[];
}

/**
 * Personal journal panel on movie/TV detail pages.
 * Lives in the sticky sidebar below the hero so the trailer stage stays open.
 */
export function PersonalMediaPanel({
  identity,
  initial,
  allTags,
  allCollections,
  ratingScale = "ten",
  seasons = [],
}: PersonalMediaPanelProps) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  // Keyed by entry/review identity so server refresh remounts clean local state.
  const formKey = `${initial.entry?.id ?? "new"}-${initial.entry?.updated_at ?? "0"}-${initial.review?.updated_at ?? "0"}-${initial.notes.length}`;
  const [reviewBody, setReviewBody] = React.useState(initial.review?.body ?? "");
  const [spoilers, setSpoilers] = React.useState(
    initial.review?.contains_spoilers ?? false,
  );
  const [noteBody, setNoteBody] = React.useState("");
  const [newTag, setNewTag] = React.useState("");
  const [newCollection, setNewCollection] = React.useState("");
  const [rating, setRating] = React.useState(
    initial.entry?.user_rating?.toString() ?? "",
  );
  const [movieMinutes, setMovieMinutes] = React.useState(
    initial.entry?.movie_progress_minutes?.toString() ?? "",
  );
  const [tvSeason, setTvSeason] = React.useState(
    String(initial.entry?.current_season ?? seasons[0]?.seasonNumber ?? 1),
  );
  const [tvEpisode, setTvEpisode] = React.useState(
    String(initial.entry?.current_episode ?? 1),
  );

  // Reset editable fields when the server payload identity changes (after router.refresh).
  const [prevKey, setPrevKey] = React.useState(formKey);
  if (prevKey !== formKey) {
    setPrevKey(formKey);
    setReviewBody(initial.review?.body ?? "");
    setSpoilers(initial.review?.contains_spoilers ?? false);
    setRating(initial.entry?.user_rating?.toString() ?? "");
    setMovieMinutes(initial.entry?.movie_progress_minutes?.toString() ?? "");
    setTvSeason(
      String(initial.entry?.current_season ?? seasons[0]?.seasonNumber ?? 1),
    );
    setTvEpisode(String(initial.entry?.current_episode ?? 1));
  }

  const seasonOptions =
    seasons.length > 0
      ? seasons
      : [{ seasonNumber: 1, name: "Season 1", episodeCount: null }];
  const selectedSeasonMeta =
    seasonOptions.find((s) => String(s.seasonNumber) === tvSeason) ??
    seasonOptions[0]!;
  const maxEpisode = Math.max(1, selectedSeasonMeta.episodeCount ?? 50);

  const state = initial;

  const run = (fn: () => Promise<void>) => {
    startTransition(async () => {
      try {
        await fn();
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Something went wrong");
      }
    });
  };

  const setStatus = (status: WatchStatus) => {
    run(async () => {
      const res = await actionUpsertAndSetStatus(identity, status);
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success(`Marked as ${WATCH_STATUS_LABELS[status]}`);
    });
  };

  const maxRating = ratingScale === "five" ? 5 : ratingScale === "hundred" ? 100 : 10;
  const step = ratingScale === "hundred" ? 1 : 0.5;
  const currentStatus = state.entry?.status;
  const statusLabel = currentStatus
    ? WATCH_STATUS_LABELS[currentStatus]
    : "Not tracked yet";

  return (
    <aside
      className={cn(
        "space-y-4 rounded-3xl border-0 bg-muted/40 dark:bg-white/[0.05] p-4 shadow-sm sm:p-5",
        pending && "opacity-90",
      )}
      aria-busy={pending}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-section-title text-[1.05rem]">Have you watched it?</h2>
          <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
            {statusLabel}
            {state.entry?.is_favorite ? " · Favorite" : ""}
          </p>
        </div>
        {pending ? (
          <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
        ) : null}
      </div>

      {/* Quick status — primary actions, compact for sidebar */}
      <div className="grid grid-cols-2 gap-1.5">
        <Button
          type="button"
          size="sm"
          variant={state.entry?.status === "watching" ? "default" : "outline"}
          className={cn(
            "h-8 text-xs",
            state.entry?.status === "watching" && "shadow-glow",
          )}
          onClick={() => setStatus("watching")}
          disabled={pending}
        >
          <Play className="h-3.5 w-3.5" />
          Watching
        </Button>
        <Button
          type="button"
          size="sm"
          variant={state.entry?.status === "completed" ? "default" : "outline"}
          className={cn(
            "h-8 text-xs",
            state.entry?.status === "completed" && "shadow-glow",
          )}
          onClick={() => setStatus("completed")}
          disabled={pending}
        >
          <Check className="h-3.5 w-3.5" />
          Completed
        </Button>
        <Button
          type="button"
          size="sm"
          variant={
            state.entry?.status === "plan_to_watch" || state.entry?.status === "wishlist"
              ? "default"
              : "outline"
          }
          className="h-8 text-xs"
          onClick={() => setStatus("plan_to_watch")}
          disabled={pending}
        >
          <Bookmark className="h-3.5 w-3.5" />
          Plan
        </Button>
        <Button
          type="button"
          size="sm"
          variant={state.entry?.status === "dropped" ? "default" : "outline"}
          className="h-8 text-xs"
          onClick={() => setStatus("dropped")}
          disabled={pending}
        >
          <XCircle className="h-3.5 w-3.5" />
          Dropped
        </Button>
      </div>

      <div className="flex gap-1.5">
        <Button
          type="button"
          variant={state.entry?.is_favorite ? "default" : "outline"}
          size="sm"
          className="h-8 flex-1 text-xs"
          disabled={pending}
          onClick={() =>
            run(async () => {
              const next = !state.entry?.is_favorite;
              const res = await actionToggleFavorite(identity, next);
              if (!res.success) toast.error(res.error);
              else toast.success(next ? "Added to favorites" : "Removed from favorites");
            })
          }
        >
          <Heart
            className={cn("h-3.5 w-3.5", state.entry?.is_favorite && "fill-current")}
          />
          Favorite
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 flex-1 text-xs"
          disabled={pending}
          onClick={() => setStatus("paused")}
        >
          <Pause className="h-3.5 w-3.5" />
          Pause
        </Button>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="status-select" className="text-xs text-muted-foreground">
          All statuses
        </Label>
        <Select
          value={state.entry?.status ?? "plan_to_watch"}
          onValueChange={(v) => setStatus(v as WatchStatus)}
          disabled={pending}
        >
          <SelectTrigger id="status-select" className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {WATCH_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {WATCH_STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {state.entry && state.entry.progress_percent > 0 ? (
        <div className="space-y-1.5 rounded-xl bg-muted/40 px-3 py-2.5">
          <div className="flex justify-between text-[11px] text-muted-foreground">
            <span>Progress</span>
            <span>{Math.round(state.entry.progress_percent)}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${state.entry.progress_percent}%` }}
            />
          </div>
          {identity.mediaType === "tv" &&
          currentStatus !== "completed" &&
          state.entry.current_season != null ? (
            <p className="text-[11px] text-muted-foreground">
              S{state.entry.current_season}E{state.entry.current_episode ?? "—"} ·{" "}
              {state.entry.episodes_watched} episodes
            </p>
          ) : null}
        </div>
      ) : null}

      {identity.mediaType === "movie" ? (
        <div className="space-y-1.5">
          <Label htmlFor="movie-progress" className="text-xs text-muted-foreground">
            Progress (minutes)
          </Label>
          <div className="flex gap-1.5">
            <Input
              id="movie-progress"
              type="number"
              min={0}
              value={movieMinutes}
              onChange={(e) => setMovieMinutes(e.target.value)}
              placeholder={identity.runtimeMinutes ? `of ${identity.runtimeMinutes}` : "0"}
              className="h-8 text-xs"
            />
            <Button
              type="button"
              size="sm"
              className="h-8 shrink-0 text-xs"
              disabled={pending}
              onClick={() =>
                run(async () => {
                  const mins = Number(movieMinutes);
                  if (Number.isNaN(mins) || mins < 0) {
                    toast.error("Enter valid minutes");
                    return;
                  }
                  const res = await actionSetMovieProgress(identity, mins);
                  if (!res.success) toast.error(res.error);
                  else toast.success("Progress saved");
                })
              }
            >
              Save
            </Button>
          </div>
        </div>
      ) : null}

      {/* Progress picker: watching / paused / dropped (not completed — full run is assumed). */}
      {identity.mediaType === "tv" && currentStatus !== "completed" ? (
        <div className="space-y-2 rounded-xl border-0 bg-muted/30 dark:bg-white/[0.04] p-3">
          <div>
            <p className="text-xs font-medium text-foreground">Watched up to</p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
              {currentStatus === "dropped"
                ? "Log how far you got before dropping — still counts toward hours."
                : "Set season & episode — hours go to your total watched."}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="tv-season" className="text-[11px] text-muted-foreground">
                Season
              </Label>
              <Select
                value={tvSeason}
                onValueChange={(v) => {
                  setTvSeason(v);
                  setTvEpisode("1");
                }}
                disabled={pending}
              >
                <SelectTrigger id="tv-season" className="h-8 text-xs">
                  <SelectValue placeholder="Season" />
                </SelectTrigger>
                <SelectContent>
                  {seasonOptions.map((s) => (
                    <SelectItem key={s.seasonNumber} value={String(s.seasonNumber)}>
                      {s.name}
                      {s.episodeCount != null ? ` (${s.episodeCount})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="tv-episode" className="text-[11px] text-muted-foreground">
                Episode
              </Label>
              <Input
                id="tv-episode"
                type="number"
                min={1}
                max={maxEpisode}
                value={tvEpisode}
                onChange={(e) => setTvEpisode(e.target.value)}
                className="h-8 text-xs"
                disabled={pending}
              />
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            className="h-8 w-full text-xs"
            disabled={pending}
            onClick={() =>
              run(async () => {
                const s = Number(tvSeason);
                const e = Number(tvEpisode);
                if (!Number.isFinite(s) || s < 1 || !Number.isFinite(e) || e < 1) {
                  toast.error("Enter a valid season and episode");
                  return;
                }
                if (e > maxEpisode) {
                  toast.error(`Episode must be 1–${maxEpisode} for this season`);
                  return;
                }
                const res = await actionSetTvProgress(
                  identity,
                  s,
                  e,
                  seasonOptions.map((x) => ({
                    seasonNumber: x.seasonNumber,
                    episodeCount: x.episodeCount,
                  })),
                );
                if (!res.success) {
                  toast.error(res.error);
                  return;
                }
                const hours = Math.round((res.data.minutesAdded / 60) * 10) / 10;
                toast.success(
                  res.data.minutesAdded > 0
                    ? `Saved S${s}E${e} · +${hours}h added to totals`
                    : `Progress set to S${s}E${e}`,
                );
              })
            }
          >
            <Play className="h-3.5 w-3.5" />
            Save episode progress
          </Button>
          {state.entry?.current_season != null ? (
            <p className="text-[11px] text-muted-foreground">
              Current: S{state.entry.current_season}E
              {state.entry.current_episode ?? "—"} ·{" "}
              {state.entry.episodes_watched} ep
              {identity.runtimeMinutes
                ? ` · ~${Math.round(((state.entry.episodes_watched || 0) * identity.runtimeMinutes) / 60)}h`
                : ""}
            </p>
          ) : null}
        </div>
      ) : null}

      <Separator className="opacity-60" />

      {/* Rating */}
      <div className="space-y-1.5">
        <Label htmlFor="rating" className="text-xs text-muted-foreground">
          Your rating (0–{maxRating})
        </Label>
        <div className="flex gap-1.5">
          <Input
            id="rating"
            type="number"
            min={0}
            max={maxRating}
            step={step}
            value={rating}
            onChange={(e) => setRating(e.target.value)}
            placeholder={`${maxRating === 5 ? "4.5" : "8.5"}`}
            className="h-8 text-xs"
          />
          <Button
            type="button"
            size="sm"
            className="h-8 shrink-0 text-xs"
            disabled={pending}
            onClick={() =>
              run(async () => {
                const v = Number(rating);
                if (Number.isNaN(v)) {
                  toast.error("Enter a number");
                  return;
                }
                const res = await actionSetRating(identity, v, ratingScale);
                if (!res.success) toast.error(res.error);
                else toast.success("Rating saved");
              })
            }
          >
            <Star className="h-3.5 w-3.5" />
            Rate
          </Button>
        </div>
        {state.ratingHistory.length > 0 ? (
          <p className="text-[11px] text-muted-foreground">
            History:{" "}
            {state.ratingHistory
              .slice(0, 3)
              .map((h) => h.value)
              .join(" → ")}
          </p>
        ) : null}
      </div>

      {/* Review */}
      <div className="space-y-1.5">
        <Label htmlFor="review" className="text-xs text-muted-foreground">
          Review
        </Label>
        <Textarea
          id="review"
          value={reviewBody}
          onChange={(e) => setReviewBody(e.target.value)}
          placeholder="What stayed with you?"
          rows={3}
          className="min-h-[4.5rem] resize-y text-xs"
        />
        <div className="flex items-center justify-between gap-2">
          <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <Switch checked={spoilers} onCheckedChange={setSpoilers} />
            Spoilers
          </label>
          <Button
            type="button"
            size="sm"
            className="h-8 text-xs"
            disabled={pending || !reviewBody.trim()}
            onClick={() =>
              run(async () => {
                const res = await actionSaveReview(identity, reviewBody, {
                  containsSpoilers: spoilers,
                });
                if (!res.success) toast.error(res.error);
                else toast.success("Review saved");
              })
            }
          >
            Save review
          </Button>
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <Label htmlFor="note" className="text-xs text-muted-foreground">
          Private notes
        </Label>
        {state.notes.length ? (
          <div className="max-h-28 space-y-1.5 overflow-y-auto pr-0.5">
            {state.notes.map((n) => (
              <div
                key={n.id}
                className="rounded-lg border-0 bg-muted/30 dark:bg-white/[0.04] p-2 text-[11px]"
              >
                <p className="whitespace-pre-wrap text-foreground/90">{n.body}</p>
                <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                  <span>{new Date(n.created_at).toLocaleDateString()}</span>
                  <button
                    type="button"
                    className="underline-offset-2 hover:underline"
                    onClick={() =>
                      run(async () => {
                        const res = await actionDeleteNote(n.id);
                        if (!res.success) toast.error(res.error);
                      })
                    }
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : null}
        <Textarea
          id="note"
          value={noteBody}
          onChange={(e) => setNoteBody(e.target.value)}
          placeholder="A quick note for yourself…"
          rows={2}
          className="min-h-[3rem] resize-y text-xs"
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 w-full text-xs"
          disabled={pending || !noteBody.trim()}
          onClick={() =>
            run(async () => {
              const res = await actionAddNote(identity, noteBody);
              if (!res.success) toast.error(res.error);
              else {
                toast.success("Note added");
                setNoteBody("");
              }
            })
          }
        >
          Add note
        </Button>
      </div>

      {/* Tags */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Tags</Label>
        {state.tags.length ? (
          <div className="flex flex-wrap gap-1">
            {state.tags.map((t) => (
              <Badge
                key={t.id}
                variant="secondary"
                className="cursor-pointer text-[10px]"
                onClick={() =>
                  state.entry &&
                  run(async () => {
                    const res = await actionRemoveTag(state.entry!.id, t.id);
                    if (!res.success) toast.error(res.error);
                  })
                }
              >
                {t.name} ×
              </Badge>
            ))}
          </div>
        ) : null}
        <Select
          onValueChange={(tagId) =>
            run(async () => {
              const res = await actionAssignTag(identity, tagId);
              if (!res.success) toast.error(res.error);
              else toast.success("Tag added");
            })
          }
        >
          <SelectTrigger aria-label="Assign tag" className="h-8 text-xs">
            <SelectValue placeholder="Assign tag" />
          </SelectTrigger>
          <SelectContent>
            {allTags.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex gap-1.5">
          <Input
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            placeholder="New tag"
            className="h-8 text-xs"
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 shrink-0 text-xs"
            disabled={pending || !newTag.trim()}
            onClick={() =>
              run(async () => {
                const created = await actionCreateTag(newTag.trim());
                if (!created.success) {
                  toast.error(created.error);
                  return;
                }
                await actionAssignTag(identity, created.data.id);
                setNewTag("");
                toast.success("Tag created");
              })
            }
          >
            Add
          </Button>
        </div>
      </div>

      {/* Collections */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Collections</Label>
        {state.collections.length ? (
          <div className="flex flex-wrap gap-1">
            {state.collections.map((c) => (
              <Badge key={c.id} variant="outline" className="text-[10px]">
                {c.name}
              </Badge>
            ))}
          </div>
        ) : null}
        <Select
          onValueChange={(collectionId) =>
            run(async () => {
              const res = await actionAddToCollection(identity, collectionId);
              if (!res.success) toast.error(res.error);
              else toast.success("Added to collection");
            })
          }
        >
          <SelectTrigger aria-label="Add to collection" className="h-8 text-xs">
            <SelectValue placeholder="Add to collection" />
          </SelectTrigger>
          <SelectContent>
            {allCollections.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex gap-1.5">
          <Input
            value={newCollection}
            onChange={(e) => setNewCollection(e.target.value)}
            placeholder="New collection"
            className="h-8 text-xs"
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 shrink-0 text-xs"
            disabled={pending || !newCollection.trim()}
            onClick={() =>
              run(async () => {
                const created = await actionCreateCollection(newCollection.trim());
                if (!created.success) {
                  toast.error(created.error);
                  return;
                }
                await actionAddToCollection(identity, created.data.id);
                setNewCollection("");
                toast.success("Collection created");
              })
            }
          >
            Create
          </Button>
        </div>
      </div>

      <Separator className="opacity-60" />

      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="h-8 w-full text-xs"
        disabled={pending}
        onClick={() =>
          run(async () => {
            const res = await actionLogSession(identity, {
              sessionDate: new Date().toISOString().slice(0, 10),
              isRewatch: state.entry?.status === "rewatching",
            });
            if (!res.success) toast.error(res.error);
            else toast.success("Watch session logged");
          })
        }
      >
        Log watch session
      </Button>
    </aside>
  );
}
