-- Migration: Create catch_logs table for Fish On feature
-- Description: Stores user catch records with auto-captured GPS data and optional enrichment

-- Create catch_logs table
CREATE TABLE IF NOT EXISTS catch_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Timestamp
  caught_at timestamptz NOT NULL DEFAULT now(),

  -- Location (auto-captured)
  location_lat decimal(10, 6) NOT NULL,
  location_lng decimal(10, 6) NOT NULL,
  location_accuracy_m decimal(8, 2),
  location_heading decimal(5, 2),
  location_speed_kph decimal(6, 2),
  location_name text,

  -- Outcome (required at capture)
  outcome text NOT NULL CHECK (outcome IN ('bite', 'landed')),

  -- Species (optional)
  species_id text,
  species_name text,

  -- Retention (optional, only meaningful for 'landed')
  retention_status text CHECK (retention_status IN ('released', 'kept') OR retention_status IS NULL),

  -- Measurements (optional)
  length_cm decimal(5, 1),
  weight_kg decimal(5, 2),
  depth_m decimal(6, 1),

  -- Lure (optional)
  lure_id uuid,
  lure_name text,

  -- Notes and photos
  notes text,
  photos jsonb DEFAULT '[]',

  -- Weather context (async populated after catch)
  weather_snapshot jsonb,
  tide_snapshot jsonb,
  moon_phase decimal(3, 2),

  -- Sync tracking for offline-first
  client_id text,
  synced_at timestamptz,

  -- Privacy
  is_private boolean DEFAULT true,

  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_catch_logs_user_id ON catch_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_catch_logs_caught_at ON catch_logs(caught_at DESC);
CREATE INDEX IF NOT EXISTS idx_catch_logs_species ON catch_logs(species_id);
CREATE INDEX IF NOT EXISTS idx_catch_logs_client_id ON catch_logs(user_id, client_id);
CREATE INDEX IF NOT EXISTS idx_catch_logs_outcome ON catch_logs(outcome);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_catch_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS catch_logs_updated_at ON catch_logs;
CREATE TRIGGER catch_logs_updated_at
  BEFORE UPDATE ON catch_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_catch_logs_updated_at();

-- Enable Row Level Security
ALTER TABLE catch_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only view their own catches
CREATE POLICY "Users can view own catches"
  ON catch_logs FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Users can only insert their own catches
CREATE POLICY "Users can insert own catches"
  ON catch_logs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can only update their own catches
CREATE POLICY "Users can update own catches"
  ON catch_logs FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own catches
CREATE POLICY "Users can delete own catches"
  ON catch_logs FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Service role has full access (for background jobs)
CREATE POLICY "Service role full access"
  ON catch_logs FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Comments for documentation
COMMENT ON TABLE catch_logs IS 'User catch records from Fish On feature with GPS, weather context, and optional details';
COMMENT ON COLUMN catch_logs.outcome IS 'bite = fish on but lost, landed = successfully in the boat';
COMMENT ON COLUMN catch_logs.client_id IS 'UUID generated client-side for deduplication during offline sync';
COMMENT ON COLUMN catch_logs.weather_snapshot IS 'Weather conditions at time of catch (populated async)';
COMMENT ON COLUMN catch_logs.tide_snapshot IS 'Tide phase and height at time of catch (populated async)';
