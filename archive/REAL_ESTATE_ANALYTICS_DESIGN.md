# Real Estate Analytics Calculations Design

**Status:** Design Document  
**Version:** 1.0  
**Date:** January 2025

---

## Overview

Comprehensive analytics calculations for real estate assets in an investment portfolio app. All calculations must account for **ownership percentage** and handle edge cases gracefully.

**Key Principles:**
- Ownership % applied to ALL value calculations
- Valuation ranges use midpoint for analytics
- EMI treated as cash outflow (negative)
- Security deposit NOT counted as income
- All metrics handle missing data gracefully

---

## Data Model Reference

### Tables Used:
- `real_estate_assets` - Property details, valuation, ownership
- `real_estate_loans` - Loan details, EMI, outstanding balance
- `real_estate_cashflows` - Rental income, expenses, occupancy

### Key Fields:
```typescript
asset: {
  purchase_price: number;
  purchase_date: Date;
  ownership_percentage: number;  // 0-100
  user_override_value: number | null;
  system_estimated_min: number | null;
  system_estimated_max: number | null;
}

loan: {
  emi: number;
  outstanding_balance: number;
  interest_rate: number;
}

cashflow: {
  rental_status: 'self_occupied' | 'rented' | 'vacant';
  monthly_rent: number;
  maintenance_monthly: number;
  property_tax_annual: number;
  other_expenses_monthly: number;
}
```

---

## Per-Property Metrics

### 1. Current Estimated Value (Ownership Adjusted)

**Formula:**
```
Current Value = Valuation × (Ownership % / 100)

Where:
  Valuation = user_override_value 
           OR (system_estimated_min + system_estimated_max) / 2
           OR purchase_price (fallback)
```

**Edge Cases:**
- If no valuation data: Use `purchase_price` as fallback
- If ownership % is null: Default to 100%
- If ownership % is 0: Return 0
- If valuation range exists but min/max are null: Use available value

**Example:**
```
Property:
  user_override_value: null
  system_estimated_min: ₹80,00,000
  system_estimated_max: ₹90,00,000
  ownership_percentage: 75%

Calculation:
  Valuation = (80,00,000 + 90,00,000) / 2 = ₹85,00,000
  Current Value = 85,00,000 × (75 / 100) = ₹63,75,000
```

---

### 2. Unrealized Gain/Loss

**Formula:**
```
Unrealized Gain/Loss = Current Value - Invested Value

Where:
  Current Value = (as calculated above)
  Invested Value = purchase_price × (ownership % / 100)
```

**Percentage:**
```
Unrealized Gain/Loss % = (Unrealized Gain/Loss / Invested Value) × 100
```

**Edge Cases:**
- If `purchase_price` is null: Return null (cannot calculate)
- If `purchase_date` is null: Still calculate (only needs price)
- If current value is null: Return null
- Negative values indicate loss

**Example:**
```
Property:
  purchase_price: ₹70,00,000
  ownership_percentage: 75%
  current_value: ₹63,75,000 (from above)

Calculation:
  Invested Value = 70,00,000 × (75 / 100) = ₹52,50,000
  Unrealized Gain/Loss = 63,75,000 - 52,50,000 = ₹11,25,000
  Unrealized Gain/Loss % = (11,25,000 / 52,50,000) × 100 = 21.43%
```

---

### 3. Gross Rental Yield

**Formula:**
```
Gross Rental Yield = (Annual Rental Income / Current Value) × 100

Where:
  Annual Rental Income = monthly_rent × 12 × (ownership % / 100)
  Current Value = (as calculated in metric #1)
```

**Edge Cases:**
- If `rental_status` is not 'rented': Return null (not applicable)
- If `monthly_rent` is null: Return null
- If `current_value` is null: Return null
- If `current_value` is 0: Return null (division by zero)

