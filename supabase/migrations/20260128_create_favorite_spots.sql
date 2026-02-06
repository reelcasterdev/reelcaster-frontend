-- Migration: Create favorite_spots table
-- Description: Stores user favorite fishing spots with GPS coordinates

-- Create favorite_spots table
CREATE TABLE IF NOT EXISTS favorite_spots (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Spot details
  name text NOT NULL,
  location text,                    -- region name e.g. "Victoria, Sidney"
  lat decimal(10, 7) NOT NULL,
  lon decimal(10, 7) NOT NULL,
  notes text,

  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_favorite_spots_user_id ON favorite_spots(user_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_favorite_spots_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS favorite_spots_updated_at ON favorite_spots;
CREATE TRIGGER favorite_spots_updated_at
  BEFORE UPDATE ON favorite_spots
  FOR EACH ROW
  EXECUTE FUNCTION update_favorite_spots_updated_at();

-- Enable Row Level Security
ALTER TABLE favorite_spots ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own spots"
  ON favorite_spots FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own spots"
  ON favorite_spots FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own spots"
  ON favorite_spots FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own spots"
  ON favorite_spots FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access on favorite_spots"
  ON favorite_spots FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Comments
COMMENT ON TABLE favorite_spots IS 'User favorite fishing spots with GPS coordinates';
COMMENT ON COLUMN favorite_spots.location IS 'Region name from fishing locations config e.g. Victoria, Sidney';
