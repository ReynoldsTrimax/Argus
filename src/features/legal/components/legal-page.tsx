import Link from "next/link";

import { cn } from "@/lib/utils";
import { LEGAL_LAST_UPDATED } from "@/features/legal/constants";

export interface LegalSection {
  /** Anchor id. Also the target of the table of contents link. */
  id: string;
  title: string;
  body: React.ReactNode;
}

interface LegalPageProps {
  title: string;
  /** One or two sentences under the title. Sets the scope of the document. */
  lede: string;
  sections: LegalSection[];
  /** Shown while bracketed placeholders remain in the text. */
  pendingReview?: boolean;
}

/**
 * Long-form legal document shell.
 *
 * Sections are passed as data rather than written as free JSX so the table of
 * contents is generated from the same list that renders the body. A heading can
 * never drift from its anchor, and there is no way to ship a link to a section
 * that does not exist.
 *
 * Prose styling lives here as utility classes instead of a global stylesheet
 * rule: these two pages are the only long-form text in the app, so a shared
 * `.prose` token would have exactly one consumer.
 */
export function LegalPage({ title, lede, sections, pendingReview }: LegalPageProps) {
  return (
    <div className="content-container py-16 sm:py-20">
      <div className="lg:grid lg:grid-cols-12 lg:gap-12">
        <div className="lg:col-span-8 lg:col-start-4 lg:row-start-1">
          <header className="max-w-2xl">
            <p className="landing-mono">Legal</p>
            <h1 className="font-display mt-4 text-3xl font-semibold tracking-tight text-white/95 sm:text-4xl">
              {title}
            </h1>
            <p className="mt-5 text-sm leading-7 text-white/70">{lede}</p>
            <p className="landing-mono mt-6">Last updated {LEGAL_LAST_UPDATED}</p>
          </header>

          {pendingReview ? (
            <div
              className="mt-8 max-w-2xl rounded-lg border border-white/10 bg-white/[0.03] p-4"
              role="note"
            >
              <p className="text-xs leading-6 text-white/60">
                Text shown in square brackets is a detail the operators of Argus still
                have to supply, such as a contact address or a governing law. This document
                is accurate about how Argus works today and has not yet had a final review
                by a lawyer.
              </p>
            </div>
          ) : null}
        </div>

        {/*
          Table of contents. On large screens it parks in the left column and
          follows the reader; on small screens it sits above the body as a plain
          list, which is more useful than a collapsed menu for this many items.

          `row-span-2` matters: a sticky child can only travel inside its own
          grid area, so without it the list would stop following the reader at
          the end of the first row.
        */}
        <nav
          aria-label="On this page"
          className="mt-12 lg:col-span-3 lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:mt-0"
        >
          <div className="lg:sticky lg:top-[calc(var(--header-height)+2rem)]">
            <p className="landing-mono">On this page</p>
            <ol className="mt-4 space-y-2.5">
              {sections.map((section, index) => (
                <li key={section.id} className="flex gap-2.5">
                  <span
                    className="font-mono text-[0.625rem] leading-6 text-white/30 tabular-nums"
                    aria-hidden="true"
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <a
                    href={`#${section.id}`}
                    className="rounded-sm text-xs leading-6 text-white/55 transition-colors duration-200 hover:text-white/90 focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
                  >
                    {section.title}
                  </a>
                </li>
              ))}
            </ol>
          </div>
        </nav>

        <div className="lg:col-span-8 lg:col-start-4 lg:row-start-2">
          <div className="mt-14 max-w-2xl space-y-12 lg:mt-16">
            {sections.map((section, index) => (
              <section
                key={section.id}
                id={section.id}
                className="scroll-mt-[calc(var(--header-height)+2rem)]"
              >
                <h2 className="font-display text-lg font-semibold tracking-[-0.01em] text-white/95">
                  <span
                    className="mr-2.5 font-mono text-xs font-normal text-white/30 tabular-nums"
                    aria-hidden="true"
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  {section.title}
                </h2>
                <div className={cn(LEGAL_PROSE, "mt-4")}>{section.body}</div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Body copy for a legal section. Element selectors keep the section content
 * readable as plain HTML instead of a class name on every paragraph.
 */
const LEGAL_PROSE = cn(
  "text-sm leading-7 text-white/75",
  "[&_p]:mt-4 [&_p:first-child]:mt-0",
  "[&_ul]:mt-4 [&_ul]:space-y-2 [&_ul]:pl-5",
  "[&_li]:list-disc [&_li]:marker:text-white/25",
  "[&_h3]:font-display [&_h3]:mt-7 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:tracking-tight [&_h3]:text-white/90",
  "[&_strong]:font-medium [&_strong]:text-white/90",
  "[&_a]:text-white/90 [&_a]:underline [&_a]:decoration-white/25 [&_a]:underline-offset-4",
  "[&_a:hover]:decoration-white/60",
);

/** Cross-link between the two legal documents. */
export function LegalCrossLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-sm text-white/90 underline decoration-white/25 underline-offset-4 transition-colors duration-200 hover:decoration-white/60"
    >
      {label}
    </Link>
  );
}
