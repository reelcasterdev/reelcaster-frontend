-- Drop approval-related tables and enums
-- These are no longer needed as we've simplified the regulations scraping system
-- to directly update the main tables instead of using an approval workflow

-- Drop tables (in order to respect foreign key constraints)
DROP TABLE IF EXISTS regulation_change_history CASCADE;
DROP TABLE IF EXISTS scraped_regulations CASCADE;

-- Drop approval_status enum (no longer needed)
DROP TYPE IF EXISTS approval_status CASCADE;

-- Add comment explaining the simplification
COMMENT ON TABLE fishing_regulations IS 'Fishing regulations by area. Regulations are now updated directly from the scraper without an approval workflow.';
