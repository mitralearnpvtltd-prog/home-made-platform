-- =============================================================================
-- Aahaa — Passenger Orders (Feature 5)
-- Migration: 20261122000000_orders
-- Target: Supabase PostgreSQL
--
-- Creates:
--   public.orders
--   public.order_items
--   public.order_number_seq
--   public.order_create_from_cart(...)
--
-- Security:
--   authenticated: SELECT own orders and order items only
--   service_role: SELECT only on order tables; EXECUTE on RPC
--   RPC: SECURITY DEFINER, restricted to service_role
--
-- Pricing (matches apps/web CheckoutTotals / checkoutFees.ts):
--   Pickup service fee: INR 15.00
--   Tax amount:         INR 8.00
--
-- Cart conversion and order creation are atomic.
-- Same-user order requests are serialized using an advisory lock keyed by
-- user id (cart RPCs use row FOR UPDATE only — no advisory key overlap).
-- Dish rows are locked FOR SHARE while pricing/snapshotting so subtotal and
-- line totals cannot diverge under concurrent catalogue edits.
-- Prerequisites: set_updated_at(), profiles, kitchens, dishes (with code),
--   carts, cart_items, cart_lock_active_cart (20261119000000 + fixes).
-- =============================================================================

BEGIN;

-- =============================================================================
-- 1. ORDER NUMBER SEQUENCE
-- =============================================================================

CREATE SEQUENCE IF NOT EXISTS public.order_number_seq
    START WITH 1
    INCREMENT BY 1;

-- =============================================================================
-- 2. ORDERS TABLE
-- =============================================================================

CREATE TABLE public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    order_number TEXT NOT NULL,

    user_id UUID NOT NULL
        REFERENCES public.profiles(id)
        ON DELETE CASCADE,

    kitchen_id UUID NOT NULL
        REFERENCES public.kitchens(id)
        ON DELETE RESTRICT,

    source_cart_id UUID
        REFERENCES public.carts(id)
        ON DELETE SET NULL,

    -- Order lifecycle and payment lifecycle are separate.
    status TEXT NOT NULL DEFAULT 'placed',

    payment_status TEXT NOT NULL DEFAULT 'pending',

    -- Collector and pickup information snapshots.
    collector_name TEXT NOT NULL,
    collector_phone TEXT NOT NULL,

    collection_point TEXT,
    kitchen_note TEXT,
    pickup_note TEXT,

    pickup_stop_name TEXT NOT NULL,
    pickup_time TEXT,

    journey_from TEXT,
    journey_to TEXT,
    journey_date DATE,

    -- Server-calculated amounts.
    subtotal NUMERIC(12, 2) NOT NULL,
    pickup_service_fee NUMERIC(12, 2) NOT NULL,
    tax_amount NUMERIC(12, 2) NOT NULL,
    total NUMERIC(12, 2) NOT NULL,

    currency TEXT NOT NULL DEFAULT 'INR',

    -- Duplicate submission protection.
    idempotency_key TEXT NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT orders_order_number_unique
        UNIQUE (order_number),

    CONSTRAINT orders_user_idempotency_unique
        UNIQUE (user_id, idempotency_key),

    CONSTRAINT orders_status_valid
        CHECK (
            status IN (
                'placed',
                'confirmed',
                'preparing',
                'ready_for_pickup',
                'completed',
                'cancelled'
            )
        ),

    CONSTRAINT orders_payment_status_valid
        CHECK (
            payment_status IN (
                'pending',
                'paid',
                'failed',
                'refunded'
            )
        ),

    CONSTRAINT orders_subtotal_non_negative
        CHECK (subtotal >= 0),

    CONSTRAINT orders_pickup_service_fee_non_negative
        CHECK (pickup_service_fee >= 0),

    CONSTRAINT orders_tax_amount_non_negative
        CHECK (tax_amount >= 0),

    CONSTRAINT orders_total_non_negative
        CHECK (total >= 0),

    CONSTRAINT orders_collector_name_nonempty
        CHECK (char_length(trim(collector_name)) > 0),

    CONSTRAINT orders_collector_phone_nonempty
        CHECK (char_length(trim(collector_phone)) > 0),

    CONSTRAINT orders_pickup_stop_nonempty
        CHECK (char_length(trim(pickup_stop_name)) > 0),

    CONSTRAINT orders_idempotency_nonempty
        CHECK (char_length(trim(idempotency_key)) > 0)
);

