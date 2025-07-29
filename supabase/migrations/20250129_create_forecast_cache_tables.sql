-- Forecast cache table
CREATE TABLE forecast_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cache_key TEXT NOT NULL UNIQUE, -- "location|hotspot|species|YYYY-MM-DD" or "location|hotspot|no-species|YYYY-MM-DD"
  location_name TEXT NOT NULL,
  hotspot_name TEXT NOT NULL,  
  species_name TEXT, -- NULL for no species selected
  coordinates JSONB NOT NULL, -- {"lat": 48.4284, "lon": -123.3656}
  
  -- Cached data
  forecast_data JSONB NOT NULL, -- OpenMeteoDailyForecast[]
  open_meteo_data JSONB NOT NULL, -- ProcessedOpenMeteoData
  tide_data JSONB, -- TideData
  
  -- Cache metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  cache_duration_hours INTEGER DEFAULT 6,
  hit_count INTEGER DEFAULT 0,
  last_accessed TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_forecast_cache_key ON forecast_cache(cache_key);
CREATE INDEX idx_forecast_expires ON forecast_cache(expires_at);
CREATE INDEX idx_forecast_location ON forecast_cache(location_name, hotspot_name);
CREATE INDEX idx_forecast_last_accessed ON forecast_cache(last_accessed);

-- Cache configuration table for per-location duration and global settings
CREATE TABLE cache_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  config_key TEXT NOT NULL UNIQUE,
  config_value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Location-specific cache durations
CREATE TABLE location_cache_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  location_name TEXT NOT NULL,
  hotspot_name TEXT NOT NULL,
  cache_duration_hours INTEGER NOT NULL DEFAULT 6,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(location_name, hotspot_name)
);

-- Insert default configuration
INSERT INTO cache_config (config_key, config_value, description) VALUES 
('default_cache_duration_hours', '6', 'Default cache duration in hours'),
('max_cache_entries', '1000', 'Maximum number of cache entries before LRU cleanup'),
('cleanup_interval_hours', '1', 'How often to run cache cleanup in hours');

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for location_cache_config
CREATE TRIGGER update_location_cache_config_updated_at 
    BEFORE UPDATE ON location_cache_config 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to increment hit count and update last accessed
CREATE OR REPLACE FUNCTION increment_cache_hit(cache_key_param TEXT)
RETURNS VOID AS $$
BEGIN
    UPDATE forecast_cache 
    SET hit_count = hit_count + 1, last_accessed = NOW()
    WHERE cache_key = cache_key_param;
END;
$$ LANGUAGE plpgsql;