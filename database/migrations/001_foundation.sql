-- =============================================================================
-- Frame — Phase 1 Foundation Schema
-- =============================================================================
-- Tables: profiles, user_settings, user_preferences
-- Auth: relies on Supabase auth.users (managed by Supabase Auth)
-- Sessions: managed by Supabase Auth (auth.sessions) — do not recreate
--
-- Extension points (future phases — do not implement yet):
--   media_titles, genres, people, credits
--   watch_entries, watchlists, collections
--   reviews, ratings, lists
--   recommendations, analytics_events
-- =============================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "citext";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.theme_preference AS ENUM ('system', 'light', 'dark');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.density_preference AS ENUM ('comfortable', 'compact');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- Profiles
-- One-to-one with auth.users. Created automatically on signup via trigger.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  username      CITEXT UNIQUE,
  display_name  TEXT,
  bio           TEXT CHECK (char_length(bio) <= 500),
  avatar_url    TEXT,
  website       TEXT,
  is_public     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT profiles_username_length CHECK (
    username IS NULL OR (char_length(username) >= 3 AND char_length(username) <= 32)
  ),
  CONSTRAINT profiles_username_format CHECK (
    username IS NULL OR username ~ '^[a-zA-Z0-9_]+$'
  )
);

CREATE INDEX IF NOT EXISTS profiles_username_idx ON public.profiles (username);
CREATE INDEX IF NOT EXISTS profiles_created_at_idx ON public.profiles (created_at DESC);

COMMENT ON TABLE public.profiles IS
  'Public-facing user profiles. Extensible for social features in later phases.';

-- ---------------------------------------------------------------------------
-- User settings (account-level preferences)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_settings (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL UNIQUE REFERENCES auth.users (id) ON DELETE CASCADE,
  theme                 public.theme_preference NOT NULL DEFAULT 'system',
  density               public.density_preference NOT NULL DEFAULT 'comfortable',
  language              TEXT NOT NULL DEFAULT 'en',
  timezone              TEXT,
  email_notifications   BOOLEAN NOT NULL DEFAULT true,
  marketing_emails      BOOLEAN NOT NULL DEFAULT false,
  reduced_motion        BOOLEAN NOT NULL DEFAULT false,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_settings_user_id_idx ON public.user_settings (user_id);

COMMENT ON TABLE public.user_settings IS
  'Account settings: theme, density, notifications, accessibility.';

-- ---------------------------------------------------------------------------
-- User preferences (UI / content preferences)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL UNIQUE REFERENCES auth.users (id) ON DELETE CASCADE,
  sidebar_collapsed   BOOLEAN NOT NULL DEFAULT false,
  default_landing     TEXT NOT NULL DEFAULT '/dashboard',
  content_languages   TEXT[] NOT NULL DEFAULT ARRAY['en']::TEXT[],
  spoiler_protection  BOOLEAN NOT NULL DEFAULT true,
  metadata            JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_preferences_user_id_idx ON public.user_preferences (user_id);

COMMENT ON TABLE public.user_preferences IS
  'UI and content preferences. metadata JSONB is a flexible extension bag.';

-- ---------------------------------------------------------------------------
-- updated_at trigger helper
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_set_updated_at ON public.profiles;
CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS user_settings_set_updated_at ON public.user_settings;
CREATE TRIGGER user_settings_set_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS user_preferences_set_updated_at ON public.user_preferences;
CREATE TRIGGER user_preferences_set_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Auto-provision profile + settings + preferences on signup
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_username TEXT;
  final_username TEXT;
BEGIN
  -- Derive a username candidate from email local-part or metadata
  base_username := lower(
    coalesce(
      NEW.raw_user_meta_data ->> 'username',
      split_part(NEW.email, '@', 1),
      'user'
    )
  );
  -- Sanitize to allowed charset
  base_username := regexp_replace(base_username, '[^a-z0-9_]', '', 'g');
  IF char_length(base_username) < 3 THEN
    base_username := 'user' || substr(replace(NEW.id::text, '-', ''), 1, 6);
  END IF;
  IF char_length(base_username) > 24 THEN
    base_username := substr(base_username, 1, 24);
  END IF;

  -- Ensure uniqueness with a short suffix if needed
  final_username := base_username;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username) THEN
    final_username := base_username || '_' || substr(replace(NEW.id::text, '-', ''), 1, 6);
  END IF;

  INSERT INTO public.profiles (id, username, display_name, avatar_url)
  VALUES (
    NEW.id,
    final_username,
    coalesce(
      NEW.raw_user_meta_data ->> 'full_name',
      NEW.raw_user_meta_data ->> 'name',
      final_username
    ),
    NEW.raw_user_meta_data ->> 'avatar_url'
  );

  INSERT INTO public.user_settings (user_id)
  VALUES (NEW.id);

  INSERT INTO public.user_preferences (user_id)
  VALUES (NEW.id);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Profiles: public read when is_public; owners full access
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (is_public = true OR auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Settings: owner only
DROP POLICY IF EXISTS "Users can view own settings" ON public.user_settings;
CREATE POLICY "Users can view own settings"
  ON public.user_settings FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own settings" ON public.user_settings;
CREATE POLICY "Users can insert own settings"
  ON public.user_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own settings" ON public.user_settings;
CREATE POLICY "Users can update own settings"
  ON public.user_settings FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Preferences: owner only
DROP POLICY IF EXISTS "Users can view own preferences" ON public.user_preferences;
CREATE POLICY "Users can view own preferences"
  ON public.user_preferences FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own preferences" ON public.user_preferences;
CREATE POLICY "Users can insert own preferences"
  ON public.user_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own preferences" ON public.user_preferences;
CREATE POLICY "Users can update own preferences"
  ON public.user_preferences FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.profiles TO anon, authenticated;
GRANT INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.user_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.user_preferences TO authenticated;
