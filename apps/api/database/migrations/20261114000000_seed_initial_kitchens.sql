-- =============================================================================
-- Aahaa — initial kitchen catalogue for /cooks listing
-- Migration: 20261114000000_seed_initial_kitchens
-- Target: Supabase PostgreSQL
--
-- - Allows catalogue cooks without Auth/profile accounts (nullable account_id).
-- - Allows unknown vegetarian status (nullable is_vegetarian).
-- - Seeds four kitchens with verified Storage public photo URLs (case-sensitive).
-- - Fail-fast preflight: aborts on unexpected existing cook/kitchen conflicts.
-- - Idempotent upserts for the intended fixed IDs only (no DELETE / cascade risk).
-- - Explicit transaction so a preflight exception rolls back schema changes too.
-- - Adds public SELECT policies for listing (no INSERT/UPDATE/DELETE).
-- - Preserves known Swathi/Lakshmi profile fields; does not invent claims for 2–4.
-- =============================================================================

-- Verified public object paths (HTTP 200 as of review):
--   kitchen-photos/Swathi/Swathi.jpeg
--   kitchen-photos/Kavita/Kavita.jpeg
--   kitchen-photos/Monica/Monica.jpeg
--   kitchen-photos/Inchara/Inchara.jpeg
-- Note: lowercase kitchen-photos/swathi/... returns 400 (case-sensitive).

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Schema adjustments for catalogue seeds (idempotent)
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'cooks'
      AND column_name = 'account_id'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.cooks
      ALTER COLUMN account_id DROP NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'cooks'
      AND column_name = 'is_vegetarian'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.cooks
      ALTER COLUMN is_vegetarian DROP NOT NULL;
  END IF;
END $$;

COMMENT ON COLUMN public.cooks.account_id IS
  'Optional link to profiles/auth.users. NULL for catalogue-only kitchen listings that are not yet tied to a cook login.';

COMMENT ON COLUMN public.cooks.is_vegetarian IS
  'Vegetarian status when known. NULL means unknown (do not treat as non-vegetarian).';

COMMENT ON TABLE public.cooks IS
  'Cook operator profile. UNIQUE account_id enforces at most one cook per linked account; account_id may be NULL for catalogue seeds.';

-- -----------------------------------------------------------------------------
-- 2. Preflight: refuse unexpected conflicts for the four fixed seed IDs
-- Allowed (safe re-run):
--   - cook id already exists (will be upserted)
--   - kitchen id already exists with the matching intended cook_id (will be upserted)
-- Blocked (raise and stop — rolls back this transaction):
--   - kitchen id exists but points at a different cook_id
--   - intended cook_id already has a different kitchen id (UNIQUE cook_id)
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  conflict_kitchen_id uuid;
  conflict_cook_id uuid;
  conflict_found_cook_id uuid;
  conflict_found_kitchen_id uuid;
BEGIN
  SELECT k.id, k.cook_id
  INTO conflict_kitchen_id, conflict_found_cook_id
  FROM public.kitchens k
  WHERE k.id IN (
      'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b11',
      'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b12',
      'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b13',
      'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b14'
    )
    AND NOT (
      (k.id = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b11' AND k.cook_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11')
      OR (k.id = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b12' AND k.cook_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12')
      OR (k.id = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b13' AND k.cook_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13')
      OR (k.id = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b14' AND k.cook_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14')
    )
  LIMIT 1;

  IF conflict_kitchen_id IS NOT NULL THEN
    RAISE EXCEPTION
      'seed_initial_kitchens aborted: kitchen % already exists with unexpected cook_id % (expected a matching seed cook). No rows were deleted or reassigned.',
      conflict_kitchen_id,
      conflict_found_cook_id;
  END IF;

  SELECT k.cook_id, k.id
  INTO conflict_cook_id, conflict_found_kitchen_id
  FROM public.kitchens k
  WHERE k.cook_id IN (
      'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12',
      'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13',
      'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14'
    )
    AND k.id NOT IN (
      'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b11',
      'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b12',
      'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b13',
      'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b14'
    )
  LIMIT 1;

  IF conflict_cook_id IS NOT NULL THEN
    RAISE EXCEPTION
      'seed_initial_kitchens aborted: cook % already has kitchen % which is not the intended seed kitchen id. No rows were deleted or reassigned.',
      conflict_cook_id,
      conflict_found_kitchen_id;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 3. Upsert four cooks (preserve non-null account_id if already linked later)
