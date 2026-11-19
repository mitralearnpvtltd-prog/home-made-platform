-- =============================================================================
-- Aahaa — Optional profile photos on partner applications
-- Migration: 20261132000000_optional_application_profile_photos
-- Target: Supabase PostgreSQL
--
-- Makes profile_photo_path nullable so cook and delivery partner applications
-- can be submitted without a photo. Existing rows with photos are unchanged.
-- Does not modify earlier applied migrations.
-- =============================================================================

BEGIN;

ALTER TABLE public.cook_applications
  ALTER COLUMN profile_photo_path DROP NOT NULL;

ALTER TABLE public.delivery_partner_applications
  ALTER COLUMN profile_photo_path DROP NOT NULL;

COMMENT ON COLUMN public.cook_applications.profile_photo_path IS
  'Optional private storage path in application-profile-photos. Null when not provided.';

COMMENT ON COLUMN public.delivery_partner_applications.profile_photo_path IS
  'Optional private storage path in application-profile-photos. Null when not provided.';

COMMIT;
