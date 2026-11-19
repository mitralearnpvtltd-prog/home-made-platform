-- =============================================================================
-- Aahaa — Location coordinates for journey tracking maps
-- Migration: 20261125000000_location_coordinates
-- Target: Supabase PostgreSQL
--
-- Context:
--   orders.journey_from / journey_to / pickup_stop_name already snapshot the
--   customer's journey at order time (no schema change needed for From/To text).
--   Map markers need verified WGS84 coordinates. locations and pickup_stops
--   currently have no lat/lng columns in live Supabase.
--
-- This migration adds nullable coordinate columns only.
-- Do NOT seed invented values here — geocode and verify each place, then UPDATE.
-- Apply manually after review. The web app currently falls back to an
-- OSM-verified place catalogue for known boarding/dropping names.
-- =============================================================================

BEGIN;

ALTER TABLE public.locations
  ADD COLUMN IF NOT EXISTS latitude NUMERIC(9, 6),
  ADD COLUMN IF NOT EXISTS longitude NUMERIC(9, 6);

ALTER TABLE public.locations
  DROP CONSTRAINT IF EXISTS locations_latitude_range;
ALTER TABLE public.locations
  ADD CONSTRAINT locations_latitude_range
  CHECK (latitude IS NULL OR (latitude >= -90 AND latitude <= 90));

ALTER TABLE public.locations
  DROP CONSTRAINT IF EXISTS locations_longitude_range;
ALTER TABLE public.locations
  ADD CONSTRAINT locations_longitude_range
  CHECK (longitude IS NULL OR (longitude >= -180 AND longitude <= 180));

ALTER TABLE public.locations
  DROP CONSTRAINT IF EXISTS locations_lat_lng_pair;
ALTER TABLE public.locations
  ADD CONSTRAINT locations_lat_lng_pair
  CHECK (
    (latitude IS NULL AND longitude IS NULL)
    OR (latitude IS NOT NULL AND longitude IS NOT NULL)
  );

-- pickup_stops may already have these columns from 20261124000000_tracking_coordinates.
ALTER TABLE public.pickup_stops
  ADD COLUMN IF NOT EXISTS latitude NUMERIC(9, 6),
  ADD COLUMN IF NOT EXISTS longitude NUMERIC(9, 6);

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

COMMENT ON COLUMN public.locations.latitude IS
  'Verified WGS84 latitude for journey From/To map markers. NULL until geocoded.';
COMMENT ON COLUMN public.locations.longitude IS
  'Verified WGS84 longitude for journey From/To map markers. NULL until geocoded.';

-- Example after verification (do not run with invented values):
-- UPDATE public.locations
-- SET latitude = <verified>, longitude = <verified>
-- WHERE name = 'Anand Rao Circle' AND location_type = 'from_locality';
--
-- UPDATE public.pickup_stops
-- SET latitude = 12.978185, longitude = 77.572185
-- WHERE name = 'Bangalore';
-- -- Kempegowda Bus Station, OSM way/239832511

COMMIT;

-- =============================================================================
-- END OF LOCATION COORDINATES MIGRATION
-- =============================================================================
