-- =============================================================================
-- GOLD PRICE DAILY TABLE
-- =============================================================================
-- Stores daily gold prices (22k and 24k) for calculating current values
-- of gold holdings

create table if not exists public.gold_price_daily (
  id uuid primary key default gen_random_uuid(),
  date date not null unique,
  gold_24k numeric not null,  -- 24k gold price per gram (INR)
  gold_22k numeric not null,  -- 22k gold price per gram (INR)
  source text default 'MOCK',  -- Source of price data (MOCK, API, etc.)
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

comment on table public.gold_price_daily is 'Daily gold prices for valuation of gold holdings';
comment on column public.gold_price_daily.gold_24k is '24k gold price per gram in INR';
comment on column public.gold_price_daily.gold_22k is '22k gold price per gram in INR';

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

-- Insert initial mock price (today's date)
insert into public.gold_price_daily (date, gold_24k, gold_22k, source)
values (current_date, 7000.00, 6400.00, 'MOCK')
on conflict (date) do nothing;