-- Fixed IDs / original card order: Lakshmi → Meena → Agalya → Padma
-- is_vegetarian: true only for Swathi (known); NULL = unknown for the other three.
-- -----------------------------------------------------------------------------
INSERT INTO public.cooks (
  id,
  account_id,
  display_name,
  blurb,
  offer_label,
  offer_type,
  from_price,
  photo_url,
  has_menu,
  is_verified,
  is_vegetarian,
  rating,
  review_count,
  created_at,
  updated_at
)
VALUES
  (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    NULL,
    'Swathi',
    'Everyday South Indian comfort food',
    'Meals & homemade snacks',
    'meals-snacks',
    60.00,
    'https://fdbdlwwangidgwydhhcq.supabase.co/storage/v1/object/public/kitchen-photos/Swathi/Swathi.jpeg',
    true,
    true,
    true,
    4.8,
    126,
    '2026-11-14 00:00:01+00',
    '2026-11-14 00:00:01+00'
  ),
  (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12',
    NULL,
    'Kavita',
    'Familiar flavours, freshly prepared',
    'Meals & crispy homemade snacks',
    'meals-snacks',
    60.00,
    'https://fdbdlwwangidgwydhhcq.supabase.co/storage/v1/object/public/kitchen-photos/Kavita/Kavita.jpeg',
    true,
    false,
    NULL,
    NULL,
    0,
    '2026-11-14 00:00:02+00',
    '2026-11-14 00:00:02+00'
  ),
  (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13',
    NULL,
    'Monica',
    'Home-style favourites for your journey',
    'Meals & homemade snacks',
    'meals-snacks',
    100.00,
    'https://fdbdlwwangidgwydhhcq.supabase.co/storage/v1/object/public/kitchen-photos/Monica/Monica.jpeg',
    true,
    false,
    NULL,
    NULL,
    0,
    '2026-11-14 00:00:03+00',
    '2026-11-14 00:00:03+00'
  ),
  (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14',
    NULL,
    'Inchara',
    'Simple meals, made with care',
    'Breakfast, lunch & snacks',
    'meals-snacks',
    80.00,
    'https://fdbdlwwangidgwydhhcq.supabase.co/storage/v1/object/public/kitchen-photos/Inchara/Inchara.jpeg',
    true,
    false,
    NULL,
    NULL,
    0,
    '2026-11-14 00:00:04+00',
    '2026-11-14 00:00:04+00'
  )
ON CONFLICT (id) DO UPDATE SET
  -- Keep an existing account link; do not wipe it back to NULL on re-run.
  account_id = COALESCE(public.cooks.account_id, EXCLUDED.account_id),
  display_name = EXCLUDED.display_name,
  blurb = EXCLUDED.blurb,
  offer_label = EXCLUDED.offer_label,
  offer_type = EXCLUDED.offer_type,
  from_price = EXCLUDED.from_price,
  photo_url = EXCLUDED.photo_url,
  has_menu = EXCLUDED.has_menu,
  is_verified = EXCLUDED.is_verified,
  is_vegetarian = EXCLUDED.is_vegetarian,
  rating = EXCLUDED.rating,
  review_count = EXCLUDED.review_count,
  updated_at = EXCLUDED.updated_at;

-- -----------------------------------------------------------------------------
-- 4. Upsert four kitchens with the matching cook_id (1:1)
-- -----------------------------------------------------------------------------
INSERT INTO public.kitchens (
  id,
  cook_id,
  name,
  tagline,
  created_at,
  updated_at
)
VALUES
  (
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b11',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'Swathi’s Kitchen',
    'Everyday South Indian comfort food',
    '2026-11-14 00:00:01+00',
    '2026-11-14 00:00:01+00'
  ),
  (
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b12',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12',
    'Kavita’s Kitchen',
    'Familiar flavours, freshly prepared',
    '2026-11-14 00:00:02+00',
    '2026-11-14 00:00:02+00'
  ),
  (
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b13',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13',
    'Monica’s Kitchen',
    'Home-style favourites for your journey',
    '2026-11-14 00:00:03+00',
    '2026-11-14 00:00:03+00'
  ),
  (
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b14',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14',
    'Inchara’s Kitchen',
    'Simple meals, made with care',
    '2026-11-14 00:00:04+00',
    '2026-11-14 00:00:04+00'
  )
ON CONFLICT (id) DO UPDATE SET
  cook_id = EXCLUDED.cook_id,
  name = EXCLUDED.name,
  tagline = EXCLUDED.tagline,
  updated_at = EXCLUDED.updated_at;

-- -----------------------------------------------------------------------------
-- 5. Public read policies for kitchen listing (writes remain denied by RLS)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS cooks_select_listed ON public.cooks;
CREATE POLICY cooks_select_listed
  ON public.cooks
  FOR SELECT
  TO anon, authenticated
  USING (true);

COMMENT ON POLICY cooks_select_listed ON public.cooks IS
  'Allow anon and authenticated clients to read cook catalogue rows for kitchen listing. Writes remain denied.';

DROP POLICY IF EXISTS kitchens_select_listed ON public.kitchens;
CREATE POLICY kitchens_select_listed
  ON public.kitchens
  FOR SELECT
  TO anon, authenticated
  USING (true);

COMMENT ON POLICY kitchens_select_listed ON public.kitchens IS
  'Allow anon and authenticated clients to read kitchen catalogue rows for listing. Writes remain denied.';

COMMIT;
