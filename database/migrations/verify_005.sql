-- Verifies migration 005 applied correctly. Every row should show PASS.
-- Safe to run repeatedly: reads catalog tables only, changes nothing.

SELECT 'friendships table' AS check_name,
       count(*)::text AS found,
       '1' AS expected,
       CASE WHEN count(*) = 1 THEN 'PASS' ELSE 'FAIL' END AS result
FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'friendships'

UNION ALL
SELECT 'profiles.library_visibility column',
       count(*)::text, '1',
       CASE WHEN count(*) = 1 THEN 'PASS' ELSE 'FAIL' END
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
  AND column_name = 'library_visibility'

UNION ALL
SELECT 'friend-read SELECT policies',
       count(*)::text, '10',
       CASE WHEN count(*) = 10 THEN 'PASS' ELSE 'FAIL' END
FROM pg_policies
WHERE schemaname = 'public' AND policyname LIKE 'Friends can view%'

UNION ALL
SELECT 'helper functions (are_friends, can_view_library)',
       count(*)::text, '2',
       CASE WHEN count(*) = 2 THEN 'PASS' ELSE 'FAIL' END
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('are_friends', 'can_view_library')

UNION ALL
SELECT 'profiles policy now requires a session',
       count(*)::text, '1',
       CASE WHEN count(*) = 1 THEN 'PASS' ELSE 'FAIL' END
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'profiles'
  AND policyname = 'Profiles are viewable by signed-in users'

UNION ALL
SELECT 'old anon-readable profiles policy removed',
       count(*)::text, '0',
       CASE WHEN count(*) = 0 THEN 'PASS' ELSE 'FAIL' END
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'profiles'
  AND policyname = 'Public profiles are viewable by everyone'

UNION ALL
SELECT 'friendships pair uniqueness index',
       count(*)::text, '1',
       CASE WHEN count(*) = 1 THEN 'PASS' ELSE 'FAIL' END
FROM pg_indexes
WHERE schemaname = 'public' AND indexname = 'friendships_pair_idx'

ORDER BY check_name;
