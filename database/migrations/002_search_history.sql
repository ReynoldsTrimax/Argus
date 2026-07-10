-- =============================================================================
-- Frame — Phase 2 Search History
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.search_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  query       TEXT NOT NULL CHECK (char_length(query) >= 1 AND char_length(query) <= 200),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS search_history_user_created_idx
  ON public.search_history (user_id, created_at DESC);

COMMENT ON TABLE public.search_history IS
  'Per-user search queries for command palette history. Local recent searches remain client-side as a fallback.';

ALTER TABLE public.search_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own search history" ON public.search_history;
CREATE POLICY "Users can view own search history"
  ON public.search_history FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own search history" ON public.search_history;
CREATE POLICY "Users can insert own search history"
  ON public.search_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own search history" ON public.search_history;
CREATE POLICY "Users can delete own search history"
  ON public.search_history FOR DELETE
  USING (auth.uid() = user_id);

GRANT SELECT, INSERT, DELETE ON public.search_history TO authenticated;
