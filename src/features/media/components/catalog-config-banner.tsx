import { AlertTriangle } from "lucide-react";

/**
 * Shown when TMDB credentials are missing so the UI still renders cleanly.
 */
export function CatalogConfigBanner() {
  return (
    <div
      className="flex items-start gap-3 rounded-xl border-0 bg-warning/15 px-4 py-3 text-sm"
      role="status"
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
      <div>
        <p className="font-medium">Catalog not configured</p>
        <p className="mt-0.5 text-muted-foreground">
          Add <code className="text-xs">TMDB_API_KEY</code> or{" "}
          <code className="text-xs">TMDB_READ_ACCESS_TOKEN</code> to{" "}
          <code className="text-xs">.env.local</code> and restart the dev server. Get a free
          key at{" "}
          <a
            href="https://www.themoviedb.org/settings/api"
            className="underline underline-offset-2 hover:text-foreground"
            target="_blank"
            rel="noreferrer"
          >
            themoviedb.org
          </a>
          .
        </p>
      </div>
    </div>
  );
}
