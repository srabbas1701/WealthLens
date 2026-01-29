-- =============================================================================
-- MARKET DATA RUNS TABLE
-- =============================================================================
-- Centralized observability for all market data ingestion:
-- - Stock price updates
-- - Mutual Fund NAV updates
-- - MF ISIN backfill
-- 
-- All timestamps are stored as-is (IST-safe timestamptz)
-- =============================================================================

create table if not exists public.market_data_runs (
  id uuid primary key default gen_random_uuid(),
  asset_type text not null check (asset_type in ('stocks', 'mutual_fund', 'isin_backfill')),
  run_type text not null check (run_type in ('cron', 'manual')),
  trigger_source text not null check (trigger_source in ('supabase_cron', 'ui_button')),
  target_date date, -- YYYY-MM-DD or null (for ISIN backfill)
  started_at timestamptz not null default now(),
  completed_at timestamptz, -- null while running, set on completion/failure
  status text not null check (status in ('running', 'completed', 'failed')) default 'running',
  success_count integer default 0,
  skipped_count integer default 0,
  failed_count integer default 0,
  notes text,
  error text, -- populated only on failures
  created_at timestamptz default now()
);

comment on table public.market_data_runs is 'Centralized observability for market data ingestion runs';
comment on column public.market_data_runs.asset_type is 'Type of asset: stocks, mutual_fund, isin_backfill';
comment on column public.market_data_runs.run_type is 'How the run was triggered: cron or manual';
comment on column public.market_data_runs.trigger_source is 'Source of trigger: supabase_cron or ui_button';
comment on column public.market_data_runs.target_date is 'Target date for the run (null for ISIN backfill)';
comment on column public.market_data_runs.status is 'Current status: running, completed, failed';
comment on column public.market_data_runs.completed_at is 'Completion timestamp (null while running)';
comment on column public.market_data_runs.error is 'Error message (populated only on failures)';

-- Indexes for fast queries
create index if not exists idx_market_data_runs_asset_type on public.market_data_runs(asset_type);
create index if not exists idx_market_data_runs_status on public.market_data_runs(status);
create index if not exists idx_market_data_runs_started_at on public.market_data_runs(started_at desc);
create index if not exists idx_market_data_runs_completed_at on public.market_data_runs(completed_at desc);

-- RLS: Allow read access to authenticated users, but writes only via admin client
alter table public.market_data_runs enable row level security;

-- Policy: Allow authenticated users to read runs (for monitoring)
create policy "Users can read market data runs"
  on public.market_data_runs
  for select
  to authenticated
  using (true);

-- Policy: Only service role can insert/update (via admin client)
-- Note: Admin client bypasses RLS, so this is mainly for documentation