**Example:**
```
Property:
  monthly_rent: ₹50,000
  ownership_percentage: 75%
  current_value: ₹63,75,000

Calculation:
  Annual Rental Income = 50,000 × 12 × (75 / 100) = ₹4,50,000
  Gross Rental Yield = (4,50,000 / 63,75,000) × 100 = 7.06%
```

---

### 4. Net Rental Yield (After Expenses)

**Formula:**
```
Net Rental Yield = (Net Annual Income / Current Value) × 100

Where:
  Net Annual Income = Annual Rental Income - Annual Expenses
  
  Annual Rental Income = monthly_rent × 12 × (ownership % / 100)
  
  Annual Expenses = (
    (maintenance_monthly × 12) +
    property_tax_annual +
    (other_expenses_monthly × 12)
  ) × (ownership % / 100)
```

**Edge Cases:**
- If `rental_status` is not 'rented': Return null
- If `monthly_rent` is null: Return null
- If all expenses are null: Treat as 0 (only rental income)
- If net income is negative: Return negative yield (expenses exceed rent)
- If `current_value` is null or 0: Return null

**Example:**
```
Property:
  monthly_rent: ₹50,000
  maintenance_monthly: ₹5,000
  property_tax_annual: ₹30,000
  other_expenses_monthly: ₹2,000
  ownership_percentage: 75%
  current_value: ₹63,75,000

Calculation:
  Annual Rental Income = 50,000 × 12 × 0.75 = ₹4,50,000
  Annual Expenses = (5,000 × 12 + 30,000 + 2,000 × 12) × 0.75
                  = (60,000 + 30,000 + 24,000) × 0.75
                  = ₹85,500
  Net Annual Income = 4,50,000 - 85,500 = ₹3,64,500
  Net Rental Yield = (3,64,500 / 63,75,000) × 100 = 5.72%
```

---

### 5. EMI vs Rent Gap

**Formula:**
```
EMI vs Rent Gap = Monthly Rent (Ownership Adjusted) - Monthly EMI

Where:
  Monthly Rent (Ownership Adjusted) = monthly_rent × (ownership % / 100)
  Monthly EMI = emi (from loan table)
```

**Interpretation:**
- **Positive**: Rent covers EMI (cash flow positive)
- **Negative**: EMI exceeds rent (cash flow negative)
- **Zero/Null**: No loan or no rent

**Edge Cases:**
- If no loan exists: Return null (not applicable)
- If `rental_status` is not 'rented': Return null
- If `monthly_rent` is null: Return null
- If `emi` is null: Return null
- If multiple loans exist: Sum all EMIs

**Example:**
```
Property:
  monthly_rent: ₹50,000
  ownership_percentage: 75%
  emi: ₹45,000

Calculation:
  Monthly Rent (Ownership Adjusted) = 50,000 × 0.75 = ₹37,500
  EMI vs Rent Gap = 37,500 - 45,000 = -₹7,500 (negative cash flow)
```

---

### 6. Holding Period (Years)

**Formula:**
```
Holding Period = (Current Date - Purchase Date) / 365.25

Where:
  Current Date = Today's date
  Purchase Date = purchase_date from asset
```

**Edge Cases:**
- If `purchase_date` is null: Return null
- If purchase date is in future: Return 0 (invalid date)
- Round to 2 decimal places for display

**Example:**
```
Property:
  purchase_date: 2020-01-15
  current_date: 2025-01-15

Calculation:
  Days = (2025-01-15 - 2020-01-15) = 1,826 days
  Holding Period = 1,826 / 365.25 = 5.00 years
```

---

### 7. Loan-Adjusted XIRR

**Formula:**
```
Loan-Adjusted XIRR uses XIRR calculation with:
  - Initial Investment: purchase_price × (ownership % / 100)
  - Current Value: Current Estimated Value (ownership adjusted)
  - Loan Equity: outstanding_balance × (ownership % / 100)
  - Net Current Value: Current Value - Loan Equity

XIRR Calculation:
  XIRR = ((Net Current Value / Initial Investment)^(1/Holding Period) - 1) × 100
```

