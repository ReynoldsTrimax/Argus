import type { EngineDebugInfo } from "@/lib/recommendations/engine";
import type { RecommendationRun } from "@/types/recommendations";

/**
 * Development-only pipeline inspector.
 *
 * Tuning a recommender without seeing the candidate pool, the lane that produced
 * each title and the signed factor contributions is guesswork, so this exposes
 * all of it — behind `NODE_ENV !== "production"` *and* an explicit `?debug=1`,
 * checked by the page before this component is rendered. It is never part of the
 * normal reading experience.
 */
export function RecommendationDebugPanel({
  run,
  debug,
}: {
  run: RecommendationRun;
  debug: EngineDebugInfo;
}) {
  const lanes = Object.entries(debug.laneCounts).sort(([a], [b]) => a.localeCompare(b));

  return (
    <section
      className="surface-card panel-corner space-y-5 p-5 font-mono text-xs"
      aria-label="Recommendation debug"
    >
      <header className="space-y-1">
        <h2 className="text-[10px] tracking-[0.16em] uppercase">Debug — engine run</h2>
        <p className="text-muted-foreground">
          mode {run.mode} · fingerprint {run.fingerprint} · pool {debug.poolSize} · scored{" "}
          {debug.scoredSize} · confidence {run.profile.confidence}
        </p>
      </header>

      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <h3 className="text-muted-foreground text-[10px] tracking-[0.16em] uppercase">
            Candidate lanes
          </h3>
          <ul className="mt-2 space-y-0.5">
            {lanes.length === 0 ? (
              <li className="text-muted-foreground">none</li>
            ) : (
              lanes.map(([lane, count]) => (
                <li key={lane} className="flex justify-between gap-4">
                  <span className="text-muted-foreground">{lane}</span>
                  <span className="tabular-nums">{count}</span>
                </li>
              ))
            )}
          </ul>
        </div>

        <div>
          <h3 className="text-muted-foreground text-[10px] tracking-[0.16em] uppercase">
            Enriched titles ({debug.enrichedTitles.length})
          </h3>
          <ul className="text-muted-foreground mt-2 space-y-0.5">
            {debug.enrichedTitles.length === 0 ? (
              <li>none</li>
            ) : (
              debug.enrichedTitles.map((title) => <li key={title}>{title}</li>)
            )}
          </ul>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        <DebugAffinity title="Genres" items={run.profile.genres} />
        <DebugAffinity title="Creators" items={run.profile.creators} />
        <DebugAffinity title="Themes" items={run.profile.themes.slice(0, 12)} />
      </div>

      <div>
        <h3 className="text-muted-foreground text-[10px] tracking-[0.16em] uppercase">
          Anchors
        </h3>
        <ul className="mt-2 space-y-0.5">
          {run.profile.anchors.length === 0 ? (
            <li className="text-muted-foreground">none</li>
          ) : (
            run.profile.anchors.map((anchor) => (
              <li key={anchor.entryId} className="flex justify-between gap-4">
                <span className="text-muted-foreground truncate">
                  {anchor.title} ({anchor.basis})
                </span>
                <span className="tabular-nums">{anchor.weight}</span>
              </li>
            ))
          )}
        </ul>
      </div>

      <div>
        <h3 className="text-muted-foreground text-[10px] tracking-[0.16em] uppercase">
          Sections
        </h3>
        <ul className="mt-2 space-y-0.5">
          {run.sections.map((section) => (
            <li key={section.id} className="flex justify-between gap-4">
              <span className="text-muted-foreground truncate">
                {section.id} ({section.kind})
              </span>
              <span className="tabular-nums">{section.items.length}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function DebugAffinity({
  title,
  items,
}: {
  title: string;
  items: { key: string; score: number; support: number; titles: number }[];
}) {
  return (
    <div>
      <h3 className="text-muted-foreground text-[10px] tracking-[0.16em] uppercase">
        {title}
      </h3>
      <ul className="mt-2 space-y-0.5">
        {items.length === 0 ? (
          <li className="text-muted-foreground">none</li>
        ) : (
          items.map((item) => (
            <li key={item.key} className="flex justify-between gap-3">
              <span className="text-muted-foreground truncate">{item.key}</span>
              <span className="tabular-nums">
                {item.score > 0 ? "+" : ""}
                {item.score} / {item.titles}
              </span>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
