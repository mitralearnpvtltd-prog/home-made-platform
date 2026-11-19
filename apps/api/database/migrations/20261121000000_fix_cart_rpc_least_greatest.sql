-- =============================================================================
-- Aahaa — fix cart RPC LEAST/GREATEST (Feature 4 follow-up)
-- Migration: 20261121000000_fix_cart_rpc_least_greatest
-- Target: Supabase PostgreSQL
--
-- Root cause (live after COALESCE fix): PostgreSQL LEAST / GREATEST are SQL
-- constructs (like COALESCE), not schema-qualified catalog functions. Applied
-- cart RPCs used pg_catalog.least / pg_catalog.greatest, which fail:
--   function pg_catalog.least(integer, integer) does not exist
--   function pg_catalog.greatest(integer, integer) does not exist
--
-- This migration recreates cart_add_item (and cart_set_item_quantity for
-- consistency) with bare LEAST(...) / GREATEST(...) and bare COALESCE(...).
-- pg_catalog.now() and pg_catalog.jsonb_build_object() remain — those are real
-- catalog functions.
--
-- Non-destructive: CREATE OR REPLACE only. No table/RLS/grant changes on carts.
-- Prerequisites: 20261119000000_carts (+ optional 20261120000000 COALESCE fix).
-- =============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.cart_add_item(
  p_user_id UUID,
  p_kitchen_id UUID,
  p_dish_id UUID,
  p_set_quantity INTEGER DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_cart_id UUID;
  v_current_kitchen UUID;
  v_dish_kitchen UUID;
  v_available BOOLEAN;
  v_qty INTEGER;
BEGIN
  IF p_kitchen_id IS NULL OR p_dish_id IS NULL THEN
    RAISE EXCEPTION 'kitchen_id and dish_id are required' USING ERRCODE = '22023';
  END IF;

  IF p_set_quantity IS NOT NULL AND (p_set_quantity < 1 OR p_set_quantity > 99) THEN
    RAISE EXCEPTION 'quantity must be between 1 and 99' USING ERRCODE = '22023';
  END IF;

  SELECT d.kitchen_id, d.is_available
  INTO v_dish_kitchen, v_available
  FROM public.dishes AS d
  WHERE d.id = p_dish_id
  FOR SHARE;

  IF NOT FOUND OR v_dish_kitchen IS DISTINCT FROM p_kitchen_id THEN
    RAISE EXCEPTION 'dish not found for kitchen' USING ERRCODE = 'P0002';
  END IF;

  -- COALESCE / LEAST / GREATEST are SQL constructs — must not be schema-qualified.
  IF NOT COALESCE(v_available, false) THEN
    RAISE EXCEPTION 'dish is unavailable' USING ERRCODE = '22023';
  END IF;

  v_cart_id := public.cart_lock_active_cart(p_user_id);

  SELECT c.kitchen_id INTO v_current_kitchen
  FROM public.carts AS c
  WHERE c.id = v_cart_id;

  IF v_current_kitchen IS DISTINCT FROM p_kitchen_id THEN
    DELETE FROM public.cart_items AS ci
    WHERE ci.cart_id = v_cart_id;

    UPDATE public.carts AS c
    SET kitchen_id = p_kitchen_id
    WHERE c.id = v_cart_id;
  END IF;

  IF p_set_quantity IS NULL THEN
    INSERT INTO public.cart_items (cart_id, dish_id, quantity)
    VALUES (v_cart_id, p_dish_id, 1)
    ON CONFLICT (cart_id, dish_id) DO UPDATE
      SET quantity = LEAST(99, public.cart_items.quantity + 1),
          updated_at = pg_catalog.now();
  ELSE
    v_qty := LEAST(99, GREATEST(1, p_set_quantity));
    INSERT INTO public.cart_items (cart_id, dish_id, quantity)
    VALUES (v_cart_id, p_dish_id, v_qty)
    ON CONFLICT (cart_id, dish_id) DO UPDATE
      SET quantity = v_qty,
          updated_at = pg_catalog.now();
  END IF;

  RETURN v_cart_id;
END;
$$;

COMMENT ON FUNCTION public.cart_add_item(UUID, UUID, UUID, INTEGER) IS
  'Atomically locks cart, switches kitchen if needed, upserts dish qty (increment or set), caps at 99. service_role only.';

CREATE OR REPLACE FUNCTION public.cart_set_item_quantity(
  p_user_id UUID,
  p_item_id UUID,
  p_quantity INTEGER
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_cart_id UUID;
  v_dish_id UUID;
  v_available BOOLEAN;
  v_status TEXT;
BEGIN
  IF p_quantity IS NULL OR p_quantity < 0 OR p_quantity > 99 THEN
    RAISE EXCEPTION 'quantity must be between 0 and 99' USING ERRCODE = '22023';
  END IF;

  v_cart_id := public.cart_lock_active_cart(p_user_id);

  SELECT ci.dish_id
  INTO v_dish_id
  FROM public.cart_items AS ci
  WHERE ci.id = p_item_id
    AND ci.cart_id = v_cart_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'cart item not found' USING ERRCODE = 'P0002';
  END IF;

  IF p_quantity = 0 THEN
    DELETE FROM public.cart_items AS ci
    WHERE ci.id = p_item_id
      AND ci.cart_id = v_cart_id;
    v_status := 'removed';
  ELSE
    SELECT d.is_available INTO v_available
    FROM public.dishes AS d
    WHERE d.id = v_dish_id
    FOR SHARE;

    IF NOT FOUND OR NOT COALESCE(v_available, false) THEN
      DELETE FROM public.cart_items AS ci
      WHERE ci.id = p_item_id
        AND ci.cart_id = v_cart_id;
      v_status := 'removed_unavailable';
    ELSE
      UPDATE public.cart_items AS ci
      SET quantity = p_quantity,
          updated_at = pg_catalog.now()
      WHERE ci.id = p_item_id
        AND ci.cart_id = v_cart_id;
      v_status := 'updated';
    END IF;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.cart_items AS ci
    WHERE ci.cart_id = v_cart_id
  ) THEN
    UPDATE public.carts AS c
    SET kitchen_id = NULL
    WHERE c.id = v_cart_id;
  END IF;

  RETURN pg_catalog.jsonb_build_object(
    'cart_id', v_cart_id,
    'status', v_status
  );
END;
$$;

COMMENT ON FUNCTION public.cart_set_item_quantity(UUID, UUID, INTEGER) IS
  'Atomically sets cart item quantity (0 removes). Unavailable dishes are removed with status removed_unavailable (no rollback). service_role only.';

REVOKE ALL ON FUNCTION public.cart_add_item(UUID, UUID, UUID, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cart_set_item_quantity(UUID, UUID, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cart_add_item(UUID, UUID, UUID, INTEGER) FROM anon;
REVOKE ALL ON FUNCTION public.cart_set_item_quantity(UUID, UUID, INTEGER) FROM anon;
REVOKE ALL ON FUNCTION public.cart_add_item(UUID, UUID, UUID, INTEGER) FROM authenticated;
REVOKE ALL ON FUNCTION public.cart_set_item_quantity(UUID, UUID, INTEGER) FROM authenticated;

GRANT EXECUTE ON FUNCTION public.cart_add_item(UUID, UUID, UUID, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.cart_set_item_quantity(UUID, UUID, INTEGER) TO service_role;

COMMIT;
