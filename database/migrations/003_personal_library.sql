-- =============================================================================
-- Frame — Phase 3 Personal Library
-- Personal watch tracking, ratings, reviews, notes, tags, collections, activity
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.media_kind AS ENUM ('movie', 'tv');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.watch_status AS ENUM (
    'watching',
    'completed',
    'paused',
    'dropped',
    'wishlist',
    'plan_to_watch',
    'rewatching',
    'archived'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.rating_scale AS ENUM ('five', 'ten', 'hundred');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.review_visibility AS ENUM ('private', 'friends', 'public');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.activity_type AS ENUM (
    'library_added',
    'status_changed',
    'started_watching',
    'finished',
    'episode_watched',
    'season_completed',
    'rated',
    'reviewed',
    'note_added',
    'favorited',
    'unfavorited',
    'collection_created',
    'collection_item_added',
    'tag_added',
    'session_logged'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- Library entries (one row per user + external title)
-- Denormalized title metadata for fast library browsing without TMDB on every row
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.library_entries (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  provider          TEXT NOT NULL DEFAULT 'tmdb',
  media_type        public.media_kind NOT NULL,
  external_id       TEXT NOT NULL,
  title             TEXT NOT NULL,
  original_title    TEXT,
  poster_path       TEXT,
  backdrop_path     TEXT,
  release_date      DATE,
  overview          TEXT,
  runtime_minutes   INT,
  status            public.watch_status NOT NULL DEFAULT 'plan_to_watch',
  is_favorite       BOOLEAN NOT NULL DEFAULT false,
  is_hidden         BOOLEAN NOT NULL DEFAULT false,
  is_pinned         BOOLEAN NOT NULL DEFAULT false,
  is_archived       BOOLEAN NOT NULL DEFAULT false,
  progress_percent  NUMERIC(5,2) NOT NULL DEFAULT 0
                      CHECK (progress_percent >= 0 AND progress_percent <= 100),
  -- Movie progress (optional minutes watched)
  movie_progress_minutes INT CHECK (movie_progress_minutes IS NULL OR movie_progress_minutes >= 0),
  -- TV progress
  current_season    INT CHECK (current_season IS NULL OR current_season >= 0),
  current_episode   INT CHECK (current_episode IS NULL OR current_episode >= 0),
  episodes_watched  INT NOT NULL DEFAULT 0 CHECK (episodes_watched >= 0),
  total_episodes    INT CHECK (total_episodes IS NULL OR total_episodes >= 0),
  started_at        TIMESTAMPTZ,
  completed_at      TIMESTAMPTZ,
  last_watched_at   TIMESTAMPTZ,
  rewatch_count     INT NOT NULL DEFAULT 0 CHECK (rewatch_count >= 0),
  user_rating       NUMERIC(5,2),
  rating_scale      public.rating_scale DEFAULT 'ten',
  metadata          JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, provider, media_type, external_id)
);

CREATE INDEX IF NOT EXISTS library_entries_user_status_idx
  ON public.library_entries (user_id, status);
CREATE INDEX IF NOT EXISTS library_entries_user_favorite_idx
  ON public.library_entries (user_id, is_favorite) WHERE is_favorite = true;
CREATE INDEX IF NOT EXISTS library_entries_user_pinned_idx
  ON public.library_entries (user_id, is_pinned) WHERE is_pinned = true;
CREATE INDEX IF NOT EXISTS library_entries_user_last_watched_idx
  ON public.library_entries (user_id, last_watched_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS library_entries_user_title_idx
  ON public.library_entries (user_id, title);
CREATE INDEX IF NOT EXISTS library_entries_external_idx
  ON public.library_entries (provider, media_type, external_id);

COMMENT ON TABLE public.library_entries IS
  'Personal media library. Catalog metadata is denormalized for performance; source of truth for discovery remains TMDB.';

-- ---------------------------------------------------------------------------
-- Status change history (never lose prior status)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.library_status_history (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id      UUID NOT NULL REFERENCES public.library_entries (id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  from_status   public.watch_status,
  to_status     public.watch_status NOT NULL,
  note          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS library_status_history_entry_idx
  ON public.library_status_history (entry_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- Episode progress (per episode granularity for TV)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.episode_progress (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id        UUID NOT NULL REFERENCES public.library_entries (id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  season_number   INT NOT NULL CHECK (season_number >= 0),
  episode_number  INT NOT NULL CHECK (episode_number >= 0),
  episode_id      TEXT,
  episode_name    TEXT,
  still_path      TEXT,
  is_watched      BOOLEAN NOT NULL DEFAULT false,
  watched_at      TIMESTAMPTZ,
  runtime_minutes INT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (entry_id, season_number, episode_number)
);

CREATE INDEX IF NOT EXISTS episode_progress_user_entry_idx
  ON public.episode_progress (user_id, entry_id);
CREATE INDEX IF NOT EXISTS episode_progress_watched_idx
  ON public.episode_progress (user_id, watched_at DESC NULLS LAST)
  WHERE is_watched = true;

-- ---------------------------------------------------------------------------
-- Season progress rollup
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.season_progress (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id          UUID NOT NULL REFERENCES public.library_entries (id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  season_number     INT NOT NULL CHECK (season_number >= 0),
  episodes_watched  INT NOT NULL DEFAULT 0 CHECK (episodes_watched >= 0),
  total_episodes    INT,
  is_completed      BOOLEAN NOT NULL DEFAULT false,
  completed_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (entry_id, season_number)
);

-- ---------------------------------------------------------------------------
-- Watch sessions (analytics-ready history of actual watches)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.watch_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id        UUID NOT NULL REFERENCES public.library_entries (id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  session_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  started_at      TIMESTAMPTZ,
  ended_at        TIMESTAMPTZ,
  duration_minutes INT CHECK (duration_minutes IS NULL OR duration_minutes >= 0),
  is_rewatch      BOOLEAN NOT NULL DEFAULT false,
  season_number   INT,
  episode_number  INT,
  device          TEXT,
  location        TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS watch_sessions_user_date_idx
  ON public.watch_sessions (user_id, session_date DESC);
CREATE INDEX IF NOT EXISTS watch_sessions_entry_idx
  ON public.watch_sessions (entry_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- Ratings (current value on library_entries; history preserved here)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rating_history (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id      UUID NOT NULL REFERENCES public.library_entries (id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  value         NUMERIC(5,2) NOT NULL,
  scale         public.rating_scale NOT NULL DEFAULT 'ten',
  previous_value NUMERIC(5,2),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rating_history_entry_idx
  ON public.rating_history (entry_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- Reviews
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reviews (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id        UUID NOT NULL REFERENCES public.library_entries (id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  body            TEXT NOT NULL CHECK (char_length(body) >= 1 AND char_length(body) <= 20000),
  body_format     TEXT NOT NULL DEFAULT 'markdown',
  contains_spoilers BOOLEAN NOT NULL DEFAULT false,
  visibility      public.review_visibility NOT NULL DEFAULT 'private',
  word_count      INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (entry_id, user_id)
);

CREATE INDEX IF NOT EXISTS reviews_user_idx ON public.reviews (user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.review_versions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id     UUID NOT NULL REFERENCES public.reviews (id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  body          TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Private notes (unlimited per title)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id      UUID NOT NULL REFERENCES public.library_entries (id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  body          TEXT NOT NULL CHECK (char_length(body) >= 1 AND char_length(body) <= 10000),
  body_format   TEXT NOT NULL DEFAULT 'markdown',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notes_user_entry_idx ON public.notes (user_id, entry_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notes_user_search_idx ON public.notes USING gin (to_tsvector('english', body));

-- ---------------------------------------------------------------------------
-- Custom tags
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tags (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  name          CITEXT NOT NULL,
  color         TEXT,
  description   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);

CREATE TABLE IF NOT EXISTS public.tag_assignments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_id        UUID NOT NULL REFERENCES public.tags (id) ON DELETE CASCADE,
  entry_id      UUID NOT NULL REFERENCES public.library_entries (id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tag_id, entry_id)
);

CREATE INDEX IF NOT EXISTS tag_assignments_entry_idx ON public.tag_assignments (entry_id);
CREATE INDEX IF NOT EXISTS tag_assignments_user_idx ON public.tag_assignments (user_id);

-- ---------------------------------------------------------------------------
-- Collections
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.collections (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  name          TEXT NOT NULL CHECK (char_length(name) >= 1 AND char_length(name) <= 120),
  description   TEXT,
  cover_path    TEXT,
  is_pinned     BOOLEAN NOT NULL DEFAULT false,
  sort_order    INT NOT NULL DEFAULT 0,
  item_count    INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS collections_user_idx
  ON public.collections (user_id, sort_order, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.collection_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id   UUID NOT NULL REFERENCES public.collections (id) ON DELETE CASCADE,
  entry_id        UUID NOT NULL REFERENCES public.library_entries (id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  position        INT NOT NULL DEFAULT 0,
  note            TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (collection_id, entry_id)
);

CREATE INDEX IF NOT EXISTS collection_items_collection_idx
  ON public.collection_items (collection_id, position);

-- ---------------------------------------------------------------------------
-- Recently viewed (catalog browsing memory)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.recently_viewed (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  provider      TEXT NOT NULL DEFAULT 'tmdb',
  media_type    public.media_kind NOT NULL,
  external_id   TEXT NOT NULL,
  title         TEXT NOT NULL,
  poster_path   TEXT,
  viewed_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, provider, media_type, external_id)
);

CREATE INDEX IF NOT EXISTS recently_viewed_user_idx
  ON public.recently_viewed (user_id, viewed_at DESC);

-- ---------------------------------------------------------------------------
-- Activity log (internal feed; analytics-ready)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.activity_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  activity_type public.activity_type NOT NULL,
  entry_id      UUID REFERENCES public.library_entries (id) ON DELETE SET NULL,
  collection_id UUID REFERENCES public.collections (id) ON DELETE SET NULL,
  title         TEXT,
  summary       TEXT NOT NULL,
  metadata      JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS activity_log_user_idx
  ON public.activity_log (user_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- Extend user_settings for library preferences
-- ---------------------------------------------------------------------------
ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS rating_scale public.rating_scale NOT NULL DEFAULT 'ten',
  ADD COLUMN IF NOT EXISTS poster_size TEXT NOT NULL DEFAULT 'md',
  ADD COLUMN IF NOT EXISTS default_sort TEXT NOT NULL DEFAULT 'last_watched',
  ADD COLUMN IF NOT EXISTS spoiler_behavior TEXT NOT NULL DEFAULT 'hide',
  ADD COLUMN IF NOT EXISTS date_format TEXT NOT NULL DEFAULT 'medium';

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS library_entries_set_updated_at ON public.library_entries;
CREATE TRIGGER library_entries_set_updated_at
  BEFORE UPDATE ON public.library_entries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS episode_progress_set_updated_at ON public.episode_progress;
CREATE TRIGGER episode_progress_set_updated_at
  BEFORE UPDATE ON public.episode_progress
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS season_progress_set_updated_at ON public.season_progress;
CREATE TRIGGER season_progress_set_updated_at
  BEFORE UPDATE ON public.season_progress
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS watch_sessions_set_updated_at ON public.watch_sessions;
CREATE TRIGGER watch_sessions_set_updated_at
  BEFORE UPDATE ON public.watch_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS reviews_set_updated_at ON public.reviews;
CREATE TRIGGER reviews_set_updated_at
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS notes_set_updated_at ON public.notes;
CREATE TRIGGER notes_set_updated_at
  BEFORE UPDATE ON public.notes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS tags_set_updated_at ON public.tags;
CREATE TRIGGER tags_set_updated_at
  BEFORE UPDATE ON public.tags
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS collections_set_updated_at ON public.collections;
CREATE TRIGGER collections_set_updated_at
  BEFORE UPDATE ON public.collections
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Collection item_count maintenance
CREATE OR REPLACE FUNCTION public.touch_collection_item_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.collections
      SET item_count = item_count + 1, updated_at = now()
      WHERE id = NEW.collection_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.collections
      SET item_count = GREATEST(item_count - 1, 0), updated_at = now()
      WHERE id = OLD.collection_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS collection_items_count_ins ON public.collection_items;
CREATE TRIGGER collection_items_count_ins
  AFTER INSERT ON public.collection_items
  FOR EACH ROW EXECUTE FUNCTION public.touch_collection_item_count();

DROP TRIGGER IF EXISTS collection_items_count_del ON public.collection_items;
CREATE TRIGGER collection_items_count_del
  AFTER DELETE ON public.collection_items
  FOR EACH ROW EXECUTE FUNCTION public.touch_collection_item_count();

-- ---------------------------------------------------------------------------
-- RLS — owner only for all personal tables
-- ---------------------------------------------------------------------------
ALTER TABLE public.library_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.library_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.episode_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.season_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watch_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rating_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tag_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recently_viewed ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- Helper macro pattern: owner policies
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'library_entries',
    'library_status_history',
    'episode_progress',
    'season_progress',
    'watch_sessions',
    'rating_history',
    'reviews',
    'review_versions',
    'notes',
    'tags',
    'tag_assignments',
    'collections',
    'collection_items',
    'recently_viewed',
    'activity_log'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_select_own', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT USING (auth.uid() = user_id)',
      t || '_select_own', t
    );
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_insert_own', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT WITH CHECK (auth.uid() = user_id)',
      t || '_insert_own', t
    );
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_update_own', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)',
      t || '_update_own', t
    );
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_delete_own', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR DELETE USING (auth.uid() = user_id)',
      t || '_delete_own', t
    );
  END LOOP;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.library_entries,
  public.library_status_history,
  public.episode_progress,
  public.season_progress,
  public.watch_sessions,
  public.rating_history,
  public.reviews,
  public.review_versions,
  public.notes,
  public.tags,
  public.tag_assignments,
  public.collections,
  public.collection_items,
  public.recently_viewed,
  public.activity_log
TO authenticated;
