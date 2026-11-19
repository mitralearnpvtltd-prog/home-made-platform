-- =============================================================================
-- Aahaa — Home Cook & Delivery Partner Applications
-- Migration: 20261130000000_partner_applications
-- Target: Supabase PostgreSQL
--
-- Creates:
--   public.cook_applications
--   public.delivery_partner_applications
--   storage bucket application-profile-photos (private)
--
-- Security:
--   No client/anon policies for application tables (service_role only).
--   Profile photos stored in a private bucket; access via Nest signed URLs
--   for authorised admins only.
--   Aadhaar/PAN stored only as AES-GCM ciphertext + last-4 mask columns.
--   Retention window: 365 days from submission (retention_until).
-- =============================================================================

BEGIN;

-- =============================================================================
-- 1. COOK APPLICATIONS
-- =============================================================================

CREATE TABLE public.cook_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CONSTRAINT cook_applications_status_check
      CHECK (status IN ('pending', 'approved', 'rejected')),

  full_name TEXT NOT NULL,
  mobile_number TEXT NOT NULL,
  mobile_normalized TEXT NOT NULL,
  email TEXT NOT NULL,
  email_normalized TEXT NOT NULL,
  profile_photo_path TEXT NOT NULL,

  kitchen_name TEXT NOT NULL,
  kitchen_address TEXT NOT NULL,
  city TEXT NOT NULL,
  pincode TEXT NOT NULL,
  years_experience INTEGER NOT NULL
    CONSTRAINT cook_applications_years_check CHECK (years_experience >= 0 AND years_experience <= 80),
  food_types TEXT[] NOT NULL DEFAULT '{}',
  food_categories TEXT[] NOT NULL DEFAULT '{}',
  special_dishes TEXT,
  food_preference TEXT NOT NULL
    CONSTRAINT cook_applications_food_preference_check
      CHECK (food_preference IN ('vegetarian', 'non_vegetarian', 'both')),

  fssai_registration_number TEXT,
  kitchen_opening_time TIME NOT NULL,
  kitchen_closing_time TIME NOT NULL,
  available_days TEXT[] NOT NULL DEFAULT '{}',

  terms_accepted_at TIMESTAMPTZ NOT NULL,
  retention_until TIMESTAMPTZ NOT NULL,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  review_notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT cook_applications_application_id_unique UNIQUE (application_id),
  CONSTRAINT cook_applications_mobile_format CHECK (mobile_normalized ~ '^[6-9][0-9]{9}$'),
  CONSTRAINT cook_applications_pincode_format CHECK (pincode ~ '^[1-9][0-9]{5}$'),
  CONSTRAINT cook_applications_email_format CHECK (position('@' IN email_normalized) > 1),
  CONSTRAINT cook_applications_closing_after_opening CHECK (kitchen_closing_time > kitchen_opening_time)
);

CREATE INDEX cook_applications_status_created_idx
  ON public.cook_applications (status, created_at DESC);

CREATE UNIQUE INDEX cook_applications_pending_email_uidx
  ON public.cook_applications (email_normalized)
  WHERE status = 'pending';

CREATE UNIQUE INDEX cook_applications_pending_mobile_uidx
  ON public.cook_applications (mobile_normalized)
  WHERE status = 'pending';

COMMENT ON TABLE public.cook_applications IS
  'Home cook onboarding applications. Service-role access only; not public catalogue cooks.';

COMMENT ON COLUMN public.cook_applications.retention_until IS
  'Applications should be deleted or anonymised after this timestamp unless approved and converted.';

-- =============================================================================
-- 2. DELIVERY PARTNER APPLICATIONS
-- =============================================================================

