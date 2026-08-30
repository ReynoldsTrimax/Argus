import { PosterCard } from "@/features/media/components/poster-card";
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
 * The same PosterCard, grid, gutters and entrance stagger as MediaGrid — a
 * ranked shelf is the browse grid in a fixed order, so it should not have its
 * own poster size, hover motion or quick-action affordances. The rank and the
 * IMDb score ride along as PosterCard props rather than as a parallel card.
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
    <ol className="grid grid-cols-2 gap-x-5 gap-y-16 px-3 pt-10 sm:grid-cols-3 sm:px-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {items.map((entry, index) => (
        <li
          key={`${entry.item.mediaType}-${entry.item.id}`}
          className="animate-fade-up min-w-0"
          style={{ animationDelay: `${Math.min(index, 12) * 35}ms` }}
        >
          <PosterCard
            item={entry.item}
            className="w-full"
            priority={index < 6}
            rank={startRank + index}
            imdbRating={imdbEnabled ? entry.imdb?.rating : null}
            imdbVotes={imdbEnabled ? entry.imdb?.votes : null}
          />
        </li>
      ))}
    </ol>
  );
}
