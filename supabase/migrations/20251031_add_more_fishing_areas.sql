-- Add more fishing areas to support dynamic regulations across BC
-- This migration adds popular fishing areas with placeholder regulations

-- Area 23: Tofino, Ucluelet
INSERT INTO fishing_regulations (area_id, area_name, official_url, last_updated, last_verified, next_review_date, data_source)
VALUES (
  '23',
  'Tofino, Ucluelet',
  'https://www.pac.dfo-mpo.gc.ca/fm-gp/rec/tidal-maree/a-s23-eng.html',
  NOW()::timestamptz,
  NOW()::timestamptz,
  (NOW() + INTERVAL '30 days')::timestamptz,
  'DFO Pacific Region'
);

-- Area 13: Campbell River
INSERT INTO fishing_regulations (area_id, area_name, official_url, last_updated, last_verified, next_review_date, data_source)
VALUES (
  '13',
  'Campbell River',
  'https://www.pac.dfo-mpo.gc.ca/fm-gp/rec/tidal-maree/a-s13-eng.html',
  NOW()::timestamptz,
  NOW()::timestamptz,
  (NOW() + INTERVAL '30 days')::timestamptz,
  'DFO Pacific Region'
);

-- Area 27: Nanaimo
INSERT INTO fishing_regulations (area_id, area_name, official_url, last_updated, last_verified, next_review_date, data_source)
VALUES (
  '27',
  'Nanaimo',
  'https://www.pac.dfo-mpo.gc.ca/fm-gp/rec/tidal-maree/a-s27-eng.html',
  NOW()::timestamptz,
  NOW()::timestamptz,
  (NOW() + INTERVAL '30 days')::timestamptz,
  'DFO Pacific Region'
);

-- Area 3: Prince Rupert
INSERT INTO fishing_regulations (area_id, area_name, official_url, last_updated, last_verified, next_review_date, data_source)
VALUES (
  '3',
  'Prince Rupert',
  'https://www.pac.dfo-mpo.gc.ca/fm-gp/rec/tidal-maree/a-s3-eng.html',
  NOW()::timestamptz,
  NOW()::timestamptz,
  (NOW() + INTERVAL '30 days')::timestamptz,
  'DFO Pacific Region'
);

-- Area 29: Powell River
INSERT INTO fishing_regulations (area_id, area_name, official_url, last_updated, last_verified, next_review_date, data_source)
VALUES (
  '29',
  'Powell River',
  'https://www.pac.dfo-mpo.gc.ca/fm-gp/rec/tidal-maree/a-s29-eng.html',
  NOW()::timestamptz,
  NOW()::timestamptz,
  (NOW() + INTERVAL '30 days')::timestamptz,
  'DFO Pacific Region'
);

-- Area 28: Pender Harbour
INSERT INTO fishing_regulations (area_id, area_name, official_url, last_updated, last_verified, next_review_date, data_source)
VALUES (
  '28',
  'Pender Harbour',
  'https://www.pac.dfo-mpo.gc.ca/fm-gp/rec/tidal-maree/a-s28-eng.html',
  NOW()::timestamptz,
  NOW()::timestamptz,
  (NOW() + INTERVAL '30 days')::timestamptz,
  'DFO Pacific Region'
);

-- Area 121: Haida Gwaii
INSERT INTO fishing_regulations (area_id, area_name, official_url, last_updated, last_verified, next_review_date, data_source)
VALUES (
  '121',
  'Haida Gwaii',
  'https://www.pac.dfo-mpo.gc.ca/fm-gp/rec/tidal-maree/a-s121-eng.html',
  NOW()::timestamptz,
  NOW()::timestamptz,
  (NOW() + INTERVAL '30 days')::timestamptz,
  'DFO Pacific Region'
);

-- Add placeholder species regulations for each new area
-- This is temporary data until the scraper is implemented
DO $$
DECLARE
  area_record RECORD;
BEGIN
  -- Loop through the newly added areas
  FOR area_record IN
    SELECT id, area_id, area_name
    FROM fishing_regulations
    WHERE area_id IN ('23', '13', '27', '3', '29', '28', '121')
  LOOP
    -- Add common species regulations (placeholder data)
    -- Note: These are generic regulations and should be updated with actual data from DFO

    -- Chinook Salmon (varies by area, this is placeholder)
    INSERT INTO species_regulations (
      regulation_id, species_id, species_name, scientific_name,
      daily_limit, annual_limit, min_size, max_size,
      status, gear, season, notes
    ) VALUES (
      area_record.id, 'chinook-salmon', 'Chinook Salmon', 'Oncorhynchus tshawytscha',
      '2', '10', '62cm', NULL,
      'Restricted', 'Barbless hook and line', 'Varies by month',
      '["Check current DFO regulations for this area", "Sizes and limits may vary by subarea"]'::jsonb
    );

    -- Coho Salmon
    INSERT INTO species_regulations (
      regulation_id, species_id, species_name, scientific_name,
      daily_limit, min_size, status, gear, season, notes
    ) VALUES (
      area_record.id, 'coho-salmon', 'Coho Salmon', 'Oncorhynchus kisutch',
      '2', '30cm', 'Open', 'Barbless hook and line', 'June - October',
      '["Max 2 hatchery-marked, 1 wild-unmarked", "Check current DFO regulations"]'::jsonb
    );

    -- Halibut
    INSERT INTO species_regulations (
      regulation_id, species_id, species_name, scientific_name,
      daily_limit, annual_limit, max_size, status, gear, season
    ) VALUES (
      area_record.id, 'halibut', 'Halibut', 'Hippoglossus stenolepis',
      '1', '6', '133cm', 'Open', 'Hook and line', 'Year-round'
    );

    -- Lingcod
    INSERT INTO species_regulations (
      regulation_id, species_id, species_name, scientific_name,
      daily_limit, min_size, status, gear, season, notes
    ) VALUES (
      area_record.id, 'lingcod', 'Lingcod', 'Ophiodon elongatus',
      '1', '65cm', 'Open', 'Hook and line', 'May 1 - September 30',
      '["Seasonal closure outside May-September in inside waters"]'::jsonb
    );

    -- Rockfish (generally restricted)
    INSERT INTO species_regulations (
      regulation_id, species_id, species_name, scientific_name,
      daily_limit, status, gear, season, notes
    ) VALUES (
      area_record.id, 'rockfish', 'Rockfish', 'Sebastes spp.',
      '0', 'Closed', 'Hook and line', 'Closed',
      '["Most rockfish species closed", "Check current DFO regulations for exceptions"]'::jsonb
    );

    -- General rules for each area
    INSERT INTO regulation_general_rules (regulation_id, rule_text, sort_order)
    VALUES
      (area_record.id, 'Must have BC Tidal Waters sport fishing licence', 1),
      (area_record.id, 'Barbless hooks required for salmon', 2),
      (area_record.id, 'Check current DFO regulations for complete and updated information', 3),
      (area_record.id, 'Some subareas may have specific closures or restrictions', 4);

  END LOOP;
END $$;

-- Add a note about data accuracy
COMMENT ON TABLE fishing_regulations IS 'Fishing regulations by area. Areas 23, 13, 27, 3, 29, 28, and 121 contain placeholder data pending DFO scraper implementation.';