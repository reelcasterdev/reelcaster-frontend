-- Create user_alert_profiles table for custom fishing condition alerts
CREATE TABLE IF NOT EXISTS user_alert_profiles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Alert identification
  name text NOT NULL,                           -- e.g., "Sooke Basin Coho"

  -- Location
  location_lat decimal(10, 6) NOT NULL,
  location_lng decimal(10, 6) NOT NULL,
  location_name text,                           -- e.g., "Sooke, BC"

  -- Status
  is_active boolean DEFAULT true,

  -- Trigger definitions (JSONB for flexibility)
  triggers jsonb NOT NULL DEFAULT '{}',

  -- Time constraints
  active_hours jsonb,                           -- {start: "05:00", end: "20:00"}

  -- Logic configuration
  logic_mode text DEFAULT 'AND' CHECK (logic_mode IN ('AND', 'OR')),

  -- Anti-spam settings
  cooldown_hours integer DEFAULT 12 CHECK (cooldown_hours >= 1 AND cooldown_hours <= 168),
  last_triggered_at timestamptz,

  -- Hysteresis state tracking
  state_flags jsonb DEFAULT '{}',

  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create alert_history table for logging triggered alerts
CREATE TABLE IF NOT EXISTS alert_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_profile_id uuid NOT NULL REFERENCES user_alert_profiles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Trigger details
  triggered_at timestamptz DEFAULT now(),
  matched_triggers jsonb,                       -- Which triggers matched (e.g., ["wind", "tide"])
  condition_snapshot jsonb,                     -- Weather/tide data at trigger time

  -- Notification status
  notification_sent boolean DEFAULT false,
  notification_error text,

  -- Metadata
  created_at timestamptz DEFAULT now()
);

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_user_alert_profiles_user_id ON user_alert_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_alert_profiles_active ON user_alert_profiles(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_user_alert_profiles_location ON user_alert_profiles(location_lat, location_lng);

CREATE INDEX IF NOT EXISTS idx_alert_history_profile_id ON alert_history(alert_profile_id);
CREATE INDEX IF NOT EXISTS idx_alert_history_user_id ON alert_history(user_id);
CREATE INDEX IF NOT EXISTS idx_alert_history_triggered_at ON alert_history(triggered_at DESC);

-- Add GIN index for JSONB queries on triggers
CREATE INDEX IF NOT EXISTS idx_user_alert_profiles_triggers ON user_alert_profiles USING gin(triggers);

-- Create updated_at trigger for user_alert_profiles
CREATE OR REPLACE FUNCTION update_user_alert_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_alert_profiles_updated_at
  BEFORE UPDATE ON user_alert_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_user_alert_profiles_updated_at();

-- Enable Row Level Security
ALTER TABLE user_alert_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_history ENABLE ROW LEVEL SECURITY;

-- Policy: Users can manage their own alert profiles
CREATE POLICY "Users can view own alert profiles"
  ON user_alert_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own alert profiles"
  ON user_alert_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own alert profiles"
  ON user_alert_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own alert profiles"
  ON user_alert_profiles
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Service role can manage all profiles (for cron job)
CREATE POLICY "Service role can manage all alert profiles"
  ON user_alert_profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy: Users can view their own alert history
CREATE POLICY "Users can view own alert history"
  ON alert_history
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Service role can manage all history (for cron job)
CREATE POLICY "Service role can manage all alert history"
  ON alert_history
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Add helpful comments
COMMENT ON TABLE user_alert_profiles IS 'Custom fishing alert profiles with multi-variable trigger conditions';
COMMENT ON COLUMN user_alert_profiles.triggers IS 'JSONB containing trigger definitions for wind, tide, pressure, water_temp, solunar, fishing_score';
COMMENT ON COLUMN user_alert_profiles.logic_mode IS 'AND = all triggers must match, OR = any trigger can match';
COMMENT ON COLUMN user_alert_profiles.cooldown_hours IS 'Minimum hours between alert notifications (1-168)';
COMMENT ON COLUMN user_alert_profiles.state_flags IS 'Hysteresis state for each trigger to prevent flickering';
COMMENT ON TABLE alert_history IS 'Log of all triggered alerts with condition snapshots';
