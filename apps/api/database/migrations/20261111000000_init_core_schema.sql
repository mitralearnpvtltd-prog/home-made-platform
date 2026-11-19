-- =============================================================================
-- Aahaa — initial core schema
-- Migration: 20261111000000_init_core_schema
-- Target: Supabase PostgreSQL
--
-- Scope: application tables, constraints, indexes, role seed, RLS enablement.
-- Auth users, passwords, OTPs and credentials are owned by Supabase Auth only.
-- Access policies are intentionally deferred; see RLS comments below.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -----------------------------------------------------------------------------
-- Helper: keep updated_at current on row changes
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- =============================================================================
-- 1. profiles
-- One application profile per Supabase Auth user. No credentials stored here.
-- =============================================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX profiles_email_idx ON public.profiles (email);
CREATE INDEX profiles_phone_idx ON public.profiles (phone);

CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.profiles IS
  'Application profile linked 1:1 to auth.users. Never store passwords, OTPs or auth secrets here.';

-- =============================================================================
-- 2. roles
-- Fixed role catalogue. Seeded below; not fabricated business data.
-- =============================================================================
CREATE TABLE public.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT roles_code_unique UNIQUE (code),
  CONSTRAINT roles_name_unique UNIQUE (name),
  CONSTRAINT roles_code_format CHECK (code ~ '^[a-z][a-z0-9_]*$')
);

COMMENT ON TABLE public.roles IS
  'System role definitions. Application accounts may hold multiple roles via user_roles.';

-- =============================================================================
-- 3. user_roles
-- Many-to-many: one account may be Customer, Cook, Admin, DeliveryPartner, etc.
-- =============================================================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES public.roles (id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT user_roles_profile_role_unique UNIQUE (profile_id, role_id)
);

CREATE INDEX user_roles_profile_id_idx ON public.user_roles (profile_id);
CREATE INDEX user_roles_role_id_idx ON public.user_roles (role_id);

COMMENT ON TABLE public.user_roles IS
  'Assigns roles to profiles. Unique (profile_id, role_id) prevents duplicate assignments.';

-- =============================================================================
-- 4. cooks
-- At most one cook record per account (UNIQUE account_id).
-- =============================================================================
CREATE TABLE public.cooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  blurb TEXT,
  offer_label TEXT,
  offer_type TEXT,
  from_price NUMERIC(12, 2),
  photo_url TEXT,
  has_menu BOOLEAN NOT NULL DEFAULT false,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  is_vegetarian BOOLEAN NOT NULL DEFAULT false,
  rating NUMERIC(2, 1),
  review_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT cooks_account_id_unique UNIQUE (account_id),
  CONSTRAINT cooks_from_price_non_negative CHECK (from_price IS NULL OR from_price >= 0),
  CONSTRAINT cooks_rating_range CHECK (rating IS NULL OR (rating >= 0 AND rating <= 5)),
  CONSTRAINT cooks_review_count_non_negative CHECK (review_count >= 0),
  CONSTRAINT cooks_offer_type_valid CHECK (
    offer_type IS NULL OR offer_type IN ('meals-snacks', 'snacks')
  )
);

CREATE INDEX cooks_has_menu_idx ON public.cooks (has_menu);
CREATE INDEX cooks_is_verified_idx ON public.cooks (is_verified);

CREATE TRIGGER cooks_set_updated_at
  BEFORE UPDATE ON public.cooks
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.cooks IS
  'Cook operator profile. UNIQUE account_id enforces one cook per account.';

-- =============================================================================
-- 5. kitchens
-- At most one kitchen per cook (UNIQUE non-null cook_id).
-- =============================================================================
CREATE TABLE public.kitchens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cook_id UUID NOT NULL REFERENCES public.cooks (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  tagline TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT kitchens_cook_id_unique UNIQUE (cook_id)
);

CREATE TRIGGER kitchens_set_updated_at
  BEFORE UPDATE ON public.kitchens
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.kitchens IS
  'Public kitchen for a cook. UNIQUE cook_id prevents a cook from having more than one kitchen; it does not require every cook to have a kitchen.';

-- =============================================================================
-- 6. pickup_stops
-- Shared stop catalogue (e.g. Madurai Bypass).
-- =============================================================================
CREATE TABLE public.pickup_stops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  pickup_time TEXT,
  title TEXT,
  detail TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT pickup_stops_name_unique UNIQUE (name)
);

