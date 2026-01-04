-- =============================================================================
-- WEALTHLENS DATABASE SCHEMA
-- =============================================================================
-- Production-grade schema for investment intelligence platform
-- 
-- Design Principles:
-- 1. Portfolio is the source of truth
-- 2. AI never reads raw market data directly
-- 3. Computed intelligence is stored (not recomputed every time)
-- 4. User data is isolated via RLS
-- 5. Time-series only where needed
--
-- Run this in Supabase SQL Editor: Dashboard > SQL Editor > New Query
-- =============================================================================

-- =============================================================================
-- 1. USERS TABLE
-- =============================================================================
-- Stores investment personality, not auth (auth handled by Supabase Auth)
-- Copilot reads this every time for context
-- Supports both email and phone authentication
-- Tracks verification status for progressive data collection

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  phone_number text,  -- Phone number with country code (e.g., +919876543210)
  -- Verification timestamps for secondary contacts (non-blocking)
  email_verified_at timestamptz default null,
  phone_verified_at timestamptz default null,
  -- Primary auth method tracking for progressive data collection
  primary_auth_method text check (primary_auth_method in ('mobile', 'email')) default null,
  risk_label text check (risk_label in ('Conservative', 'Moderate', 'Growth', 'Aggressive')),
  risk_score int check (risk_score >= 0 and risk_score <= 100),
  primary_goal text,
  horizon_years int check (horizon_years > 0 and horizon_years <= 50),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

comment on table public.users is 'User investment profile - Copilot reads this for every interaction';
comment on column public.users.risk_label is 'Conservative / Moderate / Growth / Aggressive';
comment on column public.users.risk_score is 'Numeric risk score 0-100';
comment on column public.users.phone_number is 'Phone number with country code for OTP auth (e.g., +919876543210)';
comment on column public.users.email_verified_at is 'Timestamp when secondary email was verified (NULL if not verified)';
comment on column public.users.phone_verified_at is 'Timestamp when secondary phone was verified (NULL if not verified)';
comment on column public.users.primary_auth_method is 'How user originally authenticated: mobile (OTP) or email (magic link)';

-- =============================================================================
-- 2. PORTFOLIOS TABLE
-- =============================================================================
-- Allows future: Family portfolios, Business portfolios, HNI multi-portfolio views

create table if not exists public.portfolios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade not null,
  name text not null default 'My Portfolio',
  is_primary boolean default true,
  total_value numeric default 0,
  currency text default 'INR',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

comment on table public.portfolios is 'User portfolios - supports multi-portfolio for HNI/family offices';

-- Ensure only one primary portfolio per user
create unique index if not exists idx_portfolios_primary 
on public.portfolios(user_id) 
where is_primary = true;

-- =============================================================================
-- 3. ASSETS TABLE (MASTER TABLE)
-- =============================================================================
-- Canonical reference for everything users can own
-- NO prices here - this is just the master list

create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  asset_type text not null check (asset_type in (
    'equity', 'mutual_fund', 'index_fund', 'etf', 
    'fd', 'bond', 'gold', 'cash', 'ppf', 'epf', 'nps', 'other'
  )),
  isin text unique,
  symbol text,
  sector text,
  sub_sector text,
  risk_bucket text check (risk_bucket in ('low', 'medium', 'high')),
  asset_class text check (asset_class in ('equity', 'debt', 'gold', 'cash', 'hybrid')),
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

comment on table public.assets is 'Master asset reference - no prices, just metadata';
comment on column public.assets.risk_bucket is 'low / medium / high risk classification';

-- Index for fast lookups
create index if not exists idx_assets_type on public.assets(asset_type);
create index if not exists idx_assets_isin on public.assets(isin) where isin is not null;

-- =============================================================================
-- 4. HOLDINGS TABLE
-- =============================================================================
-- User-specific ownership - this is where net worth comes from

