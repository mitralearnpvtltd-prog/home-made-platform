BEGIN;

-- =============================================================================
-- Aahaa — catalogue dishes + spice_level access
-- Migration: 20261116000000_seed_catalogue_dishes
-- Target: Supabase PostgreSQL
--
-- Adds dishes.code (frontend Meal.id slug bridge), seeds the four catalogue
-- kitchen menus, and allows anon/authenticated SELECT of available dishes.
--
-- spice_level:
--   - Nullable TEXT; only Mild | Medium | Hot when a kitchen has supplied it.
--   - Lemon rice & potato fry (Swathi) is Mild from established kitchen product
--     detail content. All other seeded rows leave spice_level NULL until the
--     kitchen provides a value — do not invent spice levels in application code.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Frontend slug bridge: dishes.code ↔ Meal.id
-- -----------------------------------------------------------------------------
ALTER TABLE public.dishes
  ADD COLUMN IF NOT EXISTS code TEXT;

COMMENT ON COLUMN public.dishes.code IS
  'Stable dish slug matching the frontend Meal.id for the kitchen catalogue.';

COMMENT ON COLUMN public.dishes.spice_level IS
  'Kitchen-supplied spice: Mild, Medium, Hot, or NULL when not specified.';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'dishes_spice_level_valid'
      AND conrelid = 'public.dishes'::regclass
  ) THEN
    ALTER TABLE public.dishes
      ADD CONSTRAINT dishes_spice_level_valid
      CHECK (
        spice_level IS NULL
        OR spice_level IN ('Mild', 'Medium', 'Hot')
      );
  END IF;
END $$;

-- Unique per kitchen once rows exist with codes.
CREATE UNIQUE INDEX IF NOT EXISTS dishes_kitchen_id_code_uidx
  ON public.dishes (kitchen_id, code);

-- -----------------------------------------------------------------------------
-- 2. Public read of available dishes (Nest anon client)
-- -----------------------------------------------------------------------------
GRANT SELECT ON public.dishes TO anon, authenticated;
GRANT SELECT ON public.food_categories TO anon, authenticated;

DROP POLICY IF EXISTS dishes_select_available ON public.dishes;

CREATE POLICY dishes_select_available
  ON public.dishes
  FOR SELECT
  TO anon, authenticated
  USING (is_available = true);

COMMENT ON POLICY dishes_select_available ON public.dishes IS
  'Allow anon and authenticated clients to read available dishes only. Writes remain denied.';

DROP POLICY IF EXISTS food_categories_select_all ON public.food_categories;

CREATE POLICY food_categories_select_all
  ON public.food_categories
  FOR SELECT
  TO anon, authenticated
  USING (true);

COMMENT ON POLICY food_categories_select_all ON public.food_categories IS
  'Allow anon and authenticated clients to read food category taxonomy.';

-- -----------------------------------------------------------------------------
-- 3. Preflight: required food categories and catalogue kitchens
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  missing_categories TEXT;
  missing_kitchens TEXT;
BEGIN
  SELECT string_agg(required.code, ', ' ORDER BY required.code)
  INTO missing_categories
  FROM (VALUES ('meals'), ('breakfast'), ('snacks')) AS required(code)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.food_categories fc WHERE fc.code = required.code
  );

  IF missing_categories IS NOT NULL THEN
    RAISE EXCEPTION
      'seed_catalogue_dishes preflight failed: missing food_categories.code values: %',
      missing_categories;
  END IF;

  SELECT string_agg(required.id::text, ', ' ORDER BY required.id::text)
  INTO missing_kitchens
  FROM (
    VALUES
      ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b11'::uuid),
      ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b12'::uuid),
      ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b13'::uuid),
      ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b14'::uuid)
  ) AS required(id)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.kitchens k WHERE k.id = required.id
  );

  IF missing_kitchens IS NOT NULL THEN
    RAISE EXCEPTION
      'seed_catalogue_dishes preflight failed: missing kitchens.id values: %',
      missing_kitchens;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 4. Seed catalogue dishes (idempotent on kitchen_id + code)