CREATE TRIGGER pickup_stops_set_updated_at
  BEFORE UPDATE ON public.pickup_stops
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.pickup_stops IS
  'Shared bus pickup locations available for cook assignment.';

-- =============================================================================
-- 7. cook_pickup_stops
-- Which stops a cook serves; no duplicate cook/stop pairs.
-- =============================================================================
CREATE TABLE public.cook_pickup_stops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cook_id UUID NOT NULL REFERENCES public.cooks (id) ON DELETE CASCADE,
  pickup_stop_id UUID NOT NULL REFERENCES public.pickup_stops (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT cook_pickup_stops_cook_stop_unique UNIQUE (cook_id, pickup_stop_id)
);

CREATE INDEX cook_pickup_stops_cook_id_idx ON public.cook_pickup_stops (cook_id);
CREATE INDEX cook_pickup_stops_pickup_stop_id_idx ON public.cook_pickup_stops (pickup_stop_id);

COMMENT ON TABLE public.cook_pickup_stops IS
  'Cook-to-stop assignments. Unique (cook_id, pickup_stop_id) prevents duplicates.';

-- =============================================================================
-- 8. food_categories
-- Controlled vocabulary for dish.category (meals / breakfast / snacks).
-- =============================================================================
CREATE TABLE public.food_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT food_categories_code_unique UNIQUE (code),
  CONSTRAINT food_categories_name_unique UNIQUE (name),
  CONSTRAINT food_categories_code_format CHECK (code ~ '^[a-z][a-z0-9_]*$')
);

COMMENT ON TABLE public.food_categories IS
  'Dish category taxonomy. Dishes reference this table for valid categories.';

-- =============================================================================
-- 9. dishes
-- Menu items owned by a kitchen (and therefore one cook via kitchens.cook_id).
-- =============================================================================
CREATE TABLE public.dishes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kitchen_id UUID NOT NULL REFERENCES public.kitchens (id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.food_categories (id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  price NUMERIC(12, 2) NOT NULL,
  description TEXT,
  spice_level TEXT,
  is_available BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT dishes_price_non_negative CHECK (price >= 0)
);

CREATE INDEX dishes_kitchen_id_idx ON public.dishes (kitchen_id);
CREATE INDEX dishes_category_id_idx ON public.dishes (category_id);
CREATE INDEX dishes_kitchen_category_idx ON public.dishes (kitchen_id, category_id);
CREATE INDEX dishes_is_available_idx ON public.dishes (is_available);

CREATE TRIGGER dishes_set_updated_at
  BEFORE UPDATE ON public.dishes
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.dishes IS
  'Kitchen menu items. category_id FK enforces valid food categories; price is NUMERIC.';

-- =============================================================================
-- 10. dish_images
-- Gallery images and included-item images for a dish.
-- =============================================================================
CREATE TABLE public.dish_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dish_id UUID NOT NULL REFERENCES public.dishes (id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  image_kind TEXT NOT NULL,
  label TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT dish_images_kind_valid CHECK (image_kind IN ('gallery', 'include'))
);

CREATE INDEX dish_images_dish_id_idx ON public.dish_images (dish_id);
CREATE INDEX dish_images_dish_kind_idx ON public.dish_images (dish_id, image_kind);

COMMENT ON TABLE public.dish_images IS
  'Dish media. image_kind gallery = photo carousel; include = plated/included item shots.';

-- =============================================================================
-- 11. dish_ingredients
-- Ordered ingredient list for a dish.
-- =============================================================================
CREATE TABLE public.dish_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dish_id UUID NOT NULL REFERENCES public.dishes (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT dish_ingredients_dish_sort_unique UNIQUE (dish_id, sort_order)
);

CREATE INDEX dish_ingredients_dish_id_idx ON public.dish_ingredients (dish_id);

COMMENT ON TABLE public.dish_ingredients IS
  'Ordered ingredients per dish. Unique (dish_id, sort_order) preserves stable ordering.';

-- =============================================================================
-- 12. dish_allergens
-- =============================================================================
CREATE TABLE public.dish_allergens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dish_id UUID NOT NULL REFERENCES public.dishes (id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT dish_allergens_dish_label_unique UNIQUE (dish_id, label)
);

CREATE INDEX dish_allergens_dish_id_idx ON public.dish_allergens (dish_id);

COMMENT ON TABLE public.dish_allergens IS
  'Allergen labels for a dish. Unique (dish_id, label) prevents duplicates.';

-- =============================================================================
-- 13. dish_tags
-- Ordered tags (e.g. Veg, Mild, Popular).
-- =============================================================================
CREATE TABLE public.dish_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dish_id UUID NOT NULL REFERENCES public.dishes (id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT dish_tags_dish_label_unique UNIQUE (dish_id, label),
  CONSTRAINT dish_tags_dish_sort_unique UNIQUE (dish_id, sort_order)
);

CREATE INDEX dish_tags_dish_id_idx ON public.dish_tags (dish_id);

COMMENT ON TABLE public.dish_tags IS
  'Ordered dish tags. Unique label and sort_order per dish.';

-- =============================================================================
-- 14. reviews
-- Targets either a kitchen or a dish (exactly one).
-- =============================================================================
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type TEXT NOT NULL,
  kitchen_id UUID REFERENCES public.kitchens (id) ON DELETE CASCADE,
  dish_id UUID REFERENCES public.dishes (id) ON DELETE CASCADE,
  author_profile_id UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  author_display_name TEXT NOT NULL,
  rating NUMERIC(2, 1) NOT NULL,
  body TEXT,
  reviewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT reviews_target_type_valid CHECK (target_type IN ('kitchen', 'dish')),
  CONSTRAINT reviews_rating_range CHECK (rating >= 0 AND rating <= 5),
  CONSTRAINT reviews_target_consistency CHECK (
    (
      target_type = 'kitchen'
      AND kitchen_id IS NOT NULL
      AND dish_id IS NULL
    )
    OR (
      target_type = 'dish'
      AND dish_id IS NOT NULL
      AND kitchen_id IS NULL
    )
  )
);