**Detailed Steps:**
1. Calculate initial investment (ownership adjusted purchase price)
2. Calculate current value (ownership adjusted)
3. Calculate loan equity (ownership adjusted outstanding balance)
4. Calculate net current value = current value - loan equity
5. Calculate holding period in years
6. Apply CAGR formula: (Net Current Value / Initial Investment)^(1/Years) - 1
7. Convert to percentage

**Edge Cases:**
- If no loan exists: Use simple XIRR (no loan adjustment)
- If `outstanding_balance` is null: Treat as 0 (loan paid off)
- If `purchase_price` is null: Return null
- If `purchase_date` is null: Return null
- If holding period < 30 days: Return null (insufficient data)
- If net current value < 0: Still calculate (negative XIRR)

**Example (With Loan):**
```
Property:
  purchase_price: ₹70,00,000
  ownership_percentage: 75%
  purchase_date: 2020-01-15
  current_value: ₹63,75,000 (ownership adjusted)
  outstanding_balance: ₹40,00,000
  current_date: 2025-01-15

Calculation:
  Initial Investment = 70,00,000 × 0.75 = ₹52,50,000
  Current Value = ₹63,75,000
  Loan Equity = 40,00,000 × 0.75 = ₹30,00,000
  Net Current Value = 63,75,000 - 30,00,000 = ₹33,75,000
  Holding Period = 5.00 years
  
  XIRR = ((33,75,000 / 52,50,000)^(1/5) - 1) × 100
       = (0.6429^0.2 - 1) × 100
       = (0.912 - 1) × 100
       = -8.8%
```

**Example (Without Loan):**
```
Property:
  purchase_price: ₹70,00,000
  ownership_percentage: 75%
  purchase_date: 2020-01-15
  current_value: ₹63,75,000
  outstanding_balance: null (no loan)
  current_date: 2025-01-15

Calculation:
  Initial Investment = ₹52,50,000
  Current Value = ₹63,75,000
  Net Current Value = 63,75,000 (no loan to subtract)
  Holding Period = 5.00 years
  
  XIRR = ((63,75,000 / 52,50,000)^(1/5) - 1) × 100
       = (1.214^0.2 - 1) × 100
       = (1.0396 - 1) × 100
       = 3.96%
```

---

## Portfolio-Level Metrics

### 1. % of Net Worth in Real Estate

**Formula:**
```
Real Estate Allocation % = (Total Real Estate Value / Total Net Worth) × 100

Where:
  Total Real Estate Value = SUM(Current Estimated Value for all properties)
  Total Net Worth = Total portfolio value from all asset classes
```

**Edge Cases:**
- If total net worth is 0: Return 0% (avoid division by zero)
- If no real estate assets: Return 0%
- If total real estate value is null: Return 0%

**Example:**
```
Portfolio:
  Total Real Estate Value: ₹2,50,00,000
  Total Net Worth: ₹1,00,00,000 (equity) + ₹50,00,000 (debt) + ₹2,50,00,000 (real estate)
                  = ₹4,00,00,000

Calculation:
  Real Estate Allocation % = (2,50,00,000 / 4,00,00,000) × 100 = 62.5%
```

---

### 2. Concentration Per Property

**Formula:**
```
Property Concentration % = (Property Value / Total Real Estate Value) × 100

Where:
  Property Value = Current Estimated Value (ownership adjusted) for this property
  Total Real Estate Value = SUM of all property values
```

**Edge Cases:**
- If total real estate value is 0: Return 0%
- If property value is null: Return 0%
- Multiple properties: Each gets its own concentration %

