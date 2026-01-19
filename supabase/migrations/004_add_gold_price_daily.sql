-- =============================================================================
-- GOLD PRICE DAILY TABLE
-- =============================================================================
-- Stores daily gold prices (22k and 24k) for calculating current values
-- of gold holdings

create table if not exists public.gold_price_daily (
  id uuid primary key default gen_random_uuid(),
  date date not null unique,
  gold_24k numeric not null,  -- 24k gold price per gram (INR) - IBJA normalized
  gold_22k numeric not null,  -- 22k gold price per gram (INR) - IBJA normalized
  source text default 'IBJA' not null,  -- Source of price data (IBJA only)
  session text check (session in ('AM', 'PM')),  -- IBJA session (AM/PM)
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

comment on table public.gold_price_daily is 'Daily IBJA gold prices (normalized to ₹ per gram) for valuation of gold holdings';
comment on column public.gold_price_daily.gold_24k is '24k (999 purity) gold price per gram in INR - IBJA normalized';
comment on column public.gold_price_daily.gold_22k is '22k (916 purity) gold price per gram in INR - IBJA normalized';
comment on column public.gold_price_daily.source is 'Source of price data (IBJA only)';
comment on column public.gold_price_daily.session is 'IBJA session: AM or PM';

-- Index for fast date lookups
create index if not exists idx_gold_price_daily_date on public.gold_price_daily(date desc);

-- Make gold_price_daily publicly readable (no user data)
alter table public.gold_price_daily enable row level security;

-- RLS Policy: Anyone can read gold prices (public market data)
create policy "Anyone can view gold prices"
  on public.gold_price_daily for select
  using (true);

-- Auto-update updated_at timestamp
create trigger set_gold_price_updated_at
  before update on public.gold_price_daily
  for each row execute function public.handle_updated_at();

-- Insert initial IBJA price (today's date) - normalized to ₹ per gram
-- Example: ₹14,397.8 per gram (999) = ₹1,43,978 per 10g in IBJA table
insert into public.gold_price_daily (date, gold_24k, gold_22k, source, session)
values (current_date, 14397.80, 13188.30, 'IBJA', 'AM')
on conflict (date) do nothing;
