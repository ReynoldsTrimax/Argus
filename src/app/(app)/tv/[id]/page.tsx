import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { DetailHero } from "@/features/media/components/detail-hero";
import { MediaMeta } from "@/features/media/components/media-meta";
import { CastRow } from "@/features/media/components/cast-row";
import { MediaRow } from "@/features/media/components/media-row";
import { StreamingProviders } from "@/features/media/components/streaming-providers";
import { SeasonEpisodes } from "@/features/media/components/season-episodes";
import { Badge } from "@/components/ui/badge";
import { CatalogConfigBanner } from "@/features/media/components/catalog-config-banner";
import { PersonalMediaPanel } from "@/features/library/components/personal-media-panel";
import { DecisionScoreCard } from "@/features/intelligence/components/decision-score-card";
import { getTvShow, isCatalogConfigured } from "@/lib/media/catalog";
import { formatDate, formatNumber, formatRuntime } from "@/lib/media/format";
import { mediaHref } from "@/lib/media/routes";
import { getPersonalMediaState } from "@/lib/library/personal-state";
import { listTags, listCollections } from "@/lib/library/tags-collections";
import { loadIntelligenceData } from "@/lib/intelligence/load-profile";
import { computeUserStats } from "@/lib/intelligence/stats-engine";
import { computeDecisionScore } from "@/lib/intelligence/decision-score";
import type { MediaIdentity } from "@/types/library";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  if (!isCatalogConfigured()) return { title: "TV Show" };
  try {
    const show = await getTvShow(id);
    if (!show) return { title: "Show not found" };
    return {
      title: show.title,
      description: show.overview?.slice(0, 160) ?? `Details for ${show.title}`,
    };
  } catch {
    return { title: "TV Show" };
  }
}

