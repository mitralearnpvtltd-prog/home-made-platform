-- =============================================================================
-- Aahaa — profiles grants + backfill missing rows for existing auth.users
-- Migration: 20261118000000_backfill_missing_profiles
-- Target: Supabase PostgreSQL
--
-- Non-destructive:
-- - Grants table privileges required by API (service_role) and RLS clients
--   (authenticated). Does not revoke anything.
-- - Inserts profiles only for auth.users rows that have no profiles row.
-- - ON CONFLICT DO NOTHING (never overwrites existing profile data).
-- - Does not delete, drop, or alter columns.
-- =============================================================================

BEGIN;

-- Authenticated clients read/write own row under RLS policies.
GRANT SELECT, INSERT, UPDATE ON TABLE public.profiles TO authenticated;

-- Service role (Nest API admin client) bypasses RLS but still needs table grants.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.profiles TO service_role;

INSERT INTO public.profiles (id, full_name, phone, email)
SELECT
  u.id,
  NULLIF(trim(COALESCE(u.raw_user_meta_data ->> 'full_name', '')), ''),
  NULLIF(trim(COALESCE(u.raw_user_meta_data ->> 'phone', u.phone, '')), ''),
  NULLIF(trim(COALESCE(u.email, u.raw_user_meta_data ->> 'email', '')), '')
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1
  FROM public.profiles p
  WHERE p.id = u.id
)
ON CONFLICT (id) DO NOTHING;

COMMIT;
