-- =============================================================================
-- Aahaa — enable shared menu shell for all four catalogue kitchens
-- Migration: 20261115000000_enable_catalogue_kitchen_menus
-- Target: Supabase PostgreSQL
--
-- - Sets has_menu = true for Swathi, Kavita, Monica, and Inchara cooks.
-- - Does NOT invent dish rows, prices, ratings, or food photos.
-- - Existing schema already supports per-kitchen dishes via public.dishes
--   (kitchen_id) and public.dish_images.url for Storage URLs.
-- - Food item photos belong in the public Storage bucket `food-images`
--   (separate from kitchen-photos). Store those URLs on dish_images.url
--   when real catalogue items are added later.
-- - Forward-only; safe to re-run (idempotent UPDATE).
-- =============================================================================

BEGIN;

UPDATE public.cooks
SET
  has_menu = true,
  updated_at = now()
WHERE id IN (
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', -- Swathi
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', -- Kavita
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', -- Monica
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14'  -- Inchara
);

COMMIT;
