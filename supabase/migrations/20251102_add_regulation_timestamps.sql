-- Add proper timestamp tracking for fishing regulations
-- Different sections of DFO pages are updated at different times
-- This migration adds columns to track:
-- 1. page_modified_date: Official DFO page modified date (from meta tag)
-- 2. most_recent_update_date: Latest section update found in content

ALTER TABLE fishing_regulations
  ADD COLUMN page_modified_date DATE,
  ADD COLUMN most_recent_update_date DATE;

-- Update existing records to use last_updated as fallback
UPDATE fishing_regulations
SET
  page_modified_date = last_updated::DATE,
  most_recent_update_date = last_updated::DATE
WHERE page_modified_date IS NULL;

-- Add helpful comments
COMMENT ON COLUMN fishing_regulations.last_verified IS 'When we last scraped and verified the regulations';
COMMENT ON COLUMN fishing_regulations.page_modified_date IS 'DFO official page modified date from meta tag';
COMMENT ON COLUMN fishing_regulations.most_recent_update_date IS 'Most recent section update date found in content';
