"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Clock, Loader2, Search, UserPlus, UserX, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  actionSearchProfiles,
  actionSendFriendRequest,
  actionAcceptFriendRequest,
  actionDeclineFriendRequest,
  actionRemoveFriend,
} from "@/features/social/actions/friend-actions";
import { ROUTES } from "@/constants/routes";
import type { ProfileWithRelationship, PublicProfile } from "@/types/social";
import { cn } from "@/lib/utils";

/** Initials fallback when a friend has no avatar. */
function initials(profile: PublicProfile): string {
  const source = profile.display_name?.trim() || profile.username || "?";
  return source
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

interface PersonRowProps {
  profile: PublicProfile;
  children?: React.ReactNode;
}

/** Avatar, name and username — the shared shape of every list row here. */
export function PersonRow({ profile, children }: PersonRowProps) {
  return (
    <li className="flex items-center gap-3 rounded-xl bg-muted/40 p-3 dark:bg-white/[0.05]">
      <Avatar className="h-9 w-9 shrink-0">
        {profile.avatar_url ? (
          <AvatarImage src={profile.avatar_url} alt="" />
        ) : null}
        <AvatarFallback className="text-[11px]">{initials(profile)}</AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        {profile.username ? (
          <Link
            href={ROUTES.userProfile(profile.username)}
            className="block min-w-0 truncate text-sm font-semibold underline-offset-4 hover:underline"
          >
            {profile.display_name || profile.username}
          </Link>
        ) : (
          <p className="min-w-0 truncate text-sm font-semibold">
            {profile.display_name ?? "Unknown"}
          </p>
        )}
        {profile.username ? (
          <p className="text-muted-foreground truncate text-xs">@{profile.username}</p>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-1.5">{children}</div>
    </li>
  );
}

/**
 * Username search with an add button per result.
 *
 * Debounced rather than search-on-submit so finding a friend feels like typing a
 * name, not filling in a form. Results carry the viewer's existing relationship,
 * so someone already added shows as such instead of offering a duplicate request
 * the unique index would reject.
 */
export function FriendSearch() {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<ProfileWithRelationship[]>([]);
  const [searching, setSearching] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  const term = query.trim();
  const tooShort = term.length < 2;

  // Derived rather than cleared in an effect: resetting these as state would mean
  // a synchronous setState in the effect body and an extra render pass on every
  // keystroke, for information already implied by the query itself.
  const visibleResults = tooShort ? [] : results;
  const isSearching = !tooShort && searching;

  React.useEffect(() => {
    if (tooShort) return;

    // Cancel-by-supersede: a slow response for an old query must never overwrite
    // the results of a newer one.
    let active = true;
    const timer = setTimeout(async () => {
      if (!active) return;
      setSearching(true);
      const res = await actionSearchProfiles(term);
      if (!active) return;
      setSearching(false);
      if (res.success) setResults(res.data);
      else toast.error(res.error);
    }, 280);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [term, tooShort]);

  const add = (userId: string) => {
    startTransition(async () => {
      const res = await actionSendFriendRequest(userId);
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success(res.data.message);
      // Reflect the new relationship without re-running the search.
      setResults((prev) =>
        prev.map((r) =>
          r.profile.id === userId ? { ...r, relationship: "outgoing_pending" } : r,
        ),
      );
      router.refresh();
    });
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search
          className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2"
          aria-hidden="true"
        />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by username or name"
          aria-label="Search for people by username"
          className="pl-9"
        />
        {isSearching ? (
          <Loader2
            className="text-muted-foreground absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 animate-spin"
            aria-hidden="true"
          />
        ) : null}
      </div>

      {!tooShort && !isSearching && visibleResults.length === 0 ? (
        <p className="text-muted-foreground px-1 text-sm">
          No one found for “{term}”. Ask your friend for the username on their
          profile page.
        </p>
      ) : null}

      {visibleResults.length > 0 ? (
        <ul className="space-y-2">
          {visibleResults.map(({ profile, relationship }) => (
            <PersonRow key={profile.id} profile={profile}>
              {relationship === "none" || relationship === "declined" ? (
                <Button
                  type="button"
                  size="sm"
                  className="h-8 text-xs"
                  disabled={pending}
                  onClick={() => add(profile.id)}
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Add
                </Button>
              ) : relationship === "friends" ? (
                <span className="text-muted-foreground flex items-center gap-1 text-xs">
                  <Check className="h-3.5 w-3.5" />
                  Friends
                </span>
              ) : relationship === "outgoing_pending" ? (
                <span className="text-muted-foreground flex items-center gap-1 text-xs">
                  <Clock className="h-3.5 w-3.5" />
                  Requested
                </span>
              ) : relationship === "incoming_pending" ? (
                <span className="text-primary flex items-center gap-1 text-xs">
                  Wants to connect
                </span>
              ) : null}
            </PersonRow>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

interface RequestActionsProps {
  friendshipId: string;
  /** Incoming requests can be accepted; outgoing ones can only be cancelled. */
  direction: "incoming" | "outgoing";
}

export function RequestActions({ friendshipId, direction }: RequestActionsProps) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  const run = (fn: () => Promise<{ success: boolean; error?: string }>, ok: string) => {
    startTransition(async () => {
      const res = await fn();
      if (!res.success) {
        toast.error(res.error ?? "Failed");
        return;
      }
      toast.success(ok);
      router.refresh();
    });
  };

  if (direction === "outgoing") {
    return (
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-8 text-xs"
        disabled={pending}
        onClick={() => run(() => actionRemoveFriend(friendshipId), "Request cancelled")}
      >
        <X className="h-3.5 w-3.5" />
        Cancel
      </Button>
    );
  }

  return (
    <>
      <Button
        type="button"
        size="sm"
        className="h-8 text-xs"
        disabled={pending}
        onClick={() =>
          run(() => actionAcceptFriendRequest(friendshipId), "You're now friends")
        }
      >
        <Check className="h-3.5 w-3.5" />
        Accept
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-8 text-xs"
        disabled={pending}
        onClick={() =>
          run(() => actionDeclineFriendRequest(friendshipId), "Request declined")
        }
      >
        <X className="h-3.5 w-3.5" />
        Decline
      </Button>
    </>
  );
}

/**
 * Unfriend control.
 *
 * Confirms inline before removing: losing access to a friend's library is not
 * something to trigger from a single mis-click, but it is also reversible by
 * asking again, so it does not warrant a modal.
 */
export function RemoveFriendButton({
  friendshipId,
  name,
}: {
  friendshipId: string;
  name: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  if (!confirming) {
    return (
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="text-muted-foreground hover:text-destructive h-8 text-xs"
        onClick={() => setConfirming(true)}
        aria-label={`Remove ${name} as a friend`}
      >
        <UserX className="h-3.5 w-3.5" />
        Remove
      </Button>
    );
  }

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="destructive"
        className="h-8 text-xs"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const res = await actionRemoveFriend(friendshipId);
            if (!res.success) {
              toast.error(res.error);
              return;
            }
            toast.success(`Removed ${name}`);
            setConfirming(false);
            router.refresh();
          })
        }
      >
        Confirm
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-8 text-xs"
        disabled={pending}
        onClick={() => setConfirming(false)}
      >
        Keep
      </Button>
    </>
  );
}

/** Add / pending / friends control for a profile page header. */
export function ProfileFriendAction({
  targetUserId,
  friendshipId,
  relationship,
  name,
}: {
  targetUserId: string;
  friendshipId: string | null;
  relationship: ProfileWithRelationship["relationship"];
  name: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  if (relationship === "self") return null;

  if (relationship === "friends" && friendshipId) {
    return <RemoveFriendButton friendshipId={friendshipId} name={name} />;
  }

  if (relationship === "incoming_pending" && friendshipId) {
    return <RequestActions friendshipId={friendshipId} direction="incoming" />;
  }

  if (relationship === "outgoing_pending" && friendshipId) {
    return <RequestActions friendshipId={friendshipId} direction="outgoing" />;
  }

  return (
    <Button
      type="button"
      size="sm"
      className={cn("h-8 text-xs")}
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const res = await actionSendFriendRequest(targetUserId);
          if (!res.success) {
            toast.error(res.error);
            return;
          }
          toast.success(res.data.message);
          router.refresh();
        })
      }
    >
      <UserPlus className="h-3.5 w-3.5" />
      Add friend
    </Button>
  );
}
