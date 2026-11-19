-- =============================================================================
-- Aahaa — Persist bus number and seat number on orders
-- Migration: 20261127000000_order_bus_seat
-- Target: Supabase PostgreSQL
--
-- Adds optional bus_number and seat_number columns to public.orders and updates
-- public.order_create_from_cart so checkout can snapshot them with the order.
--
-- Pricing source of truth: 20261123000000_order_gst_pricing (NEW checkout model):
--   pickup_service_fee (charged delivery) = INR 0.00
--   tax_amount = GST 18% of items subtotal (rounded to 2 decimals)
--   total = items subtotal + GST
-- UI still shows Delivery Fee list price ₹35 as FREE (not persisted).
--
-- Prerequisites:
--   20261122000000_orders.sql applied
--   20261123000000_order_gst_pricing.sql applied (or apply it immediately before this)
-- =============================================================================

BEGIN;

ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS bus_number TEXT,
    ADD COLUMN IF NOT EXISTS seat_number TEXT;

COMMENT ON COLUMN public.orders.bus_number IS
    'Optional bus number supplied at confirm-pickup checkout.';
COMMENT ON COLUMN public.orders.seat_number IS
    'Optional seat number supplied at confirm-pickup checkout.';

-- Drop previous 12-arg signature so we can add trailing optional args.
DROP FUNCTION IF EXISTS public.order_create_from_cart(
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
);

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
    p_journey_date DATE DEFAULT NULL,
    p_bus_number TEXT DEFAULT NULL,
    p_seat_number TEXT DEFAULT NULL
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

    -- Charged delivery / pickup fee persisted on orders.pickup_service_fee.
    v_pickup_fee NUMERIC(12, 2) := 0.00;
    -- GST 18% of items subtotal (computed after subtotal).
    v_tax NUMERIC(12, 2);
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
    -- GST = round(items subtotal × 18%, 2). Delivery charged = ₹0.
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

    v_tax := round(v_subtotal * 0.18, 2);
    v_total := (v_subtotal + v_pickup_fee + v_tax)::NUMERIC(12, 2);

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

        bus_number,
        seat_number,

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

        NULLIF(trim(COALESCE(p_bus_number, '')), ''),
        NULLIF(trim(COALESCE(p_seat_number, '')), ''),

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
    DATE,
    TEXT,
    TEXT
) IS
    'Atomically creates an order from the active cart. Snapshots item names/prices, applies GST 18% on items subtotal, charges ₹0 delivery (orders.pickup_service_fee), stores optional bus/seat numbers, converts the cart and opens a new empty cart. Idempotent by user and key.';

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
    DATE,
    TEXT,
    TEXT
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
    DATE,
    TEXT,
    TEXT
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
    DATE,
    TEXT,
    TEXT
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
    DATE,
    TEXT,
    TEXT
) TO service_role;

COMMIT;

-- =============================================================================
-- END OF ORDER BUS / SEAT MIGRATION
-- =============================================================================
