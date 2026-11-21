BEGIN;

ALTER TABLE public.delivery_partner_applications
  ALTER COLUMN profile_photo_path DROP NOT NULL,
  ALTER COLUMN current_address DROP NOT NULL,
  ALTER COLUMN vehicle_registration_number DROP NOT NULL,
  ALTER COLUMN driving_license_number DROP NOT NULL,
  ALTER COLUMN preferred_delivery_area DROP NOT NULL,
  ALTER COLUMN terms_accepted_at DROP NOT NULL,
  ADD COLUMN owns_vehicle BOOLEAN,
  ADD COLUMN available_days_mode TEXT,
  ADD COLUMN working_hours_mode TEXT,
  ADD COLUMN available_from TIME,
  ADD COLUMN available_until TIME,
  ADD CONSTRAINT delivery_partner_owns_vehicle_registration_check
    CHECK (
      owns_vehicle IS NULL
      OR (owns_vehicle AND vehicle_registration_number IS NOT NULL)
      OR (NOT owns_vehicle AND vehicle_registration_number IS NULL)
    ),
  ADD CONSTRAINT delivery_partner_available_days_mode_check
    CHECK (
      available_days_mode IS NULL
      OR available_days_mode IN ('all_days', 'weekdays', 'weekends', 'choose_days')
    ),
  ADD CONSTRAINT delivery_partner_available_days_match_mode_check
    CHECK (
      available_days_mode IS NULL
      OR (
        available_days_mode = 'all_days'
        AND available_days = ARRAY[
          'monday', 'tuesday', 'wednesday', 'thursday',
          'friday', 'saturday', 'sunday'
        ]::TEXT[]
      )
      OR (
        available_days_mode = 'weekdays'
        AND available_days = ARRAY[
          'monday', 'tuesday', 'wednesday', 'thursday', 'friday'
        ]::TEXT[]
      )
      OR (
        available_days_mode = 'weekends'
        AND available_days = ARRAY['saturday', 'sunday']::TEXT[]
      )
      OR (
        available_days_mode = 'choose_days'
        AND cardinality(available_days) > 0
        AND available_days <@ ARRAY[
          'monday', 'tuesday', 'wednesday', 'thursday',
          'friday', 'saturday', 'sunday'
        ]::TEXT[]
      )
    ),
  ADD CONSTRAINT delivery_partner_working_hours_mode_check
    CHECK (
      working_hours_mode IS NULL
      OR working_hours_mode IN ('full_app', 'custom')
    ),
  ADD CONSTRAINT delivery_partner_available_time_pair_check
    CHECK (
      (available_from IS NULL AND available_until IS NULL)
      OR (available_from IS NOT NULL AND available_until IS NOT NULL)
    ),
  ADD CONSTRAINT delivery_partner_available_time_range_check
    CHECK (
      available_from IS NULL
      OR (
        available_from >= TIME '18:00'
        AND available_from <= TIME '21:00'
        AND available_until >= TIME '18:00'
        AND available_until <= TIME '21:00'
        AND available_until > available_from
        AND EXTRACT(MINUTE FROM available_from) IN (0, 30)
        AND EXTRACT(MINUTE FROM available_until) IN (0, 30)
        AND EXTRACT(SECOND FROM available_from) = 0
        AND EXTRACT(SECOND FROM available_until) = 0
      )
    ),
  ADD CONSTRAINT delivery_partner_working_hours_match_mode_check
    CHECK (
      working_hours_mode IS NULL
      OR (
        working_hours_mode = 'full_app'
        AND available_from = TIME '18:00'
        AND available_until = TIME '21:00'
      )
      OR (
        working_hours_mode = 'custom'
        AND available_from IS NOT NULL
        AND available_until IS NOT NULL
      )
    );

COMMIT;
