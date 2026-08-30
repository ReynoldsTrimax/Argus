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
  Trash2,
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
  actionRemoveFromLibrary,
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

interface PersonalMediaPanelProps {
  identity: MediaIdentity;
  initial: PersonalMediaState;
  allTags: Tag[];
  allCollections: Collection[];
  ratingScale?: "five" | "ten" | "hundred";
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

  // Reset editable fields when the server payload identity changes (after router.refresh).
  const [prevKey, setPrevKey] = React.useState(formKey);
  if (prevKey !== formKey) {
    setPrevKey(formKey);
    setReviewBody(initial.review?.body ?? "");
    setSpoilers(initial.review?.contains_spoilers ?? false);
    setRating(initial.entry?.user_rating?.toString() ?? "");
    setMovieMinutes(initial.entry?.movie_progress_minutes?.toString() ?? "");
  }

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

  /**
   * Anything the cascade would destroy beyond a bare status.
   *
   * Untracking a title the user only tapped once is trivially reversible — one
   * tap puts it back — so it removes immediately. Once a rating, review, note or
   * episode progress exists, the delete is no longer reversible and has to be
   * confirmed first.
   */
  const hasDataWorthKeeping = Boolean(
    state.entry &&
      (state.entry.user_rating != null ||
        state.review ||
        state.notes.length > 0 ||
        (state.entry.episodes_watched ?? 0) > 0 ||
        (state.entry.movie_progress_minutes ?? 0) > 0),
  );

  const [confirmingRemove, setConfirmingRemove] = React.useState(false);

  const removeFromLibrary = () => {
    setConfirmingRemove(false);
    run(async () => {
      const res = await actionRemoveFromLibrary(identity);
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success(
        res.data.removed
          ? `Removed ${res.data.title ?? identity.title} from your library`
          : "Not in your library",
      );
    });
  };

  const requestRemove = () => {
    if (hasDataWorthKeeping) {
      setConfirmingRemove(true);
      return;
    }
    removeFromLibrary();
  };

