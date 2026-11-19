-- =============================================================================
-- Migration: 20261128000000_cashfree_payments
-- Purpose: Store Cashfree payment references on orders and allow the Nest API
--          (service_role) to attach sessions / apply verified payment statuses
--          via SECURITY DEFINER RPCs. Also records webhook deliveries for
--          idempotent processing.
--
-- Scope:
--   - Adds Cashfree reference columns on public.orders
--   - Creates public.payment_webhook_events (idempotency)
--   - Adds order_attach_cashfree_session(...)
--   - Adds order_apply_payment_result(...)
--   - Adds payment_webhook_event_record(...)
--
-- Does NOT:
--   - Change GST / delivery fee pricing
--   - Grant UPDATE/INSERT on orders to authenticated clients
--   - Mark any order paid automatically
--
-- Apply manually in Supabase SQL editor after review. Do not auto-apply.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. ORDER COLUMNS FOR CASHFREE
-- -----------------------------------------------------------------------------

ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS cashfree_order_id TEXT,
    ADD COLUMN IF NOT EXISTS cashfree_cf_order_id TEXT,
    ADD COLUMN IF NOT EXISTS cashfree_payment_session_id TEXT,
    ADD COLUMN IF NOT EXISTS cashfree_payment_id TEXT,
    ADD COLUMN IF NOT EXISTS payment_session_created_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS payment_verified_at TIMESTAMPTZ;

COMMENT ON COLUMN public.orders.cashfree_order_id IS
    'Merchant order_id sent to Cashfree (unique per payment attempt).';
COMMENT ON COLUMN public.orders.cashfree_cf_order_id IS
    'Cashfree internal cf_order_id when returned by the PG.';
COMMENT ON COLUMN public.orders.cashfree_payment_session_id IS
    'Latest Cashfree payment_session_id for hosted checkout.';
COMMENT ON COLUMN public.orders.cashfree_payment_id IS
    'Latest Cashfree cf_payment_id after a payment attempt.';
COMMENT ON COLUMN public.orders.payment_session_created_at IS
    'When the latest Cashfree payment session was attached.';
COMMENT ON COLUMN public.orders.payment_verified_at IS
    'When Aahaa last applied a backend-verified payment result.';

