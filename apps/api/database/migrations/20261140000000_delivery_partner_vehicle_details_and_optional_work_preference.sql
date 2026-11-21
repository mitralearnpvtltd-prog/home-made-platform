BEGIN;

ALTER TABLE public.delivery_partner_applications
  ADD COLUMN vehicle_type TEXT,
  ADD COLUMN other_vehicle_description TEXT,
  ALTER COLUMN work_preference DROP NOT NULL;

ALTER TABLE public.delivery_partner_applications
  DROP CONSTRAINT IF EXISTS delivery_partner_owns_vehicle_registration_check,
  ADD CONSTRAINT delivery_partner_vehicle_details_check
    CHECK (
      CASE
        WHEN owns_vehicle IS NULL THEN
          vehicle_type IS NULL
          AND other_vehicle_description IS NULL
        WHEN owns_vehicle = FALSE THEN
          vehicle_type IS NULL
          AND vehicle_registration_number IS NULL
          AND other_vehicle_description IS NULL
        WHEN owns_vehicle = TRUE AND vehicle_type IS NULL THEN
          vehicle_registration_number IS NOT NULL
          AND other_vehicle_description IS NULL
        WHEN owns_vehicle = TRUE AND vehicle_type IN ('bike', 'car', 'auto') THEN
          vehicle_registration_number IS NOT NULL
          AND other_vehicle_description IS NULL
        WHEN owns_vehicle = TRUE AND vehicle_type = 'other' THEN
          vehicle_registration_number IS NULL
          AND other_vehicle_description IS NOT NULL
          AND char_length(btrim(other_vehicle_description)) BETWEEN 2 AND 80
        ELSE FALSE
      END
    );

COMMIT;