  /**
   * Status buttons are toggles: pressing the active status untracks the title.
   * Pressing a different one just moves it, as before.
   */
  const toggleStatus = (status: WatchStatus) => {
    if (state.entry?.status === status) {
      requestRemove();
      return;
    }
    setConfirmingRemove(false);
    setStatus(status);
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
        "bg-muted/40 space-y-4 rounded-3xl border-0 p-4 shadow-sm sm:p-5 dark:bg-white/[0.05]",
        pending && "opacity-90",
      )}
      aria-busy={pending}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-section-title text-[1.05rem]">Have you watched it?</h2>
          <p className="text-muted-foreground mt-0.5 text-[11px] leading-relaxed">
            {statusLabel}
            {state.entry?.is_favorite ? " · Favorite" : ""}
          </p>
        </div>
        {pending ? (
          <Loader2 className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0 animate-spin" />
        ) : null}
      </div>

      {/* Quick status — each button is a toggle: pressing the active one untracks. */}
      <div className="grid grid-cols-2 gap-2">
        <StatusToggle
          label="Watching"
          icon={<Play className="h-3.5 w-3.5" />}
          active={state.entry?.status === "watching"}
          glow
          onClick={() => toggleStatus("watching")}
          disabled={pending}
        />
        <StatusToggle
          label="Completed"
          icon={<Check className="h-3.5 w-3.5" />}
          active={state.entry?.status === "completed"}
          glow
          onClick={() => toggleStatus("completed")}
          disabled={pending}
        />
        <StatusToggle
          label="Plan"
          icon={<Bookmark className="h-3.5 w-3.5" />}
          active={
            state.entry?.status === "plan_to_watch" ||
            state.entry?.status === "wishlist"
          }
          onClick={() =>
            toggleStatus(
              state.entry?.status === "wishlist" ? "wishlist" : "plan_to_watch",
            )
          }
          disabled={pending}
        />
        <StatusToggle
          label="Dropped"
          icon={<XCircle className="h-3.5 w-3.5" />}
          active={state.entry?.status === "dropped"}
          onClick={() => toggleStatus("dropped")}
          disabled={pending}
        />
      </div>

      <div className="flex gap-2">
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
        <Label htmlFor="status-select" className="text-muted-foreground text-xs">
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

      {/* Untrack — covers every status, including ones only reachable from the
          dropdown above, where re-picking the current value fires no change. */}
      {state.entry ? (
        confirmingRemove ? (
          <div
            className="panel-block-enter space-y-2 rounded-xl bg-destructive/10 p-3"
            role="alertdialog"
            aria-label="Confirm removal"
          >
            <p className="text-foreground text-[11px] leading-relaxed">
              Remove <span className="font-medium">{identity.title}</span> and
              everything saved with it: your rating, review, notes and episode
              progress? This can&apos;t be undone.
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="destructive"
                className="h-8 flex-1 text-xs"
                disabled={pending}
                onClick={removeFromLibrary}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 flex-1 text-xs"
                disabled={pending}
                onClick={() => setConfirmingRemove(false)}
              >
                Keep
              </Button>
            </div>
          </div>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="text-muted-foreground hover:text-destructive h-8 w-full text-xs"
            disabled={pending}
            onClick={requestRemove}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Remove from library
          </Button>
        )
      ) : null}

      {state.entry && state.entry.progress_percent > 0 ? (
        <div className="panel-block-enter bg-muted/40 space-y-1.5 rounded-xl px-3 py-2.5">
          <div className="text-muted-foreground flex justify-between text-[11px]">
            <span>Progress</span>
            <span>{Math.round(state.entry.progress_percent)}%</span>
          </div>
          <div className="bg-muted h-1.5 overflow-hidden rounded-full">
            <div
              className="bg-primary h-full rounded-full"
              style={{ width: `${state.entry.progress_percent}%` }}
            />
          </div>
          {identity.mediaType === "tv" &&
          currentStatus !== "completed" &&
          state.entry.current_season != null ? (
            <p className="text-muted-foreground text-[11px]">
              S{state.entry.current_season}E{state.entry.current_episode ?? "—"} ·{" "}
              {state.entry.episodes_watched} episodes
            </p>
          ) : null}
        </div>
      ) : null}

      {identity.mediaType === "movie" ? (
        <div className="space-y-1.5">
          <Label htmlFor="movie-progress" className="text-muted-foreground text-xs">
            Progress (minutes)
          </Label>
          <div className="flex gap-1.5">
            <Input
              id="movie-progress"
              type="number"
              min={0}
              value={movieMinutes}
              onChange={(e) => setMovieMinutes(e.target.value)}
              placeholder={
                identity.runtimeMinutes ? `of ${identity.runtimeMinutes}` : "0"
              }
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

      {/* The season/episode checklist above replaces the old two-dropdown
          "Watched up to" form. Keeping both would mean two write paths to the
          same rows, which is how progress ends up disagreeing with itself. */}

      <Separator className="opacity-60" />

      {/* Rating */}
      <div className="space-y-1.5">
        <Label htmlFor="rating" className="text-muted-foreground text-xs">
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
          <p className="text-muted-foreground text-[11px]">
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
        <Label htmlFor="review" className="text-muted-foreground text-xs">
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
          <label className="text-muted-foreground flex items-center gap-2 text-[11px]">
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
        <Label htmlFor="note" className="text-muted-foreground text-xs">
          Private notes
        </Label>
        {state.notes.length ? (
          <div className="max-h-28 space-y-1.5 overflow-y-auto pr-0.5">
            {state.notes.map((n) => (
              <div
                key={n.id}
                className="bg-muted/30 rounded-lg border-0 p-2 text-[11px] dark:bg-white/[0.04]"
              >
                <p className="text-foreground/90 whitespace-pre-wrap">{n.body}</p>
                <div className="text-muted-foreground mt-1 flex justify-between text-[10px]">
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
        <Label className="text-muted-foreground text-xs">Tags</Label>
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
        <Label className="text-muted-foreground text-xs">Collections</Label>
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

interface StatusToggleProps {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
  glow?: boolean;
}

/**
 * A status button that reads as a toggle.
 *
 * `aria-pressed`, plus a label that changes once active, is what tells the user
 * the second press untracks the title — without it the control looks like it
 * would simply re-apply a status it already has. The press scale fires on
 * pointer-down rather than on completion, so the feedback never waits for the
 * server round trip.
 */
function StatusToggle({
  label,
  icon,
  active,
  onClick,
  disabled,
  glow = false,
}: StatusToggleProps) {
  return (
    <Button
      type="button"
      size="sm"
      variant={active ? "default" : "outline"}
      aria-pressed={active}
      aria-label={active ? `${label}. Press again to remove from library` : label}
      title={active ? "Press again to remove from library" : undefined}
      className={cn(
        "h-8 justify-center gap-1.5 text-xs transition-transform duration-100 ease-out active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100",
        active && glow && "shadow-glow",
      )}
      onClick={onClick}
      disabled={disabled}
    >
      {icon}
      {label}
    </Button>
  );
}
