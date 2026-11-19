-- =============================================================================
-- Aahaa — Tracking coordinates (Feature: Track Your Order map)
-- Migration: 20261124000000_tracking_coordinates
-- Target: Supabase PostgreSQL
--
-- Adds verified geographic columns for kitchen and pickup-stop map markers.
-- Does NOT seed latitude/longitude values — coordinates must be geocoded and
-- verified before insert. The frontend map only draws markers/routes when
-- these values are present.
--
-- Apply manually in Supabase after review. Do not invent coordinates.
-- =============================================================================

BEGIN;

ALTER TABLE public.kitchens
  ADD COLUMN IF NOT EXISTS latitude NUMERIC(9, 6),
  ADD COLUMN IF NOT EXISTS longitude NUMERIC(9, 6);

ALTER TABLE public.pickup_stops
  ADD COLUMN IF NOT EXISTS latitude NUMERIC(9, 6),
  ADD COLUMN IF NOT EXISTS longitude NUMERIC(9, 6);

ALTER TABLE public.kitchens
  DROP CONSTRAINT IF EXISTS kitchens_latitude_range;
ALTER TABLE public.kitchens
  ADD CONSTRAINT kitchens_latitude_range
  CHECK (latitude IS NULL OR (latitude >= -90 AND latitude <= 90));

ALTER TABLE public.kitchens
  DROP CONSTRAINT IF EXISTS kitchens_longitude_range;
ALTER TABLE public.kitchens
  ADD CONSTRAINT kitchens_longitude_range
  CHECK (longitude IS NULL OR (longitude >= -180 AND longitude <= 180));

ALTER TABLE public.kitchens
  DROP CONSTRAINT IF EXISTS kitchens_lat_lng_pair;
ALTER TABLE public.kitchens
  ADD CONSTRAINT kitchens_lat_lng_pair
  CHECK (
    (latitude IS NULL AND longitude IS NULL)
    OR (latitude IS NOT NULL AND longitude IS NOT NULL)
  );

ALTER TABLE public.pickup_stops
  DROP CONSTRAINT IF EXISTS pickup_stops_latitude_range;
ALTER TABLE public.pickup_stops
  ADD CONSTRAINT pickup_stops_latitude_range
  CHECK (latitude IS NULL OR (latitude >= -90 AND latitude <= 90));

ALTER TABLE public.pickup_stops
  DROP CONSTRAINT IF EXISTS pickup_stops_longitude_range;
ALTER TABLE public.pickup_stops
  ADD CONSTRAINT pickup_stops_longitude_range
  CHECK (longitude IS NULL OR (longitude >= -180 AND longitude <= 180));

ALTER TABLE public.pickup_stops
  DROP CONSTRAINT IF EXISTS pickup_stops_lat_lng_pair;
ALTER TABLE public.pickup_stops
  ADD CONSTRAINT pickup_stops_lat_lng_pair
  CHECK (
    (latitude IS NULL AND longitude IS NULL)
    OR (latitude IS NOT NULL AND longitude IS NOT NULL)
  );

COMMENT ON COLUMN public.kitchens.latitude IS
  'Verified WGS84 latitude for kitchen map marker. NULL until geocoded.';
COMMENT ON COLUMN public.kitchens.longitude IS
  'Verified WGS84 longitude for kitchen map marker. NULL until geocoded.';
COMMENT ON COLUMN public.pickup_stops.latitude IS
  'Verified WGS84 latitude for pickup-stop map marker. NULL until geocoded.';
COMMENT ON COLUMN public.pickup_stops.longitude IS
  'Verified WGS84 longitude for pickup-stop map marker. NULL until geocoded.';

-- After apply: UPDATE each kitchen/pickup_stop with verified coordinates, e.g.
--   UPDATE public.pickup_stops
--   SET latitude = <verified>, longitude = <verified>
--   WHERE name = 'Bangalore';
-- Then expose lat/lng on kitchen and pickup-stop API responses so the web
-- tracking map can resolve markers without a hardcoded coordinate table.

COMMIT;

-- =============================================================================
-- END OF TRACKING COORDINATES MIGRATION
-- =============================================================================
