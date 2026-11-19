-- =============================================================================
-- Aahaa — passenger cart / Meal Bag persistence
-- Migration: 20261119000000_carts
-- Target: Supabase PostgreSQL
--
-- Non-destructive:
-- - Creates carts + cart_items only (no drops of existing tables/data).
-- - One active cart per passenger (partial unique index).
-- - Cart items unique on (cart_id, dish_id).
-- - Atomic SECURITY DEFINER RPCs (FOR UPDATE locks, empty search_path).
-- - authenticated: SELECT own rows only (no direct INSERT/UPDATE/DELETE).
-- - service_role: SELECT on cart tables + EXECUTE on RPCs only (no direct table
--   INSERT/UPDATE/DELETE — all mutations go through RPCs).
-- - RPC EXECUTE: service_role only (revoked from PUBLIC, anon, authenticated).
-- Prerequisites: public.set_updated_at(), profiles, kitchens, dishes (init schema).
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. carts
-- -----------------------------------------------------------------------------
CREATE TABLE public.carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  -- Locked to the kitchen of the first added dish; switching kitchens clears items.
  kitchen_id UUID REFERENCES public.kitchens (id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT carts_status_valid CHECK (status IN ('active', 'converted', 'abandoned'))
);

CREATE UNIQUE INDEX carts_one_active_per_user_uidx
  ON public.carts (user_id)
  WHERE status = 'active';

CREATE INDEX carts_user_id_idx ON public.carts (user_id);
CREATE INDEX carts_kitchen_id_idx ON public.carts (kitchen_id);

CREATE TRIGGER carts_set_updated_at
  BEFORE UPDATE ON public.carts
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.carts IS
  'Passenger Meal Bag. At most one row with status=active per user_id.';

-- -----------------------------------------------------------------------------
-- 2. cart_items
-- -----------------------------------------------------------------------------
CREATE TABLE public.cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id UUID NOT NULL REFERENCES public.carts (id) ON DELETE CASCADE,
  dish_id UUID NOT NULL REFERENCES public.dishes (id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT cart_items_quantity_positive CHECK (quantity >= 1 AND quantity <= 99),
  CONSTRAINT cart_items_cart_dish_unique UNIQUE (cart_id, dish_id)
);

CREATE INDEX cart_items_cart_id_idx ON public.cart_items (cart_id);
CREATE INDEX cart_items_dish_id_idx ON public.cart_items (dish_id);

CREATE TRIGGER cart_items_set_updated_at
  BEFORE UPDATE ON public.cart_items
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.cart_items IS
  'Lines in a passenger cart. Prices are never stored — always read from dishes.price.';

-- -----------------------------------------------------------------------------
-- 3. RLS + grants
-- -----------------------------------------------------------------------------
ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.carts FROM PUBLIC;
REVOKE ALL ON TABLE public.cart_items FROM PUBLIC;
REVOKE ALL ON TABLE public.carts FROM anon;
REVOKE ALL ON TABLE public.cart_items FROM anon;
REVOKE ALL ON TABLE public.carts FROM authenticated;
REVOKE ALL ON TABLE public.cart_items FROM authenticated;

-- Owner read (optional). No authenticated mutation grants/policies.
GRANT SELECT ON TABLE public.carts TO authenticated;
GRANT SELECT ON TABLE public.cart_items TO authenticated;

-- Nest reads carts/items after RPC mutations. Table writes go through DEFINER RPCs
-- (function owner privileges). Explicitly strip any inherited/default mutation grants
-- (Supabase often grants ALL on new tables to service_role via default privileges).
GRANT SELECT ON TABLE public.carts TO service_role;
GRANT SELECT ON TABLE public.cart_items TO service_role;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.carts FROM service_role;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.cart_items FROM service_role;
GRANT SELECT ON TABLE public.dishes TO service_role;
GRANT SELECT ON TABLE public.food_categories TO service_role;
GRANT SELECT ON TABLE public.kitchens TO service_role;

DROP POLICY IF EXISTS carts_select_own ON public.carts;
CREATE POLICY carts_select_own
  ON public.carts
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS cart_items_select_own ON public.cart_items;
CREATE POLICY cart_items_select_own
  ON public.cart_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.carts AS c
      WHERE c.id = cart_id
        AND c.user_id = auth.uid()
    )
  );

-- -----------------------------------------------------------------------------
-- 4. Atomic RPCs (SECURITY DEFINER, empty search_path, fully qualified names)
-- -----------------------------------------------------------------------------

