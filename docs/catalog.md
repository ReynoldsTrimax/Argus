# Catalog architecture (Phase 2)

## Provider adapter pattern

```
UI / features
    ↓
lib/media/catalog.ts          # high-level API
    ↓
lib/media/providers/index.ts  # factory
    ↓
MediaProvider interface
    ↓
tmdb/ (current) | watchmode | omdb | … (future)
```

UI components and pages **must not** import TMDB response types or call `api.themoviedb.org` directly.

### Adding a provider

1. Implement `MediaProvider` in `src/lib/media/providers/<name>/`
2. Map vendor payloads → `src/types/media.ts` domain models
3. Register in `getMediaProvider()` (or compose multiple providers)

## Environment

```env
TMDB_API_KEY=...                  # v3 query key
# or
TMDB_READ_ACCESS_TOKEN=...        # v4 bearer (preferred)
```

## Routes

| Path | Purpose |
| --- | --- |
| `/discover` | Discovery home with rails |
| `/movies` | Filtered movie browse |
| `/tv` | Filtered TV browse |
| `/movie/[id]` | Movie detail |
| `/tv/[id]` | TV detail + seasons |
| `/person/[id]` | Person + filmography |
| `/collection/[id]` | Collection timeline |
| `/genres` | Genre index |
| `/genre/[id]` | Genre browse |
| `/api/media/search` | Universal search API |
| `/api/media/trending` | Trending for palette |
| `/api/media/tv/.../season/...` | Season episodes |

## Search

- Command palette (`⌘K`) debounces input (~220ms)
- Hits `/api/media/search` via TanStack Query
- Recent searches: `localStorage` + optional `search_history` table
- Trending shown when the query is empty
- `SearchResponse.aiResults` reserved for future AI search

## Ratings & streaming

- `MediaRating[]` is multi-source:
  - **TMDB** — always live from catalog details
  - **IMDb / Rotten Tomatoes / Metacritic** — via OMDb (`OMDB_API_KEY` in `.env.local`)
  - Free OMDb key: https://www.omdbapi.com/apikey.aspx
- Enrichment runs in `getMovie` / `getTvShow` (`src/lib/media/catalog.ts` → `enrichRatings`)
- `StreamingAvailability` maps TMDB/JustWatch watch providers by region
  - Set `WATCH_REGION=US` (or `IN`, `GB`, …) for your market
  - Hero shows compact “Available on” chips; sidebar has full offer groups

## Caching

TMDB `fetch` uses Next.js `revalidate` (default 1 hour) and cache tags `tmdb`, `tmdb:<path>`.

## Database

Run `database/migrations/002_search_history.sql` for per-user search history (optional; client recent searches still work).
