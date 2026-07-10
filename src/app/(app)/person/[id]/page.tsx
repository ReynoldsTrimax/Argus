import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { MediaRow } from "@/features/media/components/media-row";
import { MediaGallery } from "@/features/media/components/media-gallery";
import { MediaMeta } from "@/features/media/components/media-meta";
import { CatalogConfigBanner } from "@/features/media/components/catalog-config-banner";
import { Badge } from "@/components/ui/badge";
import { getPerson, isCatalogConfigured } from "@/lib/media/catalog";
import { profileUrl, posterUrl } from "@/lib/media/image";
import { formatDate, formatYear } from "@/lib/media/format";
import { mediaHref } from "@/lib/media/routes";
import type { PersonCredit } from "@/types/media";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  if (!isCatalogConfigured()) return { title: "Person" };
  try {
    const person = await getPerson(id);
    if (!person) return { title: "Not found" };
    return {
      title: person.name,
      description: person.biography?.slice(0, 160) ?? person.name,
    };
  } catch {
    return { title: "Person" };
  }
}

export default async function PersonPage({ params }: PageProps) {
  const { id } = await params;

  if (!isCatalogConfigured()) {
    return <CatalogConfigBanner />;
  }

  const person = await getPerson(id);
  if (!person) notFound();

  const photo = profileUrl(person.profilePath, "h632");

  return (
    <div className="space-y-10 animate-fade-up">
      <section className="grid gap-8 lg:grid-cols-[16rem_1fr] lg:items-start">
        <div className="relative mx-auto aspect-[2/3] w-48 overflow-hidden rounded-2xl border border-border bg-muted shadow-lg sm:w-56 lg:mx-0 lg:w-full">
          {photo ? (
            <Image src={photo} alt="" fill priority sizes="256px" className="object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-4xl font-semibold text-muted-foreground">
              {person.name.slice(0, 1)}
            </div>
          )}
        </div>

        <div className="space-y-4 text-center lg:text-left">
          <div className="space-y-2">
            <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              {person.name}
            </h1>
            {person.knownForDepartment ? (
              <Badge variant="secondary">{person.knownForDepartment}</Badge>
            ) : null}
          </div>

          <MediaMeta
            className="sm:grid-cols-2 lg:grid-cols-3"
            items={[
              { label: "Birthday", value: formatDate(person.birthday) },
              { label: "Died", value: formatDate(person.deathday) },
              { label: "Place of birth", value: person.placeOfBirth },
              {
                label: "Also known as",
                value: person.alsoKnownAs?.slice(0, 3).join(", "),
              },
            ]}
          />

          {person.biography ? (
            <div className="space-y-2 text-left">
              <h2 className="text-sm font-semibold">Biography</h2>
              <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground text-pretty">
                {person.biography}
              </p>
            </div>
          ) : null}

          <div className="rounded-3xl border border-border bg-muted/40 border-dashed p-5 text-left">
            <h2 className="text-sm font-semibold">Social links</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              External social profiles will appear here when connected.
            </p>
          </div>
        </div>
      </section>

      {person.knownFor.length ? (
        <MediaRow title="Known for" items={person.knownFor} />
      ) : null}

      <FilmographyList title="Movies" credits={person.movieCredits} mediaType="movie" />
      <FilmographyList title="TV Shows" credits={person.tvCredits} mediaType="tv" />

      {person.images.length ? <MediaGallery images={person.images} /> : null}
    </div>
  );
}

function FilmographyList({
  title,
  credits,
  mediaType,
}: {
  title: string;
  credits: PersonCredit[];
  mediaType: "movie" | "tv";
}) {
  if (!credits.length) return null;

  // Dedupe by media id keeping highest popularity
  const map = new Map<string, PersonCredit>();
  for (const c of credits) {
    const existing = map.get(c.id);
    if (!existing || (c.popularity ?? 0) > (existing.popularity ?? 0)) {
      map.set(c.id, c);
    }
  }
  const list = [...map.values()]
    .sort((a, b) => (b.releaseDate ?? "").localeCompare(a.releaseDate ?? ""))
    .slice(0, 40);

  return (
    <section className="space-y-3" aria-label={title}>
      <h2 className="font-display text-lg font-semibold tracking-tight">
        {title}{" "}
        <span className="text-sm font-normal text-muted-foreground">({list.length})</span>
      </h2>
      <ul className="divide-y divide-border rounded-2xl border border-border bg-muted/40">
        {list.map((c) => {
          const poster = posterUrl(c.posterPath, "w92");
          return (
            <li key={`${mediaType}-${c.id}-${c.creditId}`}>
              <Link
                href={mediaHref(mediaType, c.id)}
                className="flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="relative h-14 w-10 shrink-0 overflow-hidden rounded-md bg-muted">
                  {poster ? (
                    <Image src={poster} alt="" fill sizes="40px" className="object-cover" />
                  ) : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {c.title ?? c.name}
                  </span>
                  {c.character ? (
                    <span className="block truncate text-xs text-muted-foreground">
                      as {c.character}
                    </span>
                  ) : null}
                </span>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {formatYear(c.releaseDate) ?? "—"}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