create table if not exists public.holdings (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid references public.portfolios(id) on delete cascade not null,
  asset_id uuid references public.assets(id) on delete restrict not null,
  quantity numeric not null default 0,
  invested_value numeric not null default 0,
  current_value numeric not null default 0,
  average_price numeric,
  source text check (source in ('csv', 'manual', 'sample', 'api')),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

comment on table public.holdings is 'User ownership of assets - source of net worth calculation';
comment on column public.holdings.source is 'How the holding was added: csv, manual, sample, api';

-- Prevent duplicate holdings of same asset in same portfolio
create unique index if not exists idx_holdings_unique 
on public.holdings(portfolio_id, asset_id);

-- =============================================================================
-- 5. PORTFOLIO_METRICS TABLE (PRE-COMPUTED INTELLIGENCE)
-- =============================================================================
-- CRITICAL: Copilot reads from here instead of recalculating everything
-- Updated periodically by backend jobs

create table if not exists public.portfolio_metrics (
  portfolio_id uuid primary key references public.portfolios(id) on delete cascade,
  
  -- Allocation percentages
  equity_pct numeric default 0,
  debt_pct numeric default 0,
  gold_pct numeric default 0,
  cash_pct numeric default 0,
  hybrid_pct numeric default 0,
  
  -- Risk metrics
  risk_score int check (risk_score >= 0 and risk_score <= 100),
  risk_label text check (risk_label in ('Conservative', 'Moderate', 'Growth', 'Aggressive')),
  
  -- Health scores
  diversification_score int check (diversification_score >= 0 and diversification_score <= 100),
  concentration_score int check (concentration_score >= 0 and concentration_score <= 100),
  sector_concentration_pct numeric,
  top_holding_pct numeric,
  
  -- Goal tracking
  goal_alignment text check (goal_alignment in ('On Track', 'Ahead', 'Behind', 'Needs Review')),
  goal_progress_pct numeric,
  
  -- Timestamps
  last_calculated timestamptz default now(),
  created_at timestamptz default now()
);

comment on table public.portfolio_metrics is 'Pre-computed portfolio intelligence - Copilot reads this, never recalculates';
comment on column public.portfolio_metrics.diversification_score is 'Higher = better diversified (0-100)';
comment on column public.portfolio_metrics.concentration_score is 'Higher = more concentrated/risky (0-100)';

-- =============================================================================
-- 6. PORTFOLIO_INSIGHTS TABLE
-- =============================================================================
-- Feeds Dashboard "Key Risks & Insights" and Copilot explanations
-- NO buy/sell language allowed

create table if not exists public.portfolio_insights (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid references public.portfolios(id) on delete cascade not null,
  
  insight_type text not null check (insight_type in (
    'concentration', 'overlap', 'fd_drag', 'sector_risk', 
    'tax_opportunity', 'sip_reminder', 'goal_drift', 'risk_mismatch',
    'diversification', 'rebalance', 'general'
  )),
  severity text check (severity in ('low', 'medium', 'high')),
  
  title text not null,
  summary text not null,
  details text,
  
  -- For actionable insights
  action_label text,
  action_type text,
  
  is_active boolean default true,
  expires_at timestamptz,
  created_at timestamptz default now()
);

comment on table public.portfolio_insights is 'AI-generated insights for dashboard and Copilot - NO buy/sell language';
comment on column public.portfolio_insights.insight_type is 'Type of insight for categorization';
comment on column public.portfolio_insights.severity is 'low = info, medium = worth noting, high = attention needed';

-- Index for active insights
create index if not exists idx_insights_active 
on public.portfolio_insights(portfolio_id, is_active) 
where is_active = true;

-- =============================================================================
-- 7. MARKET_CONTEXT TABLE (EOD SNAPSHOT)
-- =============================================================================
-- Allows Copilot to say: "Markets were volatile today due to IT sector weakness"

create table if not exists public.market_context (
  date date primary key,
  
  -- Overall market mood
  market_mood text check (market_mood in ('stable', 'volatile', 'bullish', 'bearish', 'mixed')),
  
  -- Index movements
  nifty_change numeric,
  sensex_change numeric,
  
  -- Summary for Copilot
  summary text not null,
  detailed_summary text,
  
  -- Affected sectors
  affected_sectors text[],
  top_gainers text[],
  top_losers text[],
  
  created_at timestamptz default now()
);

comment on table public.market_context is 'Daily market snapshot for Copilot context - EOD data only';

-- =============================================================================
-- 7.5. STOCK_PRICES TABLE (EOD PRICE STORAGE)
-- =============================================================================
-- Stores daily closing prices for stocks (NSE symbols)
-- Prices are shared across all users (not user-specific)
-- Updated once per day with previous trading day closing price
-- Used to calculate current_value for equity holdings

create table if not exists public.stock_prices (
  id uuid primary key default gen_random_uuid(),
  symbol text not null,  -- NSE symbol (e.g., 'RELIANCE', 'TCS')
  price_date date not null,  -- Trading date for this price
  closing_price numeric not null,  -- EOD closing price in INR
  price_source text default 'YAHOO_EOD',  -- Source of the price (e.g., 'YAHOO_EOD')
  last_updated timestamptz default now(),
  created_at timestamptz default now(),
  
  -- Ensure one price per symbol per date
  unique(symbol, price_date)
);

comment on table public.stock_prices is 'EOD stock prices - shared across all users, updated daily';
comment on column public.stock_prices.symbol is 'NSE stock symbol (e.g., RELIANCE, TCS)';
comment on column public.stock_prices.price_date is 'Trading date for this closing price';
comment on column public.stock_prices.closing_price is 'End of day closing price in INR';
comment on column public.stock_prices.price_source is 'Source of the price data (e.g., YAHOO_EOD)';

-- Index for fast lookups by symbol and date
create index if not exists idx_stock_prices_symbol on public.stock_prices(symbol);
create index if not exists idx_stock_prices_date on public.stock_prices(price_date desc);
create index if not exists idx_stock_prices_symbol_date on public.stock_prices(symbol, price_date desc);

-- Make stock_prices publicly readable (no user data)
alter table public.stock_prices enable row level security;

-- RLS Policy: Anyone can read stock prices (public market data)
create policy "Anyone can view stock prices"
  on public.stock_prices for select
  using (true);

-- =============================================================================
-- 8. COPILOT_SESSIONS TABLE
-- =============================================================================
-- Conversation continuity + auditability
-- Copilot WRITES here (logs only)

create table if not exists public.copilot_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade not null,
  session_id text not null,
  
  -- Conversation data
  question text not null,
  intent text,
  response text not null,
  response_status text,
  
  -- Context snapshot (for debugging/audit)
  context_snapshot jsonb,
  
  -- Guardrail tracking
  guardrails_triggered text[],
  
  created_at timestamptz default now()
);

