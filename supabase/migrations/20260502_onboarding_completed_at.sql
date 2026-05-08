-- Phase 3: onboarding completion tracking
-- Adds onboarding_completed_at to user_settings so the dashboard can decide
-- whether to auto-open the onboarding modal vs. show the persistent
-- "Complete your profile" banner.

ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz;

COMMENT ON COLUMN user_settings.onboarding_completed_at IS
  'Set when the 3-step onboarding modal completes. NULL until the user finishes (or until they explicitly skip and complete later). Drives the persistent profile banner.';
