-- =============================================================================
-- Aahaa — Remove delivery partner Aadhaar/PAN collection
-- Migration: 20261131000000_drop_delivery_partner_identity_columns
-- Target: Supabase PostgreSQL
--
-- Drops identity columns introduced in 20261130000000_partner_applications.
-- Does not modify that earlier migration. Existing applicant rows (non-identity
-- fields) are preserved; Aadhaar/PAN ciphertext is permanently removed.
-- =============================================================================

BEGIN;

ALTER TABLE public.delivery_partner_applications
  DROP COLUMN IF EXISTS aadhaar_ciphertext,
  DROP COLUMN IF EXISTS aadhaar_last4,
  DROP COLUMN IF EXISTS pan_ciphertext,
  DROP COLUMN IF EXISTS pan_last4,
  DROP COLUMN IF EXISTS identity_consent_at;

COMMENT ON TABLE public.delivery_partner_applications IS
  'Delivery partner onboarding applications. Identity numbers are not collected.';

COMMIT;
