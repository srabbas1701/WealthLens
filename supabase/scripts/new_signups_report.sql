-- =============================================================================
-- New Signups Report (Last 24 Hours)
-- =============================================================================
-- Run in Supabase SQL Editor or any PostgreSQL client
-- Adjust the interval below for different time windows (e.g. '48 hours')
--
-- Note: Remove the insurance_by_user CTE and insurance_count if
--       insurance_policies table does not exist in your schema.
-- =============================================================================

WITH signups AS (
  SELECT
    u.id,
    u.full_name,
    u.email,
    u.phone_number,
    u.created_at
  FROM public.users u
  WHERE u.created_at >= NOW() - INTERVAL '24 hours'
  ORDER BY u.created_at DESC
),

-- Holdings (equity, mutual_fund, gold, fd, etc.) via portfolios
holdings_by_user AS (
  SELECT
    p.user_id,
    a.asset_type,
    a.name AS asset_name,
    h.id AS holding_id
  FROM public.portfolios p
  JOIN public.holdings h ON h.portfolio_id = p.id
  JOIN public.assets a ON a.id = h.asset_id
),

-- Real estate
real_estate_by_user AS (
  SELECT
    user_id,
    property_nickname,
    property_type,
    id AS asset_id
  FROM public.real_estate_assets
),

-- Insurance (skip if table doesn't exist)
insurance_by_user AS (
  SELECT
    user_id,
    category,
    policy_name,
    id AS policy_id
  FROM public.insurance_policies
)

-- Main report: user details + asset summary
SELECT
  s.id AS user_id,
  s.full_name,
  s.email,
  s.phone_number,
  s.created_at AS registered_at,
  -- Holdings summary (asset types with counts)
  (
    SELECT jsonb_object_agg(asset_type, cnt)
    FROM (
      SELECT h.asset_type, COUNT(*)::int AS cnt
      FROM holdings_by_user h
      WHERE h.user_id = s.id
      GROUP BY h.asset_type
    ) t
  ) AS holdings_by_type,
  -- Real estate count
  (SELECT COUNT(*) FROM real_estate_by_user r WHERE r.user_id = s.id) AS real_estate_count,
  -- Insurance count
  (SELECT COUNT(*) FROM insurance_by_user i WHERE i.user_id = s.id) AS insurance_count
FROM signups s;

-- =============================================================================
-- Optional: Detailed view - each user with their asset entries listed
-- =============================================================================

/*
SELECT
  s.id AS user_id,
  s.full_name,
  s.email,
  s.phone_number,
  s.created_at AS registered_at,
  'holdings:' || h.asset_type AS asset_category,
  h.asset_name
FROM public.users s
LEFT JOIN (
  SELECT p.user_id, a.asset_type, a.name AS asset_name
  FROM public.portfolios p
  JOIN public.holdings h ON h.portfolio_id = p.id
  JOIN public.assets a ON a.id = h.asset_id
) h ON h.user_id = s.id
WHERE s.created_at >= NOW() - INTERVAL '24 hours'
  AND h.asset_name IS NOT NULL

UNION ALL

SELECT
  s.id,
  s.full_name,
  s.email,
  s.phone_number,
  s.created_at,
  'real_estate' AS asset_category,
  r.property_nickname AS asset_name
FROM public.users s
JOIN public.real_estate_assets r ON r.user_id = s.id
WHERE s.created_at >= NOW() - INTERVAL '24 hours'

UNION ALL

SELECT
  s.id,
  s.full_name,
  s.email,
  s.phone_number,
  s.created_at,
  'insurance:' || i.category AS asset_category,
  i.policy_name AS asset_name
FROM public.users s
JOIN public.insurance_policies i ON i.user_id = s.id
WHERE s.created_at >= NOW() - INTERVAL '24 hours'

ORDER BY registered_at DESC, user_id, asset_category;
*/
