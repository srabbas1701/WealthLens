-- =============================================================================
-- WEALTHLENSAI SEED DATA
-- =============================================================================
-- Run this in Supabase SQL Editor after creating the schema
-- This creates sample data for testing the application
-- 
-- VALIDATED: All UUIDs are valid hex (0-9, a-f only)
-- VALIDATED: All column types match schema.sql
-- =============================================================================

-- =============================================================================
-- 0. CREATE TEST USER IN AUTH (Required for foreign key)
-- =============================================================================
-- Supabase requires users to exist in auth.users before public.users

INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'rahul@example.com',
  crypt('TestPassword123!', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
) ON CONFLICT (id) DO NOTHING;

-- Insert into auth.identities (required for some Supabase versions)
INSERT INTO auth.identities (
  id,
  user_id,
  provider_id,
  provider,
  identity_data,
  last_sign_in_at,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'rahul@example.com',
  'email',
  jsonb_build_object('sub', '00000000-0000-0000-0000-000000000001', 'email', 'rahul@example.com'),
  NOW(),
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- 1. SAMPLE ASSETS (Master Data)
-- =============================================================================

-- Clean up first to avoid conflicts
DELETE FROM holdings WHERE portfolio_id = 'b0000001-0000-0000-0000-000000000001';
DELETE FROM portfolio_insights WHERE portfolio_id = 'b0000001-0000-0000-0000-000000000001';
DELETE FROM portfolio_metrics WHERE portfolio_id = 'b0000001-0000-0000-0000-000000000001';
DELETE FROM portfolios WHERE id = 'b0000001-0000-0000-0000-000000000001';
DELETE FROM onboarding_snapshots WHERE user_id = '00000000-0000-0000-0000-000000000001';
DELETE FROM users WHERE id = '00000000-0000-0000-0000-000000000001';

-- Delete assets by ISIN to avoid unique constraint violations
DELETE FROM assets WHERE isin IN (
  'INF179K01AA8', 'INF200K01LK4', 'INF846K01DP8', 'INF879O01019',
  'INF789F01986', 'INF179K01YX1', 'INF109K01AZ8', 'INF200K01HJ3', 'INF200K01JJ0'
);

-- Delete assets by ID
DELETE FROM assets WHERE id IN (
  'a0000001-0000-0000-0000-000000000001',
  'a0000001-0000-0000-0000-000000000002',
  'a0000001-0000-0000-0000-000000000003',
  'a0000001-0000-0000-0000-000000000004',
  'a0000001-0000-0000-0000-000000000005',
  'a0000001-0000-0000-0000-000000000006',
  'a0000001-0000-0000-0000-000000000007',
  'a0000001-0000-0000-0000-000000000008',
  'a0000001-0000-0000-0000-000000000009',
  'a0000001-0000-0000-0000-00000000000a',
  'a0000001-0000-0000-0000-00000000000b',
  'a0000001-0000-0000-0000-00000000000c',
  'a0000001-0000-0000-0000-00000000000d',
  'a0000001-0000-0000-0000-00000000000e'
);

-- Insert assets
-- Schema: id, name, asset_type, isin, symbol, sector, sub_sector, risk_bucket, asset_class, is_active
INSERT INTO assets (id, name, asset_type, isin, symbol, sector, sub_sector, risk_bucket, asset_class, is_active) VALUES
  ('a0000001-0000-0000-0000-000000000001', 'HDFC Flexi Cap Fund', 'mutual_fund', 'INF179K01AA8', 'HDFCFLEXICAP', 'Multi Cap', 'Flexi Cap', 'high', 'equity', true),
  ('a0000001-0000-0000-0000-000000000002', 'SBI Bluechip Fund', 'mutual_fund', 'INF200K01LK4', 'SBIBLUECHIP', 'Large Cap', 'Bluechip', 'medium', 'equity', true),
  ('a0000001-0000-0000-0000-000000000003', 'Axis Midcap Fund', 'mutual_fund', 'INF846K01DP8', 'AXISMIDCAP', 'Mid Cap', 'Mid Cap', 'high', 'equity', true),
  ('a0000001-0000-0000-0000-000000000004', 'Parag Parikh Flexi Cap', 'mutual_fund', 'INF879O01019', 'PPFAS', 'Multi Cap', 'Flexi Cap', 'medium', 'equity', true),
  ('a0000001-0000-0000-0000-000000000005', 'UTI Nifty 50 Index Fund', 'index_fund', 'INF789F01986', 'UTINIFTY50', 'Index', 'Large Cap Index', 'medium', 'equity', true),
  ('a0000001-0000-0000-0000-000000000006', 'HDFC Nifty Next 50 Index', 'index_fund', 'INF179K01YX1', 'HDFCNEXT50', 'Index', 'Large Cap Index', 'medium', 'equity', true),
  ('a0000001-0000-0000-0000-000000000007', 'ICICI Pru Corporate Bond', 'mutual_fund', 'INF109K01AZ8', 'ICICORPBOND', 'Debt', 'Corporate Bond', 'low', 'debt', true),
  ('a0000001-0000-0000-0000-000000000008', 'SBI Magnum Gilt Fund', 'mutual_fund', 'INF200K01HJ3', 'SBIGILT', 'Debt', 'Gilt', 'low', 'debt', true),
  ('a0000001-0000-0000-0000-000000000009', 'Public Provident Fund', 'ppf', NULL, 'PPF', 'Government', 'Small Savings', 'low', 'debt', true),
  ('a0000001-0000-0000-0000-00000000000a', 'Employee Provident Fund', 'epf', NULL, 'EPF', 'Government', 'Retirement', 'low', 'debt', true),
  ('a0000001-0000-0000-0000-00000000000b', 'SBI Gold Fund', 'mutual_fund', 'INF200K01JJ0', 'SBIGOLD', 'Gold', 'Gold Fund', 'medium', 'gold', true),
  ('a0000001-0000-0000-0000-00000000000c', 'Sovereign Gold Bond 2024', 'gold', NULL, 'SGB2024', 'Gold', 'SGB', 'medium', 'gold', true),
  ('a0000001-0000-0000-0000-00000000000d', 'HDFC Bank FD', 'fd', NULL, 'HDFCFD', 'Bank', 'Fixed Deposit', 'low', 'cash', true),
  ('a0000001-0000-0000-0000-00000000000e', 'Savings Account', 'cash', NULL, 'SAVINGS', 'Bank', 'Savings', 'low', 'cash', true);

-- =============================================================================
-- 2. SAMPLE USER
-- =============================================================================
-- Schema: id, full_name, email, risk_label, risk_score, primary_goal, horizon_years

INSERT INTO users (id, full_name, email, risk_label, risk_score, primary_goal, horizon_years) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Rahul Sharma', 'rahul@example.com', 'Moderate', 62, 'retirement', 15);

-- =============================================================================
-- 3. SAMPLE PORTFOLIO
-- =============================================================================
-- Schema: id, user_id, name, is_primary, total_value, currency

INSERT INTO portfolios (id, user_id, name, is_primary, total_value, currency) VALUES
  ('b0000001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'My Portfolio', true, 2485420, 'INR');

-- =============================================================================
-- 4. SAMPLE HOLDINGS
-- =============================================================================
-- Schema: id, portfolio_id, asset_id, quantity, invested_value, current_value, source

INSERT INTO holdings (id, portfolio_id, asset_id, quantity, invested_value, current_value, source) VALUES
  ('c0000001-0000-0000-0000-000000000001', 'b0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001', 2500, 420000, 485230, 'sample'),
  ('c0000001-0000-0000-0000-000000000002', 'b0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000002', 1800, 265000, 298450, 'sample'),
  ('c0000001-0000-0000-0000-000000000003', 'b0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000003', 1200, 180000, 215890, 'sample'),
  ('c0000001-0000-0000-0000-000000000004', 'b0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000004', 1000, 105000, 118620, 'sample'),
  ('c0000001-0000-0000-0000-000000000005', 'b0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000005', 2000, 320000, 372150, 'sample'),
  ('c0000001-0000-0000-0000-000000000006', 'b0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000006', 800, 115000, 124930, 'sample'),
  ('c0000001-0000-0000-0000-000000000007', 'b0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000007', 1500, 235000, 246320, 'sample'),
  ('c0000001-0000-0000-0000-000000000008', 'b0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000008', 800, 118000, 126490, 'sample'),
  ('c0000001-0000-0000-0000-000000000009', 'b0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000009', 1, 165000, 198240, 'sample'),
  ('c0000001-0000-0000-0000-00000000000a', 'b0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-00000000000a', 1, 85000, 99850, 'sample'),
  ('c0000001-0000-0000-0000-00000000000b', 'b0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-00000000000b', 500, 95000, 124250, 'sample'),
  ('c0000001-0000-0000-0000-00000000000c', 'b0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-00000000000d', 1, 65000, 75000, 'sample');

-- =============================================================================
-- 5. PORTFOLIO METRICS
-- =============================================================================
-- Schema: portfolio_id, equity_pct, debt_pct, gold_pct, cash_pct, hybrid_pct,
--         risk_score, risk_label, diversification_score, concentration_score,
--         sector_concentration_pct (numeric), top_holding_pct (numeric),
--         goal_alignment, goal_progress_pct, last_calculated

INSERT INTO portfolio_metrics (
  portfolio_id,
  equity_pct,
  debt_pct,
  gold_pct,
  cash_pct,
  hybrid_pct,
  risk_score,
  risk_label,
  diversification_score,
  concentration_score,
  sector_concentration_pct,
  top_holding_pct,
  goal_alignment,
  goal_progress_pct,
  last_calculated
) VALUES (
  'b0000001-0000-0000-0000-000000000001',
  65,      -- equity_pct
  27,      -- debt_pct
  5,       -- gold_pct
  3,       -- cash_pct
  0,       -- hybrid_pct
  62,      -- risk_score
  'Moderate',  -- risk_label
  85,      -- diversification_score
  28,      -- concentration_score
  28,      -- sector_concentration_pct (numeric - IT sector is 28%)
  19.5,    -- top_holding_pct (numeric - top holding is 19.5%)
  'On Track',  -- goal_alignment
  78,      -- goal_progress_pct
  NOW()    -- last_calculated
);

-- =============================================================================
-- 6. PORTFOLIO INSIGHTS
-- =============================================================================
-- Schema: id, portfolio_id, insight_type, severity, title, summary, details, is_active

INSERT INTO portfolio_insights (id, portfolio_id, insight_type, severity, title, summary, details, is_active) VALUES
  ('d0000001-0000-0000-0000-000000000001', 'b0000001-0000-0000-0000-000000000001', 'concentration', 'low', 'IT Sector Concentration', 'IT sector is 28% of your equity', 'Slightly above your target of 25%. Consider reviewing during your next SIP.', true),
  ('d0000001-0000-0000-0000-000000000002', 'b0000001-0000-0000-0000-000000000001', 'tax_opportunity', 'medium', 'Tax Harvesting Opportunity', '₹18,500 in short-term losses could offset gains', 'Review before March 31 to optimize your tax liability.', true),
  ('d0000001-0000-0000-0000-000000000003', 'b0000001-0000-0000-0000-000000000001', 'sip_reminder', 'low', 'SIP Step-Up Reminder', 'Annual 10% increase would add ₹2,500/month', 'Consider increasing your SIP to stay on track for retirement goal.', true);

-- =============================================================================
-- 7. MARKET CONTEXT
-- =============================================================================
-- Schema: date, market_mood, nifty_change, sensex_change, summary, detailed_summary, affected_sectors

INSERT INTO market_context (date, market_mood, nifty_change, sensex_change, summary, detailed_summary, affected_sectors) VALUES
  (CURRENT_DATE, 'stable', -0.3, -0.25, 'Markets traded flat with slight negative bias', 'Markets saw some volatility due to global cues, primarily driven by IT sector weakness. Banking stocks provided some support.', ARRAY['IT', 'Pharma'])
ON CONFLICT (date) DO UPDATE SET
  market_mood = EXCLUDED.market_mood,
  nifty_change = EXCLUDED.nifty_change,
  summary = EXCLUDED.summary;

-- =============================================================================
-- 8. ONBOARDING SNAPSHOT
-- =============================================================================
-- Schema: user_id, goals, primary_goal, horizon_years, risk_answers, risk_label, risk_score,
--         portfolio_snapshot, ai_summary, confidence, is_complete, completed_at

INSERT INTO onboarding_snapshots (
  user_id,
  goals,
  primary_goal,
  horizon_years,
  risk_answers,
  risk_label,
  risk_score,
  portfolio_snapshot,
  ai_summary,
  confidence,
  is_complete,
  completed_at
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  ARRAY['retirement', 'wealth_building'],
  'retirement',
  15,
  '["worried_but_stay_invested", "comfortable_with_volatility"]'::jsonb,
  'Moderate',
  62,
  '{"equity_pct": 65, "debt_pct": 27, "gold_pct": 5, "cash_pct": 3}'::jsonb,
  ARRAY['You are a moderate risk investor', 'Your portfolio is equity-heavy, focused on growth', 'With a 15+ year horizon, you have time for long-term growth', 'Your risk level aligns with your goals'],
  'high',
  true,
  NOW()
);

-- =============================================================================
-- 9. AI DAILY SUMMARIES
-- =============================================================================
-- Pre-computed daily AI summaries for habit loops
-- 
-- DESIGN PHILOSOPHY:
-- - Most days should be "no_action_required" - this is CORRECT behavior
-- - Calm, reassuring tone builds trust and reduces anxiety
-- - Users return because they feel informed, not worried
-- - NO urgency language, NO trading language, NO predictions
--
-- WHY "NO ACTION REQUIRED" IS THE DEFAULT:
-- Long-term investing is intentionally boring. Most days, nothing significant
-- happens, and that's exactly what we want. This status reinforces patience
-- and prevents the anxiety-driven checking that leads to poor decisions.

-- Clean up existing summaries first
DELETE FROM ai_daily_summaries WHERE user_id = '00000000-0000-0000-0000-000000000001';

-- Today's summary (most recent)
INSERT INTO ai_daily_summaries (
  id,
  user_id,
  portfolio_id,
  summary_date,
  headline,
  summary_points,
  status,
  portfolio_value_at_generation,
  market_mood_at_generation,
  risk_score_at_generation,
  generated_at
) VALUES (
  'e0000001-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'b0000001-0000-0000-0000-000000000001',
  CURRENT_DATE,
  'Your portfolio remains stable today',
  ARRAY[
    'Markets traded in a narrow range with mild profit booking',
    'Your portfolio impact was limited due to diversification',
    'Your risk level remains within your comfort zone',
    'You remain on track for your retirement goals'
  ],
  'no_action_required',  -- DEFAULT: Most days are calm
  2485420,
  'stable',
  62,
  NOW()
);

-- Yesterday's summary (showing consistency)
INSERT INTO ai_daily_summaries (
  id,
  user_id,
  portfolio_id,
  summary_date,
  headline,
  summary_points,
  status,
  portfolio_value_at_generation,
  market_mood_at_generation,
  risk_score_at_generation,
  generated_at
) VALUES (
  'e0000001-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  'b0000001-0000-0000-0000-000000000001',
  CURRENT_DATE - INTERVAL '1 day',
  'A quiet day for your investments',
  ARRAY[
    'Markets saw slight positive movement led by banking stocks',
    'Your portfolio moved in line with broader markets',
    'Diversification continues to provide stability',
    'No changes needed to your investment strategy'
  ],
  'no_action_required',
  2478650,
  'stable',
  62,
  NOW() - INTERVAL '1 day'
);

-- 3 days ago - example of "monitor" status (rare but not alarming)
INSERT INTO ai_daily_summaries (
  id,
  user_id,
  portfolio_id,
  summary_date,
  headline,
  summary_points,
  status,
  portfolio_value_at_generation,
  market_mood_at_generation,
  risk_score_at_generation,
  generated_at
) VALUES (
  'e0000001-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000001',
  'b0000001-0000-0000-0000-000000000001',
  CURRENT_DATE - INTERVAL '3 days',
  'Markets saw some volatility today',
  ARRAY[
    'IT sector experienced weakness due to global tech concerns',
    'Your IT exposure (28%) was affected, but diversification helped',
    'This is typical market behavior - part of long-term investing',
    'Your overall risk profile remains unchanged'
  ],
  'monitor',  -- Worth noting, but no action needed
  2465890,
  'volatile',
  62,
  NOW() - INTERVAL '3 days'
);

-- =============================================================================
-- 10. AI WEEKLY SUMMARIES
-- =============================================================================
-- Weekly reflection summaries for deeper habit engagement
--
-- DESIGN PHILOSOPHY:
-- - Weekly is for "zoom out" perspective - "Am I on track?"
-- - Covers allocation drift, goal progress, diversification
-- - Reflective, not reactive
-- - Celebrates consistency ("You stayed the course")
-- - NO predictions, NO recommendations to buy/sell

-- Clean up existing weekly summaries first
DELETE FROM ai_weekly_summaries WHERE user_id = '00000000-0000-0000-0000-000000000001';

-- Current week summary
INSERT INTO ai_weekly_summaries (
  id,
  user_id,
  portfolio_id,
  week_start_date,
  week_end_date,
  headline,
  summary_points,
  status,
  allocation_drift_summary,
  risk_alignment_status,
  goal_progress_summary,
  diversification_note,
  reflection_prompt,
  portfolio_value_at_generation,
  equity_pct_at_generation,
  debt_pct_at_generation,
  risk_score_at_generation,
  generated_at
) VALUES (
  'f0000001-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'b0000001-0000-0000-0000-000000000001',
  DATE_TRUNC('week', CURRENT_DATE)::date,  -- Monday of current week
  (DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '6 days')::date,  -- Sunday
  'A steady week for your portfolio',
  ARRAY[
    'Your portfolio remained well-balanced throughout the week',
    'Markets saw mixed movements, but your diversification provided stability',
    'Asset allocation stayed within your target range',
    'You continue to make progress toward your retirement goal'
  ],
  'no_action_required',
  'Your allocation remained stable this week. Equity at 65% and debt at 27% - both within your target range.',
  'aligned',  -- Risk profile matches portfolio
  'You are 78% of the way to your retirement goal. At your current pace, you remain on track.',
  'Your portfolio is spread across 12 holdings in 5 asset classes - healthy diversification.',
  'How do you feel about your investment journey this week?',
  2485420,
  65,
  27,
  62,
  NOW()
);

-- Previous week summary
INSERT INTO ai_weekly_summaries (
  id,
  user_id,
  portfolio_id,
  week_start_date,
  week_end_date,
  headline,
  summary_points,
  status,
  allocation_drift_summary,
  risk_alignment_status,
  goal_progress_summary,
  diversification_note,
  reflection_prompt,
  portfolio_value_at_generation,
  equity_pct_at_generation,
  debt_pct_at_generation,
  risk_score_at_generation,
  generated_at
) VALUES (
  'f0000001-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  'b0000001-0000-0000-0000-000000000001',
  (DATE_TRUNC('week', CURRENT_DATE) - INTERVAL '1 week')::date,
  (DATE_TRUNC('week', CURRENT_DATE) - INTERVAL '1 day')::date,
  'You stayed the course despite market volatility',
  ARRAY[
    'Markets experienced some turbulence mid-week',
    'Your portfolio showed resilience due to diversification',
    'Equity allocation shifted slightly but remains within range',
    'Long-term investors benefit from staying invested during volatility'
  ],
  'no_action_required',
  'Equity drifted from 64% to 65% due to market movements. This is normal and within your target range.',
  'aligned',
  'Goal progress increased from 77% to 78% this week. Steady progress.',
  'Your sector exposure remains balanced with no single sector exceeding 30%.',
  'What aspect of your portfolio would you like to understand better?',
  2478650,
  65,
  27,
  62,
  NOW() - INTERVAL '1 week'
);

-- Two weeks ago - example of "slightly_drifted" (still not alarming)
INSERT INTO ai_weekly_summaries (
  id,
  user_id,
  portfolio_id,
  week_start_date,
  week_end_date,
  headline,
  summary_points,
  status,
  allocation_drift_summary,
  risk_alignment_status,
  goal_progress_summary,
  diversification_note,
  reflection_prompt,
  portfolio_value_at_generation,
  equity_pct_at_generation,
  debt_pct_at_generation,
  risk_score_at_generation,
  generated_at
) VALUES (
  'f0000001-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000001',
  'b0000001-0000-0000-0000-000000000001',
  (DATE_TRUNC('week', CURRENT_DATE) - INTERVAL '2 weeks')::date,
  (DATE_TRUNC('week', CURRENT_DATE) - INTERVAL '1 week' - INTERVAL '1 day')::date,
  'A week of market movements',
  ARRAY[
    'Equity markets rallied this week on positive economic data',
    'Your equity allocation increased slightly due to market gains',
    'This is normal behavior - allocations shift with market movements',
    'Consider reviewing your allocation during your next SIP'
  ],
  'monitor',  -- Worth noting
  'Equity moved from 63% to 66% due to market rally. Slightly above your target of 65%.',
  'slightly_drifted',  -- Not urgent, just awareness
  'Good progress this week. Goal completion moved from 76% to 77%.',
  'IT sector concentration increased to 29%. Worth monitoring but not concerning.',
  'Is your current asset allocation still aligned with your comfort level?',
  2465890,
  66,
  26,
  63,
  NOW() - INTERVAL '2 weeks'
);

-- =============================================================================
-- VERIFICATION - Run these after seed to confirm data
-- =============================================================================
-- SELECT 'users' as tbl, count(*) FROM users;
-- SELECT 'portfolios' as tbl, count(*) FROM portfolios;
-- SELECT 'assets' as tbl, count(*) FROM assets;
-- SELECT 'holdings' as tbl, count(*) FROM holdings;
-- SELECT 'portfolio_metrics' as tbl, count(*) FROM portfolio_metrics;
-- SELECT 'portfolio_insights' as tbl, count(*) FROM portfolio_insights;
-- SELECT 'market_context' as tbl, count(*) FROM market_context;
-- SELECT 'onboarding_snapshots' as tbl, count(*) FROM onboarding_snapshots;
-- SELECT 'ai_daily_summaries' as tbl, count(*) FROM ai_daily_summaries;
-- SELECT 'ai_weekly_summaries' as tbl, count(*) FROM ai_weekly_summaries;

-- =============================================================================
-- DONE!
-- =============================================================================
-- Test User:
--   ID: 00000000-0000-0000-0000-000000000001
--   Name: Rahul Sharma
--   Email: rahul@example.com
--   Password: TestPassword123!
--   Portfolio Value: ₹24.85 L
--   Risk Profile: Moderate (62/100)
--
-- AI Summaries:
--   Daily: 3 summaries (today, yesterday, 3 days ago)
--   Weekly: 3 summaries (current week, last week, 2 weeks ago)
--   Status distribution: Mostly "no_action_required" (as intended)
-- =============================================================================
