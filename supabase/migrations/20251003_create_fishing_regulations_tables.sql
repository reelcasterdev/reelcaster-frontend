-- Create enum for regulation status
CREATE TYPE regulation_status AS ENUM ('Open', 'Closed', 'Non Retention', 'Restricted');

-- Create enum for approval status
CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected');

-- Main regulations table
CREATE TABLE fishing_regulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  area_id TEXT NOT NULL,
  area_name TEXT NOT NULL,
  official_url TEXT NOT NULL,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_verified TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  next_review_date TIMESTAMPTZ NOT NULL,
  data_source TEXT NOT NULL DEFAULT 'DFO Pacific Region',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Species regulations table
CREATE TABLE species_regulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  regulation_id UUID NOT NULL REFERENCES fishing_regulations(id) ON DELETE CASCADE,
  species_id TEXT NOT NULL,
  species_name TEXT NOT NULL,
  scientific_name TEXT,
  daily_limit TEXT NOT NULL,
  annual_limit TEXT,
  min_size TEXT,
  max_size TEXT,
  status regulation_status NOT NULL,
  gear TEXT NOT NULL,
  season TEXT NOT NULL,
  notes JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- General rules table
CREATE TABLE regulation_general_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  regulation_id UUID NOT NULL REFERENCES fishing_regulations(id) ON DELETE CASCADE,
  rule_text TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Protected areas table
CREATE TABLE regulation_protected_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  regulation_id UUID NOT NULL REFERENCES fishing_regulations(id) ON DELETE CASCADE,
  area_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Scraped regulations awaiting approval
CREATE TABLE scraped_regulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  area_id TEXT NOT NULL,
  scraped_data JSONB NOT NULL,
  scrape_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approval_status approval_status NOT NULL DEFAULT 'pending',
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  changes_detected JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Regulation change history
CREATE TABLE regulation_change_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  regulation_id UUID NOT NULL REFERENCES fishing_regulations(id) ON DELETE CASCADE,
  changed_by UUID REFERENCES auth.users(id),
  change_type TEXT NOT NULL,
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_fishing_regulations_area_id ON fishing_regulations(area_id);
CREATE INDEX idx_fishing_regulations_active ON fishing_regulations(is_active);
CREATE INDEX idx_species_regulations_regulation_id ON species_regulations(regulation_id);
CREATE INDEX idx_species_regulations_species_id ON species_regulations(species_id);
CREATE INDEX idx_scraped_regulations_status ON scraped_regulations(approval_status);
CREATE INDEX idx_scraped_regulations_area ON scraped_regulations(area_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
CREATE TRIGGER update_fishing_regulations_updated_at BEFORE UPDATE ON fishing_regulations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_species_regulations_updated_at BEFORE UPDATE ON species_regulations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE fishing_regulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE species_regulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE regulation_general_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE regulation_protected_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE scraped_regulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE regulation_change_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Allow public read access to approved regulations
CREATE POLICY "Public can view active regulations" ON fishing_regulations
  FOR SELECT USING (is_active = true);

CREATE POLICY "Public can view species regulations" ON species_regulations
  FOR SELECT USING (true);

CREATE POLICY "Public can view general rules" ON regulation_general_rules
  FOR SELECT USING (true);

CREATE POLICY "Public can view protected areas" ON regulation_protected_areas
  FOR SELECT USING (true);

-- Admin policies for scraped regulations (only authenticated users can view/manage)
CREATE POLICY "Authenticated users can view scraped regulations" ON scraped_regulations
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert scraped regulations" ON scraped_regulations
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update scraped regulations" ON scraped_regulations
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Admin policies for change history
CREATE POLICY "Public can view change history" ON regulation_change_history
  FOR SELECT USING (true);
