import type { Metadata } from "next";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { Lock, Sparkles } from "lucide-react";

import { getCurrentUser } from "@/lib/services/user-service";
import { getProfileWithRelationship, getFriendLibrary } from "@/lib/social/profiles";
import { ProfileFriendAction } from "@/features/social/components/friend-controls";
import { FriendLibraryBrowser } from "@/features/social/components/friend-library-browser";
import { fromLibraryEntry } from "@/features/social/friend-title-item";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/feedback/empty-state";
import { ROUTES } from "@/constants/routes";
import { backdropUrl } from "@/lib/media/image";

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

  const entries = library?.entries ?? [];
  const items = entries.map(fromLibraryEntry);

  // The most recently watched title with artwork becomes the header backdrop —
  // it makes the page feel like this person's shelf rather than a generic
  // profile, and costs nothing extra since the rows are already loaded.
  const heroBackdrop =
    entries.find((entry) => entry.backdrop_path)?.backdrop_path ?? null;
  const heroUrl = backdropUrl(heroBackdrop, "w1280");

  const films = items.filter((item) => item.mediaType === "movie").length;
  const series = items.length - films;
  const finished = items.filter((item) => item.status === "completed").length;

  const stats: { label: string; value: string }[] = [];
  if (items.length > 0) {
    stats.push({ label: "Tracked", value: String(items.length) });
    if (films > 0) stats.push({ label: "Films", value: String(films) });
    if (series > 0) stats.push({ label: "Series", value: String(series) });
    if (finished > 0) stats.push({ label: "Finished", value: String(finished) });
  }

  return (
    <div className="animate-fade-up space-y-8">
      <header className="relative overflow-hidden rounded-2xl">
        {heroUrl ? (
          <>
            <Image
              src={heroUrl}
              alt=""
              fill
              sizes="100vw"
              priority
              className="scale-105 object-cover opacity-35 blur-[1px]"
            />
            {/* Two scrims: vertical for text legibility, horizontal to keep the
                artwork readable as an image rather than a wash of colour. */}
            <div
              className="from-background via-background/85 absolute inset-0 bg-gradient-to-t to-transparent"
              aria-hidden
            />
            <div
              className="from-background/95 absolute inset-0 bg-gradient-to-r to-transparent"
              aria-hidden
            />
          </>
        ) : (
          <div
            className="bg-muted/40 absolute inset-0 dark:bg-white/[0.04]"
            aria-hidden
          />
        )}

        <div className="relative flex flex-wrap items-start gap-4 p-5 sm:p-7">
          <Avatar className="ring-background h-16 w-16 shrink-0 ring-2 sm:h-20 sm:w-20">
            {profile.avatar_url ? <AvatarImage src={profile.avatar_url} alt="" /> : null}
            <AvatarFallback>{name.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1 space-y-2">
            <div className="space-y-1">
              <h1 className="text-page-title min-w-0 truncate">{name}</h1>
              {profile.username ? (
                <p className="text-muted-foreground font-mono text-xs">
                  @{profile.username}
                </p>
              ) : null}
            </div>

            {profile.bio ? (
              <p className="text-muted-foreground max-w-prose text-sm text-pretty">
                {profile.bio}
              </p>
            ) : null}

            {relationship === "friends" ? <Badge variant="muted">Friends</Badge> : null}

            {stats.length > 0 ? (
              <dl className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-1">
                {stats.map((stat) => (
                  <div key={stat.label} className="flex items-baseline gap-1.5">
                    <dd className="font-display text-lg leading-none font-semibold tabular-nums">
                      {stat.value}
                    </dd>
                    <dt className="text-muted-foreground font-mono text-[10px] tracking-[0.14em] uppercase">
                      {stat.label}
                    </dt>
                  </div>
                ))}
              </dl>
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
      ) : items.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="Nothing here yet"
          description={`${name} hasn't tracked any titles.`}
        />
      ) : (
        <FriendLibraryBrowser items={items} name={name} />
      )}
    </div>
  );
}
