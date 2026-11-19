-- =============================================================================
-- Aahaa — grant Nest service_role read access to roles / user_roles
-- Migration: 20261133000000_roles_user_roles_service_role_grants
-- Target: Supabase PostgreSQL
--
-- Root cause fixed:
--   AdminGuard and related Nest checks query public.roles / public.user_roles
--   with SUPABASE_SERVICE_ROLE_KEY. Those tables had RLS enabled but never
--   received table GRANTs for service_role, so PostgREST returned
--   "permission denied" (SQLSTATE 42501). AdminGuard previously treated any
--   query error as Forbidden ("Administrator access required"), masking the
--   real failure even when user_roles correctly contained an admin assignment.
--
-- Security:
--   - SELECT only for service_role (Nest after AuthGuard + AdminGuard).
--   - No anon / authenticated GRANTs (role assignment stays server-side).
--   - Does not grant INSERT/UPDATE/DELETE; does not weaken RLS policies.
--   - Does not auto-assign admin to any profile.
-- =============================================================================

BEGIN;

GRANT SELECT ON TABLE public.roles TO service_role;
GRANT SELECT ON TABLE public.user_roles TO service_role;

COMMIT;
