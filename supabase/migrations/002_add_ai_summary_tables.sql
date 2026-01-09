-- =============================================================================
-- Migration: Add AI Summary Tables
-- =============================================================================
-- This migration adds the ai_daily_summaries and ai_weekly_summaries tables
-- that are required for the habit loop feature.
--
-- Run this in Supabase SQL Editor if you're seeing errors about missing tables.
-- =============================================================================

-- =============================================================================
-- AI_DAILY_SUMMARIES TABLE
-- =============================================================================
-- PRE-COMPUTED daily AI summaries for habit loops

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
-- AI_WEEKLY_SUMMARIES TABLE
-- =============================================================================
-- Weekly reflection summaries for deeper habit engagement

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
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================

-- Enable RLS on AI summary tables
alter table public.ai_daily_summaries enable row level security;
alter table public.ai_weekly_summaries enable row level security;

-- AI Daily Summaries: users can only view their own summaries
drop policy if exists "Users can view own daily summaries" on public.ai_daily_summaries;
create policy "Users can view own daily summaries"
  on public.ai_daily_summaries for select
  using (auth.uid() = user_id);

-- AI Weekly Summaries: users can only view their own summaries
drop policy if exists "Users can view own weekly summaries" on public.ai_weekly_summaries;
create policy "Users can view own weekly summaries"
  on public.ai_weekly_summaries for select
  using (auth.uid() = user_id);

-- =============================================================================
-- DONE!
-- =============================================================================
-- The ai_daily_summaries and ai_weekly_summaries tables are now ready.
-- Your app should no longer show "table not found" errors.
-- =============================================================================













