-- =============================================================================
-- MF SCHEME MASTER TABLE
-- =============================================================================
-- Master data for Mutual Fund schemes from AMFI
-- Maps scheme_code (AMFI) to ISIN (used in assets table)
-- Populated automatically from AMFI published scheme master data
-- Shared across all users (not user-specific)

create table if not exists public.mf_scheme_master (
  id uuid primary key default gen_random_uuid(),
  scheme_code text not null unique,  -- AMFI scheme code (primary identifier)
  scheme_name text not null,  -- Full scheme name
  fund_house text,  -- AMC / Fund House name
  scheme_type text,  -- e.g., 'Open Ended Schemes', 'Close Ended Schemes'
  isin_growth text,  -- ISIN for Growth option
  isin_div_payout text,  -- ISIN for Dividend Payout option
  isin_div_reinvest text,  -- ISIN for Dividend Reinvestment option
  scheme_status text,  -- e.g., 'Active', 'Closed', 'Merged'
  nav_date date,  -- Date of last NAV update (for validation)
  last_updated timestamptz default now(),
  created_at timestamptz default now()
);

comment on table public.mf_scheme_master is 'AMFI scheme master data - maps scheme_code to ISINs';
comment on column public.mf_scheme_master.scheme_code is 'AMFI scheme code (unique identifier)';
comment on column public.mf_scheme_master.scheme_name is 'Full scheme name from AMFI';
comment on column public.mf_scheme_master.fund_house is 'AMC / Fund House name';
comment on column public.mf_scheme_master.isin_growth is 'ISIN for Growth option (used in assets table)';
comment on column public.mf_scheme_master.isin_div_payout is 'ISIN for Dividend Payout option';
comment on column public.mf_scheme_master.isin_div_reinvest is 'ISIN for Dividend Reinvestment option';

-- Indexes for fast lookups
create index if not exists idx_mf_scheme_master_scheme_code on public.mf_scheme_master(scheme_code);
create index if not exists idx_mf_scheme_master_isin_growth on public.mf_scheme_master(isin_growth) where isin_growth is not null;
create index if not exists idx_mf_scheme_master_isin_div_payout on public.mf_scheme_master(isin_div_payout) where isin_div_payout is not null;
create index if not exists idx_mf_scheme_master_isin_div_reinvest on public.mf_scheme_master(isin_div_reinvest) where isin_div_reinvest is not null;
create index if not exists idx_mf_scheme_master_fund_house on public.mf_scheme_master(fund_house);

-- Composite index for ISIN lookups (most common query pattern)
create index if not exists idx_mf_scheme_master_isins on public.mf_scheme_master(isin_growth, isin_div_payout, isin_div_reinvest);

-- RLS: Allow all reads (scheme master is public data)
alter table public.mf_scheme_master enable row level security;

create policy "Anyone can read scheme master" on public.mf_scheme_master
  for select using (true);

-- Only service role can insert/update (via API)
create policy "Service role can manage scheme master" on public.mf_scheme_master
  for all using (auth.role() = 'service_role');

