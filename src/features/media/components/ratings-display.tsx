import { cn } from "@/lib/utils";
import { formatCount } from "@/lib/media/format";
import type { MediaRating } from "@/types/media";

interface RatingsDisplayProps {
  ratings: MediaRating[];
  className?: string;
  compact?: boolean;
}

function formatValue(rating: MediaRating): string | null {
  if (rating.value == null) return null;
  if (rating.scale === 100) return `${Math.round(rating.value)}%`;
  return rating.value.toFixed(1);
}

/**
 * Multi-source ratings: TMDB, IMDb, Rotten Tomatoes, Metacritic.
 */
export function RatingsDisplay({ ratings, className, compact }: RatingsDisplayProps) {
  // Prefer showing sources that have values first, keep known order
  const order = ["tmdb", "imdb", "rotten_tomatoes", "metacritic"] as const;
  const sorted = [...ratings].sort((a, b) => {
    const ai = order.indexOf(a.provider as (typeof order)[number]);
    const bi = order.indexOf(b.provider as (typeof order)[number]);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  // Hide empty placeholders when at least one external rating is live
  const hasExternal = sorted.some(
    (r) =>
      r.provider !== "tmdb" && r.value != null,
  );
  const visible = sorted.filter((r) => {
    if (r.provider === "tmdb") return true;
    if (r.value != null) return true;
    // Keep empty slots only when nothing external loaded yet (prompts config)
    return !hasExternal;
  });

  if (!visible.length) return null;

  return (
    <div
      className={cn(
        "flex flex-wrap gap-2",
        compact ? "gap-1.5" : "gap-2",
        className,
      )}
      role="list"
      aria-label="Ratings"
    >
      {visible.map((rating) => {
        const display = formatValue(rating);
        const isLink = Boolean(rating.url && display != null);
        const inner = (
          <>
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              {rating.label}
            </p>
            <p
              className={cn(
                "font-semibold tabular-nums",
                compact ? "text-sm" : "text-base",
              )}
            >
              {display != null ? (
                <>
                  {display}
                  {rating.scale !== 100 ? (
                    <span className="ml-0.5 text-xs font-normal text-muted-foreground">
                      /{rating.scale}
                    </span>
                  ) : null}
                </>
              ) : (
                <span className="text-xs font-normal text-muted-foreground">
                  —
                </span>
              )}
            </p>
            {rating.count != null && rating.count > 0 ? (
              <p className="text-[10px] text-muted-foreground">
                {formatCount(rating.count)} votes
              </p>
            ) : null}
            {rating.secondaryValue != null && rating.secondaryLabel ? (
              <p className="text-[10px] text-muted-foreground">
                {rating.secondaryLabel}: {Math.round(rating.secondaryValue)}
                {rating.scale === 100 ? "%" : ""}
              </p>
            ) : null}
          </>
        );

        return isLink ? (
          <a
            key={`${rating.provider}-${rating.label}`}
            href={rating.url!}
            target="_blank"
            rel="noreferrer"
            role="listitem"
            className={cn(
              "rounded-xl border-0 bg-muted/50 px-3 py-2 dark:bg-white/[0.06] transition-colors hover:bg-muted/70 dark:hover:bg-white/[0.1]",
              compact && "px-2.5 py-1.5",
            )}
          >
            {inner}
          </a>
        ) : (
          <div
            key={`${rating.provider}-${rating.label}`}
            role="listitem"
            className={cn(
              "rounded-xl border-0 bg-muted/50 px-3 py-2 dark:bg-white/[0.06]",
              compact && "px-2.5 py-1.5",
            )}
          >
            {inner}
          </div>
        );
      })}
    </div>
  );
}