**Example:**
```
Properties:
  Property A: ₹1,00,00,000
  Property B: ₹80,00,000
  Property C: ₹70,00,000
  Total: ₹2,50,00,000

Calculation:
  Property A Concentration = (1,00,00,000 / 2,50,00,000) × 100 = 40%
  Property B Concentration = (80,00,000 / 2,50,00,000) × 100 = 32%
  Property C Concentration = (70,00,000 / 2,50,00,000) × 100 = 28%
```

---

### 3. Income-Generating vs Non-Income Assets

**Formula:**
```
Income-Generating Assets:
  Count: Properties where rental_status = 'rented'
  Value: SUM(Current Value where rental_status = 'rented')
  Percentage: (Income-Generating Value / Total Real Estate Value) × 100

Non-Income Assets:
  Count: Properties where rental_status IN ('self_occupied', 'vacant')
  Value: SUM(Current Value where rental_status IN ('self_occupied', 'vacant'))
  Percentage: (Non-Income Value / Total Real Estate Value) × 100
```

**Edge Cases:**
- If `rental_status` is null: Treat as 'self_occupied' (non-income)
- If no properties: Return 0 for all metrics
- Percentages should sum to 100%

**Example:**
```
Properties:
  Property A: ₹1,00,00,000, rental_status: 'rented'
  Property B: ₹80,00,000, rental_status: 'self_occupied'
  Property C: ₹70,00,000, rental_status: 'vacant'
  Total: ₹2,50,00,000

Calculation:
  Income-Generating:
    Count: 1
    Value: ₹1,00,00,000
    Percentage: (1,00,00,000 / 2,50,00,000) × 100 = 40%
  
  Non-Income:
    Count: 2
    Value: ₹1,50,00,000
    Percentage: (1,50,00,000 / 2,50,00,000) × 100 = 60%
```

---

## Additional Portfolio Metrics

### 4. Total Rental Income (Annual)

**Formula:**
```
Total Annual Rental Income = SUM(
  monthly_rent × 12 × (ownership % / 100)
  WHERE rental_status = 'rented'
)
```

**Example:**
```
Properties:
  Property A: monthly_rent = ₹50,000, ownership = 75%, status = 'rented'
  Property B: monthly_rent = ₹40,000, ownership = 100%, status = 'rented'
  Property C: monthly_rent = ₹30,000, ownership = 50%, status = 'self_occupied'

Calculation:
  Property A: 50,000 × 12 × 0.75 = ₹4,50,000
  Property B: 40,000 × 12 × 1.0 = ₹4,80,000
  Property C: 0 (not rented)
  Total = ₹9,30,000
```

---

### 5. Total EMI Outflow (Monthly)

**Formula:**
```
Total Monthly EMI = SUM(emi WHERE loan exists)

Note: Ownership % does NOT apply to EMI (loan is per property, not per ownership share)
```

**Example:**
```
Properties:
  Property A: emi = ₹45,000
  Property B: emi = ₹35,000
  Property C: no loan

Calculation:
  Total Monthly EMI = 45,000 + 35,000 = ₹80,000
```

---

### 6. Net Cash Flow (Monthly)

**Formula:**
```
Net Cash Flow = Total Rental Income (Monthly) - Total EMI - Total Expenses (Monthly)

Where:
  Total Rental Income (Monthly) = SUM(monthly_rent × ownership % WHERE rented) / 12
  Total EMI = SUM(emi)
  Total Expenses (Monthly) = SUM(
    (maintenance_monthly + other_expenses_monthly + property_tax_annual/12) × ownership %
  )
```

**Example:**
```
Properties:
  Property A: rent ₹50,000, ownership 75%, emi ₹45,000, expenses ₹7,000/month
  Property B: rent ₹40,000, ownership 100%, emi ₹35,000, expenses ₹5,000/month

Calculation:
  Monthly Rental Income = (50,000 × 0.75) + (40,000 × 1.0) = ₹77,500
  Total EMI = 45,000 + 35,000 = ₹80,000
  Total Expenses = (7,000 × 0.75) + (5,000 × 1.0) = ₹10,250
  Net Cash Flow = 77,500 - 80,000 - 10,250 = -₹12,750 (negative)
```

