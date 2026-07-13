import Image from "next/image";
import { MonitorPlay } from "lucide-react";

import { cn } from "@/lib/utils";
import { logoUrl } from "@/lib/media/image";
import type { StreamingAvailability, StreamingOfferType } from "@/types/media";
import { Badge } from "@/components/ui/badge";

const OFFER_LABEL: Record<StreamingOfferType, string> = {
  flatrate: "Stream with subscription",
  free: "Free",
  ads: "Free with ads",
  rent: "Rent",
  buy: "Buy",
  unavailable: "Unavailable",
};

interface StreamingProvidersProps {
  availability: StreamingAvailability | null | undefined;
  className?: string;
  /** Compact chips for hero / inline placement */
  compact?: boolean;
}

/**
 * Where-to-watch — live TMDB / JustWatch provider data by region.
 */
export function StreamingProviders({
  availability,
  className,
  compact,
}: StreamingProvidersProps) {
  const providers = availability?.providers ?? [];

  if (!providers.length) {
    return (
      <div
        className={cn(
          "rounded-2xl border-0 bg-muted/40 p-4",
          className,
        )}
      >
        <p className="flex items-center gap-2 text-sm font-medium">
          <MonitorPlay className="h-4 w-4 text-primary" aria-hidden />
          Where to watch
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          No streaming offers reported for this title in your region yet. Try
          another region via{" "}
          <code className="rounded bg-muted px-1 text-[10px]">WATCH_REGION</code>{" "}
          in <code className="rounded bg-muted px-1 text-[10px]">.env.local</code>
          .
        </p>
      </div>
    );
  }

  if (compact) {
    const featured = providers
      .filter((p) => p.offerType === "flatrate" || p.offerType === "free" || p.offerType === "ads")
      .slice(0, 8);
    const list = featured.length ? featured : providers.slice(0, 8);

    return (
      <div className={cn("space-y-2", className)} aria-label="Where to watch">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Available on
          {availability?.region ? (
            <span className="ml-1.5 normal-case tracking-normal opacity-70">
              · {availability.region}
            </span>
          ) : null}
        </p>
        <ul className="flex flex-wrap gap-2">
          {list.map((p) => {
            const logo = logoUrl(p.logoPath, "w92");
            return (
              <li
                key={`${p.offerType}-${p.id}`}
                className="inline-flex items-center gap-2 rounded-xl border-0 bg-muted/50 dark:bg-white/[0.07]/90 px-2.5 py-1 text-xs font-medium text-foreground shadow-xs"
              >
                {logo ? (
                  <span className="relative h-5 w-5 overflow-hidden rounded-md bg-white/10">
                    <Image src={logo} alt="" fill sizes="20px" className="object-cover" />
                  </span>
                ) : null}
                <span>{p.name}</span>
                {p.offerType === "rent" || p.offerType === "buy" ? (
                  <span className="text-[10px] uppercase opacity-70">{p.offerType}</span>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  const grouped = groupByOffer(providers);

  return (
    <div className={cn("space-y-4 rounded-2xl border-0 bg-muted/40 p-5 dark:bg-white/[0.05]", className)}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <MonitorPlay className="h-4 w-4 text-primary" aria-hidden />
          Where to watch
        </h3>
        {availability?.region ? (
          <Badge variant="muted" className="text-[10px]">
            {availability.region}
          </Badge>
        ) : null}
      </div>
      {(Object.entries(grouped) as [StreamingOfferType, typeof providers][]).map(
        ([type, list]) =>
          list.length ? (
            <div key={type} className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {OFFER_LABEL[type]}
              </p>
              <ul className="flex flex-wrap gap-2">
                {list.map((p) => {
                  const logo = logoUrl(p.logoPath, "w92");
                  return (
                    <li
                      key={`${type}-${p.id}`}
                      className="inline-flex items-center gap-2 rounded-xl border-0 bg-muted/40 dark:bg-white/[0.05] px-2.5 py-1.5 text-sm"
                    >
                      {logo ? (
                        <span className="relative h-6 w-6 overflow-hidden rounded-md bg-muted">
                          <Image
                            src={logo}
                            alt=""
                            fill
                            sizes="24px"
                            className="object-cover"
                          />
                        </span>
                      ) : null}
                      <span>{p.name}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null,
      )}
      {availability?.link ? (
        <a
          href={availability.link}
          target="_blank"
          rel="noreferrer"
          className="inline-block text-xs font-medium text-primary underline-offset-4 hover:underline"
        >
          See all options
        </a>
      ) : null}
    </div>
  );
}

function groupByOffer(
  providers: NonNullable<StreamingAvailability["providers"]>,
) {
  const groups: Record<StreamingOfferType, typeof providers> = {
    flatrate: [],
    free: [],
    ads: [],
    rent: [],
    buy: [],
    unavailable: [],
  };
  for (const p of providers) {
    groups[p.offerType].push(p);
  }
  return groups;
}
