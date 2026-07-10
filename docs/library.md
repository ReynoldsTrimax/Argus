# Personal library (Phase 3)

## Overview

Phase 3 turns Frame into a personal entertainment journal. Catalog discovery (Phase 2) remains the source of metadata; Supabase stores **your** relationship to each title.

## Migration

Run in the Supabase SQL editor:

```text
database/migrations/003_personal_library.sql
```

Requires Phase 1 foundation (`001`) already applied.

## Core tables

| Table | Purpose |
| --- | --- |
| `library_entries` | One row per user + external title (status, progress, favorite, rating) |
| `library_status_history` | Status changes over time |
| `episode_progress` / `season_progress` | TV tracking |
| `watch_sessions` | Analytics-ready session log |
| `rating_history` | Never overwrite past ratings |
| `reviews` / `review_versions` | Personal reviews + edit history |
| `notes` | Unlimited private notes |
| `tags` / `tag_assignments` | Custom tags |
| `collections` / `collection_items` | Custom collections |
| `recently_viewed` | Catalog browsing memory |
| `activity_log` | Internal activity feed |

All tables use RLS: `auth.uid() = user_id`.

## Application layers

```
UI (personal-media-panel, library pages)
  → Server Actions (features/library/actions)
    → lib/library/* services
      → Supabase (table helper)
```

Domain types: `src/types/library.ts`  
Do **not** import TMDB types into library services.

## Routes

| Path | Purpose |
| --- | --- |
| `/library` | Full personal library |
| `/library/search` | Search library, notes, reviews, tags, collections |
| `/watchlist` | Plan to watch + wishlist |
| `/favorites` | Favorites only |
| `/collections` | User collections |
| `/collections/[id]` | Collection detail |
| `/history` | Watch sessions timeline |
| `/activity` | Activity feed |

## Detail page integration

Movie and TV pages load `getPersonalMediaState` and render `PersonalMediaPanel` (status, favorite, rating history, review, notes, tags, collections, sessions).

## Import / export

Scaffold only: `src/features/import-export/`.  
Adapters for Letterboxd / Trakt / IMDb / CSV are intentionally not implemented.

## Not in this phase

Advanced analytics, Wrapped, AI recommendations, social / friends, public profiles.
