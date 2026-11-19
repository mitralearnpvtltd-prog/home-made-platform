-- =============================================================================
-- Aahaa — locations active SELECT policy
-- Migration: 20261113000000_locations_active_select_policy
-- Target: Supabase PostgreSQL
--
-- Allows anon and authenticated roles to read active catalogue rows only.
-- Does not disable RLS. Does not grant INSERT, UPDATE, or DELETE.
-- =============================================================================

CREATE POLICY locations_select_active
  ON public.locations
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

COMMENT ON POLICY locations_select_active ON public.locations IS
  'Allow anon and authenticated clients to read active locations only. Writes remain denied.';