comment on table public.copilot_sessions is 'Copilot conversation logs - for continuity and audit';

-- Index for user sessions
create index if not exists idx_copilot_sessions_user 
on public.copilot_sessions(user_id, created_at desc);

-- =============================================================================
-- 9. ONBOARDING_SNAPSHOTS TABLE
-- =============================================================================
-- Drives "Here's what we understand about you" and risk calibration

create table if not exists public.onboarding_snapshots (
  user_id uuid primary key references public.users(id) on delete cascade,
  
  -- Goals
  goals text[],
  primary_goal text,
  
  -- Time horizon
  horizon_years int,
  
  -- Risk assessment
  risk_answers jsonb,
  risk_label text,
  risk_score int,
  
  -- Initial portfolio
  portfolio_snapshot jsonb,
  
  -- AI understanding
  ai_summary text[],
  confidence text check (confidence in ('high', 'medium', 'low')),
  
  -- Status
  is_complete boolean default false,
  completed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

comment on table public.onboarding_snapshots is 'Onboarding data for AI understanding and risk calibration';

-- =============================================================================
-- 10. AI_DAILY_SUMMARIES TABLE
-- =============================================================================
-- PRE-COMPUTED daily AI summaries for habit loops
-- 
-- DESIGN PHILOSOPHY:
-- This table is the foundation of the "Daily Check-in" habit loop.
-- 
-- WHY THIS EXISTS:
-- 1. Users should feel INFORMED, not ANXIOUS when checking their portfolio
-- 2. Most days, nothing significant happens - this is GOOD
-- 3. The default status "no_action_required" reinforces calm investing
-- 4. Summaries are generated once/day, NOT on-demand (prevents refresh anxiety)
-- 
-- WHY "NO_ACTION_REQUIRED" IS THE DEFAULT:
-- - Long-term investing means most days are uneventful
-- - Constant "action required" creates trading behavior
-- - Calm language builds trust and reduces churn
-- - Users return because they feel confident, not worried
-- 
-- TONE GUIDELINES (enforced by generation logic):
-- - Never use urgency language ("act now", "urgent", "immediately")
-- - Never use trading language ("buy", "sell", "exit")
-- - Focus on context, not predictions
-- - Acknowledge market movements without alarm
--
-- Copilot READS this table but NEVER regenerates summaries
-- Copilot can EXPLAIN what a summary means, but uses stored data

create table if not exists public.ai_daily_summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade not null,
  portfolio_id uuid references public.portfolios(id) on delete cascade not null,
  
  -- Summary date (one summary per user per day)
  summary_date date not null,
  
  -- Core summary content (pre-generated, immutable for the day)
  headline text not null,
  summary_points text[] not null,
  
  -- Status: The key to calm investing
  -- no_action_required: Default state - everything is fine
  -- monitor: Something worth noting, but no action needed
  -- attention_required: Rare - only for significant drift (never urgent)
  status text not null default 'no_action_required' 
    check (status in ('no_action_required', 'monitor', 'attention_required')),
  
  -- Context snapshot at generation time (for audit/debugging)
  portfolio_value_at_generation numeric,
  market_mood_at_generation text,
  risk_score_at_generation int,
  
  -- Metadata
  generated_at timestamptz default now(),
  created_at timestamptz default now()
);

