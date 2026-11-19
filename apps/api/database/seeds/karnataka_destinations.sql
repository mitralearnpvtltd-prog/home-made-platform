-- =============================================================================
-- Aahaa — Karnataka to-destination seed
-- File: karnataka_destinations.sql
-- Target: Supabase PostgreSQL (public.locations)
--
-- Idempotent: skips rows that already match the uniqueness rule
-- (location_type, name, state, COALESCE(city, ''), COALESCE(district, '')).
-- Bengaluru / Bangalore are intentionally excluded (From localities only).
-- Do not run as a migration substitute.
-- =============================================================================

INSERT INTO public.locations (name, city, district, state, location_type, is_active)
SELECT v.name, v.city, v.district, v.state, v.location_type, v.is_active
FROM (
  VALUES
    -- South Karnataka
    ('Mysuru', 'Mysuru', NULL::TEXT, 'Karnataka', 'to_destination', true),
    ('Mandya', 'Mandya', NULL, 'Karnataka', 'to_destination', true),
    ('Srirangapatna', 'Srirangapatna', NULL, 'Karnataka', 'to_destination', true),
    ('Nanjangud', 'Nanjangud', NULL, 'Karnataka', 'to_destination', true),
    ('Chamarajanagar', 'Chamarajanagar', NULL, 'Karnataka', 'to_destination', true),
    ('Kollegal', 'Kollegal', NULL, 'Karnataka', 'to_destination', true),
    ('Gundlupet', 'Gundlupet', NULL, 'Karnataka', 'to_destination', true),
    ('Maddur', 'Maddur', NULL, 'Karnataka', 'to_destination', true),
    ('Malavalli', 'Malavalli', NULL, 'Karnataka', 'to_destination', true),
    ('Nagamangala', 'Nagamangala', NULL, 'Karnataka', 'to_destination', true),
    ('Pandavapura', 'Pandavapura', NULL, 'Karnataka', 'to_destination', true),
    ('Krishnarajanagara', 'Krishnarajanagara', NULL, 'Karnataka', 'to_destination', true),
    ('Hunsur', 'Hunsur', NULL, 'Karnataka', 'to_destination', true),
    -- Hassan / Chikkamagaluru / Kodagu
    ('Hassan', 'Hassan', NULL, 'Karnataka', 'to_destination', true),
    ('Belur', 'Belur', NULL, 'Karnataka', 'to_destination', true),
    ('Halebidu', 'Halebidu', NULL, 'Karnataka', 'to_destination', true),
    ('Sakleshpur', 'Sakleshpur', NULL, 'Karnataka', 'to_destination', true),
    ('Arsikere', 'Arsikere', NULL, 'Karnataka', 'to_destination', true),
    ('Channarayapatna', 'Channarayapatna', NULL, 'Karnataka', 'to_destination', true),
    ('Shravanabelagola', 'Shravanabelagola', NULL, 'Karnataka', 'to_destination', true),
    ('Chikkamagaluru', 'Chikkamagaluru', NULL, 'Karnataka', 'to_destination', true),
    ('Mudigere', 'Mudigere', NULL, 'Karnataka', 'to_destination', true),
    ('Kadur', 'Kadur', NULL, 'Karnataka', 'to_destination', true),
    ('Tarikere', 'Tarikere', NULL, 'Karnataka', 'to_destination', true),
    ('Sringeri', 'Sringeri', NULL, 'Karnataka', 'to_destination', true),
    ('Koppa', 'Koppa', NULL, 'Karnataka', 'to_destination', true),
    ('Madikeri', 'Madikeri', NULL, 'Karnataka', 'to_destination', true),
    ('Virajpet', 'Virajpet', NULL, 'Karnataka', 'to_destination', true),
    ('Somwarpet', 'Somwarpet', NULL, 'Karnataka', 'to_destination', true),
    -- Coastal Karnataka
    ('Mangaluru', 'Mangaluru', NULL, 'Karnataka', 'to_destination', true),
    ('Udupi', 'Udupi', NULL, 'Karnataka', 'to_destination', true),
    ('Kundapura', 'Kundapura', NULL, 'Karnataka', 'to_destination', true),
    ('Karkala', 'Karkala', NULL, 'Karnataka', 'to_destination', true),
    ('Moodbidri', 'Moodbidri', NULL, 'Karnataka', 'to_destination', true),
    ('Puttur', 'Puttur', NULL, 'Karnataka', 'to_destination', true),
    ('Bantwal', 'Bantwal', NULL, 'Karnataka', 'to_destination', true),
    ('Sullia', 'Sullia', NULL, 'Karnataka', 'to_destination', true),
    ('Belthangady', 'Belthangady', NULL, 'Karnataka', 'to_destination', true),
    ('Dharmasthala', 'Dharmasthala', NULL, 'Karnataka', 'to_destination', true),
    ('Kukke Subramanya', 'Kukke Subramanya', NULL, 'Karnataka', 'to_destination', true),
    ('Murudeshwar', 'Murudeshwar', NULL, 'Karnataka', 'to_destination', true),
    ('Gokarna', 'Gokarna', NULL, 'Karnataka', 'to_destination', true),
    ('Karwar', 'Karwar', NULL, 'Karnataka', 'to_destination', true),
    ('Sirsi', 'Sirsi', NULL, 'Karnataka', 'to_destination', true),
    ('Kumta', 'Kumta', NULL, 'Karnataka', 'to_destination', true),
    ('Honavar', 'Honavar', NULL, 'Karnataka', 'to_destination', true),
    ('Bhatkal', 'Bhatkal', NULL, 'Karnataka', 'to_destination', true),
    ('Ankola', 'Ankola', NULL, 'Karnataka', 'to_destination', true),
    ('Dandeli', 'Dandeli', NULL, 'Karnataka', 'to_destination', true),
    ('Kollur', 'Kollur', NULL, 'Karnataka', 'to_destination', true),
    -- Central Karnataka
    ('Shivamogga', 'Shivamogga', NULL, 'Karnataka', 'to_destination', true),
    ('Bhadravati', 'Bhadravati', NULL, 'Karnataka', 'to_destination', true),
    ('Sagar', 'Sagar', NULL, 'Karnataka', 'to_destination', true),
    ('Thirthahalli', 'Thirthahalli', NULL, 'Karnataka', 'to_destination', true),
    ('Shikaripur', 'Shikaripur', NULL, 'Karnataka', 'to_destination', true),
    ('Chitradurga', 'Chitradurga', NULL, 'Karnataka', 'to_destination', true),
    ('Challakere', 'Challakere', NULL, 'Karnataka', 'to_destination', true),
    ('Hiriyur', 'Hiriyur', NULL, 'Karnataka', 'to_destination', true),
    ('Davanagere', 'Davanagere', NULL, 'Karnataka', 'to_destination', true),
    ('Harihara', 'Harihara', NULL, 'Karnataka', 'to_destination', true),
    ('Harapanahalli', 'Harapanahalli', NULL, 'Karnataka', 'to_destination', true),
    ('Tumakuru', 'Tumakuru', NULL, 'Karnataka', 'to_destination', true),
    ('Tiptur', 'Tiptur', NULL, 'Karnataka', 'to_destination', true),
    ('Sira', 'Sira', NULL, 'Karnataka', 'to_destination', true),
    ('Madhugiri', 'Madhugiri', NULL, 'Karnataka', 'to_destination', true),
    ('Kunigal', 'Kunigal', NULL, 'Karnataka', 'to_destination', true),
    ('Gubbi', 'Gubbi', NULL, 'Karnataka', 'to_destination', true),
    ('Pavagada', 'Pavagada', NULL, 'Karnataka', 'to_destination', true),
    -- Bengaluru Rural belt (not Bengaluru city)
    ('Ramanagara', 'Ramanagara', NULL, 'Karnataka', 'to_destination', true),
    ('Channapatna', 'Channapatna', NULL, 'Karnataka', 'to_destination', true),
    ('Kanakapura', 'Kanakapura', NULL, 'Karnataka', 'to_destination', true),
    ('Magadi', 'Magadi', NULL, 'Karnataka', 'to_destination', true),
    ('Bidadi', 'Bidadi', NULL, 'Karnataka', 'to_destination', true),
    ('Doddaballapura', 'Doddaballapura', NULL, 'Karnataka', 'to_destination', true),
    ('Nelamangala', 'Nelamangala', NULL, 'Karnataka', 'to_destination', true),
    ('Hoskote', 'Hoskote', NULL, 'Karnataka', 'to_destination', true),
    -- East / Kolar belt
    ('Kolar', 'Kolar', NULL, 'Karnataka', 'to_destination', true),
    ('Kolar Gold Fields', 'Kolar Gold Fields', NULL, 'Karnataka', 'to_destination', true),
    ('Bangarapet', 'Bangarapet', NULL, 'Karnataka', 'to_destination', true),
    ('Malur', 'Malur', NULL, 'Karnataka', 'to_destination', true),
    ('Mulbagal', 'Mulbagal', NULL, 'Karnataka', 'to_destination', true),
    ('Chikkaballapur', 'Chikkaballapur', NULL, 'Karnataka', 'to_destination', true),
    ('Chintamani', 'Chintamani', NULL, 'Karnataka', 'to_destination', true),
    ('Sidlaghatta', 'Sidlaghatta', NULL, 'Karnataka', 'to_destination', true),
    ('Gauribidanur', 'Gauribidanur', NULL, 'Karnataka', 'to_destination', true),
    ('Bagepalli', 'Bagepalli', NULL, 'Karnataka', 'to_destination', true),
    -- North Karnataka
    ('Hubballi', 'Hubballi', NULL, 'Karnataka', 'to_destination', true),
    ('Dharwad', 'Dharwad', NULL, 'Karnataka', 'to_destination', true),
    ('Belagavi', 'Belagavi', NULL, 'Karnataka', 'to_destination', true),
    ('Gokak', 'Gokak', NULL, 'Karnataka', 'to_destination', true),
    ('Athani', 'Athani', NULL, 'Karnataka', 'to_destination', true),
    ('Chikkodi', 'Chikkodi', NULL, 'Karnataka', 'to_destination', true),
    ('Nipani', 'Nipani', NULL, 'Karnataka', 'to_destination', true),
    ('Bailhongal', 'Bailhongal', NULL, 'Karnataka', 'to_destination', true),
    ('Sankeshwar', 'Sankeshwar', NULL, 'Karnataka', 'to_destination', true),
    ('Bagalkot', 'Bagalkot', NULL, 'Karnataka', 'to_destination', true),
    ('Badami', 'Badami', NULL, 'Karnataka', 'to_destination', true),
    ('Ilkal', 'Ilkal', NULL, 'Karnataka', 'to_destination', true),
    ('Jamkhandi', 'Jamkhandi', NULL, 'Karnataka', 'to_destination', true),
    ('Mudhol', 'Mudhol', NULL, 'Karnataka', 'to_destination', true),
    ('Gadag', 'Gadag', NULL, 'Karnataka', 'to_destination', true),
    ('Haveri', 'Haveri', NULL, 'Karnataka', 'to_destination', true),
    ('Ranebennur', 'Ranebennur', NULL, 'Karnataka', 'to_destination', true),
    ('Byadgi', 'Byadgi', NULL, 'Karnataka', 'to_destination', true),
    ('Hangal', 'Hangal', NULL, 'Karnataka', 'to_destination', true),
    ('Koppal', 'Koppal', NULL, 'Karnataka', 'to_destination', true),
    ('Gangavathi', 'Gangavathi', NULL, 'Karnataka', 'to_destination', true),
    ('Hosapete', 'Hosapete', NULL, 'Karnataka', 'to_destination', true),
    ('Ballari', 'Ballari', NULL, 'Karnataka', 'to_destination', true),
    ('Sandur', 'Sandur', NULL, 'Karnataka', 'to_destination', true),
    ('Siruguppa', 'Siruguppa', NULL, 'Karnataka', 'to_destination', true),
    ('Vijayapura', 'Vijayapura', NULL, 'Karnataka', 'to_destination', true),
    ('Indi', 'Indi', NULL, 'Karnataka', 'to_destination', true),
    ('Basavana Bagewadi', 'Basavana Bagewadi', NULL, 'Karnataka', 'to_destination', true),
    ('Muddebihal', 'Muddebihal', NULL, 'Karnataka', 'to_destination', true),
    ('Kalaburagi', 'Kalaburagi', NULL, 'Karnataka', 'to_destination', true),
    ('Sedam', 'Sedam', NULL, 'Karnataka', 'to_destination', true),
    ('Aland', 'Aland', NULL, 'Karnataka', 'to_destination', true),
    ('Yadgir', 'Yadgir', NULL, 'Karnataka', 'to_destination', true),
    ('Shahapur', 'Shahapur', NULL, 'Karnataka', 'to_destination', true),
    ('Raichur', 'Raichur', NULL, 'Karnataka', 'to_destination', true),
    ('Sindhanur', 'Sindhanur', NULL, 'Karnataka', 'to_destination', true),
    ('Manvi', 'Manvi', NULL, 'Karnataka', 'to_destination', true),
    ('Bidar', 'Bidar', NULL, 'Karnataka', 'to_destination', true),
    ('Basavakalyan', 'Basavakalyan', NULL, 'Karnataka', 'to_destination', true),
    ('Bhalki', 'Bhalki', NULL, 'Karnataka', 'to_destination', true),
    ('Humnabad', 'Humnabad', NULL, 'Karnataka', 'to_destination', true)
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
