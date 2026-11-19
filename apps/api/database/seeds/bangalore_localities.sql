-- =============================================================================
-- Aahaa — Bangalore from-locality seed
-- File: bangalore_localities.sql
-- Target: Supabase PostgreSQL (public.locations)
--
-- Idempotent: skips rows that already match the uniqueness rule
-- (location_type, name, state, COALESCE(city, ''), COALESCE(district, '')).
-- No To destinations. Do not run as a migration substitute.
-- =============================================================================

INSERT INTO public.locations (name, city, district, state, location_type, is_active)
SELECT v.name, v.city, v.district, v.state, v.location_type, v.is_active
FROM (
  VALUES
    -- Central Bangalore
    ('Indiranagar', 'Bengaluru', NULL::TEXT, 'Karnataka', 'from_locality', true),
    ('Malleshwaram', 'Bengaluru', NULL, 'Karnataka', 'from_locality', true),
    ('Richmond Town', 'Bengaluru', NULL, 'Karnataka', 'from_locality', true),
    ('Vasanth Nagar', 'Bengaluru', NULL, 'Karnataka', 'from_locality', true),
    ('Shivajinagar', 'Bengaluru', NULL, 'Karnataka', 'from_locality', true),
    ('Ulsoor', 'Bengaluru', NULL, 'Karnataka', 'from_locality', true),
    ('Sadashivanagar', 'Bengaluru', NULL, 'Karnataka', 'from_locality', true),
    ('Rajajinagar', 'Bengaluru', NULL, 'Karnataka', 'from_locality', true),
    ('Central Business District (CBD)', 'Bengaluru', NULL, 'Karnataka', 'from_locality', true),
    -- East Bangalore
    ('Whitefield', 'Bengaluru', NULL, 'Karnataka', 'from_locality', true),
    ('Marathahalli', 'Bengaluru', NULL, 'Karnataka', 'from_locality', true),
    ('Bellandur', 'Bengaluru', NULL, 'Karnataka', 'from_locality', true),
    ('Varthur', 'Bengaluru', NULL, 'Karnataka', 'from_locality', true),
    ('KR Puram', 'Bengaluru', NULL, 'Karnataka', 'from_locality', true),
    ('Mahadevapura', 'Bengaluru', NULL, 'Karnataka', 'from_locality', true),
    ('CV Raman Nagar', 'Bengaluru', NULL, 'Karnataka', 'from_locality', true),
    -- North-East Bangalore
    ('Banaswadi', 'Bengaluru', NULL, 'Karnataka', 'from_locality', true),
    ('HBR Layout', 'Bengaluru', NULL, 'Karnataka', 'from_locality', true),
    ('Horamavu', 'Bengaluru', NULL, 'Karnataka', 'from_locality', true),
    ('Kalyan Nagar', 'Bengaluru', NULL, 'Karnataka', 'from_locality', true),
    ('Kammanahalli', 'Bengaluru', NULL, 'Karnataka', 'from_locality', true),
    ('Hennur', 'Bengaluru', NULL, 'Karnataka', 'from_locality', true),
    -- North Bangalore
    ('Hebbal', 'Bengaluru', NULL, 'Karnataka', 'from_locality', true),
    ('Yelahanka', 'Bengaluru', NULL, 'Karnataka', 'from_locality', true),
    ('Jakkur', 'Bengaluru', NULL, 'Karnataka', 'from_locality', true),
    ('Mathikere', 'Bengaluru', NULL, 'Karnataka', 'from_locality', true),
    ('Peenya', 'Bengaluru', NULL, 'Karnataka', 'from_locality', true),
    ('Devanahalli', 'Bengaluru', 'Bengaluru Rural', 'Karnataka', 'from_locality', true),
    -- South-East Bangalore
    ('Koramangala', 'Bengaluru', NULL, 'Karnataka', 'from_locality', true),
    ('HSR Layout', 'Bengaluru', NULL, 'Karnataka', 'from_locality', true),
    ('BTM Layout', 'Bengaluru', NULL, 'Karnataka', 'from_locality', true),
    ('Bommanahalli', 'Bengaluru', NULL, 'Karnataka', 'from_locality', true),
    ('Madiwala', 'Bengaluru', NULL, 'Karnataka', 'from_locality', true),
    ('Electronic City', 'Bengaluru', NULL, 'Karnataka', 'from_locality', true),
    -- South Bangalore
    ('Jayanagar', 'Bengaluru', NULL, 'Karnataka', 'from_locality', true),
    ('JP Nagar', 'Bengaluru', NULL, 'Karnataka', 'from_locality', true),
    ('Banashankari', 'Bengaluru', NULL, 'Karnataka', 'from_locality', true),
    ('Basavanagudi', 'Bengaluru', NULL, 'Karnataka', 'from_locality', true),
    ('Bannerghatta Road', 'Bengaluru', NULL, 'Karnataka', 'from_locality', true),
    ('Kanakapura Road', 'Bengaluru', NULL, 'Karnataka', 'from_locality', true),
    -- West Bangalore
    ('Vijayanagar', 'Bengaluru', NULL, 'Karnataka', 'from_locality', true),
    ('Basaveshwaranagar', 'Bengaluru', NULL, 'Karnataka', 'from_locality', true),
    ('Nagarbhavi', 'Bengaluru', NULL, 'Karnataka', 'from_locality', true),
    ('Kengeri', 'Bengaluru', NULL, 'Karnataka', 'from_locality', true),
    ('Rajarajeshwari Nagar', 'Bengaluru', NULL, 'Karnataka', 'from_locality', true)
) AS v(name, city, district, state, location_type, is_active)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.locations AS existing
  WHERE existing.location_type = v.location_type
    AND existing.name = v.name
    AND existing.state = v.state
    AND COALESCE(existing.city, '') = COALESCE(v.city, '')
    AND COALESCE(existing.district, '') = COALESCE(v.district, '')
);