comment on table public.ai_daily_summaries is 
  'Pre-computed daily AI summaries - Copilot reads but never regenerates. Default status is no_action_required to promote calm investing.';
comment on column public.ai_daily_summaries.status is 
  'no_action_required (default/most days), monitor (worth noting), attention_required (rare)';
comment on column public.ai_daily_summaries.headline is 
  'Single-line calm summary - never uses urgency or trading language';

-- Ensure one summary per user per day
create unique index if not exists idx_daily_summaries_unique 
on public.ai_daily_summaries(user_id, summary_date);

-- Index for efficient date lookups
create index if not exists idx_daily_summaries_date 
on public.ai_daily_summaries(summary_date desc);

-- =============================================================================
-- 11. AI_WEEKLY_SUMMARIES TABLE
-- =============================================================================
-- Weekly reflection summaries for deeper habit engagement
--
-- DESIGN PHILOSOPHY:
-- Weekly summaries provide a "zoom out" moment for users.
-- They reinforce long-term thinking and goal alignment.
--
-- WHY WEEKLY MATTERS:
-- 1. Daily is for "am I okay?" - Weekly is for "am I on track?"
-- 2. Allocation drift is only meaningful over time
-- 3. Goal progress is a weekly/monthly concept, not daily
-- 4. Reduces noise - not every fluctuation deserves attention
--
-- WHAT WEEKLY SUMMARIES COVER:
-- - Risk profile alignment (did allocation drift?)
-- - Goal progress (on track, ahead, behind)
-- - Diversification health
-- - NO predictions about future performance
-- - NO recommendations to buy/sell
--
-- TONE GUIDELINES:
-- - Reflective, not reactive
-- - Celebratory of consistency ("You stayed the course")
-- - Educational about long-term principles
-- - Never creates FOMO or regret

create table if not exists public.ai_weekly_summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade not null,
  portfolio_id uuid references public.portfolios(id) on delete cascade not null,
  
  -- Week identification (ISO week)
  week_start_date date not null,
  week_end_date date not null,
  
  -- Core summary content
  headline text not null,
  summary_points text[] not null,
  
  -- Status (same philosophy as daily)
  status text not null default 'no_action_required' 
    check (status in ('no_action_required', 'monitor', 'attention_required')),
  
  -- Weekly-specific insights (pre-computed, not generated on-demand)
  allocation_drift_summary text,
  risk_alignment_status text check (risk_alignment_status in ('aligned', 'slightly_drifted', 'review_suggested')),
  goal_progress_summary text,
  diversification_note text,
  
  -- Reflection prompt (optional - encourages engagement)
  reflection_prompt text,
  
  -- Context snapshot at generation time
  portfolio_value_at_generation numeric,
  equity_pct_at_generation numeric,
  debt_pct_at_generation numeric,
  risk_score_at_generation int,
  
  -- Metadata
  generated_at timestamptz default now(),
  created_at timestamptz default now()
);

comment on table public.ai_weekly_summaries is 
  'Pre-computed weekly AI summaries for reflection and goal tracking. No predictions or recommendations.';
comment on column public.ai_weekly_summaries.allocation_drift_summary is 
  'Describes how allocation changed over the week - observational, not prescriptive';
comment on column public.ai_weekly_summaries.reflection_prompt is 
  'Optional prompt to encourage user reflection without creating anxiety';

-- Ensure one summary per user per week
create unique index if not exists idx_weekly_summaries_unique 
on public.ai_weekly_summaries(user_id, week_start_date);

-- Index for efficient week lookups
create index if not exists idx_weekly_summaries_date 
on public.ai_weekly_summaries(week_start_date desc);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) - NON-NEGOTIABLE
-- =============================================================================

