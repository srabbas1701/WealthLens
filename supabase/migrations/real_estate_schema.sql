-- ============================================================================
-- Real Estate Module Schema
-- Production-ready SQL for Indian Investment Portfolio App
-- ============================================================================

-- ----------------------------------------------------------------------------
-- ENUMS
-- ----------------------------------------------------------------------------

-- Property type classification
CREATE TYPE property_type_enum AS ENUM (
    'residential',
    'commercial',
    'land'
);

-- Property construction status
CREATE TYPE property_status_enum AS ENUM (
    'ready',
    'under_construction'
);

-- Rental/occupancy status
CREATE TYPE rental_status_enum AS ENUM (
    'self_occupied',
    'rented',
    'vacant'
);

-- ----------------------------------------------------------------------------
-- TABLE: real_estate_assets
-- Main table storing real estate property information
-- ----------------------------------------------------------------------------

CREATE TABLE real_estate_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Basic property information
    property_nickname TEXT NOT NULL,
    property_type property_type_enum NOT NULL,
    property_status property_status_enum NOT NULL,
    
    -- Financial details
    purchase_price NUMERIC(15, 2),
    purchase_date DATE,
    registration_value NUMERIC(15, 2),
    ownership_percentage NUMERIC(5, 2) DEFAULT 100.00 CHECK (ownership_percentage >= 0 AND ownership_percentage <= 100),
    
    -- Location details
    city TEXT,
    state TEXT,
    pincode TEXT,
    address TEXT,
    
    -- Project and builder information
    project_name TEXT,
    builder_name TEXT,
    rera_number TEXT, -- RERA registration number for transparency
    
    -- Area measurements (in square feet)
    carpet_area_sqft NUMERIC(10, 2),
    builtup_area_sqft NUMERIC(10, 2),
    
    -- Valuation fields
    user_override_value NUMERIC(15, 2), -- Manual override by user
    system_estimated_min NUMERIC(15, 2), -- System-generated minimum estimate
    system_estimated_max NUMERIC(15, 2), -- System-generated maximum estimate
    valuation_last_updated TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_ownership_percentage CHECK (ownership_percentage >= 0 AND ownership_percentage <= 100),
    CONSTRAINT valid_purchase_date CHECK (purchase_date IS NULL OR purchase_date <= CURRENT_DATE)
);

-- ----------------------------------------------------------------------------
-- TABLE: real_estate_loans
-- Tracks home loans and other property-related loans
-- ----------------------------------------------------------------------------

CREATE TABLE real_estate_loans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL REFERENCES real_estate_assets(id) ON DELETE CASCADE,
    
    -- Loan details
    lender_name TEXT NOT NULL,
    loan_amount NUMERIC(15, 2) NOT NULL,
    interest_rate NUMERIC(5, 2), -- Annual interest rate percentage
    emi NUMERIC(10, 2), -- Equated Monthly Installment
    tenure_months INTEGER, -- Loan tenure in months
    outstanding_balance NUMERIC(15, 2), -- Current outstanding loan amount
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_loan_amount CHECK (loan_amount >= 0),
    CONSTRAINT valid_interest_rate CHECK (interest_rate IS NULL OR (interest_rate >= 0 AND interest_rate <= 100)),
    CONSTRAINT valid_emi CHECK (emi IS NULL OR emi >= 0),
    CONSTRAINT valid_tenure CHECK (tenure_months IS NULL OR tenure_months > 0),
    CONSTRAINT valid_outstanding_balance CHECK (outstanding_balance IS NULL OR outstanding_balance >= 0)
);

-- ----------------------------------------------------------------------------
-- TABLE: real_estate_cashflows
-- Tracks rental income, expenses, and occupancy status
-- ----------------------------------------------------------------------------

CREATE TABLE real_estate_cashflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL REFERENCES real_estate_assets(id) ON DELETE CASCADE,
    
    -- Rental and occupancy
    rental_status rental_status_enum NOT NULL DEFAULT 'self_occupied',
    monthly_rent NUMERIC(10, 2),
    rent_start_date DATE,
    escalation_percent NUMERIC(5, 2), -- Annual rent escalation percentage
    
    -- Expenses
    maintenance_monthly NUMERIC(10, 2), -- Monthly maintenance charges
    property_tax_annual NUMERIC(10, 2), -- Annual property tax
    other_expenses_monthly NUMERIC(10, 2), -- Other monthly expenses (insurance, etc.)
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_monthly_rent CHECK (monthly_rent IS NULL OR monthly_rent >= 0),
    CONSTRAINT valid_escalation CHECK (escalation_percent IS NULL OR (escalation_percent >= 0 AND escalation_percent <= 100)),
    CONSTRAINT valid_maintenance CHECK (maintenance_monthly IS NULL OR maintenance_monthly >= 0),
    CONSTRAINT valid_property_tax CHECK (property_tax_annual IS NULL OR property_tax_annual >= 0),
    CONSTRAINT valid_other_expenses CHECK (other_expenses_monthly IS NULL OR other_expenses_monthly >= 0),
    CONSTRAINT rent_consistency CHECK (
        (rental_status = 'rented' AND monthly_rent IS NOT NULL) OR
        (rental_status != 'rented')
    )
);

-- ----------------------------------------------------------------------------
-- INDEXES
-- Optimize queries on frequently filtered columns
-- ----------------------------------------------------------------------------

-- Index on user_id for fast user-specific queries
CREATE INDEX idx_real_estate_assets_user_id ON real_estate_assets(user_id);

-- Index on asset_id for fast joins with loans and cashflows
CREATE INDEX idx_real_estate_loans_asset_id ON real_estate_loans(asset_id);
CREATE INDEX idx_real_estate_cashflows_asset_id ON real_estate_cashflows(asset_id);

