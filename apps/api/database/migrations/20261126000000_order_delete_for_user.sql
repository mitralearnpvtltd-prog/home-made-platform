-- =============================================================================
-- Migration: 20261126000000_order_delete_for_user
-- Purpose: Allow authenticated backend (service_role) to delete a single order
--          owned by a specific user via SECURITY DEFINER RPC.
--
-- Scope:
--   - Adds public.order_delete_for_user(p_user_id, p_order_id)
--   - Deletes only the matching orders row (user_id + id)
--   - Associated order_items are removed by existing ON DELETE CASCADE
--
-- Does NOT:
--   - Grant DELETE on tables to authenticated clients
--   - Weaken SELECT RLS policies
--   - Truncate or bulk-delete orders
--
-- Apply manually in Supabase SQL editor after review.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.order_delete_for_user(
    p_user_id UUID,
    p_order_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_deleted INTEGER := 0;
BEGIN
    IF p_user_id IS NULL OR p_order_id IS NULL THEN
        RAISE EXCEPTION 'user_id and order_id are required';
    END IF;

    DELETE FROM public.orders AS o
    WHERE o.id = p_order_id
      AND o.user_id = p_user_id;

    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RETURN v_deleted > 0;
END;
$$;

COMMENT ON FUNCTION public.order_delete_for_user(UUID, UUID) IS
    'Deletes one order owned by p_user_id. order_items cascade via FK. Returns true when a row was deleted.';

REVOKE ALL ON FUNCTION public.order_delete_for_user(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.order_delete_for_user(UUID, UUID) FROM anon;
REVOKE ALL ON FUNCTION public.order_delete_for_user(UUID, UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.order_delete_for_user(UUID, UUID) TO service_role;
