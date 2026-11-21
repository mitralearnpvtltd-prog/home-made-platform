-- Store each selected cook-availability day and timing mode.
-- Existing applications receive an empty schedule and retain their legacy
-- available_days and kitchen time values for display compatibility.

BEGIN;

ALTER TABLE public.cook_applications
  ADD COLUMN availability_mode TEXT NOT NULL DEFAULT 'shared'
    CONSTRAINT cook_applications_availability_mode_check
      CHECK (availability_mode IN ('shared', 'per_day')),
  ADD COLUMN availability_by_day JSONB NOT NULL DEFAULT '{}'::jsonb
    CONSTRAINT cook_applications_availability_by_day_object_check
      CHECK (jsonb_typeof(availability_by_day) = 'object');

COMMENT ON COLUMN public.cook_applications.availability_mode IS
  'Whether all available days share one schedule or use per-day schedules.';

COMMENT ON COLUMN public.cook_applications.availability_by_day IS
  'Availability times keyed by weekday, with each value containing from and until.';

COMMIT;