CREATE UNIQUE INDEX IF NOT EXISTS orders_cashfree_order_id_uidx
    ON public.orders (cashfree_order_id)
    WHERE cashfree_order_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS orders_cashfree_payment_id_idx
    ON public.orders (cashfree_payment_id)
    WHERE cashfree_payment_id IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 2. WEBHOOK EVENT IDEMPOTENCY
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.payment_webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL DEFAULT 'cashfree',
    event_id TEXT NOT NULL,
    event_type TEXT,
    order_id UUID
        REFERENCES public.orders(id)
        ON DELETE SET NULL,
    cashfree_order_id TEXT,
    payload_hash TEXT NOT NULL,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT payment_webhook_events_provider_nonempty
        CHECK (char_length(trim(provider)) > 0),
    CONSTRAINT payment_webhook_events_event_id_nonempty
        CHECK (char_length(trim(event_id)) > 0),
    CONSTRAINT payment_webhook_events_payload_hash_nonempty
        CHECK (char_length(trim(payload_hash)) > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS payment_webhook_events_provider_event_uidx
    ON public.payment_webhook_events (provider, event_id);

CREATE INDEX IF NOT EXISTS payment_webhook_events_order_id_idx
    ON public.payment_webhook_events (order_id);

COMMENT ON TABLE public.payment_webhook_events IS
    'Idempotent record of processed payment provider webhooks.';

ALTER TABLE public.payment_webhook_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.payment_webhook_events FROM PUBLIC;
REVOKE ALL ON TABLE public.payment_webhook_events FROM anon;
REVOKE ALL ON TABLE public.payment_webhook_events FROM authenticated;
REVOKE ALL ON TABLE public.payment_webhook_events FROM service_role;

GRANT SELECT ON TABLE public.payment_webhook_events TO service_role;

-- -----------------------------------------------------------------------------
-- 3. RPC: ATTACH CASHFREE SESSION TO AN UNPAID ORDER
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.order_attach_cashfree_session(
    p_user_id UUID,
    p_order_id UUID,
    p_cashfree_order_id TEXT,
    p_payment_session_id TEXT,
    p_cashfree_cf_order_id TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_updated INTEGER := 0;
BEGIN
    IF p_user_id IS NULL OR p_order_id IS NULL THEN
        RAISE EXCEPTION 'user_id and order_id are required';
    END IF;
    IF p_cashfree_order_id IS NULL OR char_length(trim(p_cashfree_order_id)) = 0 THEN
        RAISE EXCEPTION 'cashfree_order_id is required';
    END IF;
    IF p_payment_session_id IS NULL OR char_length(trim(p_payment_session_id)) = 0 THEN
        RAISE EXCEPTION 'payment_session_id is required';
    END IF;

    UPDATE public.orders AS o
    SET
        cashfree_order_id = trim(p_cashfree_order_id),
        cashfree_payment_session_id = trim(p_payment_session_id),
        cashfree_cf_order_id = COALESCE(NULLIF(trim(p_cashfree_cf_order_id), ''), o.cashfree_cf_order_id),
        payment_session_created_at = now()
    WHERE o.id = p_order_id
      AND o.user_id = p_user_id
      AND o.payment_status IN ('pending', 'failed');

    GET DIAGNOSTICS v_updated = ROW_COUNT;
    RETURN v_updated > 0;
END;
$$;

COMMENT ON FUNCTION public.order_attach_cashfree_session(UUID, UUID, TEXT, TEXT, TEXT) IS
    'Stores the latest Cashfree session on an unpaid/failed order owned by p_user_id.';

REVOKE ALL ON FUNCTION public.order_attach_cashfree_session(UUID, UUID, TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.order_attach_cashfree_session(UUID, UUID, TEXT, TEXT, TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.order_attach_cashfree_session(UUID, UUID, TEXT, TEXT, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.order_attach_cashfree_session(UUID, UUID, TEXT, TEXT, TEXT) TO service_role;

-- -----------------------------------------------------------------------------
-- 4. RPC: APPLY BACKEND-VERIFIED PAYMENT RESULT
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.order_apply_payment_result(
    p_order_id UUID,
    p_payment_status TEXT,
    p_cashfree_order_id TEXT DEFAULT NULL,
    p_cashfree_payment_id TEXT DEFAULT NULL,
    p_cashfree_cf_order_id TEXT DEFAULT NULL,
    p_expected_total NUMERIC DEFAULT NULL,
    p_expected_currency TEXT DEFAULT 'INR'
)
RETURNS TABLE (
    applied BOOLEAN,
    order_id UUID,
    payment_status TEXT,
    already_paid BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_order public.orders%ROWTYPE;
    v_new_status TEXT;
BEGIN
    IF p_order_id IS NULL THEN
        RAISE EXCEPTION 'order_id is required';
    END IF;

    v_new_status := lower(trim(p_payment_status));
    IF v_new_status NOT IN ('pending', 'paid', 'failed', 'refunded') THEN
        RAISE EXCEPTION 'invalid payment_status: %', p_payment_status;
    END IF;

    SELECT *
    INTO v_order
    FROM public.orders AS o
    WHERE o.id = p_order_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN QUERY SELECT false, p_order_id, NULL::TEXT, false;
        RETURN;
    END IF;

    IF p_expected_currency IS NOT NULL
       AND upper(trim(p_expected_currency)) <> upper(trim(v_order.currency)) THEN
        RAISE EXCEPTION 'currency mismatch for order %', p_order_id;
    END IF;

    IF p_expected_total IS NOT NULL
       AND round(p_expected_total::numeric, 2) <> round(v_order.total::numeric, 2) THEN
        RAISE EXCEPTION 'amount mismatch for order %', p_order_id;
    END IF;

    -- Never downgrade a paid order via webhook/verify retries.
    IF v_order.payment_status = 'paid' THEN
        RETURN QUERY SELECT false, v_order.id, v_order.payment_status, true;
        RETURN;
    END IF;

    IF p_cashfree_order_id IS NOT NULL
       AND v_order.cashfree_order_id IS NOT NULL
       AND trim(p_cashfree_order_id) <> trim(v_order.cashfree_order_id)
       AND position(v_order.id::text in trim(p_cashfree_order_id)) = 0 THEN
        -- Allow retry merchant order ids that contain the Aahaa order UUID.
        IF position(replace(v_order.id::text, '-', '') in replace(trim(p_cashfree_order_id), '-', '')) = 0 THEN
            RAISE EXCEPTION 'cashfree_order_id does not belong to order %', p_order_id;
        END IF;
    END IF;

    UPDATE public.orders AS o
    SET
        payment_status = v_new_status,
        cashfree_order_id = COALESCE(NULLIF(trim(p_cashfree_order_id), ''), o.cashfree_order_id),
        cashfree_payment_id = COALESCE(NULLIF(trim(p_cashfree_payment_id), ''), o.cashfree_payment_id),
        cashfree_cf_order_id = COALESCE(NULLIF(trim(p_cashfree_cf_order_id), ''), o.cashfree_cf_order_id),
        payment_verified_at = CASE
            WHEN v_new_status IN ('paid', 'failed', 'refunded') THEN now()
            ELSE o.payment_verified_at
        END,
        status = CASE
            WHEN v_new_status = 'paid' AND o.status = 'placed' THEN 'confirmed'
            ELSE o.status
        END
    WHERE o.id = p_order_id;

    RETURN QUERY SELECT true, p_order_id, v_new_status, false;
END;
$$;

COMMENT ON FUNCTION public.order_apply_payment_result(UUID, TEXT, TEXT, TEXT, TEXT, NUMERIC, TEXT) IS
    'Applies a backend-verified Cashfree payment result. Paid orders are never downgraded.';

REVOKE ALL ON FUNCTION public.order_apply_payment_result(UUID, TEXT, TEXT, TEXT, TEXT, NUMERIC, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.order_apply_payment_result(UUID, TEXT, TEXT, TEXT, TEXT, NUMERIC, TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.order_apply_payment_result(UUID, TEXT, TEXT, TEXT, TEXT, NUMERIC, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.order_apply_payment_result(UUID, TEXT, TEXT, TEXT, TEXT, NUMERIC, TEXT) TO service_role;

-- -----------------------------------------------------------------------------
-- 5. RPC: RECORD WEBHOOK EVENT (IDEMPOTENT)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.payment_webhook_event_record(
    p_provider TEXT,
    p_event_id TEXT,
    p_event_type TEXT DEFAULT NULL,
    p_order_id UUID DEFAULT NULL,
    p_cashfree_order_id TEXT DEFAULT NULL,
    p_payload_hash TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_inserted INTEGER := 0;
BEGIN
    IF p_provider IS NULL OR char_length(trim(p_provider)) = 0 THEN
        RAISE EXCEPTION 'provider is required';
    END IF;
    IF p_event_id IS NULL OR char_length(trim(p_event_id)) = 0 THEN
        RAISE EXCEPTION 'event_id is required';
    END IF;
    IF p_payload_hash IS NULL OR char_length(trim(p_payload_hash)) = 0 THEN
        RAISE EXCEPTION 'payload_hash is required';
    END IF;

    INSERT INTO public.payment_webhook_events (
        provider,
        event_id,
        event_type,
        order_id,
        cashfree_order_id,
        payload_hash
    )
    VALUES (
        trim(p_provider),
        trim(p_event_id),
        NULLIF(trim(p_event_type), ''),
        p_order_id,
        NULLIF(trim(p_cashfree_order_id), ''),
        trim(p_payload_hash)
    )
    ON CONFLICT (provider, event_id) DO NOTHING;

    GET DIAGNOSTICS v_inserted = ROW_COUNT;
    RETURN v_inserted > 0;
END;
$$;

COMMENT ON FUNCTION public.payment_webhook_event_record(TEXT, TEXT, TEXT, UUID, TEXT, TEXT) IS
    'Inserts a webhook event once. Returns false when the event_id was already processed.';

REVOKE ALL ON FUNCTION public.payment_webhook_event_record(TEXT, TEXT, TEXT, UUID, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.payment_webhook_event_record(TEXT, TEXT, TEXT, UUID, TEXT, TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.payment_webhook_event_record(TEXT, TEXT, TEXT, UUID, TEXT, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.payment_webhook_event_record(TEXT, TEXT, TEXT, UUID, TEXT, TEXT) TO service_role;