-- Enable RLS on all tables
alter table public.users enable row level security;
alter table public.portfolios enable row level security;
alter table public.holdings enable row level security;
alter table public.portfolio_metrics enable row level security;
alter table public.portfolio_insights enable row level security;
alter table public.copilot_sessions enable row level security;
alter table public.onboarding_snapshots enable row level security;

-- Assets and market_context are public read (no user data)
alter table public.assets enable row level security;
alter table public.market_context enable row level security;

-- AI Summaries (user-specific)
alter table public.ai_daily_summaries enable row level security;
alter table public.ai_weekly_summaries enable row level security;

-- =============================================================================
-- RLS POLICIES
-- =============================================================================

-- Users: can only access own profile
create policy "Users can view own profile"
  on public.users for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.users for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.users for insert
  with check (auth.uid() = id);

-- Portfolios: can only access own portfolios
create policy "Users can access own portfolios"
  on public.portfolios for select
  using (auth.uid() = user_id);

create policy "Users can create own portfolios"
  on public.portfolios for insert
  with check (auth.uid() = user_id);

create policy "Users can update own portfolios"
  on public.portfolios for update
  using (auth.uid() = user_id);

create policy "Users can delete own portfolios"
  on public.portfolios for delete
  using (auth.uid() = user_id);

-- Holdings: access through portfolio ownership
create policy "Users can access own holdings"
  on public.holdings for select
  using (
    portfolio_id in (
      select id from public.portfolios where user_id = auth.uid()
    )
  );

create policy "Users can create own holdings"
  on public.holdings for insert
  with check (
    portfolio_id in (
      select id from public.portfolios where user_id = auth.uid()
    )
  );

create policy "Users can update own holdings"
  on public.holdings for update
  using (
    portfolio_id in (
      select id from public.portfolios where user_id = auth.uid()
    )
  );

create policy "Users can delete own holdings"
  on public.holdings for delete
  using (
    portfolio_id in (
      select id from public.portfolios where user_id = auth.uid()
    )
  );

-- Portfolio Metrics: read-only for users, written by backend
create policy "Users can view own portfolio metrics"
  on public.portfolio_metrics for select
  using (
    portfolio_id in (
      select id from public.portfolios where user_id = auth.uid()
    )
  );

-- Portfolio Insights: read-only for users
create policy "Users can view own portfolio insights"
  on public.portfolio_insights for select
  using (
    portfolio_id in (
      select id from public.portfolios where user_id = auth.uid()
    )
  );

-- Copilot Sessions: users can view and create own sessions
create policy "Users can view own copilot sessions"
  on public.copilot_sessions for select
  using (auth.uid() = user_id);

create policy "Users can create own copilot sessions"
  on public.copilot_sessions for insert
  with check (auth.uid() = user_id);

-- Onboarding Snapshots: users can access own
create policy "Users can access own onboarding"
  on public.onboarding_snapshots for select
  using (auth.uid() = user_id);

create policy "Users can create own onboarding"
  on public.onboarding_snapshots for insert
  with check (auth.uid() = user_id);

create policy "Users can update own onboarding"
  on public.onboarding_snapshots for update
  using (auth.uid() = user_id);

-- Assets: public read (master data)
create policy "Anyone can view assets"
  on public.assets for select
  using (true);

-- Market Context: public read
create policy "Anyone can view market context"
  on public.market_context for select
  using (true);

-- AI Daily Summaries: users can only view their own summaries
create policy "Users can view own daily summaries"
  on public.ai_daily_summaries for select
  using (auth.uid() = user_id);

-- AI Weekly Summaries: users can only view their own summaries
create policy "Users can view own weekly summaries"
  on public.ai_weekly_summaries for select
  using (auth.uid() = user_id);

-- =============================================================================
-- FUNCTIONS & TRIGGERS
-- =============================================================================

-- Auto-update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Apply updated_at trigger to relevant tables
create trigger set_updated_at
  before update on public.users
  for each row execute function public.handle_updated_at();

create trigger set_updated_at
  before update on public.portfolios
  for each row execute function public.handle_updated_at();

create trigger set_updated_at
  before update on public.holdings
  for each row execute function public.handle_updated_at();

create trigger set_updated_at
  before update on public.onboarding_snapshots
  for each row execute function public.handle_updated_at();

