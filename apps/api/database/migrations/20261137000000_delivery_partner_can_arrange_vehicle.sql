BEGIN;

ALTER TABLE public.delivery_partner_applications
  ADD COLUMN can_arrange_vehicle BOOLEAN,
  ADD CONSTRAINT delivery_partner_can_arrange_vehicle_ownership_check
    CHECK (
      can_arrange_vehicle IS NULL
      OR owns_vehicle IS NOT DISTINCT FROM FALSE
    );

COMMIT;
