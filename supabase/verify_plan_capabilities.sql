-- =============================================================================
-- Plan Capabilities Sanity Check
-- =============================================================================
-- Run this in Supabase SQL Editor to verify plan_capabilities matches
-- PricingSection.tsx exactly. Must have BOTH frontend guards AND correct DB mapping.
--
-- Usage: Run the SELECT, then verify against EXPECTED MAPPING below.
-- =============================================================================

-- ONE-TIME SANITY QUERY: Current plan → capability mapping
SELECT p.name AS plan_name, c.key AS capability_key
FROM plans p
JOIN plan_capabilities pc ON p.id = pc.plan_id
JOIN capabilities c ON c.id = pc.capability_id
WHERE c.is_active = true
ORDER BY p.name, c.key;

-- =============================================================================
-- EXPECTED MAPPING (must match PricingSection.tsx exactly)
-- =============================================================================
--
-- FREE:
--   MUST NOT HAVE: advanced_analytics, real_assets, insurance, manage_liabilities,
--                  pdf_reports (downloads), excel_exports, use_ai_help
--   (Free has: view_holdings, analyst_queries or similar limited access only)
--
-- PRO:
--   MUST HAVE:    advanced_analytics, real_assets, insurance, manage_liabilities,
--                 pdf_reports, excel_exports
--   MUST NOT HAVE: use_ai_help (AI Portfolio Analyst is Premium-only)
--
-- PREMIUM:
--   MUST HAVE:    Everything in Pro + use_ai_help
--                 (unlimited_analyst, weekly_deep_dives, etc.)
--
-- =============================================================================
-- Quick verification (optional): Count capabilities per plan
-- =============================================================================
-- SELECT p.name, COUNT(pc.capability_id) AS capability_count
-- FROM plans p
-- LEFT JOIN plan_capabilities pc ON p.id = pc.plan_id
-- JOIN capabilities c ON c.id = pc.capability_id AND c.is_active = true
-- GROUP BY p.name ORDER BY p.name;