CREATE INDEX reviews_kitchen_id_idx ON public.reviews (kitchen_id);
CREATE INDEX reviews_dish_id_idx ON public.reviews (dish_id);
CREATE INDEX reviews_author_profile_id_idx ON public.reviews (author_profile_id);
CREATE INDEX reviews_target_type_idx ON public.reviews (target_type);
CREATE INDEX reviews_reviewed_at_idx ON public.reviews (reviewed_at DESC);

CREATE TRIGGER reviews_set_updated_at
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.reviews IS
  'Reviews for kitchens or dishes. target_type + CHECK enforce exactly one target FK.';

-- =============================================================================
-- Seed: system roles (not cook/kitchen/dish/review business data)
-- =============================================================================
INSERT INTO public.roles (code, name)
VALUES
  ('customer', 'Customer'),
  ('cook', 'Cook'),
  ('admin', 'Admin'),
  ('delivery_partner', 'DeliveryPartner')
ON CONFLICT (code) DO NOTHING;

-- =============================================================================
-- Seed: food category taxonomy (not fabricated menu/content data)
-- =============================================================================
INSERT INTO public.food_categories (code, name, sort_order)
VALUES
  ('meals', 'Meals', 1),
  ('breakfast', 'Breakfast', 2),
  ('snacks', 'Snacks', 3)
ON CONFLICT (code) DO NOTHING;

-- =============================================================================
-- Row Level Security
-- Enable RLS on every application table. No policies are created in this
-- migration: with RLS on and no policies, anon/authenticated roles cannot
-- read or write (service_role bypasses RLS). Implement SELECT/INSERT/UPDATE/
-- DELETE policies in a later security-phase migration. Do not add permissive
-- public write policies. Do not expose service-role credentials to clients.
-- =============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kitchens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pickup_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cook_pickup_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dishes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dish_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dish_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dish_allergens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dish_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Future policy notes (security phase — do not implement here):
-- profiles: users read/update own row (auth.uid() = id); admin read-all.
-- roles: authenticated read-only catalogue; no client writes.
-- user_roles: users read own assignments; only trusted backend/admin assigns.
-- cooks / kitchens: public read of listed cooks; cook writes own kitchen/menu.
-- pickup_stops: public read; admin write.
-- cook_pickup_stops: public read; cook manages own stop links.
-- food_categories: public/authenticated read; admin write.
-- dishes + dish_*: public read available items; cook manages own kitchen menu.
-- reviews: public read; authenticated insert with author_profile_id = auth.uid();
--          owners/admins moderate updates/deletes.
-- Never grant anon unrestricted INSERT/UPDATE/DELETE on application tables.
