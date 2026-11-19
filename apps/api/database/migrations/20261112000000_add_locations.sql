-- =============================================================================
-- Aahaa — locations catalogue
-- Migration: 20261112000000_add_locations
-- Target: Supabase PostgreSQL
--
-- Adds searchable from-locality and to-destination locations.
-- No location seed data in this migration.
-- Access policies are deferred; RLS is enabled only.
-- =============================================================================

CREATE TABLE public.locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  city TEXT,
  district TEXT,
  state TEXT NOT NULL,
  location_type TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT locations_type_valid CHECK (
    location_type IN ('from_locality', 'to_destination')
  )
);

-- Treat NULL city/district as empty string so duplicates are blocked while
-- allowing the same name under different cities or districts.
CREATE UNIQUE INDEX locations_type_name_state_city_district_unique
  ON public.locations (
    location_type,
    name,
    state,
    (COALESCE(city, '')),
    (COALESCE(district, ''))
  );

CREATE INDEX locations_active_type_idx
  ON public.locations (location_type)
  WHERE is_active;

CREATE INDEX locations_active_state_idx
  ON public.locations (state)
  WHERE is_active;

CREATE INDEX locations_active_city_idx
  ON public.locations (city)
  WHERE is_active;

CREATE INDEX locations_active_name_idx
  ON public.locations (name)
  WHERE is_active;

CREATE INDEX locations_active_type_state_name_idx
  ON public.locations (location_type, state, name)
  WHERE is_active;

CREATE INDEX locations_active_type_name_idx
  ON public.locations (location_type, name)
  WHERE is_active;

CREATE TRIGGER locations_set_updated_at
  BEFORE UPDATE ON public.locations
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.locations IS
  'From localities and to destinations for journey search. Unique on (location_type, name, state, COALESCE(city, ''''), COALESCE(district, '''')) prevents duplicates across null city/district while allowing the same name in different cities or districts.';

ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

-- Future policy notes (security phase — do not implement here):
-- locations: public/authenticated read of active rows; admin write only.
-- Never grant anon unrestricted INSERT/UPDATE/DELETE on locations.