CREATE TABLE public.delivery_partner_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CONSTRAINT delivery_partner_applications_status_check
      CHECK (status IN ('pending', 'approved', 'rejected')),

  full_name TEXT NOT NULL,
  mobile_number TEXT NOT NULL,
  mobile_normalized TEXT NOT NULL,
  email TEXT NOT NULL,
  email_normalized TEXT NOT NULL,
  profile_photo_path TEXT NOT NULL,

  current_address TEXT NOT NULL,
  city TEXT NOT NULL,
  pincode TEXT NOT NULL,

  vehicle_registration_number TEXT NOT NULL,
  driving_license_number TEXT NOT NULL,

  -- Identity: ciphertext only + last-4 for masked admin display. Never plaintext.
  aadhaar_ciphertext TEXT NOT NULL,
  aadhaar_last4 TEXT NOT NULL
    CONSTRAINT delivery_partner_aadhaar_last4_check CHECK (aadhaar_last4 ~ '^[0-9]{4}$'),
  pan_ciphertext TEXT NOT NULL,
  pan_last4 TEXT NOT NULL
    CONSTRAINT delivery_partner_pan_last4_check CHECK (char_length(pan_last4) = 4),
  identity_consent_at TIMESTAMPTZ NOT NULL,

  preferred_delivery_area TEXT NOT NULL,
  available_days TEXT[] NOT NULL DEFAULT '{}',
  work_preference TEXT NOT NULL
    CONSTRAINT delivery_partner_work_preference_check
      CHECK (work_preference IN ('full_time', 'part_time')),

  terms_accepted_at TIMESTAMPTZ NOT NULL,
  retention_until TIMESTAMPTZ NOT NULL,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  review_notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT delivery_partner_applications_application_id_unique UNIQUE (application_id),
  CONSTRAINT delivery_partner_applications_mobile_format CHECK (mobile_normalized ~ '^[6-9][0-9]{9}$'),
  CONSTRAINT delivery_partner_applications_pincode_format CHECK (pincode ~ '^[1-9][0-9]{5}$'),
  CONSTRAINT delivery_partner_applications_email_format CHECK (position('@' IN email_normalized) > 1)
);

CREATE INDEX delivery_partner_applications_status_created_idx
  ON public.delivery_partner_applications (status, created_at DESC);

CREATE UNIQUE INDEX delivery_partner_applications_pending_email_uidx
  ON public.delivery_partner_applications (email_normalized)
  WHERE status = 'pending';

CREATE UNIQUE INDEX delivery_partner_applications_pending_mobile_uidx
  ON public.delivery_partner_applications (mobile_normalized)
  WHERE status = 'pending';

COMMENT ON TABLE public.delivery_partner_applications IS
  'Delivery partner onboarding applications. Aadhaar/PAN are AES-GCM ciphertext only.';

COMMENT ON COLUMN public.delivery_partner_applications.aadhaar_ciphertext IS
  'AES-256-GCM ciphertext of normalised Aadhaar. Never log or return to clients.';

COMMENT ON COLUMN public.delivery_partner_applications.pan_ciphertext IS
  'AES-256-GCM ciphertext of normalised PAN. Never log or return to clients.';

COMMENT ON COLUMN public.delivery_partner_applications.retention_until IS
  'Identity and application data should be deleted after this timestamp unless legally retained.';

-- =============================================================================
-- 3. UPDATED_AT TRIGGERS
-- =============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'set_updated_at' AND pg_function_is_visible(oid)
  ) THEN
    CREATE TRIGGER cook_applications_set_updated_at
      BEFORE UPDATE ON public.cook_applications
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

    CREATE TRIGGER delivery_partner_applications_set_updated_at
      BEFORE UPDATE ON public.delivery_partner_applications
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

-- =============================================================================
-- 4. ROW LEVEL SECURITY (deny-by-default for anon/authenticated)
-- =============================================================================

ALTER TABLE public.cook_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_partner_applications ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.cook_applications FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.delivery_partner_applications FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.cook_applications TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.delivery_partner_applications TO service_role;

-- =============================================================================
-- 5. PRIVATE PROFILE PHOTO BUCKET
-- =============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'application-profile-photos',
  'application-profile-photos',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- No storage policies for anon/authenticated — Nest service role only.

COMMIT;
