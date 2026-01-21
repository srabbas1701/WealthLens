-- ============================================================================
-- Real Estate Change History Table
-- Tracks all changes to real estate assets for audit and history purposes
-- ============================================================================

CREATE TABLE real_estate_change_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL REFERENCES real_estate_assets(id) ON DELETE CASCADE,
    
    -- Change details
    change_type TEXT NOT NULL, -- 'valuation', 'loan_balance', 'rental', 'property_details'
    field_name TEXT NOT NULL, -- Field that changed
    previous_value JSONB, -- Previous value (can be null, number, string, etc.)
    new_value JSONB, -- New value
    changed_by TEXT NOT NULL, -- 'user' | 'system'
    changed_by_user_id UUID REFERENCES auth.users(id), -- If changed_by = 'user'
    
    -- Metadata
    update_date DATE, -- Date of the update (for valuation/loan balance)
    source TEXT, -- 'manual', 'valuation_service', 'user_edit', etc.
    notes TEXT, -- Optional notes
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_change_type CHECK (change_type IN ('valuation', 'loan_balance', 'rental', 'property_details')),
    CONSTRAINT valid_changed_by CHECK (changed_by IN ('user', 'system'))
);

-- Indexes for fast queries
CREATE INDEX idx_real_estate_history_asset_id ON real_estate_change_history(asset_id);
CREATE INDEX idx_real_estate_history_type ON real_estate_change_history(asset_id, change_type);
CREATE INDEX idx_real_estate_history_created_at ON real_estate_change_history(created_at DESC);
CREATE INDEX idx_real_estate_history_user_id ON real_estate_change_history(changed_by_user_id);
CREATE INDEX idx_real_estate_history_update_date ON real_estate_change_history(update_date DESC);

-- RLS Policies
ALTER TABLE real_estate_change_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own change history"
    ON real_estate_change_history
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM real_estate_assets
            WHERE real_estate_assets.id = real_estate_change_history.asset_id
            AND real_estate_assets.user_id = auth.uid()
        )
    );

-- Comments
COMMENT ON TABLE real_estate_change_history IS 'Audit log for all changes to real estate assets, loans, and cashflows';
COMMENT ON COLUMN real_estate_change_history.change_type IS 'Type of change: valuation, loan_balance, rental, or property_details';
COMMENT ON COLUMN real_estate_change_history.field_name IS 'Name of the field that changed';
COMMENT ON COLUMN real_estate_change_history.previous_value IS 'Previous value (stored as JSONB for flexibility)';
COMMENT ON COLUMN real_estate_change_history.new_value IS 'New value (stored as JSONB for flexibility)';
COMMENT ON COLUMN real_estate_change_history.changed_by IS 'Who made the change: user or system';
COMMENT ON COLUMN real_estate_change_history.update_date IS 'Date of the update (for valuation/loan balance tracking)';
COMMENT ON COLUMN real_estate_change_history.source IS 'Source of the change: manual, valuation_service, user_edit, etc.';
