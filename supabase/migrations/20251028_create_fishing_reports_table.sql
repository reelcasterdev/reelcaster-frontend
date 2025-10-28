-- Create fishing_reports table
CREATE TABLE IF NOT EXISTS fishing_reports (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Core identifiers
  location text NOT NULL, -- e.g., "Victoria, Sidney" or "Sooke, Port Renfrew"
  week_ending date NOT NULL, -- The week this report covers
  report_id text, -- Original report ID from source
  source_url text, -- URL the report was scraped from

  -- Report data (stored as JSONB for flexibility)
  report_data jsonb NOT NULL,

  -- Metadata
  scraped_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Ensure one active report per location per week (partial unique index)
CREATE UNIQUE INDEX IF NOT EXISTS idx_fishing_reports_unique_active
  ON fishing_reports(location, week_ending)
  WHERE is_active = true;

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_fishing_reports_location ON fishing_reports(location);
CREATE INDEX IF NOT EXISTS idx_fishing_reports_week_ending ON fishing_reports(week_ending DESC);
CREATE INDEX IF NOT EXISTS idx_fishing_reports_location_week ON fishing_reports(location, week_ending DESC);
CREATE INDEX IF NOT EXISTS idx_fishing_reports_active ON fishing_reports(is_active) WHERE is_active = true;

-- Add GIN index for JSONB queries
CREATE INDEX IF NOT EXISTS idx_fishing_reports_data ON fishing_reports USING gin(report_data);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_fishing_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER fishing_reports_updated_at
  BEFORE UPDATE ON fishing_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_fishing_reports_updated_at();

-- Enable Row Level Security
ALTER TABLE fishing_reports ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read active reports
CREATE POLICY "Anyone can read active fishing reports"
  ON fishing_reports
  FOR SELECT
  USING (is_active = true);

-- Policy: Authenticated users can insert reports
CREATE POLICY "Authenticated users can insert fishing reports"
  ON fishing_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Authenticated users can update reports
CREATE POLICY "Authenticated users can update fishing reports"
  ON fishing_reports
  FOR UPDATE
  TO authenticated
  USING (true);

-- Policy: Service role can do everything
CREATE POLICY "Service role can manage all fishing reports"
  ON fishing_reports
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Add helpful comments
COMMENT ON TABLE fishing_reports IS 'Stores historical fishing reports scraped from FishingVictoria.com';
COMMENT ON COLUMN fishing_reports.location IS 'Location name like "Victoria, Sidney" or "Sooke, Port Renfrew"';
COMMENT ON COLUMN fishing_reports.week_ending IS 'The week ending date this report covers';
COMMENT ON COLUMN fishing_reports.report_data IS 'Complete report data as JSONB including hotspots, conditions, tackle, etc.';
COMMENT ON COLUMN fishing_reports.is_active IS 'Whether this is the active version of the report (for versioning)';