CREATE INDEX orders_user_id_created_at_idx
    ON public.orders (user_id, created_at DESC);

CREATE INDEX orders_kitchen_id_idx
    ON public.orders (kitchen_id);

CREATE INDEX orders_status_idx
    ON public.orders (status);

CREATE INDEX orders_payment_status_idx
    ON public.orders (payment_status);

CREATE INDEX orders_source_cart_id_idx
    ON public.orders (source_cart_id);

CREATE TRIGGER orders_set_updated_at
    BEFORE UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.orders IS
    'Passenger orders created from an active cart. Payment remains pending until Feature 6 confirms payment.';

-- =============================================================================
-- 3. ORDER ITEMS — IMMUTABLE PURCHASE SNAPSHOTS
-- =============================================================================

CREATE TABLE public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    order_id UUID NOT NULL
        REFERENCES public.orders(id)
        ON DELETE CASCADE,

    dish_id UUID
        REFERENCES public.dishes(id)
        ON DELETE SET NULL,

    dish_code TEXT NOT NULL,
    dish_name TEXT NOT NULL,

    unit_price NUMERIC(12, 2) NOT NULL,
    quantity INTEGER NOT NULL,
    line_total NUMERIC(12, 2) NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT order_items_quantity_positive
        CHECK (quantity >= 1 AND quantity <= 99),

    CONSTRAINT order_items_unit_price_non_negative
        CHECK (unit_price >= 0),

    CONSTRAINT order_items_line_total_non_negative
        CHECK (line_total >= 0),

    CONSTRAINT order_items_dish_code_nonempty
        CHECK (char_length(trim(dish_code)) > 0),

    CONSTRAINT order_items_dish_name_nonempty
        CHECK (char_length(trim(dish_name)) > 0)
);

CREATE INDEX order_items_order_id_idx
    ON public.order_items (order_id);

CREATE INDEX order_items_dish_id_idx
    ON public.order_items (dish_id);

COMMENT ON TABLE public.order_items IS
    'Order line snapshots. Dish name, code, unit price and line total are frozen at creation.';

-- =============================================================================
-- 4. ROW LEVEL SECURITY AND PRIVILEGES
-- =============================================================================

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Orders: authenticated users can only read their own records.
REVOKE ALL ON TABLE public.orders FROM PUBLIC;
REVOKE ALL ON TABLE public.orders FROM anon;
REVOKE ALL ON TABLE public.orders FROM authenticated;
REVOKE ALL ON TABLE public.orders FROM service_role;

GRANT SELECT ON TABLE public.orders TO authenticated;
GRANT SELECT ON TABLE public.orders TO service_role;

-- Order items: authenticated users can only read items belonging
-- to their own orders.
REVOKE ALL ON TABLE public.order_items FROM PUBLIC;
REVOKE ALL ON TABLE public.order_items FROM anon;
REVOKE ALL ON TABLE public.order_items FROM authenticated;
REVOKE ALL ON TABLE public.order_items FROM service_role;

GRANT SELECT ON TABLE public.order_items TO authenticated;
GRANT SELECT ON TABLE public.order_items TO service_role;

-- Backend enrichment reads kitchen information after order creation.
GRANT SELECT ON TABLE public.kitchens TO service_role;

DROP POLICY IF EXISTS orders_select_own
    ON public.orders;

CREATE POLICY orders_select_own
    ON public.orders
    FOR SELECT
    TO authenticated
    USING (
        auth.uid() = user_id
    );

DROP POLICY IF EXISTS order_items_select_own
    ON public.order_items;

CREATE POLICY order_items_select_own
    ON public.order_items
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.orders AS o
            WHERE o.id = order_items.order_id
              AND o.user_id = auth.uid()
        )
    );

