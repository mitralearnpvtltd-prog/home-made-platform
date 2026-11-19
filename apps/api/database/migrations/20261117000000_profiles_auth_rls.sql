-- =============================================================================
-- Aahaa — profiles auth access for passenger registration / Profile page
-- Migration: 20261117000000_profiles_auth_rls
-- Target: Supabase PostgreSQL
--
-- - Grants authenticated clients access to public.profiles (RLS still applies).
-- - Own-row SELECT / INSERT / UPDATE policies (auth.uid() = id).
-- - Auto-creates a profiles row when auth.users is created (from user metadata).
-- - Does not drop data, weaken other table policies, or grant anon writes.
-- =============================================================================

BEGIN;

GRANT SELECT, INSERT, UPDATE ON TABLE public.profiles TO authenticated;

-- Nest API uses the service-role key; it bypasses RLS but still needs GRANTs.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.profiles TO service_role;

-- Own-row read
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
CREATE POLICY profiles_select_own
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Own-row insert (upsert / first write after signup)
DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;
CREATE POLICY profiles_insert_own
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Own-row update
DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Create profile row for every new Auth user (SECURITY DEFINER bypasses RLS insert).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, email)
  VALUES (
    NEW.id,
    NULLIF(trim(COALESCE(NEW.raw_user_meta_data ->> 'full_name', '')), ''),
    NULLIF(trim(COALESCE(NEW.raw_user_meta_data ->> 'phone', NEW.phone, '')), ''),
    NULLIF(trim(COALESCE(NEW.email, NEW.raw_user_meta_data ->> 'email', '')), '')
  )
  ON CONFLICT (id) DO UPDATE
    SET
      full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
      phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
      email = COALESCE(EXCLUDED.email, public.profiles.email),
      updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

COMMENT ON FUNCTION public.handle_new_user() IS
  'Creates/updates public.profiles when a Supabase Auth user is inserted. Reads full_name/phone/email from auth metadata.';

COMMIT;
