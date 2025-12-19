-- Migration: Create lures table with predefined BC fishing lures
-- Description: Reference table for lures/tackle with system and user-created entries

-- Create lures table
CREATE TABLE IF NOT EXISTS lures (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,

  -- User-created lures have user_id, predefined lures have NULL
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Lure details
  name text NOT NULL,
  category text,  -- 'spoon', 'hoochie', 'plug', 'fly', 'jig', 'bait', 'other'
  brand text,
  color text,
  size text,

  -- System vs user lure
  is_predefined boolean DEFAULT false,

  -- Usage tracking for sorting/recommendations
  usage_count integer DEFAULT 0,

  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_lures_user_id ON lures(user_id);
CREATE INDEX IF NOT EXISTS idx_lures_predefined ON lures(is_predefined) WHERE is_predefined = true;
CREATE INDEX IF NOT EXISTS idx_lures_category ON lures(category);
CREATE INDEX IF NOT EXISTS idx_lures_name ON lures(name);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_lures_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS lures_updated_at ON lures;
CREATE TRIGGER lures_updated_at
  BEFORE UPDATE ON lures
  FOR EACH ROW
  EXECUTE FUNCTION update_lures_updated_at();

-- Enable Row Level Security
ALTER TABLE lures ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Anyone authenticated can view predefined lures
CREATE POLICY "Anyone can view predefined lures"
  ON lures FOR SELECT TO authenticated
  USING (is_predefined = true);

-- Users can view their own custom lures
CREATE POLICY "Users can view own lures"
  ON lures FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Users can create their own lures
CREATE POLICY "Users can insert own lures"
  ON lures FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND is_predefined = false);

-- Users can update their own lures
CREATE POLICY "Users can update own lures"
  ON lures FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND is_predefined = false)
  WITH CHECK (auth.uid() = user_id AND is_predefined = false);

-- Users can delete their own lures
CREATE POLICY "Users can delete own lures"
  ON lures FOR DELETE TO authenticated
  USING (auth.uid() = user_id AND is_predefined = false);

-- Service role has full access
CREATE POLICY "Service role full access"
  ON lures FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Seed predefined BC fishing lures
-- Popular salmon and bottom fish lures used in BC waters

-- Spoons
INSERT INTO lures (name, category, brand, color, size, is_predefined) VALUES
  ('Coyote Spoon', 'spoon', 'Gibbs Delta', 'Silver/Chrome', '3.5"', true),
  ('Coyote Spoon', 'spoon', 'Gibbs Delta', 'Chartreuse/Green', '3.5"', true),
  ('Coyote Spoon', 'spoon', 'Gibbs Delta', 'Army Truck', '3.5"', true),
  ('Needlefish', 'spoon', 'Silver Horde', 'Chrome/Blue', '3.5"', true),
  ('Needlefish', 'spoon', 'Silver Horde', 'Cop Car', '3.5"', true),
  ('Apex', 'spoon', 'Hot Spot', 'Cop Car', '4.5"', true),
  ('Apex', 'spoon', 'Hot Spot', 'Green Glow', '4.5"', true),
  ('Kingfisher', 'spoon', 'Gibbs Delta', 'Silver', '4"', true);

-- Plugs
INSERT INTO lures (name, category, brand, color, size, is_predefined) VALUES
  ('Krippled K', 'plug', 'Luhr Jensen', 'Green Glow', 'K15', true),
  ('Krippled K', 'plug', 'Luhr Jensen', 'Chrome', 'K15', true),
  ('Tomic Plug 500', 'plug', 'Tomic', 'Army Truck', '500', true),
  ('Tomic Plug 500', 'plug', 'Tomic', 'Green Glow', '500', true),
  ('Tomic Plug 602', 'plug', 'Tomic', 'Watermelon', '602', true),
  ('Oki Darter', 'plug', 'Oki', 'Chartreuse', '4"', true),
  ('Skinny G', 'plug', 'G-Force', 'Silver/Blue', '4.25"', true);

-- Hoochies
INSERT INTO lures (name, category, brand, color, size, is_predefined) VALUES
  ('Coho Killer Hoochie', 'hoochie', 'Gibbs Delta', 'Pink/White', '4"', true),
  ('Coho Killer Hoochie', 'hoochie', 'Gibbs Delta', 'Chartreuse', '4"', true),
  ('Rhys Davis Teaser Head', 'hoochie', 'Rhys Davis', 'Glow Green', 'Large', true),
  ('Rhys Davis Teaser Head', 'hoochie', 'Rhys Davis', 'Army Truck', 'Large', true),
  ('Squid Skirt', 'hoochie', 'Generic', 'Pink Glow', '5"', true),
  ('Squid Skirt', 'hoochie', 'Generic', 'Green Glow', '5"', true),
  ('Octopus Skirt', 'hoochie', 'Generic', 'Purple', '4"', true);

-- Jigs
INSERT INTO lures (name, category, brand, color, size, is_predefined) VALUES
  ('Buzz Bomb', 'jig', 'Buzz Bomb', 'Green', '4oz', true),
  ('Buzz Bomb', 'jig', 'Buzz Bomb', 'Chrome', '3oz', true),
  ('Zzinger', 'jig', 'Zzinger', 'White', '2oz', true),
  ('Point Wilson Dart', 'jig', 'Point Wilson', 'Herring', '3oz', true),
  ('Pirken', 'jig', 'Generic', 'Chrome', '6oz', true);

-- Bait
INSERT INTO lures (name, category, brand, color, size, is_predefined) VALUES
  ('Anchovy', 'bait', NULL, 'Natural', 'Whole', true),
  ('Herring', 'bait', NULL, 'Natural', 'Whole', true),
  ('Herring', 'bait', NULL, 'Natural', 'Strip Cut', true),
  ('Anchovy', 'bait', NULL, 'Natural', 'Strip Cut', true),
  ('Prawns', 'bait', NULL, 'Natural', 'Live', true),
  ('Shrimp', 'bait', NULL, 'Natural', 'Fresh', true);

-- Flies
INSERT INTO lures (name, category, brand, color, size, is_predefined) VALUES
  ('Clouser Minnow', 'fly', NULL, 'Chartreuse/White', '#2', true),
  ('Lefty Deceiver', 'fly', NULL, 'Blue/White', '#1/0', true),
  ('Pink Shrimp', 'fly', NULL, 'Pink', '#4', true),
  ('Rolled Muddler', 'fly', NULL, 'Olive', '#6', true);

-- Comments
COMMENT ON TABLE lures IS 'Reference table for fishing lures/tackle, includes predefined BC lures and user-created entries';
COMMENT ON COLUMN lures.is_predefined IS 'True for system-defined lures, false for user-created';
COMMENT ON COLUMN lures.usage_count IS 'Number of times this lure was used in catch_logs, for sorting';
