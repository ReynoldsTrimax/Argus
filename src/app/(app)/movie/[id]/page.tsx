import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { DetailHero } from "@/features/media/components/detail-hero";
import { MediaMeta } from "@/features/media/components/media-meta";
import { CastRow } from "@/features/media/components/cast-row";
import { MediaRow } from "@/features/media/components/media-row";
import { StreamingProviders } from "@/features/media/components/streaming-providers";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CatalogConfigBanner } from "@/features/media/components/catalog-config-banner";
import { PersonalMediaPanel } from "@/features/library/components/personal-media-panel";
import { DecisionScoreCard } from "@/features/intelligence/components/decision-score-card";
import { getMovie, isCatalogConfigured } from "@/lib/media/catalog";
import {
  formatDate,
  formatMoney,
  formatNumber,
  formatRuntime,
} from "@/lib/media/format";
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
  if (!isCatalogConfigured()) return { title: "Movie" };
  try {
    const movie = await getMovie(id);
    if (!movie) return { title: "Movie not found" };
    return {
      title: movie.title,
      description: movie.overview?.slice(0, 160) ?? `Details for ${movie.title}`,
    };
  } catch {
    return { title: "Movie" };
  }
}

export default async function MovieDetailPage({ params }: PageProps) {
  const { id } = await params;

  if (!isCatalogConfigured()) {
    return (
      <div className="space-y-4">
        <CatalogConfigBanner />
      </div>
    );
  }

  const movie = await getMovie(id);
  if (!movie) notFound();

  const identity: MediaIdentity = {
    provider: "tmdb",
    mediaType: "movie",
    externalId: movie.id,
    title: movie.title,
    originalTitle: movie.originalTitle,
    posterPath: movie.posterPath,
    backdropPath: movie.backdropPath,
    releaseDate: movie.releaseDate,
    overview: movie.overview,
    runtimeMinutes: movie.runtime,
    genres: movie.genres.map((g) => g.name),
    originalLanguage: movie.originalLanguage,
  };

  const personal = await getPersonalMediaState("movie", movie.id, identity);
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
            title: movie.title,
            mediaType: "movie",
            genres: movie.genres,
            voteAverage: movie.voteAverage,
            popularity: movie.popularity,
            runtime: movie.runtime,
            releaseDate: movie.releaseDate,
            overview: movie.overview,
            crew: movie.crew,
            cast: movie.cast,
          },
          computeUserStats(intelligence),
          intelligence.entries,
        )
      : null;

  // Crew jobs may be merged ("Director · Writer") — match token, not exact string
  const directors = movie.crew.filter((c) =>
    (c.job ?? "").split(" · ").includes("Director"),
  );

  return (
    <div className="space-y-10 animate-fade-up">
      <DetailHero
        title={movie.title}
        tagline={movie.tagline}
        overview={movie.overview}
        backdropPath={movie.backdropPath}
        posterPath={movie.posterPath}
        logoPath={movie.logoPath}
        releaseDate={movie.releaseDate}
        runtime={movie.runtime}
        certification={movie.certification}
        status={movie.status}
        mediaTypeLabel="Movie"
        genres={movie.genres}
        ratings={movie.ratings}
        videos={movie.videos}
        streaming={movie.streaming}
      >
        {directors.length ? (
          <p className="text-sm text-muted-foreground">
            Directed by{" "}
            {directors.map((d, i) => (
              <span key={d.creditId ?? d.id}>
                {i > 0 ? ", " : null}
                <Link
                  href={mediaHref("person", d.id)}
                  className="font-medium text-foreground underline-offset-4 hover:underline"
                >
                  {d.name}
                </Link>
              </span>
            ))}
          </p>
        ) : null}
      </DetailHero>

      <div className="grid w-full min-w-0 max-w-full gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(16.5rem,20rem)] lg:items-start lg:gap-6">
        <div className="min-w-0 max-w-full space-y-10 overflow-x-hidden">
          <CastRow people={movie.cast} />

          {movie.recommendations.length ? (
            <MediaRow title="Recommendations" items={movie.recommendations} />
          ) : null}
          {movie.similar.length ? (
            <MediaRow title="Similar movies" items={movie.similar} />
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
                { label: "Release date", value: formatDate(movie.releaseDate) },
                { label: "Runtime", value: formatRuntime(movie.runtime) },
                { label: "Status", value: movie.status },
                { label: "Original language", value: movie.originalLanguage?.toUpperCase() },
                {
                  label: "Spoken languages",
                  value: movie.spokenLanguages.map((l) => l.englishName ?? l.name).join(", "),
                },
                {
                  label: "Countries",
                  value: movie.productionCountries.map((c) => c.name).join(", "),
                },
                { label: "Budget", value: formatMoney(movie.budget) },
                { label: "Revenue", value: formatMoney(movie.revenue) },
                { label: "Popularity", value: formatNumber(movie.popularity) },
                { label: "Vote count", value: formatNumber(movie.voteCount) },
              ]}
            />
          </div>

          {movie.productionCompanies.length ? (
            <div className="rounded-3xl border-0 bg-muted/40 dark:bg-white/[0.05] p-5">
              <h2 className="mb-3 text-sm font-semibold">Production</h2>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                {movie.productionCompanies.map((c) => (
                  <li key={c.id}>{c.name}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {movie.collection ? (
            <div className="rounded-3xl border-0 bg-muted/40 dark:bg-white/[0.05] p-5">
              <h2 className="mb-2 text-sm font-semibold">Collection</h2>
              <Link
                href={mediaHref("collection", movie.collection.id)}
                className="text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                {movie.collection.name}
              </Link>
            </div>
          ) : null}

          {movie.keywords.length ? (
            <div className="rounded-3xl border-0 bg-muted/40 dark:bg-white/[0.05] p-5">
              <h2 className="mb-3 text-sm font-semibold">Keywords</h2>
              <div className="flex flex-wrap gap-1.5">
                {movie.keywords.slice(0, 20).map((k) => (
                  <Badge key={k.id} variant="muted">
                    {k.name}
                  </Badge>
                ))}
              </div>
            </div>
          ) : null}

          <StreamingProviders availability={movie.streaming} />

          <div className="rounded-3xl border-0 bg-muted/40 dark:bg-white/[0.05] bg-muted/30 dark:bg-white/[0.04] p-5">
            <h2 className="text-sm font-semibold">Awards</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Awards data will appear here when an awards provider is connected.
            </p>
          </div>
        </aside>
      </div>

      <Separator className="opacity-0" />
    </div>
  );
}