-- =============================================================================
-- 5. ATOMIC CREATE-ORDER-FROM-CART RPC
-- =============================================================================

CREATE OR REPLACE FUNCTION public.order_create_from_cart(
    p_user_id UUID,
    p_idempotency_key TEXT,
    p_collector_name TEXT,
    p_collector_phone TEXT,
    p_collection_point TEXT DEFAULT NULL,
    p_kitchen_note TEXT DEFAULT NULL,
    p_pickup_note TEXT DEFAULT NULL,
    p_pickup_stop_name TEXT DEFAULT NULL,
    p_pickup_time TEXT DEFAULT NULL,
    p_journey_from TEXT DEFAULT NULL,
    p_journey_to TEXT DEFAULT NULL,
    p_journey_date DATE DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$

DECLARE
    v_existing UUID;
    v_cart_id UUID;
    v_kitchen_id UUID;
    v_order_id UUID;

    v_subtotal NUMERIC(12, 2);

    v_pickup_fee NUMERIC(12, 2) := 15.00;
    v_tax NUMERIC(12, 2) := 8.00;
    v_total NUMERIC(12, 2);

    v_order_number TEXT;

    v_item_count INTEGER;
    v_unavailable INTEGER;
    v_wrong_kitchen INTEGER;
    v_missing_code INTEGER;

BEGIN

    -- -------------------------------------------------------------------------
    -- Validate required input.
    -- -------------------------------------------------------------------------

    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'user_id is required'
            USING ERRCODE = '22023';
    END IF;

    IF p_idempotency_key IS NULL
       OR char_length(trim(p_idempotency_key)) = 0 THEN
        RAISE EXCEPTION 'idempotency_key is required'
            USING ERRCODE = '22023';
    END IF;

    IF p_collector_name IS NULL
       OR char_length(trim(p_collector_name)) = 0 THEN
        RAISE EXCEPTION 'collector_name is required'
            USING ERRCODE = '22023';
    END IF;

    IF p_collector_phone IS NULL
       OR char_length(trim(p_collector_phone)) = 0 THEN
        RAISE EXCEPTION 'collector_phone is required'
            USING ERRCODE = '22023';
    END IF;

    IF p_pickup_stop_name IS NULL
       OR char_length(trim(p_pickup_stop_name)) = 0 THEN
        RAISE EXCEPTION 'pickup_stop_name is required'
            USING ERRCODE = '22023';
    END IF;

    -- -------------------------------------------------------------------------
    -- Serialize order creation for this user.
    --
    -- Cart Feature 4 RPCs use row-level FOR UPDATE only (no advisory locks),
    -- so this key space does not collide with cart RPC locking.
    -- Different users can still create orders concurrently.
    -- -------------------------------------------------------------------------

    PERFORM pg_catalog.pg_advisory_xact_lock(
        pg_catalog.hashtextextended(p_user_id::TEXT, 0)
    );

    -- -------------------------------------------------------------------------
    -- Idempotency check AFTER acquiring the user lock.
    -- -------------------------------------------------------------------------

    SELECT o.id
    INTO v_existing
    FROM public.orders AS o
    WHERE o.user_id = p_user_id
      AND o.idempotency_key = trim(p_idempotency_key);

    IF FOUND THEN
        RETURN v_existing;
    END IF;

    -- -------------------------------------------------------------------------
    -- Lock the active cart using the existing Feature 4 RPC
    -- (public.cart_lock_active_cart(UUID) → UUID, FOR UPDATE, create-if-missing).
    -- Concurrent cart_add / cart_set / cart_clear also take this row lock, so
    -- they wait until this transaction commits — no lost mid-order mutations.
    -- -------------------------------------------------------------------------

    v_cart_id := public.cart_lock_active_cart(p_user_id);

    SELECT c.kitchen_id
    INTO v_kitchen_id
    FROM public.carts AS c
    WHERE c.id = v_cart_id
    FOR UPDATE;

    IF NOT FOUND OR v_kitchen_id IS NULL THEN
        RAISE EXCEPTION 'cart is empty'
            USING ERRCODE = '22023';
    END IF;

    -- -------------------------------------------------------------------------
    -- Validate cart contents.
    -- -------------------------------------------------------------------------

    SELECT count(*)::INTEGER
    INTO v_item_count
    FROM public.cart_items AS ci
    WHERE ci.cart_id = v_cart_id;

    IF v_item_count IS NULL OR v_item_count < 1 THEN
        RAISE EXCEPTION 'cart is empty'
            USING ERRCODE = '22023';
    END IF;

    -- Lock dish rows FOR SHARE before availability / price reads so a concurrent
    -- catalogue price edit cannot make header subtotal disagree with snapshots.
    PERFORM 1
    FROM public.cart_items AS ci
    INNER JOIN public.dishes AS d
        ON d.id = ci.dish_id
    WHERE ci.cart_id = v_cart_id
    FOR SHARE OF d;

    -- Check that every dish exists and is available.

    SELECT count(*)::INTEGER
    INTO v_unavailable
    FROM public.cart_items AS ci
    LEFT JOIN public.dishes AS d
        ON d.id = ci.dish_id
    WHERE ci.cart_id = v_cart_id
      AND (
          d.id IS NULL
          OR NOT COALESCE(d.is_available, false)
      );

    IF v_unavailable > 0 THEN
        RAISE EXCEPTION 'one or more dishes are unavailable'
            USING ERRCODE = '22023';
    END IF;

    -- dishes.code is nullable in catalogue schema; order_items.require non-empty code.
    SELECT count(*)::INTEGER
    INTO v_missing_code
    FROM public.cart_items AS ci
    INNER JOIN public.dishes AS d
        ON d.id = ci.dish_id
    WHERE ci.cart_id = v_cart_id
      AND (
          d.code IS NULL
          OR char_length(trim(d.code)) = 0
      );

    IF v_missing_code > 0 THEN
        RAISE EXCEPTION 'one or more dishes are unavailable'
            USING ERRCODE = '22023';
    END IF;

    -- Check that all dishes belong to the cart kitchen.

    SELECT count(*)::INTEGER
    INTO v_wrong_kitchen
    FROM public.cart_items AS ci
    INNER JOIN public.dishes AS d
        ON d.id = ci.dish_id
    WHERE ci.cart_id = v_cart_id
      AND d.kitchen_id IS DISTINCT FROM v_kitchen_id;

    IF v_wrong_kitchen > 0 THEN
        RAISE EXCEPTION 'cart contains dishes from another kitchen'
            USING ERRCODE = '22023';
    END IF;

    -- -------------------------------------------------------------------------
    -- Calculate authoritative subtotal using current database prices.
    -- -------------------------------------------------------------------------

    SELECT
        COALESCE(
            sum(d.price * ci.quantity),
            0
        )::NUMERIC(12, 2)
    INTO v_subtotal
    FROM public.cart_items AS ci
    INNER JOIN public.dishes AS d
        ON d.id = ci.dish_id
    WHERE ci.cart_id = v_cart_id;

    v_total := (
        v_subtotal + v_pickup_fee + v_tax
    )::NUMERIC(12, 2);

    -- -------------------------------------------------------------------------
    -- Generate unique order number.
    -- -------------------------------------------------------------------------

    v_order_number :=
        'AHA-'
        || pg_catalog.to_char(
            pg_catalog.timezone('UTC', pg_catalog.now()),
            'YYYYMMDD'
        )
        || '-'
        || pg_catalog.lpad(
            pg_catalog.nextval(
                'public.order_number_seq'::REGCLASS
            )::TEXT,
            6,
            '0'
        );

    -- -------------------------------------------------------------------------
    -- Insert order header.
    -- -------------------------------------------------------------------------

    INSERT INTO public.orders (
        order_number,
        user_id,
        kitchen_id,
        source_cart_id,

        status,
        payment_status,

        collector_name,
        collector_phone,

        collection_point,
        kitchen_note,
        pickup_note,

        pickup_stop_name,
        pickup_time,

        journey_from,
        journey_to,
        journey_date,

        subtotal,
        pickup_service_fee,
        tax_amount,
        total,

        idempotency_key
    )
    VALUES (
        v_order_number,
        p_user_id,
        v_kitchen_id,
        v_cart_id,

        'placed',
        'pending',

        trim(p_collector_name),
        trim(p_collector_phone),

        NULLIF(trim(COALESCE(p_collection_point, '')), ''),
        NULLIF(trim(COALESCE(p_kitchen_note, '')), ''),
        NULLIF(trim(COALESCE(p_pickup_note, '')), ''),

        trim(p_pickup_stop_name),
        NULLIF(trim(COALESCE(p_pickup_time, '')), ''),

        NULLIF(trim(COALESCE(p_journey_from, '')), ''),
        NULLIF(trim(COALESCE(p_journey_to, '')), ''),
        p_journey_date,

        v_subtotal,
        v_pickup_fee,
        v_tax,
        v_total,

        trim(p_idempotency_key)
    )
    RETURNING id INTO v_order_id;

    -- -------------------------------------------------------------------------
    -- Insert immutable order item snapshots (same locked dish prices).
    -- -------------------------------------------------------------------------

    INSERT INTO public.order_items (
        order_id,
        dish_id,
        dish_code,
        dish_name,
        unit_price,
        quantity,
        line_total
    )
    SELECT
        v_order_id,
        d.id,
        trim(d.code),
        d.name,
        d.price::NUMERIC(12, 2),
        ci.quantity,
        (d.price * ci.quantity)::NUMERIC(12, 2)
    FROM public.cart_items AS ci
    INNER JOIN public.dishes AS d
        ON d.id = ci.dish_id
    WHERE ci.cart_id = v_cart_id
    ORDER BY ci.created_at ASC, ci.id ASC;

    -- -------------------------------------------------------------------------
    -- Convert the cart only after the order and all items are inserted.
    -- -------------------------------------------------------------------------

    DELETE FROM public.cart_items AS ci
    WHERE ci.cart_id = v_cart_id;

    UPDATE public.carts AS c
    SET
        status = 'converted',
        kitchen_id = NULL
    WHERE c.id = v_cart_id;

    -- Create a new empty active cart for subsequent browsing.
    -- Must succeed; a uniqueness violation rolls back the entire order
    -- (do not swallow — otherwise the passenger would have no active cart).
    INSERT INTO public.carts (
        user_id,
        status,
        kitchen_id
    )
    VALUES (
        p_user_id,
        'active',
        NULL
    );

    RETURN v_order_id;

EXCEPTION
    WHEN unique_violation THEN
        -- Only treat as idempotent replay when this user's key already exists.
        -- Any other unique_violation (e.g. active-cart insert) must re-raise so
        -- the whole transaction rolls back.
        SELECT o.id INTO v_existing
        FROM public.orders AS o
        WHERE o.user_id = p_user_id
          AND o.idempotency_key = trim(p_idempotency_key);

        IF FOUND THEN
            RETURN v_existing;
        END IF;
        RAISE;

END;

$function$;

COMMENT ON FUNCTION public.order_create_from_cart(
    UUID,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    DATE
) IS
    'Atomically creates an order from the active cart, snapshots item names and prices, applies server-side fees, converts the cart and opens a new empty cart. Same-user calls are serialized and requests are idempotent by user and key.';

-- =============================================================================
-- 6. RPC EXECUTION PERMISSIONS
-- =============================================================================

REVOKE ALL ON FUNCTION public.order_create_from_cart(
    UUID,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    DATE
) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.order_create_from_cart(
    UUID,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    DATE
) FROM anon;

REVOKE ALL ON FUNCTION public.order_create_from_cart(
    UUID,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    DATE
) FROM authenticated;

GRANT EXECUTE ON FUNCTION public.order_create_from_cart(
    UUID,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    DATE
) TO service_role;

COMMIT;

-- =============================================================================
-- END OF FEATURE 5 ORDERS MIGRATION
-- =============================================================================
