import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProfileForm } from "@/features/profile/components/profile-form";
import { LibraryPosterCard } from "@/features/library/components/library-poster-card";
import { StatCounter } from "@/features/intelligence/components/stat-counter";
import { getSessionContext } from "@/lib/services/user-service";
import { ROUTES } from "@/constants/routes";
import { formatDisplayName } from "@/lib/utils";
import type { Profile } from "@/types";
import { loadIntelligenceData } from "@/lib/intelligence/load-profile";
import {
  computeUserStats,
  formatWatchHours,
} from "@/lib/intelligence/stats-engine";
import { listCollections } from "@/lib/library/tags-collections";

export const metadata: Metadata = {
  title: "Profile",
};

function fallbackProfile(userId: string, email?: string | null): Profile {
  const local = email?.split("@")[0] ?? "user";
  return {
    id: userId,
    username: local.slice(0, 32),
    display_name: local,
    bio: null,
    avatar_url: null,
    website: null,
    is_public: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/**
 * Profile dashboard — personal stats + identity.
 */
export default async function ProfilePage() {
  const { user, profile } = await getSessionContext();
  if (!user) redirect(ROUTES.login);

  const data = profile ?? fallbackProfile(user.id, user.email);
  const name = formatDisplayName({
    displayName: data.display_name,
    username: data.username,
    email: user.email,
  });
  const initials = name.replace("@", "").slice(0, 2).toUpperCase();

  const intelligence = await loadIntelligenceData(user.id);
  const stats = computeUserStats(intelligence);
  const collections = await listCollections(user.id);
  const pinned = collections.filter((c) => c.is_pinned).slice(0, 4);
  const topRated = stats.favorites.highRated.slice(0, 6);
  const year = new Date().getFullYear();

  return (
    <div className="space-y-8 animate-fade-up">
      <section className="relative overflow-hidden rounded-3xl border border-border">
        <div
          className="absolute inset-0 h-36 gradient-mesh dark:gradient-mesh-dark sm:h-44"
          aria-hidden
        />
        <div className="relative flex flex-col gap-4 px-4 pb-6 pt-20 sm:flex-row sm:items-end sm:px-8 sm:pt-28">
          <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
            {data.avatar_url ? <AvatarImage src={data.avatar_url} alt="" /> : null}
            <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-1">
            <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
              {name}
            </h1>
            {data.username ? (
              <p className="text-sm text-muted-foreground">@{data.username}</p>
            ) : null}
            {data.bio ? (
              <p className="max-w-xl text-sm text-muted-foreground text-pretty">{data.bio}</p>
            ) : null}
            <p className="text-xs text-muted-foreground">
              Member since {new Date(data.created_at).toLocaleDateString()}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" variant="outline">
              <Link href={ROUTES.stats}>Stats</Link>
            </Button>
            <Button asChild size="sm">
              <Link href={ROUTES.wrapped(year)}>Wrapped</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCounter
          value={Math.round(stats.totals.totalWatchMinutes / 60)}
          label="Hours watched"
          hint={formatWatchHours(stats.totals.totalWatchMinutes)}
        />
        <StatCounter
          value={stats.streaks.current}
          label="Current streak"
          suffix="d"
          hint={`Best ${stats.streaks.longest}`}
        />
        <StatCounter value={stats.totals.librarySize} label="Library size" />
        <StatCounter
          value={stats.totals.averageRating ?? 0}
          label="Avg rating"
          decimals={1}
        />
      </section>

      {stats.favorites.genres.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold">Favorite genres</h2>
          <div className="flex flex-wrap gap-2">
            {stats.favorites.genres.map((g) => (
              <Badge key={g.name} variant="outline">
                {g.name}
              </Badge>
            ))}
          </div>
        </section>
      ) : null}

      {topRated.length > 0 ? (
        <section className="space-y-3">
          <h2 className="font-display text-lg font-semibold">Top rated</h2>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
            {topRated.map((e) => (
              <LibraryPosterCard key={e.id} entry={e} />
            ))}
          </div>
        </section>
      ) : null}

      {pinned.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold">Pinned collections</h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {pinned.map((c) => (
              <li key={c.id}>
                <Link
                  href={ROUTES.collectionDetail(c.id)}
                  className="flex justify-between rounded-xl border border-border px-3 py-2 text-sm hover:bg-muted/40"
                >
                  <span className="font-medium">{c.name}</span>
                  <span className="text-muted-foreground">{c.item_count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <Card className="mx-auto max-w-2xl">
        <CardHeader>
          <CardTitle className="text-base">Edit profile</CardTitle>
          <CardDescription>
            Public details about you. Avatar uploads arrive later.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm profile={data} />
        </CardContent>
      </Card>
    </div>
  );
}
