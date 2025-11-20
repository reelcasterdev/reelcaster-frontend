-- DFO Fishery Notices Migration
-- Purpose: Store and track DFO recreational fishing and safety notices
-- Date: 2025-11-20

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Main table for DFO fishery notices (recreational + safety only)
CREATE TABLE IF NOT EXISTS dfo_fishery_notices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Core identifiers
  notice_number VARCHAR(20) NOT NULL UNIQUE,  -- e.g., 'FN1227'
  doc_id INTEGER NOT NULL,                     -- DFO's internal ID

  -- DFO's own category classification (as shown on their website)
  dfo_category VARCHAR(100) NOT NULL,
  -- Examples: 'RECREATIONAL - Salmon', 'PSP (Red Tide) / Other Marine Toxins'

  -- Metadata
  title TEXT NOT NULL,
  date_issued TIMESTAMPTZ NOT NULL,
  date_scraped TIMESTAMPTZ DEFAULT NOW(),

  -- Content
  full_text TEXT NOT NULL,
  notice_url TEXT NOT NULL,

  -- AI-parsed categorization
  notice_type VARCHAR(50),  -- 'closure', 'opening', 'modification', 'alert', 'information'
  priority_level VARCHAR(20) NOT NULL,  -- 'critical', 'high', 'medium', 'low'

  -- Geographic data (AI-extracted)
  areas INTEGER[],              -- [19, 20, 15]
  subareas TEXT[],              -- ['19-1', '19-2', '20-5']
  region VARCHAR(50) DEFAULT 'Pacific',

  -- Species data (AI-extracted)
  species TEXT[],               -- ['chinook salmon', 'coho salmon', 'clams', 'mussels']

  -- Temporal data
  effective_date TIMESTAMPTZ,
  expiry_date TIMESTAMPTZ,      -- NULL if 'until further notice'

  -- Safety and action flags
  is_closure BOOLEAN DEFAULT FALSE,
  is_opening BOOLEAN DEFAULT FALSE,
  is_biotoxin_alert BOOLEAN DEFAULT FALSE,
  is_sanitary_closure BOOLEAN DEFAULT FALSE,

  -- Contact information
  contact_name VARCHAR(255),
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_dfo_notices_date_issued ON dfo_fishery_notices(date_issued DESC);
CREATE INDEX idx_dfo_notices_category ON dfo_fishery_notices(dfo_category);
CREATE INDEX idx_dfo_notices_areas ON dfo_fishery_notices USING GIN(areas);
CREATE INDEX idx_dfo_notices_species ON dfo_fishery_notices USING GIN(species);
CREATE INDEX idx_dfo_notices_priority ON dfo_fishery_notices(priority_level);
CREATE INDEX idx_dfo_notices_biotoxin ON dfo_fishery_notices(is_biotoxin_alert) WHERE is_biotoxin_alert = TRUE;
CREATE INDEX idx_dfo_notices_notice_type ON dfo_fishery_notices(notice_type);

-- User notification tracking (many-to-many)
CREATE TABLE IF NOT EXISTS user_dfo_notice_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notice_id UUID NOT NULL REFERENCES dfo_fishery_notices(id) ON DELETE CASCADE,

  -- Tracking
  notified_at TIMESTAMPTZ DEFAULT NOW(),
  notification_method VARCHAR(20),  -- 'email', 'push', 'in_app'

  -- Constraints
  UNIQUE(user_id, notice_id)
);

CREATE INDEX idx_user_notice_history_user ON user_dfo_notice_history(user_id);
CREATE INDEX idx_user_notice_history_notice ON user_dfo_notice_history(notice_id);
CREATE INDEX idx_user_notice_history_notified_at ON user_dfo_notice_history(notified_at DESC);

-- Scraper run tracking
CREATE TABLE IF NOT EXISTS dfo_scraper_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  run_started_at TIMESTAMPTZ NOT NULL,
  run_completed_at TIMESTAMPTZ,
  notices_found INTEGER DEFAULT 0,
  notices_new INTEGER DEFAULT 0,
  notices_updated INTEGER DEFAULT 0,
  errors JSONB DEFAULT '[]'::jsonb,
  status VARCHAR(20) DEFAULT 'running', -- 'running', 'completed', 'failed'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_scraper_runs_started ON dfo_scraper_runs(run_started_at DESC);
CREATE INDEX idx_scraper_runs_status ON dfo_scraper_runs(status);

-- Add DFO notice preferences to notification_preferences table
ALTER TABLE notification_preferences
ADD COLUMN IF NOT EXISTS dfo_notices_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS dfo_areas_of_interest INTEGER[] DEFAULT ARRAY[19, 20];

-- Row Level Security Policies

-- Enable RLS on new tables
ALTER TABLE dfo_fishery_notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_dfo_notice_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE dfo_scraper_runs ENABLE ROW LEVEL SECURITY;

-- DFO notices are public (read-only for all authenticated users)
CREATE POLICY "DFO notices are viewable by all authenticated users"
  ON dfo_fishery_notices
  FOR SELECT
  TO authenticated
  USING (true);

-- Only system can insert/update notices (via service role)
CREATE POLICY "Only service role can insert DFO notices"
  ON dfo_fishery_notices
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Only service role can update DFO notices"
  ON dfo_fishery_notices
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Users can only see their own notification history
CREATE POLICY "Users can view their own DFO notice history"
  ON user_dfo_notice_history
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Only system can insert notification history
CREATE POLICY "Only service role can insert notification history"
  ON user_dfo_notice_history
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Only admins/system can view scraper runs
CREATE POLICY "Only service role can access scraper runs"
  ON dfo_scraper_runs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Add helpful comments
COMMENT ON TABLE dfo_fishery_notices IS 'Stores DFO recreational fishing and safety notices scraped daily';
COMMENT ON TABLE user_dfo_notice_history IS 'Tracks which notices have been sent to which users';
COMMENT ON TABLE dfo_scraper_runs IS 'Logs scraper execution for monitoring and debugging';
COMMENT ON COLUMN dfo_fishery_notices.dfo_category IS 'DFO''s official category as shown on their website';
COMMENT ON COLUMN dfo_fishery_notices.priority_level IS 'AI-determined priority: critical (biotoxin), high (closure/opening), medium (info), low (admin)';
COMMENT ON COLUMN dfo_fishery_notices.areas IS 'Fishing area numbers extracted by AI (e.g., [19, 20])';
COMMENT ON COLUMN dfo_fishery_notices.subareas IS 'Subarea codes extracted by AI (e.g., [''19-1'', ''20-5''])';
