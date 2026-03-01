-- ============================================================================
-- Migration 020: Add Co-Owner Fields to Real Estate Assets
--
-- Adds co_owner_name and co_owner_relationship columns to real_estate_assets
-- to capture joint ownership details when ownership_percentage < 100.
-- ============================================================================

ALTER TABLE real_estate_assets
  ADD COLUMN IF NOT EXISTS co_owner_name TEXT,
  ADD COLUMN IF NOT EXISTS co_owner_relationship TEXT;

COMMENT ON COLUMN real_estate_assets.co_owner_name IS 'Name of the co-owner (shown when ownership_percentage < 100)';
COMMENT ON COLUMN real_estate_assets.co_owner_relationship IS 'Relationship with co-owner (e.g., Spouse, Parent, Sibling, Business Partner)';
