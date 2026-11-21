-- Aahaa — durable payment-confirmation notification outbox.
-- Adds a transactional event at the order/payment state transition and
-- idempotent, service-role-only outbox processing.

BEGIN;

CREATE TABLE public.notification_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key TEXT NOT NULL UNIQUE
    CONSTRAINT notification_outbox_event_key_check
      CHECK (char_length(btrim(event_key)) BETWEEN 1 AND 160),
  event_type TEXT NOT NULL
    CONSTRAINT notification_outbox_event_type_check
      CHECK (event_type IN ('payment_confirmed')),
  order_id UUID NOT NULL,
  recipient_user_id UUID NOT NULL
    REFERENCES public.profiles (id) ON DELETE CASCADE,
  order_number TEXT NOT NULL
    CONSTRAINT notification_outbox_order_number_check
      CHECK (char_length(btrim(order_number)) BETWEEN 1 AND 80),
  order_updates_enabled_at_event BOOLEAN NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CONSTRAINT notification_outbox_status_check
      CHECK (status IN ('pending', 'processing', 'delivered', 'suppressed', 'dead_letter')),
  attempts INTEGER NOT NULL DEFAULT 0
    CONSTRAINT notification_outbox_attempts_check
      CHECK (attempts >= 0),
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  claim_token UUID,
  lease_expires_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  CONSTRAINT notification_outbox_claim_state_check
    CHECK (
      (status = 'processing' AND claim_token IS NOT NULL
        AND lease_expires_at IS NOT NULL AND completed_at IS NULL)
      OR
      (status = 'pending' AND claim_token IS NULL
        AND lease_expires_at IS NULL AND completed_at IS NULL)
      OR
      (status IN ('delivered', 'suppressed', 'dead_letter')
        AND claim_token IS NULL AND lease_expires_at IS NULL
        AND completed_at IS NOT NULL)
    )
);

CREATE INDEX notification_outbox_pending_idx
  ON public.notification_outbox (next_attempt_at, created_at, id)
  WHERE status = 'pending';
CREATE INDEX notification_outbox_expired_lease_idx
  ON public.notification_outbox (lease_expires_at, created_at, id)
  WHERE status = 'processing';

ALTER TABLE public.notification_outbox ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public.notification_outbox
  FROM PUBLIC, anon, authenticated, service_role;

ALTER TABLE public.notifications
  ADD COLUMN source_event_key TEXT
    CONSTRAINT notifications_source_event_key_check
      CHECK (
        source_event_key IS NULL
        OR char_length(btrim(source_event_key)) BETWEEN 1 AND 160
      );
CREATE UNIQUE INDEX notifications_source_event_key_uidx
  ON public.notifications (source_event_key);

