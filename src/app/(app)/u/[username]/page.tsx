import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Lock } from "lucide-react";

import { getCurrentUser } from "@/lib/services/user-service";
import { getProfileWithRelationship, getFriendLibrary } from "@/lib/social/profiles";
import { ProfileFriendAction } from "@/features/social/components/friend-controls";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/feedback/empty-state";
import { ROUTES } from "@/constants/routes";
import { mediaHref } from "@/lib/media/routes";
import { WATCH_STATUS_LABELS } from "@/types/library";

interface PageProps {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username } = await params;
  return { title: `@${username}` };
}

export default async function UserProfilePage({ params }: PageProps) {
  const { username } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(ROUTES.login);

  const result = await getProfileWithRelationship(user.id, username);
  if (!result) notFound();

  const { profile, relationship, friendshipId } = result;
  const library = await getFriendLibrary(user.id, username);
  const name = profile.display_name || profile.username || "Unknown";

  const grouped = new Map<string, typeof library extends null ? never : NonNullable<typeof library>["entries"]>();
  for (const entry of library?.entries ?? []) {
    const list = grouped.get(entry.status) ?? [];
    list.push(entry);
    grouped.set(entry.status, list);
  }

  return (
    <div className="animate-fade-up space-y-8">
      <header className="flex flex-wrap items-start gap-4">
        <Avatar className="h-16 w-16 shrink-0">
          {profile.avatar_url ? <AvatarImage src={profile.avatar_url} alt="" /> : null}
          <AvatarFallback>{name.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1 space-y-1">
          <h1 className="text-page-title min-w-0 truncate">{name}</h1>
          {profile.username ? (
            <p className="text-muted-foreground text-sm">@{profile.username}</p>
          ) : null}
          {profile.bio ? (
            <p className="text-muted-foreground max-w-prose text-sm text-pretty">
              {profile.bio}
            </p>
          ) : null}
          {relationship === "friends" ? (
            <Badge variant="muted">Friends</Badge>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <ProfileFriendAction
            targetUserId={profile.id}
            friendshipId={friendshipId}
            relationship={relationship}
            name={name}
          />
        </div>
      </header>

      {library && !library.visible ? (
        <EmptyState
          icon={Lock}
          title="This library is private"
          description={
            relationship === "friends"
              ? `${name} has set their library to private.`
              : `Add ${name} as a friend to see what they're watching.`
          }
        />
      ) : (library?.entries.length ?? 0) === 0 ? (
        <EmptyState
          icon={Lock}
          title="Nothing here yet"
          description={`${name} hasn't tracked any titles.`}
        />
      ) : (
        <div className="space-y-8">
          {[...grouped.entries()].map(([status, entries]) => (
            <section key={status} className="space-y-3">
              <h2 className="text-section-title">
                {WATCH_STATUS_LABELS[status as keyof typeof WATCH_STATUS_LABELS] ?? status}{" "}
                <Badge variant="muted">{entries.length}</Badge>
              </h2>
              <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {entries.map((entry) => (
                  <li
                    key={entry.id}
                    className="min-w-0 rounded-xl bg-muted/40 p-3 dark:bg-white/[0.05]"
                  >
                    <Link
                      href={mediaHref(
                        entry.media_type as "movie" | "tv",
                        entry.external_id,
                      )}
                      className="block min-w-0 truncate text-sm font-medium underline-offset-4 hover:underline"
                    >
                      {entry.title}
                    </Link>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      {entry.media_type === "tv" && entry.current_season != null
                        ? `S${entry.current_season}E${entry.current_episode ?? "—"} · `
                        : ""}
                      {entry.user_rating != null ? `★ ${entry.user_rating}` : null}
                      {entry.user_rating == null && entry.progress_percent > 0
                        ? `${Math.round(entry.progress_percent)}%`
                        : null}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