-- -----------------------------------------------------------------------------
WITH cats AS (
  SELECT
    (SELECT id FROM public.food_categories WHERE code = 'meals') AS meals,
    (SELECT id FROM public.food_categories WHERE code = 'breakfast') AS breakfast,
    (SELECT id FROM public.food_categories WHERE code = 'snacks') AS snacks
),
seed(kitchen_id, code, name, price, description, spice_level, category_code, sort_order) AS (
  VALUES
    -- Swathi’s Kitchen
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b11'::uuid, 'veg-lunch', 'Homestyle veg lunch', 140.00, 'Rice, sambar, poriyal & curd', NULL::text, 'meals', 1),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b11'::uuid, 'lemon-rice', 'Lemon rice & potato fry', 100.00, 'Tangy lemon rice with crispy potatoes', 'Mild', 'meals', 2),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b11'::uuid, 'idli', 'Soft idli & chutney', 80.00, '4 idli, chutney & sambar', NULL, 'breakfast', 3),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b11'::uuid, 'curd-rice', 'Curd rice & pickle', 90.00, 'A cooling homestyle favourite', NULL, 'meals', 4),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b11'::uuid, 'chapati', 'Chapati & vegetable curry', 110.00, '3 chapati with seasonal curry', NULL, 'meals', 5),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b11'::uuid, 'pulao', 'Vegetable pulao', 120.00, 'Mild pulao with vegetables', NULL, 'meals', 6),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b11'::uuid, 'banana-chips', 'Banana chips', 60.00, 'Crispy homemade chips', NULL, 'snacks', 7),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b11'::uuid, 'murukku', 'Murukku', 70.00, 'Crunchy homemade murukku', NULL, 'snacks', 8),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b11'::uuid, 'mixture', 'Spiced mixture', 65.00, 'Mildly spiced tea-time mix', NULL, 'snacks', 9),

    -- Kavita’s Kitchen
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b12'::uuid, 'kavita-masala-dosa', 'Masala dosa', 90.00, 'Crispy dosa with potato masala', NULL, 'breakfast', 1),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b12'::uuid, 'kavita-tamarind-rice', 'Tamarind rice', 80.00, 'Traditional tangy tamarind rice', NULL, 'meals', 2),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b12'::uuid, 'kavita-tomato-bath', 'Tomato bath', 70.00, 'Tomato spiced rice', NULL, 'meals', 3),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b12'::uuid, 'kavita-poori-potato-masala', 'Poori & potato masala', 100.00, 'Fluffy pooris with masala', NULL, 'breakfast', 4),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b12'::uuid, 'kavita-veg-pongal', 'Veg pongal', 80.00, 'Rice and pongal with ghee', NULL, 'breakfast', 5),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b12'::uuid, 'kavita-ragi-mudde-bassaru', 'Ragi mudde & bassaru', 110.00, 'Ragi balls with traditional curry', NULL, 'meals', 6),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b12'::uuid, 'kavita-masala-peanuts', 'Masala peanuts', 50.00, '100g pack', NULL, 'snacks', 7),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b12'::uuid, 'kavita-kodubale', 'Kodubale', 60.00, '100g pack', NULL, 'snacks', 8),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b12'::uuid, 'kavita-nippattu', 'Nippattu', 70.00, '100g pack', NULL, 'snacks', 9),

    -- Monica’s Kitchen
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b13'::uuid, 'monica-lemon-rice', 'Lemon rice', 80.00, 'Rice flavoured with seeds', NULL, 'meals', 1),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b13'::uuid, 'monica-curd-rice-pickle', 'Curd rice & pickle', 80.00, 'Soft rice with creamy curd', NULL, 'meals', 2),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b13'::uuid, 'monica-tomato-bath', 'Tomato bath', 90.00, 'Flavourful rice with fresh vegetables', NULL, 'meals', 3),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b13'::uuid, 'monica-set-dosa', 'Set dosa', 90.00, '3 soft dosas with vegetable curry', NULL, 'breakfast', 4),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b13'::uuid, 'monica-soft-idli', 'Soft idli', 70.00, '4 soft idlis', NULL, 'breakfast', 5),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b13'::uuid, 'monica-akki-roti', 'Akki roti', 100.00, 'Rice rotis with vegetable curry', NULL, 'breakfast', 6),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b13'::uuid, 'monica-chakli', 'Chakli', 60.00, '100g', NULL, 'snacks', 7),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b13'::uuid, 'monica-roasted-chana', 'Roasted chana', 40.00, '50g', NULL, 'snacks', 8),

    -- Inchara’s Kitchen
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b14'::uuid, 'inchara-vegetable-khichdi', 'Vegetable khichdi', 100.00, 'Rice with fresh vegetables', NULL, 'meals', 1),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b14'::uuid, 'inchara-bisibelebath', 'Bisibelebath', 70.00, 'Spicy lentil rice', NULL, 'meals', 2),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b14'::uuid, 'inchara-chapati-vegetable-curry', 'Chapati & vegetable curry', 80.00, 'Smooth rice with curry', NULL, 'meals', 3),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b14'::uuid, 'inchara-sambar-rice-meal', 'Sambar rice meal', 70.00, 'Traditional rice and sambar', NULL, 'meals', 4),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b14'::uuid, 'inchara-vegetable-upma', 'Vegetable upma', 70.00, 'Savoury vegetable semolina', NULL, 'breakfast', 5),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b14'::uuid, 'inchara-rava-idli', 'Rava idli', 90.00, 'Soft steamed idli', NULL, 'breakfast', 6),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b14'::uuid, 'inchara-onion-pakoda', 'Onion pakoda', 90.00, '100g', NULL, 'snacks', 7),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b14'::uuid, 'inchara-masala-makhana', 'Masala makhana', 60.00, '50g', NULL, 'snacks', 8)
)
INSERT INTO public.dishes (
  kitchen_id,
  category_id,
  code,
  name,
  price,
  description,
  spice_level,
  is_available,
  sort_order
)
SELECT
  seed.kitchen_id,
  CASE seed.category_code
    WHEN 'meals' THEN cats.meals
    WHEN 'breakfast' THEN cats.breakfast
    WHEN 'snacks' THEN cats.snacks
  END,
  seed.code,
  seed.name,
  seed.price,
  seed.description,
  seed.spice_level,
  true,
  seed.sort_order
FROM seed
CROSS JOIN cats
ON CONFLICT (kitchen_id, code) DO UPDATE
SET
  name = EXCLUDED.name,
  price = EXCLUDED.price,
  description = EXCLUDED.description,
  spice_level = EXCLUDED.spice_level,
  category_id = EXCLUDED.category_id,
  sort_order = EXCLUDED.sort_order,
  is_available = EXCLUDED.is_available,
  updated_at = now();

COMMIT;