-- Claim pending work, or recover claims whose worker lease expired.
CREATE OR REPLACE FUNCTION public.claim_payment_notification_outbox(
  p_batch_size INTEGER,
  p_lease_seconds INTEGER
)
RETURNS TABLE (
  id UUID,
  event_key TEXT,
  event_type TEXT,
  order_id UUID,
  recipient_user_id UUID,
  order_number TEXT,
  order_updates_enabled_at_event BOOLEAN,
  attempts INTEGER,
  claim_token UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  IF p_batch_size IS NULL OR p_batch_size < 1 OR p_batch_size > 100 THEN
    RAISE EXCEPTION 'batch size must be between 1 and 100';
  END IF;
  IF p_lease_seconds IS NULL OR p_lease_seconds < 30 OR p_lease_seconds > 900 THEN
    RAISE EXCEPTION 'lease duration must be between 30 and 900 seconds';
  END IF;

  WITH exhausted AS (
    SELECT outbox.id
    FROM public.notification_outbox AS outbox
    WHERE outbox.status = 'processing'
      AND outbox.attempts >= 10
      AND outbox.lease_expires_at <= pg_catalog.now()
    ORDER BY outbox.lease_expires_at, outbox.created_at, outbox.id
    LIMIT p_batch_size
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.notification_outbox AS outbox
  SET
    status = 'dead_letter',
    claim_token = NULL,
    lease_expires_at = NULL,
    last_error = COALESCE(
      NULLIF(BTRIM(outbox.last_error), ''),
      'Maximum of 10 attempts exhausted after expired worker leases'
    ),
    completed_at = pg_catalog.now(),
    updated_at = pg_catalog.now()
  FROM exhausted
  WHERE outbox.id = exhausted.id;

  RETURN QUERY
  WITH candidates AS (
    SELECT outbox.id
    FROM public.notification_outbox AS outbox
    WHERE
      (outbox.status = 'pending'
        AND outbox.next_attempt_at <= pg_catalog.now())
      OR
      (outbox.status = 'processing'
        AND outbox.attempts < 10
        AND outbox.lease_expires_at <= pg_catalog.now())
    ORDER BY outbox.created_at, outbox.id
    LIMIT p_batch_size
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.notification_outbox AS outbox
  SET
    status = 'processing',
    claim_token = pg_catalog.gen_random_uuid(),
    lease_expires_at = pg_catalog.now()
      + pg_catalog.make_interval(secs => p_lease_seconds),
    attempts = outbox.attempts + 1,
    updated_at = pg_catalog.now()
  FROM candidates
  WHERE outbox.id = candidates.id
  RETURNING
    outbox.id,
    outbox.event_key,
    outbox.event_type,
    outbox.order_id,
    outbox.recipient_user_id,
    outbox.order_number,
    outbox.order_updates_enabled_at_event,
    outbox.attempts,
    outbox.claim_token;
END;
$function$;

CREATE OR REPLACE FUNCTION public.finish_payment_notification_outbox(
  p_event_id UUID,
  p_claim_token UUID,
  p_outcome TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_updated INTEGER := 0;
BEGIN
  IF p_outcome NOT IN ('delivered', 'suppressed') THEN
    RAISE EXCEPTION 'invalid notification outbox outcome';
  END IF;

  UPDATE public.notification_outbox AS outbox
  SET
    status = p_outcome,
    claim_token = NULL,
    lease_expires_at = NULL,
    completed_at = pg_catalog.now(),
    updated_at = pg_catalog.now()
  WHERE outbox.id = p_event_id
    AND outbox.status = 'processing'
    AND outbox.claim_token = p_claim_token;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated = 1;
END;
$function$;

CREATE OR REPLACE FUNCTION public.fail_payment_notification_outbox(
  p_event_id UUID,
  p_claim_token UUID,
  p_error_message TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_status TEXT;
BEGIN
  UPDATE public.notification_outbox AS outbox
  SET
    status = CASE
      WHEN outbox.attempts >= 10 THEN 'dead_letter'
      ELSE 'pending'
    END,
    next_attempt_at = CASE
      WHEN outbox.attempts >= 10 THEN outbox.next_attempt_at
      ELSE pg_catalog.now() + pg_catalog.make_interval(
        secs => LEAST(
          3600,
          (15 * pg_catalog.power(2::NUMERIC, LEAST(outbox.attempts - 1, 8)))::INTEGER
        )
      )
    END,
    claim_token = NULL,
    lease_expires_at = NULL,
    last_error = LEFT(
      COALESCE(NULLIF(BTRIM(p_error_message), ''), 'Unknown notification delivery error'),
      2000
    ),
    completed_at = CASE
      WHEN outbox.attempts >= 10 THEN pg_catalog.now()
      ELSE NULL
    END,
    updated_at = pg_catalog.now()
  WHERE outbox.id = p_event_id
    AND outbox.status = 'processing'
    AND outbox.claim_token = p_claim_token
  RETURNING outbox.status INTO v_status;

  RETURN COALESCE(v_status, 'claim_lost');
END;
$function$;

-- Replace the payment RPC so its qualifying outbox event is committed atomically
-- with the payment and order status update. Keep its existing validation,
-- row-locking, and paid-order protection.
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
AS $function$
DECLARE
    v_order public.orders%ROWTYPE;
    v_new_status TEXT;
    v_order_updates_enabled BOOLEAN := TRUE;
    v_event_key TEXT;
BEGIN
    IF p_order_id IS NULL THEN
        RAISE EXCEPTION 'order_id is required';
    END IF;

    v_new_status := LOWER(TRIM(p_payment_status));
    IF v_new_status NOT IN ('pending', 'paid', 'failed', 'refunded') THEN
        RAISE EXCEPTION 'invalid payment_status: %', p_payment_status;
    END IF;

    SELECT *
    INTO v_order
    FROM public.orders AS o
    WHERE o.id = p_order_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, p_order_id, NULL::TEXT, FALSE;
        RETURN;
    END IF;

    IF p_expected_currency IS NOT NULL
       AND UPPER(TRIM(p_expected_currency)) <> UPPER(TRIM(v_order.currency)) THEN
        RAISE EXCEPTION 'currency mismatch for order %', p_order_id;
    END IF;

    IF p_expected_total IS NOT NULL
       AND ROUND(p_expected_total::NUMERIC, 2) <> ROUND(v_order.total::NUMERIC, 2) THEN
        RAISE EXCEPTION 'amount mismatch for order %', p_order_id;
    END IF;

    -- Never downgrade a paid order via webhook/verify retries.
    IF v_order.payment_status = 'paid' THEN
        RETURN QUERY SELECT FALSE, v_order.id, v_order.payment_status, TRUE;
        RETURN;
    END IF;

    IF p_cashfree_order_id IS NOT NULL
       AND v_order.cashfree_order_id IS NOT NULL
       AND TRIM(p_cashfree_order_id) <> TRIM(v_order.cashfree_order_id)
       AND POSITION(v_order.id::TEXT IN TRIM(p_cashfree_order_id)) = 0 THEN
        -- Allow retry merchant order ids that contain the Aahaa order UUID.
        IF POSITION(
          REPLACE(v_order.id::TEXT, '-', '')
          IN REPLACE(TRIM(p_cashfree_order_id), '-', '')
        ) = 0 THEN
            RAISE EXCEPTION 'cashfree_order_id does not belong to order %', p_order_id;
        END IF;
    END IF;

    UPDATE public.orders AS o
    SET
        payment_status = v_new_status,
        cashfree_order_id = COALESCE(NULLIF(TRIM(p_cashfree_order_id), ''), o.cashfree_order_id),
        cashfree_payment_id = COALESCE(NULLIF(TRIM(p_cashfree_payment_id), ''), o.cashfree_payment_id),
        cashfree_cf_order_id = COALESCE(NULLIF(TRIM(p_cashfree_cf_order_id), ''), o.cashfree_cf_order_id),
        payment_verified_at = CASE
            WHEN v_new_status IN ('paid', 'failed', 'refunded') THEN pg_catalog.now()
            ELSE o.payment_verified_at
        END,
        status = CASE
            WHEN v_new_status = 'paid' AND o.status = 'placed' THEN 'confirmed'
            ELSE o.status
        END
    WHERE o.id = p_order_id;

    IF v_new_status = 'paid'
       AND v_order.status = 'placed'
       AND v_order.payment_status IN ('pending', 'failed') THEN
        SELECT preferences.order_updates
        INTO v_order_updates_enabled
        FROM public.notification_preferences AS preferences
        WHERE preferences.user_id = v_order.user_id
        FOR SHARE;

        IF NOT FOUND THEN
            v_order_updates_enabled := TRUE;
        END IF;

        v_event_key := 'payment_confirmed:' || v_order.id::TEXT;
        INSERT INTO public.notification_outbox (
          event_key,
          event_type,
          order_id,
          recipient_user_id,
          order_number,
          order_updates_enabled_at_event,
          status,
          completed_at
        )
        VALUES (
          v_event_key,
          'payment_confirmed',
          v_order.id,
          v_order.user_id,
          v_order.order_number,
          v_order_updates_enabled,
          CASE WHEN v_order_updates_enabled THEN 'pending' ELSE 'suppressed' END,
          CASE WHEN v_order_updates_enabled THEN NULL ELSE pg_catalog.now() END
        )
        ON CONFLICT (event_key) DO NOTHING;
    END IF;

    RETURN QUERY SELECT TRUE, p_order_id, v_new_status, FALSE;
END;
$function$;

ALTER FUNCTION public.claim_payment_notification_outbox(INTEGER, INTEGER)
  OWNER TO postgres;
ALTER FUNCTION public.finish_payment_notification_outbox(UUID, UUID, TEXT)
  OWNER TO postgres;
ALTER FUNCTION public.fail_payment_notification_outbox(UUID, UUID, TEXT)
  OWNER TO postgres;
ALTER FUNCTION public.order_apply_payment_result(UUID, TEXT, TEXT, TEXT, TEXT, NUMERIC, TEXT)
  OWNER TO postgres;

REVOKE ALL PRIVILEGES ON FUNCTION
  public.claim_payment_notification_outbox(INTEGER, INTEGER),
  public.finish_payment_notification_outbox(UUID, UUID, TEXT),
  public.fail_payment_notification_outbox(UUID, UUID, TEXT),
  public.order_apply_payment_result(UUID, TEXT, TEXT, TEXT, TEXT, NUMERIC, TEXT)
FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION
  public.claim_payment_notification_outbox(INTEGER, INTEGER),
  public.finish_payment_notification_outbox(UUID, UUID, TEXT),
  public.fail_payment_notification_outbox(UUID, UUID, TEXT),
  public.order_apply_payment_result(UUID, TEXT, TEXT, TEXT, TEXT, NUMERIC, TEXT)
TO service_role;

COMMIT;
