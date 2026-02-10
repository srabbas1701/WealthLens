-- Add started_at to user_trials for trial start tracking.
-- Table may already exist from CAPABILITY_BASED_ACCESS_CONTROL setup.
ALTER TABLE IF EXISTS public.user_trials
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ DEFAULT NOW();

COMMENT ON COLUMN public.user_trials.started_at IS 'When the trial started; used with ends_at for duration.';