export default async function TvDetailPage({ params }: PageProps) {
  const { id } = await params;

  if (!isCatalogConfigured()) {
    return <CatalogConfigBanner />;
  }

  const show = await getTvShow(id);
  if (!show) notFound();

  const runtime =
    show.episodeRunTime?.length
      ? show.episodeRunTime[0]
      : null;

  const identity: MediaIdentity = {
    provider: "tmdb",
    mediaType: "tv",
    externalId: show.id,
    title: show.title,
    originalTitle: show.originalTitle,
    posterPath: show.posterPath,
    backdropPath: show.backdropPath,
    releaseDate: show.firstAirDate,
    overview: show.overview,
    runtimeMinutes: runtime,
    totalEpisodes: show.numberOfEpisodes,
    genres: show.genres.map((g) => g.name),
    originalLanguage: show.originalLanguage,
  };

  const personal = await getPersonalMediaState("tv", show.id, identity);
  const [allTags, allCollections, intelligence] = await Promise.all([
    personal.userId ? listTags(personal.userId) : Promise.resolve([]),
    personal.userId ? listCollections(personal.userId) : Promise.resolve([]),
    personal.userId
      ? loadIntelligenceData(personal.userId)
      : Promise.resolve(null),
  ]);

  const decision =
    intelligence != null
      ? computeDecisionScore(
          {
            title: show.title,
            mediaType: "tv",
            genres: show.genres,
            voteAverage: show.voteAverage,
            popularity: show.popularity,
            runtime,
            episodeRunTime: show.episodeRunTime,
            releaseDate: show.firstAirDate,
            overview: show.overview,
            crew: show.crew,
            cast: show.cast,
          },
          computeUserStats(intelligence),
          intelligence.entries,
        )
      : null;

  return (
    <div className="space-y-10 animate-fade-up">
      <DetailHero
        title={show.title}
        tagline={show.tagline}
        overview={show.overview}
        backdropPath={show.backdropPath}
        posterPath={show.posterPath}
        logoPath={show.logoPath}
        releaseDate={show.firstAirDate}
        runtime={runtime}
        certification={show.certification}
        status={show.status}
        mediaTypeLabel="TV Series"
        genres={show.genres}
        ratings={show.ratings}
        videos={show.videos}
        streaming={show.streaming}
      >
        {show.createdBy.length ? (
          <p className="text-sm text-muted-foreground">
            Created by{" "}
            {show.createdBy.map((c, i) => (
              <span key={c.creditId ?? c.id}>
                {i > 0 ? ", " : null}
                <Link
                  href={mediaHref("person", c.id)}
                  className="font-medium text-foreground underline-offset-4 hover:underline"
                >
                  {c.name}
                </Link>
              </span>
            ))}
          </p>
        ) : null}
      </DetailHero>

      <div className="grid w-full min-w-0 max-w-full gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(16.5rem,20rem)] lg:items-start lg:gap-6">
        <div className="min-w-0 max-w-full space-y-10 overflow-x-hidden">
          {/* Progress is recorded here, on the episode rows themselves. Tracking
              props are omitted for signed-out visitors, who get the same list
              without checkboxes. */}
          <SeasonEpisodes
            showId={show.id}
            seasons={show.seasons}
            identity={personal.userId ? identity : undefined}
            episodeProgress={personal.episodeProgress}
          />

          <CastRow people={show.cast} />

          {show.recommendations.length ? (
            <MediaRow title="Recommendations" items={show.recommendations} />
          ) : null}
          {show.similar.length ? (
            <MediaRow title="Similar shows" items={show.similar} />
          ) : null}
        </div>

        <aside className="min-w-0 w-full space-y-6 lg:sticky lg:top-20 lg:self-start lg:max-h-[calc(100vh-5.5rem)] lg:w-auto lg:overflow-y-auto lg:overflow-x-hidden lg:pr-0.5">
          {personal.userId ? (
            <PersonalMediaPanel
              identity={identity}
              initial={personal}
              allTags={allTags}
              allCollections={allCollections}
            />
          ) : null}

          {decision ? <DecisionScoreCard decision={decision} /> : null}

          <div className="rounded-3xl border-0 bg-muted/40 dark:bg-white/[0.05] p-5">
            <h2 className="mb-3 text-sm font-semibold">Details</h2>
            <MediaMeta
              items={[
                { label: "First air date", value: formatDate(show.firstAirDate) },
                { label: "Last air date", value: formatDate(show.lastAirDate) },
                { label: "Status", value: show.status },
                { label: "Type", value: show.type },
                { label: "Seasons", value: show.numberOfSeasons },
                { label: "Episodes", value: show.numberOfEpisodes },
                {
                  label: "Episode runtime",
                  value: runtime ? formatRuntime(runtime) : null,
                },
                {
                  label: "Original language",
                  value: show.originalLanguage?.toUpperCase(),
                },
                {
                  label: "Languages",
                  value: show.spokenLanguages
                    .map((l) => l.englishName ?? l.name)
                    .join(", "),
                },
                { label: "Popularity", value: formatNumber(show.popularity) },
                { label: "Vote count", value: formatNumber(show.voteCount) },
              ]}
            />
          </div>

          {show.networks.length ? (
            <div className="rounded-3xl border-0 bg-muted/40 dark:bg-white/[0.05] p-5">
              <h2 className="mb-3 text-sm font-semibold">Networks</h2>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                {show.networks.map((n) => (
                  <li key={n.id}>{n.name}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {show.productionCompanies.length ? (
            <div className="rounded-3xl border-0 bg-muted/40 dark:bg-white/[0.05] p-5">
              <h2 className="mb-3 text-sm font-semibold">Studios</h2>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                {show.productionCompanies.map((c) => (
                  <li key={c.id}>{c.name}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {show.keywords.length ? (
            <div className="rounded-3xl border-0 bg-muted/40 dark:bg-white/[0.05] p-5">
              <h2 className="mb-3 text-sm font-semibold">Keywords</h2>
              <div className="flex flex-wrap gap-1.5">
                {show.keywords.slice(0, 20).map((k) => (
                  <Badge key={k.id} variant="muted">
                    {k.name}
                  </Badge>
                ))}
              </div>
            </div>
          ) : null}

          <StreamingProviders availability={show.streaming} />

          <div className="rounded-3xl border-0 bg-muted/40 dark:bg-white/[0.05] bg-muted/30 dark:bg-white/[0.04] p-5">
            <h2 className="text-sm font-semibold">Awards</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Awards data will appear when a provider is connected.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
