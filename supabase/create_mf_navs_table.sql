-- =============================================================================
-- MF NAVS TABLE
-- =============================================================================
-- Centralized storage for Mutual Fund NAVs from AMFI
-- Shared across all users (not user-specific)
-- Updated daily from AMFI official NAV feed

create table if not exists public.mf_navs (
  id uuid primary key default gen_random_uuid(),
  scheme_code text not null,  -- AMFI scheme code (primary identifier)
  scheme_name text not null,  -- Full scheme name from AMFI
  nav numeric not null,  -- NAV value
  nav_date date not null,  -- Trading date for this NAV
  price_source text default 'AMFI_DAILY',  -- Source of the NAV (e.g., 'AMFI_DAILY')
  last_updated timestamptz default now(),
  created_at timestamptz default now(),
  
  -- Ensure one NAV per scheme per date
  unique(scheme_code, nav_date)
);

comment on table public.mf_navs is 'Centralized MF NAV storage - shared across all users';
comment on column public.mf_navs.scheme_code is 'AMFI scheme code (primary identifier, not ISIN)';
comment on column public.mf_navs.scheme_name is 'Full scheme name from AMFI NAV feed';
comment on column public.mf_navs.nav is 'NAV value';
comment on column public.mf_navs.nav_date is 'Trading date for this NAV';
comment on column public.mf_navs.price_source is 'Source of NAV: AMFI_DAILY';

-- Indexes for fast lookups
create index if not exists idx_mf_navs_scheme_code on public.mf_navs(scheme_code);
create index if not exists idx_mf_navs_nav_date on public.mf_navs(nav_date);
create index if not exists idx_mf_navs_scheme_date on public.mf_navs(scheme_code, nav_date desc);

-- RLS: Allow all reads (NAVs are public data)
alter table public.mf_navs enable row level security;

create policy "Anyone can read NAVs" on public.mf_navs
  for select using (true);

-- Only service role can insert/update (via API)
create policy "Service role can manage NAVs" on public.mf_navs
  for all using (auth.role() = 'service_role');

