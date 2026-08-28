-- ===========================================================================
-- 005 — Social: friendships and friend-visible library
--
-- Adds a friendship graph and, with it, the first cross-user reads in the
-- schema. Everything before this migration was strictly `auth.uid() = user_id`.
--
-- The visibility rule lives in the database rather than in application code on
-- purpose: a friend reading another user's library is an authorization
-- decision, and enforcing it in a service function would leave the raw tables
-- readable to anything holding a session. RLS is the only layer that cannot be
-- bypassed by a future caller that forgets the check.
--
-- Deliberately NOT shared with friends:
--   * notes            — documented as private notes
--   * user_settings / user_preferences — account configuration
--   * search_history   — browsing behaviour
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'friendship_status') THEN
    CREATE TYPE public.friendship_status AS ENUM ('pending', 'accepted', 'declined');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'library_visibility') THEN
    CREATE TYPE public.library_visibility AS ENUM ('private', 'friends', 'public');
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Per-user visibility control
--
-- Defaults to 'friends', not 'public': adding a social graph must not
-- retroactively expose the library of every existing account to the internet.
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS library_visibility public.library_visibility
    NOT NULL DEFAULT 'friends';

COMMENT ON COLUMN public.profiles.library_visibility IS
  'Who may read this user''s library: private (nobody), friends (accepted friends), public (any signed-in user).';

-- ---------------------------------------------------------------------------
-- Friendships
--
-- One row per pair, direction preserved so "who asked whom" stays answerable.
-- A declined row is kept rather than deleted, so declining actually prevents
-- the request from being sent again; unfriending and cancelling both DELETE,
-- which frees the pair to start over.
--
-- The columns reference public.profiles rather than auth.users even though
-- profiles.id is itself a reference to auth.users. Integrity is identical
-- (profiles cascades from auth.users), but PostgREST can only embed a related
-- table across a declared foreign key — pointing these at auth.users would make
-- `profiles!friendships_requester_id_fkey` unresolvable and force the friends
-- list into an N+1 of separate profile lookups.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.friendships (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  addressee_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  status       public.friendship_status NOT NULL DEFAULT 'pending',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at TIMESTAMPTZ,

  CONSTRAINT friendships_no_self CHECK (requester_id <> addressee_id)
);

-- One relationship per pair regardless of who asked, so A→B and B→A cannot
-- both exist and produce two rows describing one friendship.
CREATE UNIQUE INDEX IF NOT EXISTS friendships_pair_idx
  ON public.friendships (
    LEAST(requester_id, addressee_id),
    GREATEST(requester_id, addressee_id)
  );

CREATE INDEX IF NOT EXISTS friendships_requester_idx
  ON public.friendships (requester_id, status);
CREATE INDEX IF NOT EXISTS friendships_addressee_idx
  ON public.friendships (addressee_id, status);

COMMENT ON TABLE public.friendships IS
  'Friend graph. One row per user pair; direction records who sent the request.';

-- ---------------------------------------------------------------------------
-- Helpers
--
-- SECURITY DEFINER because these are called from inside the RLS policies of
-- other tables. A plain function would re-enter `friendships` RLS while
-- evaluating a policy on `library_entries`, which is both slower and a route to
-- recursive policy evaluation. STABLE lets the planner hoist them out of loops.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.are_friends(user_a UUID, user_b UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.friendships f
    WHERE f.status = 'accepted'
      AND (
        (f.requester_id = user_a AND f.addressee_id = user_b)
        OR (f.requester_id = user_b AND f.addressee_id = user_a)
      )
  );
$$;

COMMENT ON FUNCTION public.are_friends IS
  'True when an accepted friendship connects the two users, in either direction.';

/**
 * Single source of truth for "may the current user read this library".
 *
 * Used by every friend-read policy below so the rule cannot drift between
 * tables — adding a table means calling this, not restating the condition.
 */
CREATE OR REPLACE FUNCTION public.can_view_library(owner_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    CASE
      -- Owners always read their own rows, whatever the visibility setting.
      WHEN auth.uid() = owner_id THEN true
      -- Anonymous callers never read another user's library, even a public one:
      -- the app has no signed-out surface for it, so allowing it would only
      -- widen the anon key's reach.
      WHEN auth.uid() IS NULL THEN false
      ELSE COALESCE(
        (
          SELECT
            CASE p.library_visibility
              WHEN 'public' THEN true
              WHEN 'friends' THEN public.are_friends(auth.uid(), owner_id)
              ELSE false
            END
          FROM public.profiles p
          WHERE p.id = owner_id
        ),
        false
      )
    END;
$$;

COMMENT ON FUNCTION public.can_view_library IS
  'True when the current user may read owner_id''s library, per that user''s library_visibility.';

-- ---------------------------------------------------------------------------
-- Friendships RLS
--
-- UPDATE is restricted to the addressee: accepting or declining is their
-- decision, and letting the requester update the row would let them mark their
-- own request accepted. Both parties may DELETE, which covers "cancel my
-- request" and "unfriend" with one policy.
-- ---------------------------------------------------------------------------
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own friendships" ON public.friendships;
CREATE POLICY "Users can view their own friendships"
  ON public.friendships FOR SELECT
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

DROP POLICY IF EXISTS "Users can send friend requests" ON public.friendships;
CREATE POLICY "Users can send friend requests"
  ON public.friendships FOR INSERT
  WITH CHECK (auth.uid() = requester_id);

DROP POLICY IF EXISTS "Addressee can respond to a request" ON public.friendships;
CREATE POLICY "Addressee can respond to a request"
  ON public.friendships FOR UPDATE
  USING (auth.uid() = addressee_id)
  WITH CHECK (auth.uid() = addressee_id);

DROP POLICY IF EXISTS "Either party can remove a friendship" ON public.friendships;
CREATE POLICY "Either party can remove a friendship"
  ON public.friendships FOR DELETE
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- ---------------------------------------------------------------------------
-- Profiles: require a session to browse other people
--
-- Replaces the original policy, which allowed the `anon` role to read every
-- public profile. Usernames are derived from the email local-part on signup, so
-- that made a list of address prefixes world-readable. Friend search only ever
-- runs for a signed-in user, so gating on a session costs the product nothing.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by signed-in users" ON public.profiles;
CREATE POLICY "Profiles are viewable by signed-in users"
  ON public.profiles FOR SELECT
  USING (
    auth.uid() = id
    OR (auth.uid() IS NOT NULL AND is_public = true)
  );

-- ---------------------------------------------------------------------------
-- Friend-visible library reads
--
-- Additive SELECT policies. Postgres ORs multiple permissive policies together,
-- so the existing owner-only policies stay untouched and keep working; these
-- only widen SELECT, and never INSERT / UPDATE / DELETE. A friend can read a
-- library and can never write to it.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  target TEXT;
BEGIN
  FOREACH target IN ARRAY ARRAY[
    'library_entries',
    'episode_progress',
    'season_progress',
    'watch_sessions',
    'reviews',
    'rating_history',
    'library_status_history',
    'activity_log',
    'collections',
    'collection_items'
  ]
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.%I',
      'Friends can view ' || target, target
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT USING (public.can_view_library(user_id))',
      'Friends can view ' || target, target
    );
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON public.friendships TO authenticated;
GRANT EXECUTE ON FUNCTION public.are_friends(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_library(UUID) TO authenticated;