-- Lock active cart for user (create if missing). Returns locked cart id.
CREATE OR REPLACE FUNCTION public.cart_lock_active_cart(p_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_cart_id UUID;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'user_id is required' USING ERRCODE = '22023';
  END IF;

  LOOP
    SELECT c.id INTO v_cart_id
    FROM public.carts AS c
    WHERE c.user_id = p_user_id
      AND c.status = 'active'
    FOR UPDATE;

    IF FOUND THEN
      RETURN v_cart_id;
    END IF;

    BEGIN
      INSERT INTO public.carts (user_id, status, kitchen_id)
      VALUES (p_user_id, 'active', NULL)
      RETURNING public.carts.id INTO v_cart_id;

      SELECT c.id INTO v_cart_id
      FROM public.carts AS c
      WHERE c.id = v_cart_id
      FOR UPDATE;

      RETURN v_cart_id;
    EXCEPTION
      WHEN unique_violation THEN
        NULL;
    END;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION public.cart_lock_active_cart(UUID) IS
  'Locks (FOR UPDATE) the passenger active cart, creating it if missing. Callable by service_role only.';

-- Atomically clear items and bind kitchen (or clear kitchen when p_kitchen_id is NULL).
CREATE OR REPLACE FUNCTION public.cart_switch_kitchen(
  p_user_id UUID,
  p_kitchen_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_cart_id UUID;
  v_current_kitchen UUID;
BEGIN
  v_cart_id := public.cart_lock_active_cart(p_user_id);

  SELECT c.kitchen_id INTO v_current_kitchen
  FROM public.carts AS c
  WHERE c.id = v_cart_id;

  IF v_current_kitchen IS NOT DISTINCT FROM p_kitchen_id THEN
    RETURN v_cart_id;
  END IF;

  DELETE FROM public.cart_items AS ci
  WHERE ci.cart_id = v_cart_id;

  UPDATE public.carts AS c
  SET kitchen_id = p_kitchen_id
  WHERE c.id = v_cart_id;

  RETURN v_cart_id;
END;
$$;

COMMENT ON FUNCTION public.cart_switch_kitchen(UUID, UUID) IS
  'Atomically clears cart items and sets kitchen_id under a cart row lock. service_role only.';

-- Add or set a dish quantity atomically (kitchen switch + upsert in one transaction).
-- p_set_quantity NULL => increment by 1 (capped at 99).
-- p_set_quantity >= 1 => set absolute quantity (capped at 99).
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

  -- COALESCE is SQL syntax — must not be schema-qualified.
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

-- Set absolute quantity for an owned cart item (0 deletes). Row-locked.
-- Returns jsonb: { cart_id, status } where status is:
--   'updated' | 'removed' | 'removed_unavailable'
-- Unavailable dishes are deleted successfully (no exception after DELETE),
-- so the removal commits. Nest returns the updated cart (successful removal).
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

    -- COALESCE is SQL syntax — must not be schema-qualified.
    IF NOT FOUND OR NOT COALESCE(v_available, false) THEN
      -- Commit the removal; do not RAISE (would roll back the DELETE).
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

-- Clear all items and kitchen binding under cart lock.
CREATE OR REPLACE FUNCTION public.cart_clear(p_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_cart_id UUID;
BEGIN
  v_cart_id := public.cart_lock_active_cart(p_user_id);

  DELETE FROM public.cart_items AS ci
  WHERE ci.cart_id = v_cart_id;

  UPDATE public.carts AS c
  SET kitchen_id = NULL
  WHERE c.id = v_cart_id;

  RETURN v_cart_id;
END;
$$;

COMMENT ON FUNCTION public.cart_clear(UUID) IS
  'Atomically clears cart items and kitchen_id under a cart row lock. service_role only.';

-- -----------------------------------------------------------------------------
-- 5. Restrict RPC execution to service_role only
-- -----------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.cart_lock_active_cart(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cart_switch_kitchen(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cart_add_item(UUID, UUID, UUID, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cart_set_item_quantity(UUID, UUID, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cart_clear(UUID) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.cart_lock_active_cart(UUID) FROM anon;
REVOKE ALL ON FUNCTION public.cart_switch_kitchen(UUID, UUID) FROM anon;
REVOKE ALL ON FUNCTION public.cart_add_item(UUID, UUID, UUID, INTEGER) FROM anon;
REVOKE ALL ON FUNCTION public.cart_set_item_quantity(UUID, UUID, INTEGER) FROM anon;
REVOKE ALL ON FUNCTION public.cart_clear(UUID) FROM anon;

REVOKE ALL ON FUNCTION public.cart_lock_active_cart(UUID) FROM authenticated;
REVOKE ALL ON FUNCTION public.cart_switch_kitchen(UUID, UUID) FROM authenticated;
REVOKE ALL ON FUNCTION public.cart_add_item(UUID, UUID, UUID, INTEGER) FROM authenticated;
REVOKE ALL ON FUNCTION public.cart_set_item_quantity(UUID, UUID, INTEGER) FROM authenticated;
REVOKE ALL ON FUNCTION public.cart_clear(UUID) FROM authenticated;

GRANT EXECUTE ON FUNCTION public.cart_lock_active_cart(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.cart_switch_kitchen(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.cart_add_item(UUID, UUID, UUID, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.cart_set_item_quantity(UUID, UUID, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.cart_clear(UUID) TO service_role;

COMMIT;
