-- ============================================================
-- launch_signups: email capture for the coming-soon page.
-- Anonymous visitors leave an email to be notified at launch.
-- ============================================================

CREATE TABLE IF NOT EXISTS launch_signups (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL,
  region text,
  source text NOT NULL DEFAULT 'coming_soon',
  notified_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- One row per email (case-insensitive); re-submits are idempotent.
CREATE UNIQUE INDEX IF NOT EXISTS launch_signups_email_unique
  ON launch_signups (lower(email));

ALTER TABLE launch_signups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert launch signups"
  ON launch_signups FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Service role can read launch signups"
  ON launch_signups FOR SELECT TO service_role
  USING (true);

CREATE INDEX IF NOT EXISTS launch_signups_created_at_idx
  ON launch_signups (created_at DESC);