-- Auto-create user profile on signup (handles both email and phone auth)
-- This trigger fires for both email magic link AND phone OTP signups
-- Tracks primary auth method for progressive data collection
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (
    id, 
    email, 
    phone_number, 
    full_name,
    primary_auth_method,
    -- If user has email from auth, mark it as verified via auth
    email_verified_at,
    -- If user has phone from auth, mark it as verified via auth
    phone_verified_at
  )
  values (
    new.id, 
    new.email,  -- Will be null for phone-only users
    new.phone,  -- Will be null for email-only users
    new.raw_user_meta_data->>'full_name',
    -- Determine primary auth method
    case 
      when new.phone is not null then 'mobile'
      when new.email is not null then 'email'
      else null
    end,
    -- Email verified at (from auth, not secondary verification)
    case when new.email is not null then now() else null end,
    -- Phone verified at (from auth, not secondary verification)
    case when new.phone is not null then now() else null end
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for new user signup (fires for both email and phone auth)
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================================================
-- SEED DATA: Sample Assets (Indian Market)
-- =============================================================================

insert into public.assets (name, asset_type, isin, symbol, sector, risk_bucket, asset_class) values
  -- Equity Mutual Funds
  ('HDFC Flexi Cap Fund', 'mutual_fund', 'INF179K01BB3', 'HDFCFLEXICAP', 'Diversified', 'high', 'equity'),
  ('SBI Bluechip Fund', 'mutual_fund', 'INF200K01RJ1', 'SBIBLUECHIP', 'Large Cap', 'medium', 'equity'),
  ('Axis Midcap Fund', 'mutual_fund', 'INF846K01DP8', 'AXISMIDCAP', 'Mid Cap', 'high', 'equity'),
  ('Mirae Asset Large Cap Fund', 'mutual_fund', 'INF769K01101', 'MABORAELARGECP', 'Large Cap', 'medium', 'equity'),
  ('Parag Parikh Flexi Cap Fund', 'mutual_fund', 'INF879O01019', 'PPFAS', 'Diversified', 'medium', 'equity'),
  
  -- Index Funds
  ('Nifty 50 Index Fund', 'index_fund', 'INF090I01JH1', 'NIFTY50INDEX', 'Index', 'medium', 'equity'),
  ('Nifty Next 50 Index Fund', 'index_fund', 'INF090I01JI9', 'NIFTYNEXT50', 'Index', 'high', 'equity'),
  ('UTI Nifty Index Fund', 'index_fund', 'INF789F01YH0', 'UTINIFTY', 'Index', 'medium', 'equity'),
  
  -- Debt Funds
  ('ICICI Pru Corporate Bond Fund', 'mutual_fund', 'INF109K01VH5', 'ABORAICICORPBD', 'Debt', 'low', 'debt'),
  ('HDFC Short Term Debt Fund', 'mutual_fund', 'INF179K01574', 'HDFCSTDEBT', 'Debt', 'low', 'debt'),
  ('SBI Magnum Gilt Fund', 'mutual_fund', 'INF200K01180', 'SBIGILT', 'Gilt', 'low', 'debt'),
  
  -- Government Schemes
  ('PPF Account', 'ppf', NULL, 'PPF', 'Government', 'low', 'debt'),
  ('EPF Account', 'epf', NULL, 'EPF', 'Government', 'low', 'debt'),
  ('NPS Tier 1', 'nps', NULL, 'NPS', 'Pension', 'medium', 'hybrid'),
  
  -- Fixed Deposits
  ('Bank FD', 'fd', NULL, 'FD', 'Bank', 'low', 'debt'),
  
  -- Gold
  ('Sovereign Gold Bond', 'gold', NULL, 'SGB', 'Gold', 'medium', 'gold'),
  ('Gold ETF', 'etf', 'INF204K01YV9', 'GOLDETF', 'Gold', 'medium', 'gold'),
  
  -- Cash
  ('Savings Account', 'cash', NULL, 'SAVINGS', 'Cash', 'low', 'cash'),
  ('Liquid Fund', 'mutual_fund', 'INF179K01152', 'HDFCLIQUID', 'Liquid', 'low', 'cash')
on conflict (isin) do nothing;

-- =============================================================================
-- SEED DATA: Sample Market Context
-- =============================================================================

insert into public.market_context (date, market_mood, nifty_change, sensex_change, summary, affected_sectors) values
  (current_date, 'stable', -0.3, -0.25, 
   'Markets traded in a narrow range with mild profit booking. IT sector saw some weakness due to global cues.',
   array['IT', 'Banking'])
on conflict (date) do update set
  market_mood = excluded.market_mood,
  summary = excluded.summary;

-- =============================================================================
-- DONE! Schema is ready.
-- =============================================================================

