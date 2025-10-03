-- Seed current regulation data from JSON files

-- Area 19: Victoria, Sidney
INSERT INTO fishing_regulations (area_id, area_name, official_url, last_updated, last_verified, next_review_date, data_source)
VALUES (
  '19',
  'Victoria, Sidney',
  'https://www.pac.dfo-mpo.gc.ca/fm-gp/rec/tidal-maree/a-s19-eng.html',
  '2025-10-02'::timestamptz,
  '2025-10-02'::timestamptz,
  '2025-11-02'::timestamptz,
  'DFO Pacific Region'
)
RETURNING id AS area_19_id;

-- Get the ID for Area 19 (you'll need to replace this with actual ID after running)
DO $$
DECLARE
  area_19_id UUID;
  area_20_id UUID;
BEGIN
  -- Get Area 19 ID
  SELECT id INTO area_19_id FROM fishing_regulations WHERE area_id = '19' LIMIT 1;

  -- Insert Area 19 species
  INSERT INTO species_regulations (regulation_id, species_id, species_name, scientific_name, daily_limit, annual_limit, min_size, max_size, status, gear, season, notes) VALUES
  (area_19_id, 'chinook-salmon', 'Chinook Salmon', 'Oncorhynchus tshawytscha', '2', '10', '45cm', NULL, 'Restricted', 'Barbless hook and line', 'Varies by subarea',
   '["Subareas 19-1 to 19-4: 2 daily limit, 45cm minimum", "Subareas 19-5 and 19-6: 2 daily limit, 62cm minimum", "Subareas 19-7 to 19-12: 0 retention (closed)", "Must have salmon conservation stamp", "Must record retained catch immediately"]'::jsonb),

  (area_19_id, 'chum-salmon', 'Chum Salmon', 'Oncorhynchus keta', '2', NULL, '30cm', NULL, 'Open', 'Barbless hook and line', 'September - December', '[]'::jsonb),

  (area_19_id, 'coho-salmon', 'Coho Salmon', 'Oncorhynchus kisutch', '2', NULL, '30cm', NULL, 'Open', 'Barbless hook and line', 'June - October',
   '["Max 2 hatchery-marked, 1 wild-unmarked"]'::jsonb),

  (area_19_id, 'pink-salmon', 'Pink Salmon', 'Oncorhynchus gorbuscha', '4', NULL, '30cm', NULL, 'Open', 'Barbless hook and line', 'July - September (odd years)', '[]'::jsonb),

  (area_19_id, 'sockeye-salmon', 'Sockeye Salmon', 'Oncorhynchus nerka', '0', NULL, '30cm', NULL, 'Non Retention', 'Barbless hook and line', 'Year-round closure', '[]'::jsonb),

  (area_19_id, 'halibut', 'Halibut', 'Hippoglossus stenolepis', '1', '10', NULL, '102cm', 'Open', 'Hook and line', 'Year-round',
   '["Head-on measurement"]'::jsonb),

  (area_19_id, 'lingcod', 'Lingcod', 'Ophiodon elongatus', '1', '10', '65cm', NULL, 'Open', 'Hook and line', 'May 1 - September 30',
   '["Minimum fillet size 53cm head-off", "Seasonal closure outside May-September in inside waters"]'::jsonb),

  (area_19_id, 'rockfish', 'Rockfish', 'Sebastes spp.', '0', NULL, NULL, NULL, 'Closed', 'Hook and line', 'Closed',
   '["Most rockfish species are closed in Area 19", "Yelloweye Rockfish: 0 (Non-Retention)", "Must use descender device for released fish"]'::jsonb),

  (area_19_id, 'trout', 'Trout', 'Oncorhynchus mykiss', '2', NULL, '30cm', NULL, 'Open', 'Hook and line', 'Year-round',
   '["Max 2 hatchery-marked, 0 wild-unmarked"]'::jsonb),

  (area_19_id, 'dungeness-crab', 'Dungeness Crab', 'Metacarcinus magister', '4', NULL, '165mm', NULL, 'Open', 'Trap, ring net, diving', 'Year-round',
   '["Combined with Red Rock Crab (4 total)", "No female crabs", "Daylight hours only for setting/hauling traps"]'::jsonb),

  (area_19_id, 'red-rock-crab', 'Red Rock Crab', 'Cancer productus', '4', NULL, '115mm', NULL, 'Open', 'Trap, ring net, diving', 'Year-round',
   '["Combined with Dungeness Crab (4 total)", "No female crabs", "Daylight hours only for setting/hauling traps"]'::jsonb);

  -- Insert Area 19 general rules
  INSERT INTO regulation_general_rules (regulation_id, rule_text, sort_order) VALUES
  (area_19_id, 'Must have BC Tidal Waters sport fishing licence', 1),
  (area_19_id, 'Must record certain retained catches immediately', 2),
  (area_19_id, 'Barbless hooks required for salmon', 3),
  (area_19_id, 'Some areas have specific closures', 4);

  -- Area 20: Sooke
  INSERT INTO fishing_regulations (area_id, area_name, official_url, last_updated, last_verified, next_review_date, data_source)
  VALUES (
    '20',
    'Sooke',
    'https://www.pac.dfo-mpo.gc.ca/fm-gp/rec/tidal-maree/a-s20-eng.html',
    '2025-10-02'::timestamptz,
    '2025-10-02'::timestamptz,
    '2025-11-02'::timestamptz,
    'DFO Pacific Region'
  )
  RETURNING id INTO area_20_id;

  -- Insert Area 20 species
  INSERT INTO species_regulations (regulation_id, species_id, species_name, scientific_name, daily_limit, annual_limit, min_size, max_size, status, gear, season, notes) VALUES
  (area_20_id, 'chinook-salmon', 'Chinook Salmon', 'Oncorhynchus tshawytscha', '2', '10', '45cm', NULL, 'Restricted', 'Barbless hook and line', 'Year-round',
   '["Subareas 20-1 to 20-5: 2 daily limit", "Subareas 20-6 and 20-7: 0 retention (closed)", "Must have salmon conservation stamp", "Must record retained catch immediately"]'::jsonb),

  (area_20_id, 'coho-salmon', 'Coho Salmon', 'Oncorhynchus kisutch', '4', NULL, '30cm', NULL, 'Open', 'Barbless hook and line', 'June - October',
   '["Max 4 hatchery-marked, 1 wild-unmarked"]'::jsonb),

  (area_20_id, 'chum-salmon', 'Chum Salmon', 'Oncorhynchus keta', '2', NULL, '30cm', NULL, 'Open', 'Barbless hook and line', 'September - December', '[]'::jsonb),

  (area_20_id, 'pink-salmon', 'Pink Salmon', 'Oncorhynchus gorbuscha', '4', NULL, '30cm', NULL, 'Open', 'Barbless hook and line', 'July - September (odd years)', '[]'::jsonb),

  (area_20_id, 'sockeye-salmon', 'Sockeye Salmon', 'Oncorhynchus nerka', '0', NULL, NULL, NULL, 'Non Retention', 'Barbless hook and line', 'Year-round closure', '[]'::jsonb),

  (area_20_id, 'lingcod', 'Lingcod', 'Ophiodon elongatus', '3', NULL, '65cm', NULL, 'Restricted', 'Angling, spear fishing while diving', 'Varies by subarea',
   '["Subareas 20-1 to 20-4: Daily limit 3", "Subareas 20-5 to 20-7: Closed (0 retention)"]'::jsonb),

  (area_20_id, 'halibut', 'Halibut', 'Hippoglossus stenolepis', '1', '10', NULL, '102cm', 'Open', 'Angling, spear fishing while diving', 'Year-round',
   '["Head-on measurement", "78cm maximum head-off"]'::jsonb),

  (area_20_id, 'rockfish', 'Rockfish', 'Sebastes spp.', '3', NULL, NULL, NULL, 'Restricted', 'Hook and line', 'Varies by subarea',
   '["Subareas 20-1 to 20-4: Daily limit 3", "Subareas 20-5 to 20-7: Closed (0 retention)", "Yelloweye Rockfish: 0 (Non-Retention)", "Must use descender device for released fish"]'::jsonb);

  -- Insert Area 20 general rules
  INSERT INTO regulation_general_rules (regulation_id, rule_text, sort_order) VALUES
  (area_20_id, 'Must have BC Tidal Waters sport fishing licence', 1),
  (area_20_id, 'Possession limit typically double daily limit', 2),
  (area_20_id, 'Barbless hooks required', 3),
  (area_20_id, 'Must record certain retained catches immediately', 4);

  -- Insert Area 20 protected areas
  INSERT INTO regulation_protected_areas (regulation_id, area_name) VALUES
  (area_20_id, 'Race Rocks'),
  (area_20_id, 'Rockfish Conservation Areas in Becher Bay'),
  (area_20_id, 'Rockfish Conservation Areas in Sooke Bay'),
  (area_20_id, 'Pacific Rim National Park (specific closures)');
END $$;
