CREATE TABLE IF NOT EXISTS ai_suggestions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Version identification
  version text NOT NULL CHECK (version IN ('score_based', 'raw_data')),

  -- Pairing key (links A/B from same request)
  pair_id uuid,

  -- Context
  location_name text NOT NULL,
  species text,
  forecast_date text NOT NULL,
  day_index integer NOT NULL,

  -- Input/output
  input_payload jsonb NOT NULL,
  suggestion text NOT NULL,
  model text NOT NULL DEFAULT 'claude-haiku-4-5',
  input_tokens integer,
  output_tokens integer,
  latency_ms integer,

  -- User rating (thumbs up/down)
  user_rating smallint CHECK (user_rating IN (1, -1)),

  -- PM evaluation
  pm_rating smallint CHECK (pm_rating >= 1 AND pm_rating <= 5),
  pm_notes text,

  -- Coordinates
  latitude decimal(10, 6),
  longitude decimal(10, 6),

  created_at timestamptz DEFAULT now()
);

-- Query patterns
CREATE INDEX idx_ai_suggestions_user_id ON ai_suggestions(user_id);
CREATE INDEX idx_ai_suggestions_created_at ON ai_suggestions(created_at DESC);
CREATE INDEX idx_ai_suggestions_pair ON ai_suggestions(pair_id) WHERE pair_id IS NOT NULL;
CREATE INDEX idx_ai_suggestions_version ON ai_suggestions(version);
CREATE INDEX idx_ai_suggestions_location ON ai_suggestions(location_name, species);
CREATE INDEX idx_ai_suggestions_unrated ON ai_suggestions(pm_rating) WHERE pm_rating IS NULL;

ALTER TABLE ai_suggestions ENABLE ROW LEVEL SECURITY;

-- Users can view and rate their own suggestions
CREATE POLICY "Users can view own suggestions"
  ON ai_suggestions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own suggestions"
  ON ai_suggestions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own user_rating"
  ON ai_suggestions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Service role for admin operations
CREATE POLICY "Service role full access"
  ON ai_suggestions FOR ALL TO service_role
  USING (true) WITH CHECK (true);
