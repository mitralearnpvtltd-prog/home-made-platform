-- Support the current cook application fields without changing existing records.
-- Preference, availability days, and availability times already exist in the
-- original schema; food_references is the only new application-data column.
-- Removed form fields remain nullable for legacy records and new submissions.

BEGIN;

ALTER TABLE public.cook_applications
  ADD COLUMN food_references TEXT[] NOT NULL DEFAULT '{}',
  ALTER COLUMN kitchen_name DROP NOT NULL,
  ALTER COLUMN kitchen_address DROP NOT NULL,
  ALTER COLUMN years_experience DROP NOT NULL,
  ALTER COLUMN profile_photo_path DROP NOT NULL,
  ALTER COLUMN terms_accepted_at DROP NOT NULL;

COMMENT ON COLUMN public.cook_applications.food_references IS
  'Dish names selected or entered by the applicant.';

COMMENT ON COLUMN public.cook_applications.terms_accepted_at IS
  'Legacy consent timestamp; new cook applications do not collect terms acceptance.';

COMMIT;