---

## Edge Cases Summary

### Valuation Edge Cases:
1. **No valuation data**: Use `purchase_price` as fallback
2. **Only min or max available**: Use available value (not midpoint)
3. **Both min and max null**: Use `purchase_price`
4. **User override exists**: Always use user override (highest priority)
5. **Valuation is 0**: Return 0 (valid state)

### Ownership Edge Cases:
1. **Ownership % is null**: Default to 100%
2. **Ownership % is 0**: Return 0 for all value calculations
3. **Ownership % > 100**: Invalid, cap at 100% (database constraint should prevent)
4. **Ownership % < 0**: Invalid, treat as 0 (database constraint should prevent)

### Loan Edge Cases:
1. **No loan exists**: Loan metrics return null
2. **Multiple loans**: Sum all EMIs and outstanding balances
3. **Outstanding balance > loan amount**: Invalid, but handle gracefully (use loan_amount as max)
4. **EMI is null**: Return null for EMI-dependent metrics

### Rental Edge Cases:
1. **rental_status is null**: Treat as 'self_occupied' (non-income)
2. **monthly_rent is null but status is 'rented'**: Return null for yield calculations
3. **Expenses are null**: Treat as 0 (no expenses)
4. **Security deposit**: NEVER include in income calculations (explicitly excluded)

### Date Edge Cases:
1. **purchase_date is null**: Return null for holding period and XIRR
2. **purchase_date in future**: Invalid, return 0 for holding period
3. **purchase_date = today**: Return 0 years (or very small value)

