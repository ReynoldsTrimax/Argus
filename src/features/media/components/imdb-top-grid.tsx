import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";
import { posterUrl } from "@/lib/media/image";
import { formatYear } from "@/lib/media/format";
import { mediaHref } from "@/lib/media/routes";
import type { ImdbRankedItem } from "@/lib/media/imdb";

interface ImdbTopGridProps {
  items: ImdbRankedItem[];
  /** Rank of the first item, so page 2 starts at 26 rather than 1. */
  startRank: number;
  /** False when ratings could not be fetched; hides the IMDb badges. */
  imdbEnabled: boolean;
}

/**
 * Ranked poster grid for the top-rated shelf.
 *
 * A Server Component — there is no interactivity here beyond the links, and
 * keeping it server-side means the IMDb ratings never reach the client as props
 * on a hydrated tree. The rank number is the point of the layout, so it sits in
 * the poster corner rather than being implied by reading order.
 */
export function ImdbTopGrid({ items, startRank, imdbEnabled }: ImdbTopGridProps) {
  if (items.length === 0) {
    return (
      <p className="text-muted-foreground py-10 text-center text-sm">
        No titles to show.
      </p>
    );
  }

  return (
    <ol className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {items.map((entry, index) => {
        const { item, imdb } = entry;
        const rank = startRank + index;
        const src = posterUrl(item.posterPath, "w342");
        const year = formatYear(item.releaseDate);

        return (
          <li key={`${item.mediaType}-${item.id}`} className="min-w-0">
            <Link
              href={mediaHref(item.mediaType, item.id)}
              prefetch={false}
              className="group focus-visible:ring-ring block rounded-xl focus-visible:ring-2 focus-visible:outline-none"
              aria-label={`#${rank} ${item.title}${year ? `, ${year}` : ""}${
                imdb?.rating != null ? `, IMDb ${imdb.rating.toFixed(1)}` : ""
              }`}
            >
              <div
                className={cn(
                  "bg-muted relative aspect-[2/3] overflow-hidden rounded-xl shadow-md",
                  "transition-[transform,box-shadow] duration-400 ease-out",
                  "group-hover:-translate-y-1 group-hover:shadow-xl motion-reduce:group-hover:translate-y-0",
                )}
              >
                {src ? (
                  <Image
                    src={src}
                    alt=""
                    fill
                    sizes="(max-width: 640px) 45vw, (max-width: 1024px) 22vw, 170px"
                    className="object-cover"
                    priority={index < 6}
                  />
                ) : (
                  <div className="text-muted-foreground flex h-full items-center justify-center p-3 text-center text-xs">
                    {item.title}
                  </div>
                )}

                <div
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/90 via-black/35 to-transparent"
                  aria-hidden
                />

                <span className="pointer-events-none absolute top-0 left-0 rounded-br-lg bg-black/80 px-2 py-1 font-mono text-xs font-semibold text-white tabular-nums backdrop-blur-sm">
                  {rank}
                </span>

                {imdbEnabled && imdb?.rating != null ? (
                  <span className="pointer-events-none absolute bottom-1.5 left-1.5 inline-flex items-center gap-1 rounded bg-[#f5c518] px-1.5 py-0.5 text-[10px] font-bold text-black">
                    IMDb {imdb.rating.toFixed(1)}
                  </span>
                ) : null}
              </div>

              <p className="mt-2 line-clamp-2 text-sm leading-snug font-medium tracking-tight">
                {item.title}
              </p>
              <p className="text-muted-foreground text-xs">
                {year ?? "—"}
                {imdb?.votes ? (
                  <>
                    <span className="mx-1 opacity-40">·</span>
                    {formatVotes(imdb.votes)} votes
                  </>
                ) : null}
              </p>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}

/** Compact vote counts — "2.6M" reads faster than "2,602,845" on a card. */
function formatVotes(votes: number): string {
  if (votes >= 1_000_000) return `${(votes / 1_000_000).toFixed(1)}M`;
  if (votes >= 1_000) return `${Math.round(votes / 1_000)}K`;
  return String(votes);
}
