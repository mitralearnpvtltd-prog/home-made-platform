-- =============================================================================
-- Aahaa — auth OTP challenges (AquaSMS)
-- Migration: 20261129000000_auth_otp_challenges
-- Target: Supabase PostgreSQL
--
-- REVIEW BEFORE APPLYING. Do not auto-apply from the app.
--
-- Security model:
--   - Stores otp_hash only (SHA-256 with OTP_HASH_PEPPER on the Nest API).
--     Plaintext OTP is never written to this table.
--   - RLS is ENABLED and FORCED.
--   - No permissive policies for anon / authenticated (default-deny under RLS).
--   - ALL privileges revoked from PUBLIC, anon, authenticated.
--   - Nest API accesses rows only via SUPABASE_SERVICE_ROLE_KEY (service_role),
--     which bypasses RLS by design in Supabase.
--   - Does not alter auth.users, JWT, profiles, carts, or orders.
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.auth_otp_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_e164 text NOT NULL,
  phone10 text NOT NULL,
  purpose text NOT NULL CHECK (purpose IN ('login', 'register')),
  otp_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  attempt_count integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 5,
  consumed_at timestamptz NULL,
  invalidated_at timestamptz NULL,
  request_ip text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT auth_otp_challenges_phone10_len CHECK (char_length(phone10) = 10),
  CONSTRAINT auth_otp_challenges_attempt_bounds CHECK (
    attempt_count >= 0
    AND max_attempts > 0
    AND attempt_count <= max_attempts
  )
);

-- Active challenge lookup used by Nest (latest unconsumed / non-invalidated).
CREATE INDEX IF NOT EXISTS auth_otp_challenges_active_lookup_idx
  ON public.auth_otp_challenges (phone10, purpose, created_at DESC)
  WHERE consumed_at IS NULL AND invalidated_at IS NULL;

-- Supporting indexes requested for phone10 / purpose / created_at queries.
CREATE INDEX IF NOT EXISTS auth_otp_challenges_phone10_idx
  ON public.auth_otp_challenges (phone10);

CREATE INDEX IF NOT EXISTS auth_otp_challenges_purpose_idx
  ON public.auth_otp_challenges (purpose);

CREATE INDEX IF NOT EXISTS auth_otp_challenges_created_at_idx
  ON public.auth_otp_challenges (created_at);

-- Explicit RLS: enable + force (even table owner is subject to RLS unless BYPASSRLS).
ALTER TABLE public.auth_otp_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_otp_challenges FORCE ROW LEVEL SECURITY;

-- Default-deny for client roles: drop EVERY existing policy, then create none.
-- CREATE TABLE IF NOT EXISTS may leave behind unknown permissive policies.
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'auth_otp_challenges'
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.auth_otp_challenges',
      pol.policyname
    );
  END LOOP;
END
$$;

-- Privilege lockdown: clients must not CRUD even if RLS were misconfigured later.
REVOKE ALL ON TABLE public.auth_otp_challenges FROM PUBLIC;
REVOKE ALL ON TABLE public.auth_otp_challenges FROM anon;
REVOKE ALL ON TABLE public.auth_otp_challenges FROM authenticated;

-- Nest service role: revoke then grant only required table privileges.
REVOKE ALL ON TABLE public.auth_otp_challenges FROM service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.auth_otp_challenges TO service_role;

COMMENT ON TABLE public.auth_otp_challenges IS
  'Hashed AquaSMS OTP challenges for login/register. Plaintext OTP is never stored. Nest-only via service_role; RLS forced; no anon/authenticated access.';

COMMENT ON COLUMN public.auth_otp_challenges.otp_hash IS
  'SHA-256 hex digest of phone10|purpose|otp|OTP_HASH_PEPPER. Never store plaintext OTP.';

COMMIT;