### Calculation Edge Cases:
1. **Division by zero**: Return null (e.g., yield when value is 0)
2. **Negative values**: Allow (e.g., negative cash flow, negative XIRR)
3. **Very large values**: Cap at reasonable limits (e.g., XIRR at ±999%)
4. **Null inputs**: Return null (don't calculate with missing data)

---

## Sample Complete Calculation

### Property Details:
```
Property: "2BHK Apartment, Mumbai"
  purchase_price: ₹70,00,000
  purchase_date: 2020-01-15
  ownership_percentage: 75%
  user_override_value: null
  system_estimated_min: ₹80,00,000
  system_estimated_max: ₹90,00,000
  
Loan:
  emi: ₹45,000
  outstanding_balance: ₹40,00,000
  interest_rate: 8.5%
  
Cashflow:
  rental_status: 'rented'
  monthly_rent: ₹50,000
  maintenance_monthly: ₹5,000
  property_tax_annual: ₹30,000
  other_expenses_monthly: ₹2,000
```

### Calculations:

**1. Current Estimated Value:**
```
Valuation = (80,00,000 + 90,00,000) / 2 = ₹85,00,000
Current Value = 85,00,000 × 0.75 = ₹63,75,000
```

**2. Unrealized Gain/Loss:**
```
Invested Value = 70,00,000 × 0.75 = ₹52,50,000
Unrealized Gain = 63,75,000 - 52,50,000 = ₹11,25,000
Unrealized Gain % = (11,25,000 / 52,50,000) × 100 = 21.43%
```

**3. Gross Rental Yield:**
```
Annual Rental Income = 50,000 × 12 × 0.75 = ₹4,50,000
Gross Rental Yield = (4,50,000 / 63,75,000) × 100 = 7.06%
```

**4. Net Rental Yield:**
```
Annual Expenses = (5,000 × 12 + 30,000 + 2,000 × 12) × 0.75 = ₹85,500
Net Annual Income = 4,50,000 - 85,500 = ₹3,64,500
Net Rental Yield = (3,64,500 / 63,75,000) × 100 = 5.72%
```

**5. EMI vs Rent Gap:**
```
Monthly Rent (Ownership Adjusted) = 50,000 × 0.75 = ₹37,500
EMI vs Rent Gap = 37,500 - 45,000 = -₹7,500 (negative)
```

**6. Holding Period:**
```
Holding Period = (2025-01-15 - 2020-01-15) / 365.25 = 5.00 years
```

**7. Loan-Adjusted XIRR:**
```
Initial Investment = ₹52,50,000
Current Value = ₹63,75,000
Loan Equity = 40,00,000 × 0.75 = ₹30,00,000
Net Current Value = 63,75,000 - 30,00,000 = ₹33,75,000
XIRR = ((33,75,000 / 52,50,000)^(1/5) - 1) × 100 = -8.8%
```

---

## Implementation Notes

### 1. Ownership Percentage Application

**Rule:** Ownership % applies to:
- ✅ Purchase price (invested value)
- ✅ Current valuation (current value)
- ✅ Rental income
- ✅ Property expenses (maintenance, tax, etc.)
- ✅ Outstanding loan balance (for XIRR calculation)

**Rule:** Ownership % does NOT apply to:
- ❌ EMI (loan is per property, not per ownership share)
- ❌ Loan amount (full loan amount, not ownership-adjusted)

### 2. Valuation Priority

1. **User Override** (highest priority)
2. **System Estimate Midpoint** (if range exists)
3. **System Estimate Single Value** (if only min or max)
4. **Purchase Price** (fallback)

### 3. EMI Treatment

- EMI is always a **cash outflow** (negative)
- EMI is NOT ownership-adjusted (full EMI amount)
- If multiple loans: Sum all EMIs
- EMI affects cash flow but not property value directly

### 4. Security Deposit

- **NEVER** include security deposit in income
- Security deposit is a liability (returnable)
- Only count actual rental income (monthly_rent)

### 5. Date Handling

- Use actual calendar days (365.25 for leap years)
- Round to 2 decimal places for years
- Minimum 30 days for XIRR calculation

### 6. Null Handling

- Return `null` when calculation cannot be performed
- Don't use 0 as a fallback (0 has meaning, null means "cannot calculate")
- UI should display "N/A" or "—" for null values

---

## API Response Format

### Per-Property Analytics Response:

```typescript
{
  assetId: string;
  metrics: {
    currentEstimatedValue: number | null;
    unrealizedGainLoss: number | null;
    unrealizedGainLossPercent: number | null;
    grossRentalYield: number | null;
    netRentalYield: number | null;
    emiVsRentGap: number | null;
    holdingPeriodYears: number | null;
    loanAdjustedXIRR: number | null;
  };
  metadata: {
    valuationSource: 'user_override' | 'system_estimate' | 'purchase_price';
    ownershipPercentage: number;
    hasLoan: boolean;
    rentalStatus: 'rented' | 'self_occupied' | 'vacant';
  };
}
```

### Portfolio-Level Analytics Response:

```typescript
{
  portfolioMetrics: {
    realEstateAllocationPercent: number;
    totalRealEstateValue: number;
    totalRentalIncomeAnnual: number;
    totalEMIMonthly: number;
    netCashFlowMonthly: number;
  };
  propertyConcentrations: Array<{
    assetId: string;
    propertyName: string;
    concentrationPercent: number;
    value: number;
  }>;
  incomeBreakdown: {
    incomeGenerating: {
      count: number;
      value: number;
      percentage: number;
    };
    nonIncome: {
      count: number;
      value: number;
      percentage: number;
    };
  };
}
```

---

## Summary

This design provides:
- ✅ Complete formulas for all metrics
- ✅ Ownership % applied consistently
- ✅ Valuation range handling (midpoint)
- ✅ EMI as cash outflow
- ✅ Security deposit exclusion
- ✅ Comprehensive edge case handling
- ✅ Sample numeric examples
- ✅ Clear implementation guidelines

All calculations are production-ready and handle real-world scenarios gracefully.
