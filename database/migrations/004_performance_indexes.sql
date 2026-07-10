-- =============================================================================
-- Frame — Phase 5 performance indexes (safe, additive)
-- Run after 001–003. Uses IF NOT EXISTS for idempotency.
-- =============================================================================

-- Library listing / smart filters
CREATE INDEX IF NOT EXISTS library_entries_user_rating_idx
  ON public.library_entries (user_id, user_rating DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS library_entries_user_status_updated_idx
  ON public.library_entries (user_id, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS library_entries_user_favorite_rating_idx
  ON public.library_entries (user_id, is_favorite, user_rating DESC NULLS LAST)
  WHERE is_favorite = true;

-- Sessions timeline
CREATE INDEX IF NOT EXISTS watch_sessions_user_created_idx
  ON public.watch_sessions (user_id, created_at DESC);

-- Activity feed
CREATE INDEX IF NOT EXISTS activity_log_user_type_idx
  ON public.activity_log (user_id, activity_type, created_at DESC);

-- Reviews / notes listing
CREATE INDEX IF NOT EXISTS reviews_user_updated_idx
  ON public.reviews (user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS notes_user_updated_idx
  ON public.notes (user_id, updated_at DESC);

-- Collection browse
CREATE INDEX IF NOT EXISTS collections_user_pinned_idx
  ON public.collections (user_id, is_pinned DESC, updated_at DESC);

COMMENT ON INDEX public.library_entries_user_rating_idx IS
  'Speeds sort by personal rating on library pages';
