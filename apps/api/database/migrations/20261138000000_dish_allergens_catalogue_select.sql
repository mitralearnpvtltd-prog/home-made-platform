BEGIN;

GRANT SELECT ON TABLE public.dish_allergens TO anon, authenticated;

DROP POLICY IF EXISTS dish_allergens_select_available
  ON public.dish_allergens;

CREATE POLICY dish_allergens_select_available
  ON public.dish_allergens
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.dishes AS d
      WHERE d.id = dish_allergens.dish_id
        AND d.is_available = true
    )
  );

COMMENT ON POLICY dish_allergens_select_available
  ON public.dish_allergens IS
  'Allow clients to read allergen labels for available dishes only.';

COMMIT;
