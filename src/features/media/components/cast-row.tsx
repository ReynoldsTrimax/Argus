"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";
import { profileUrl } from "@/lib/media/image";
import { mediaHref } from "@/lib/media/routes";
import type { PersonCredit } from "@/types/media";

interface CastRowProps {
  title?: string;
  people: PersonCredit[];
  className?: string;
  /** Show job instead of character (crew mode). */
  showJob?: boolean;
}

/**
 * Horizontal cast strip — one person card each (no duplicate faces).
 */
export function CastRow({
  title = "Cast",
  people,
  className,
  showJob,
}: CastRowProps) {
  const unique = React.useMemo(() => {
    const seen = new Set<string>();
    const out: PersonCredit[] = [];
    for (const p of people) {
      if (seen.has(p.id)) continue;
      seen.add(p.id);
      out.push(p);
    }
    return out;
  }, [people]);

  if (!unique.length) return null;

  return (
    <section className={cn("min-w-0 max-w-full space-y-3", className)} aria-label={title}>
      <h2 className="text-section-title">{title}</h2>
      <div className="scrollbar-thin flex max-w-full gap-3 overflow-x-auto pb-2">
        {unique.map((person) => {
          const src = profileUrl(person.profilePath, "w185");
          const subtitle = showJob ? person.job : person.character;
          return (
            <Link
              key={`${showJob ? "crew" : "cast"}-${person.id}`}
              href={mediaHref("person", person.id)}
              className="group w-28 shrink-0 rounded-xl transition-transform duration-300 ease-out hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="relative aspect-[2/3] overflow-hidden rounded-xl border-0 bg-muted shadow-sm transition-shadow duration-300 group-hover:shadow-md group-hover:shadow-primary/10">
                {src ? (
                  <Image
                    src={src}
                    alt=""
                    fill
                    sizes="112px"
                    className="object-cover transition-transform duration-500 ease-out group-hover:scale-110"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                    {person.name.slice(0, 1)}
                  </div>
                )}
              </div>
              <p className="mt-1.5 line-clamp-2 text-xs font-medium leading-snug transition-colors group-hover:text-primary">
                {person.name}
              </p>
              {subtitle ? (
                <p className="line-clamp-2 text-[11px] text-muted-foreground">{subtitle}</p>
              ) : null}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