-- Composite index for common query patterns (user + property type)
CREATE INDEX idx_real_estate_assets_user_type ON real_estate_assets(user_id, property_type);

-- Index on valuation_last_updated for sorting/filtering
CREATE INDEX idx_real_estate_assets_valuation_updated ON real_estate_assets(valuation_last_updated);

-- ----------------------------------------------------------------------------
-- TRIGGERS
-- Auto-update updated_at timestamp on row modification
-- ----------------------------------------------------------------------------

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all three tables
CREATE TRIGGER update_real_estate_assets_updated_at
    BEFORE UPDATE ON real_estate_assets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_real_estate_loans_updated_at
    BEFORE UPDATE ON real_estate_loans
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_real_estate_cashflows_updated_at
    BEFORE UPDATE ON real_estate_cashflows
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Ensure users can only access their own data
-- ----------------------------------------------------------------------------

-- Enable RLS on all tables
ALTER TABLE real_estate_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE real_estate_loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE real_estate_cashflows ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own assets
CREATE POLICY "Users can view own real estate assets"
    ON real_estate_assets
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can insert their own assets
CREATE POLICY "Users can insert own real estate assets"
    ON real_estate_assets
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own assets
CREATE POLICY "Users can update own real estate assets"
    ON real_estate_assets
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own assets
CREATE POLICY "Users can delete own real estate assets"
    ON real_estate_assets
    FOR DELETE
    USING (auth.uid() = user_id);

-- Policy: Users can view loans for their own assets
CREATE POLICY "Users can view loans for own assets"
    ON real_estate_loans
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM real_estate_assets
            WHERE real_estate_assets.id = real_estate_loans.asset_id
            AND real_estate_assets.user_id = auth.uid()
        )
    );

-- Policy: Users can insert loans for their own assets
CREATE POLICY "Users can insert loans for own assets"
    ON real_estate_loans
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM real_estate_assets
            WHERE real_estate_assets.id = real_estate_loans.asset_id
            AND real_estate_assets.user_id = auth.uid()
        )
    );

-- Policy: Users can update loans for their own assets
CREATE POLICY "Users can update loans for own assets"
    ON real_estate_loans
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM real_estate_assets
            WHERE real_estate_assets.id = real_estate_loans.asset_id
            AND real_estate_assets.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM real_estate_assets
            WHERE real_estate_assets.id = real_estate_loans.asset_id
            AND real_estate_assets.user_id = auth.uid()
        )
    );

-- Policy: Users can delete loans for their own assets
CREATE POLICY "Users can delete loans for own assets"
    ON real_estate_loans
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM real_estate_assets
            WHERE real_estate_assets.id = real_estate_loans.asset_id
            AND real_estate_assets.user_id = auth.uid()
        )
    );

-- Policy: Users can view cashflows for their own assets
CREATE POLICY "Users can view cashflows for own assets"
    ON real_estate_cashflows
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM real_estate_assets
            WHERE real_estate_assets.id = real_estate_cashflows.asset_id
            AND real_estate_assets.user_id = auth.uid()
        )
    );

-- Policy: Users can insert cashflows for their own assets
CREATE POLICY "Users can insert cashflows for own assets"
    ON real_estate_cashflows
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM real_estate_assets
            WHERE real_estate_assets.id = real_estate_cashflows.asset_id
            AND real_estate_assets.user_id = auth.uid()
        )
    );

-- Policy: Users can update cashflows for their own assets
CREATE POLICY "Users can update cashflows for own assets"
    ON real_estate_cashflows
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM real_estate_assets
            WHERE real_estate_assets.id = real_estate_cashflows.asset_id
            AND real_estate_assets.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM real_estate_assets
            WHERE real_estate_assets.id = real_estate_cashflows.asset_id
            AND real_estate_assets.user_id = auth.uid()
        )
    );

-- Policy: Users can delete cashflows for their own assets
CREATE POLICY "Users can delete cashflows for own assets"
    ON real_estate_cashflows
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM real_estate_assets
            WHERE real_estate_assets.id = real_estate_cashflows.asset_id
            AND real_estate_assets.user_id = auth.uid()
        )
    );

-- ----------------------------------------------------------------------------
-- COMMENTS
-- Documentation for better understanding
-- ----------------------------------------------------------------------------

COMMENT ON TABLE real_estate_assets IS 'Stores real estate property information including location, financials, and valuation data';
COMMENT ON TABLE real_estate_loans IS 'Tracks home loans and property-related loans linked to real estate assets';
COMMENT ON TABLE real_estate_cashflows IS 'Manages rental income, expenses, and occupancy status for properties';

COMMENT ON COLUMN real_estate_assets.ownership_percentage IS 'Percentage of ownership (0-100), useful for joint ownership scenarios';
COMMENT ON COLUMN real_estate_assets.rera_number IS 'RERA registration number for property transparency and compliance';
COMMENT ON COLUMN real_estate_assets.carpet_area_sqft IS 'Usable area inside the property (excluding walls)';
COMMENT ON COLUMN real_estate_assets.builtup_area_sqft IS 'Total constructed area including walls and common areas';
COMMENT ON COLUMN real_estate_assets.user_override_value IS 'Manual valuation override by user';
COMMENT ON COLUMN real_estate_assets.system_estimated_min IS 'System-generated minimum property valuation';
COMMENT ON COLUMN real_estate_assets.system_estimated_max IS 'System-generated maximum property valuation';

COMMENT ON COLUMN real_estate_loans.outstanding_balance IS 'Current outstanding loan amount (should be updated periodically)';
COMMENT ON COLUMN real_estate_cashflows.escalation_percent IS 'Annual percentage increase in rent';
COMMENT ON COLUMN real_estate_cashflows.maintenance_monthly IS 'Monthly maintenance charges paid to society/association';
