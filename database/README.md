# Database

## Migrations (run in order)

1. `migrations/001_foundation.sql` — profiles, settings, preferences  
2. `migrations/002_search_history.sql` — search history  
3. `migrations/003_personal_library.sql` — full personal library (Phase 3)  
4. `migrations/004_performance_indexes.sql` — additive indexes (Phase 5)

### Phase 1 tables

| Table | Purpose |
| --- | --- |
| `profiles` | Public user profile (1:1 with `auth.users`) |
| `user_settings` | Theme, density, notifications, a11y |
| `user_preferences` | UI prefs + flexible `metadata` JSONB |

### Phase 3 tables (summary)

`library_entries`, `library_status_history`, `episode_progress`, `season_progress`, `watch_sessions`, `rating_history`, `reviews`, `review_versions`, `notes`, `tags`, `tag_assignments`, `collections`, `collection_items`, `recently_viewed`, `activity_log`

See `docs/library.md` for architecture. Sessions for auth live in Supabase Auth — do not duplicate them.

### Future extensions

Analytics aggregates, AI recommendations, social graphs — new numbered migrations only. Always enable RLS with the table.
