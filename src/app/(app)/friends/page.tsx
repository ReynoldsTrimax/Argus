import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Users } from "lucide-react";

import { getCurrentUser, getProfile } from "@/lib/services/user-service";
import {
  listFriends,
  listIncomingRequests,
  listOutgoingRequests,
} from "@/lib/social/friends";
import { getFriendActivity } from "@/lib/social/profiles";
import {
  FriendSearch,
  PersonRow,
  RequestActions,
  RemoveFriendButton,
} from "@/features/social/components/friend-controls";
import { LibraryVisibilityControl } from "@/features/social/components/library-visibility-control";
import { EmptyState } from "@/components/feedback/empty-state";
import { Badge } from "@/components/ui/badge";
import { ROUTES } from "@/constants/routes";
import { mediaHref } from "@/lib/media/routes";
import type { LibraryVisibility } from "@/types/social";

export const metadata: Metadata = {
  title: "Friends",
  description: "See what your friends are watching",
};

export default async function FriendsPage() {
  const user = await getCurrentUser();
  if (!user) redirect(ROUTES.login);

  const [profile, friends, incoming, outgoing] = await Promise.all([
    getProfile(user.id),
    listFriends(user.id),
    listIncomingRequests(user.id),
    listOutgoingRequests(user.id),
  ]);

  // One activity fetch per friend. Parallel, and each is a pair of small indexed
  // reads, so this stays a single round of queries rather than a sequence.
  const activity = await Promise.all(
    friends.map(async (friend) => ({
      ...friend,
      ...(await getFriendActivity(friend.profile.id, 4)),
      libraryVisible: friend.profile.library_visibility !== "private",
    })),
  );

  const visibility =
    ((profile as { library_visibility?: LibraryVisibility } | null)
      ?.library_visibility ?? "friends") as LibraryVisibility;

  return (
    <div className="animate-fade-up space-y-8">
      <header className="space-y-1">
        <h1 className="text-page-title">Friends</h1>
        <p className="text-muted-foreground text-sm">
          Follow what people you know are watching. Your username is{" "}
          <span className="text-foreground font-medium">
            @{profile?.username ?? "—"}
          </span>{" "}
          — share it so friends can find you.
        </p>
      </header>

      <section className="space-y-3" aria-label="Find friends">
        <h2 className="text-section-title">Find people</h2>
        <FriendSearch />
      </section>

      <section className="space-y-3" aria-label="Your library visibility">
        <h2 className="text-section-title">Who can see your library</h2>
        <LibraryVisibilityControl value={visibility} />
      </section>

      {incoming.length > 0 ? (
        <section className="space-y-3" aria-label="Friend requests">
          <h2 className="text-section-title">
            Requests <Badge variant="muted">{incoming.length}</Badge>
          </h2>
          <ul className="space-y-2">
            {incoming.map((req) => (
              <PersonRow key={req.friendshipId} profile={req.profile}>
                <RequestActions friendshipId={req.friendshipId} direction="incoming" />
              </PersonRow>
            ))}
          </ul>
        </section>
      ) : null}

      {outgoing.length > 0 ? (
        <section className="space-y-3" aria-label="Sent requests">
          <h2 className="text-section-title">Sent</h2>
          <ul className="space-y-2">
            {outgoing.map((req) => (
              <PersonRow key={req.friendshipId} profile={req.profile}>
                <RequestActions friendshipId={req.friendshipId} direction="outgoing" />
              </PersonRow>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="space-y-3" aria-label="Your friends">
        <h2 className="text-section-title">
          Your friends {friends.length > 0 ? <Badge variant="muted">{friends.length}</Badge> : null}
        </h2>

        {friends.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No friends yet"
            description="Search for a username above to send your first friend request."
          />
        ) : (
          <ul className="space-y-3">
            {activity.map((friend) => (
              <li
                key={friend.friendshipId}
                className="space-y-3 rounded-2xl bg-muted/40 p-4 dark:bg-white/[0.05]"
              >
                <ul className="contents">
                  <PersonRow profile={friend.profile}>
                    <RemoveFriendButton
                      friendshipId={friend.friendshipId}
                      name={friend.profile.display_name || friend.profile.username || "friend"}
                    />
                  </PersonRow>
                </ul>

                {!friend.libraryVisible ? (
                  <p className="text-muted-foreground px-1 text-xs">
                    Their library is private.
                  </p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <FriendRail
                      heading="Watching now"
                      items={friend.watchingNow}
                      empty="Nothing in progress."
                    />
                    <FriendRail
                      heading="Recently finished"
                      items={friend.recentlyWatched}
                      empty="Nothing completed yet."
                    />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

interface FriendRailProps {
  heading: string;
  items: {
    entryId: string;
    title: string;
    mediaType: "movie" | "tv";
    externalId: string;
    currentSeason: number | null;
    currentEpisode: number | null;
    progressPercent: number;
  }[];
  empty: string;
}

/** A short titled list of a friend's titles, linking into the catalog. */
function FriendRail({ heading, items, empty }: FriendRailProps) {
  return (
    <div className="space-y-1.5 rounded-xl bg-background/40 p-3 dark:bg-black/20">
      <p className="text-muted-foreground text-[11px] font-medium tracking-[0.04em] uppercase">
        {heading}
      </p>
      {items.length === 0 ? (
        <p className="text-muted-foreground text-xs">{empty}</p>
      ) : (
        <ul className="space-y-1">
          {items.map((item) => (
            <li key={item.entryId} className="min-w-0">
              <Link
                href={mediaHref(item.mediaType, item.externalId)}
                className="block min-w-0 truncate text-xs underline-offset-4 hover:underline"
              >
                {item.title}
                {item.mediaType === "tv" && item.currentSeason != null ? (
                  <span className="text-muted-foreground">
                    {" "}
                    · S{item.currentSeason}E{item.currentEpisode ?? "—"}
                  </span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
