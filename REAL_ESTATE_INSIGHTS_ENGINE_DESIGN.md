# Real Estate Insights Engine Design

**Status:** Design Document  
**Version:** 1.0  
**Date:** January 2025

---

## Overview

Lightweight insights engine for Indian real estate investors. Generates actionable alerts based on portfolio health indicators. Designed for UI display only (no notifications).

**Key Principles:**
- Real-time calculation (no background jobs)
- Clear severity levels (info, warning, critical)
- Actionable suggestions
- Property-specific and portfolio-level insights

---

## Rule Definitions

### Rule 1: EMI > Rent for More Than 3 Months

**Trigger Condition:**
```
EMI > Monthly Rent (Ownership Adjusted) 
AND 
Condition persists for > 3 months
```

**Calculation:**
```
Monthly Rent (Ownership Adjusted) = monthly_rent × (ownership_percentage / 100)
EMI = emi (from loan table)

If EMI > Monthly Rent (Ownership Adjusted):
  - Check if this condition has been true for > 3 months
  - If yes, trigger alert
```

**Severity Logic:**
- **Critical**: EMI > Rent by > 20% for > 6 months
- **Warning**: EMI > Rent by > 10% for > 3 months
- **Info**: EMI > Rent for > 3 months (but < 10% difference)

**Edge Cases:**
- No loan exists: Skip this rule
- No rent data: Skip this rule
- Rental status not 'rented': Skip this rule
- Multiple loans: Sum all EMIs

---

### Rule 2: Rental Yield < 2%

**Trigger Condition:**
```
Gross Rental Yield < 2%
```

**Calculation:**
```
Gross Rental Yield = (Annual Rental Income / Current Value) × 100

Where:
  Annual Rental Income = monthly_rent × 12 × (ownership_percentage / 100)
  Current Value = Valuation × (ownership_percentage / 100)
```

**Severity Logic:**
- **Critical**: Yield < 1% (very poor return)
- **Warning**: Yield < 2% but >= 1% (below market average)
- **Info**: Yield < 2.5% but >= 2% (slightly below average)

**Edge Cases:**
- Rental status not 'rented': Skip this rule
- No monthly_rent: Skip this rule
- No current value: Skip this rule
- Current value is 0: Skip this rule (division by zero)

---

### Rule 3: Single Property > 40% of Total Net Worth

**Trigger Condition:**
```
Property Value > (Total Net Worth × 0.40)
```

**Calculation:**
```
Property Value = Current Estimated Value (ownership adjusted)
Total Net Worth = Sum of all asset classes (equity + debt + gold + cash + real estate + others)

Concentration % = (Property Value / Total Net Worth) × 100
```

**Severity Logic:**
- **Critical**: Property > 60% of net worth (extreme concentration)
- **Warning**: Property > 40% but <= 60% of net worth (high concentration)
- **Info**: Property > 35% but <= 40% of net worth (approaching threshold)

**Edge Cases:**
- Total net worth is 0: Skip this rule
- No other assets: Still calculate (100% concentration)
- Multiple properties: Check each property individually

---

### Rule 4: No Valuation Update in Last 12 Months

**Trigger Condition:**
```
valuation_last_updated IS NULL 
OR 
valuation_last_updated < (Current Date - 365 days)
```

**Calculation:**
```
Days Since Update = Current Date - valuation_last_updated

If Days Since Update >= 365:
  Trigger alert
```

**Severity Logic:**
- **Critical**: No update for > 18 months (very stale)
- **Warning**: No update for > 12 months but <= 18 months (stale)
- **Info**: No update for > 9 months but <= 12 months (approaching threshold)

**Edge Cases:**
- valuation_last_updated is null: Treat as never updated (critical)
- Property just added (< 30 days): Skip this rule (too new)
- User override exists: Lower severity (user has manual value)

---

## Insight Data Structure

### TypeScript Interface

```typescript
interface RealEstateInsight {
  id: string;                    // Unique identifier
  ruleId: string;                // Rule identifier (e.g., "emi_rent_gap", "low_yield")
  severity: 'info' | 'warning' | 'critical';
  title: string;                  // Short title (max 60 chars)
  explanation: string;            // Detailed explanation (2-3 sentences)
  suggestedAction: string;       // Actionable suggestion (1-2 sentences)
  propertyId?: string;           // Property ID (if property-specific)
  propertyName?: string;          // Property nickname (if property-specific)
  metadata: {
    currentValue?: number;        // Current value (if relevant)
    threshold?: number;           // Threshold value (if relevant)
    actualValue?: number;         // Actual value (if relevant)
    daysSinceUpdate?: number;     // Days since last update (if relevant)
    [key: string]: any;          // Additional context
  };
  createdAt: string;             // ISO timestamp
}
```

---

## Sample Output JSON

### Scenario 1: Multiple Alerts (Complete Example)

```json
{
  "insights": [
    {
      "id": "re_insight_001",
      "ruleId": "emi_rent_gap",
      "severity": "warning",
      "title": "EMI exceeds rental income by ₹7,500/month",
      "explanation": "Your monthly EMI of ₹45,000 is higher than your ownership-adjusted rental income of ₹37,500. This negative cash flow has persisted for 4 months, creating a monthly shortfall.",
      "suggestedAction": "Consider increasing rent, refinancing the loan at a lower rate, or using rental income to partially offset the EMI gap. Review your cash flow projections.",
      "propertyId": "123e4567-e89b-12d3-a456-426614174000",
      "propertyName": "2BHK Apartment, Mumbai",
      "metadata": {
        "emi": 45000,
        "monthlyRent": 50000,
        "ownershipPercentage": 75,
        "ownershipAdjustedRent": 37500,
        "gap": -7500,
        "monthsPersisting": 4
      },
      "createdAt": "2025-01-15T10:30:00Z"
    },
    {
      "id": "re_insight_002",
      "ruleId": "low_yield",
      "severity": "critical",
      "title": "Rental yield is only 1.2% - well below market average",
      "explanation": "Your property generates a gross rental yield of 1.2%, which is significantly below the typical 3-5% range for residential properties in your area. This suggests either overvaluation or below-market rent.",
      "suggestedAction": "Review your rental rate against market comparables. If rent is below market, consider increasing it. If property is overvalued, reassess the valuation or consider selling if returns don't improve.",
      "propertyId": "123e4567-e89b-12d3-a456-426614174000",
      "propertyName": "2BHK Apartment, Mumbai",
      "metadata": {
        "grossRentalYield": 1.2,
        "annualRentalIncome": 450000,
        "currentValue": 37500000,
        "marketAverageYield": 3.5
      },
      "createdAt": "2025-01-15T10:30:00Z"
    },
    {
      "id": "re_insight_003",
      "ruleId": "high_concentration",
      "severity": "critical",
      "title": "Single property represents 65% of your net worth",
      "explanation": "Your Mumbai apartment accounts for 65% of your total net worth (₹2.5 Cr out of ₹3.85 Cr). This extreme concentration exposes you to significant risk if property values decline or if you need liquidity.",
      "suggestedAction": "Consider diversifying your portfolio by investing in other asset classes (equity, debt, gold) or acquiring additional properties to reduce concentration risk. Aim for no single property to exceed 30-40% of net worth.",
      "propertyId": "123e4567-e89b-12d3-a456-426614174000",
      "propertyName": "2BHK Apartment, Mumbai",
      "metadata": {
        "propertyValue": 25000000,
        "totalNetWorth": 38500000,
        "concentrationPercent": 64.94
      },
      "createdAt": "2025-01-15T10:30:00Z"
    },
    {
      "id": "re_insight_004",
      "ruleId": "stale_valuation",
      "severity": "warning",
      "title": "Property valuation hasn't been updated in 14 months",
      "explanation": "The last valuation update for your property was on November 15, 2023 (14 months ago). Property values can change significantly over this period, especially in dynamic markets like Mumbai.",
      "suggestedAction": "Update your property valuation to get accurate current value estimates. You can set a manual override value or trigger a fresh system valuation to reflect current market conditions.",
      "propertyId": "123e4567-e89b-12d3-a456-426614174000",
      "propertyName": "2BHK Apartment, Mumbai",
      "metadata": {
        "lastUpdated": "2023-11-15T00:00:00Z",
        "daysSinceUpdate": 426,
        "hasUserOverride": false
      },
      "createdAt": "2025-01-15T10:30:00Z"
    }
  ],
  "summary": {
    "totalInsights": 4,
    "criticalCount": 2,
    "warningCount": 2,
    "infoCount": 0,
    "generatedAt": "2025-01-15T10:30:00Z"
  }
}
```

---

### Scenario 2: Single Property, No Alerts

```json
{
  "insights": [],
  "summary": {
    "totalInsights": 0,
    "criticalCount": 0,
    "warningCount": 0,
    "infoCount": 0,
    "generatedAt": "2025-01-15T10:30:00Z"
  }
}
```

---

### Scenario 3: Portfolio-Level Alert (High Concentration)

```json
{
  "insights": [
    {
      "id": "re_insight_005",
      "ruleId": "high_concentration",
      "severity": "warning",
      "title": "Property concentration risk: 45% of net worth in real estate",
      "explanation": "Your real estate holdings represent 45% of your total net worth (₹1.8 Cr out of ₹4 Cr). While real estate is a solid asset class, this concentration may limit liquidity and diversification.",
      "suggestedAction": "Consider rebalancing your portfolio by investing in other asset classes. A balanced portfolio typically has 20-30% in real estate, with the rest in equity, debt, and other instruments.",
      "metadata": {
        "totalRealEstateValue": 18000000,
        "totalNetWorth": 40000000,
        "realEstateAllocationPercent": 45,
        "propertyCount": 3
      },
      "createdAt": "2025-01-15T10:30:00Z"
    }
  ],
  "summary": {
    "totalInsights": 1,
    "criticalCount": 0,
    "warningCount": 1,
    "infoCount": 0,
    "generatedAt": "2025-01-15T10:30:00Z"
  }
}
```

---

### Scenario 4: Info-Level Alerts

```json
{
  "insights": [
    {
      "id": "re_insight_006",
      "ruleId": "low_yield",
      "severity": "info",
      "title": "Rental yield is 2.1% - slightly below market average",
      "explanation": "Your property generates a gross rental yield of 2.1%, which is slightly below the typical 3-5% range for residential properties. This may be acceptable if you're prioritizing capital appreciation over rental income.",
      "suggestedAction": "Monitor your rental yield over time. If you're not seeing capital appreciation, consider reviewing your rental rate or property valuation.",
      "propertyId": "223e4567-e89b-12d3-a456-426614174001",
      "propertyName": "3BHK Villa, Bangalore",
      "metadata": {
        "grossRentalYield": 2.1,
        "annualRentalIncome": 600000,
        "currentValue": 28500000,
        "marketAverageYield": 3.5
      },
      "createdAt": "2025-01-15T10:30:00Z"
    },
    {
      "id": "re_insight_007",
      "ruleId": "stale_valuation",
      "severity": "info",
      "title": "Property valuation updated 10 months ago",
      "explanation": "Your property valuation was last updated 10 months ago. While still relatively recent, consider updating it to ensure accurate portfolio tracking.",
      "suggestedAction": "Update your property valuation when convenient to maintain accurate portfolio values.",
      "propertyId": "223e4567-e89b-12d3-a456-426614174001",
      "propertyName": "3BHK Villa, Bangalore",
      "metadata": {
        "lastUpdated": "2024-03-15T00:00:00Z",
        "daysSinceUpdate": 305,
        "hasUserOverride": false
      },
      "createdAt": "2025-01-15T10:30:00Z"
    }
  ],
  "summary": {
    "totalInsights": 2,
    "criticalCount": 0,
    "warningCount": 0,
    "infoCount": 2,
    "generatedAt": "2025-01-15T10:30:00Z"
  }
}
```

---

## Rule Implementation Details

### Rule 1: EMI > Rent Gap

**Pseudocode:**
```pseudocode
FUNCTION checkEMIRentGap(property, loan, cashflow):
  IF loan IS NULL OR cashflow IS NULL:
    RETURN null
  
  IF cashflow.rental_status != 'rented':
    RETURN null
  
  ownershipAdjustedRent = cashflow.monthly_rent × (property.ownership_percentage / 100)
  emi = loan.emi
  
  IF emi <= ownershipAdjustedRent:
    RETURN null  // No gap, no alert
  
  gap = ownershipAdjustedRent - emi
  gapPercent = (gap / ownershipAdjustedRent) × 100
  
  // Check persistence (simplified: assume condition persists if current state shows gap)
  // In real implementation, track historical data
  monthsPersisting = estimateMonthsPersisting(property, loan, cashflow) // Placeholder
  
  IF gapPercent < -20 AND monthsPersisting >= 6:
    severity = 'critical'
  ELSE IF gapPercent < -10 AND monthsPersisting >= 3:
    severity = 'warning'
  ELSE IF monthsPersisting >= 3:
    severity = 'info'
  ELSE:
    RETURN null  // Not persistent enough
  
  RETURN {
    ruleId: 'emi_rent_gap',
    severity: severity,
    title: `EMI exceeds rental income by ₹${abs(gap).toLocaleString('en-IN')}/month`,
    explanation: `Your monthly EMI of ₹${emi.toLocaleString('en-IN')} is higher than your ownership-adjusted rental income of ₹${ownershipAdjustedRent.toLocaleString('en-IN')}. This negative cash flow has persisted for ${monthsPersisting} months, creating a monthly shortfall.`,
    suggestedAction: 'Consider increasing rent, refinancing the loan at a lower rate, or using rental income to partially offset the EMI gap. Review your cash flow projections.',
    metadata: {
      emi: emi,
      monthlyRent: cashflow.monthly_rent,
      ownershipPercentage: property.ownership_percentage,
      ownershipAdjustedRent: ownershipAdjustedRent,
      gap: gap,
      monthsPersisting: monthsPersisting
    }
  }
END FUNCTION
```

---

### Rule 2: Low Rental Yield

**Pseudocode:**
```pseudocode
FUNCTION checkLowRentalYield(property, cashflow):
  IF cashflow IS NULL:
    RETURN null
  
  IF cashflow.rental_status != 'rented':
    RETURN null
  
  IF cashflow.monthly_rent IS NULL:
    RETURN null
  
  // Calculate current value
  currentValue = getCurrentValue(property)  // Uses valuation logic from analytics
  
  IF currentValue IS NULL OR currentValue <= 0:
    RETURN null
  
  // Calculate yield
  annualRentalIncome = cashflow.monthly_rent × 12 × (property.ownership_percentage / 100)
  grossRentalYield = (annualRentalIncome / currentValue) × 100
  
  IF grossRentalYield >= 2.5:
    RETURN null  // Yield is acceptable
  
  IF grossRentalYield < 1:
    severity = 'critical'
  ELSE IF grossRentalYield < 2:
    severity = 'warning'
  ELSE:
    severity = 'info'
  
  marketAverageYield = 3.5  // Could be location-specific
  
  RETURN {
    ruleId: 'low_yield',
    severity: severity,
    title: `Rental yield is ${grossRentalYield.toFixed(1)}% - ${grossRentalYield < 1 ? 'well' : grossRentalYield < 2 ? '' : 'slightly'} below market average`,
    explanation: `Your property generates a gross rental yield of ${grossRentalYield.toFixed(1)}%, which is ${grossRentalYield < 1 ? 'significantly' : 'slightly'} below the typical 3-5% range for residential properties in your area. This suggests either overvaluation or below-market rent.`,
    suggestedAction: grossRentalYield < 1 
      ? 'Review your rental rate against market comparables. If rent is below market, consider increasing it. If property is overvalued, reassess the valuation or consider selling if returns don't improve.'
      : 'Monitor your rental yield over time. If you're not seeing capital appreciation, consider reviewing your rental rate or property valuation.',
    metadata: {
      grossRentalYield: grossRentalYield,
      annualRentalIncome: annualRentalIncome,
      currentValue: currentValue,
      marketAverageYield: marketAverageYield
    }
  }
END FUNCTION
```

---

### Rule 3: High Concentration

**Pseudocode:**
```pseudocode
FUNCTION checkHighConcentration(property, totalNetWorth):
  IF totalNetWorth <= 0:
    RETURN null
  
  currentValue = getCurrentValue(property)
  
  IF currentValue IS NULL:
    RETURN null
  
  concentrationPercent = (currentValue / totalNetWorth) × 100
  
  IF concentrationPercent <= 35:
    RETURN null  // Acceptable concentration
  
  IF concentrationPercent > 60:
    severity = 'critical'
  ELSE IF concentrationPercent > 40:
    severity = 'warning'
  ELSE:
    severity = 'info'
  
  RETURN {
    ruleId: 'high_concentration',
    severity: severity,
    title: `Single property represents ${concentrationPercent.toFixed(0)}% of your net worth`,
    explanation: `Your ${property.property_nickname} accounts for ${concentrationPercent.toFixed(0)}% of your total net worth (₹${(currentValue / 10000000).toFixed(1)} Cr out of ₹${(totalNetWorth / 10000000).toFixed(1)} Cr). ${concentrationPercent > 60 ? 'This extreme' : 'This high'} concentration exposes you to significant risk if property values decline or if you need liquidity.`,
    suggestedAction: concentrationPercent > 60
      ? 'Consider diversifying your portfolio by investing in other asset classes (equity, debt, gold) or acquiring additional properties to reduce concentration risk. Aim for no single property to exceed 30-40% of net worth.'
      : 'Consider diversifying your portfolio to reduce concentration risk. Aim for no single property to exceed 30-40% of net worth.',
    metadata: {
      propertyValue: currentValue,
      totalNetWorth: totalNetWorth,
      concentrationPercent: concentrationPercent
    }
  }
END FUNCTION
```

---

### Rule 4: Stale Valuation

**Pseudocode:**
```pseudocode
FUNCTION checkStaleValuation(property):
  // Skip if property is very new (< 30 days)
  IF property.created_at IS NOT NULL:
    daysSinceCreation = (CURRENT_DATE - property.created_at) / DAYS
    IF daysSinceCreation < 30:
      RETURN null  // Too new to check
  
  IF property.valuation_last_updated IS NULL:
    // Never updated - critical
    daysSinceUpdate = null
    severity = 'critical'
    lastUpdatedText = 'never'
  ELSE:
    daysSinceUpdate = (CURRENT_DATE - property.valuation_last_updated) / DAYS
    
    IF daysSinceUpdate < 270:  // 9 months
      RETURN null  // Still recent
    
    IF daysSinceUpdate > 540:  // 18 months
      severity = 'critical'
    ELSE IF daysSinceUpdate > 365:  // 12 months
      severity = 'warning'
    ELSE:
      severity = 'info'
    
    lastUpdatedText = formatDate(property.valuation_last_updated)
  
  // Lower severity if user has override
  IF property.user_override_value IS NOT NULL:
    IF severity == 'critical':
      severity = 'warning'
    ELSE IF severity == 'warning':
      severity = 'info'
  
  RETURN {
    ruleId: 'stale_valuation',
    severity: severity,
    title: `Property valuation ${daysSinceUpdate === null ? "hasn't been updated" : `updated ${Math.floor(daysSinceUpdate / 30)} months ago`}`,
    explanation: `The last valuation update for your property was ${daysSinceUpdate === null ? 'never' : `on ${lastUpdatedText} (${Math.floor(daysSinceUpdate)} days ago)`}. Property values can change significantly over this period, especially in dynamic markets.`,
    suggestedAction: daysSinceUpdate === null || daysSinceUpdate > 365
      ? 'Update your property valuation to get accurate current value estimates. You can set a manual override value or trigger a fresh system valuation to reflect current market conditions.'
      : 'Update your property valuation when convenient to maintain accurate portfolio values.',
    metadata: {
      lastUpdated: property.valuation_last_updated,
      daysSinceUpdate: daysSinceUpdate,
      hasUserOverride: property.user_override_value !== null
    }
  }
END FUNCTION
```

---

## API Response Structure

### Endpoint: `GET /api/real-estate/insights`

**Response:**
```typescript
{
  insights: RealEstateInsight[];
  summary: {
    totalInsights: number;
    criticalCount: number;
    warningCount: number;
    infoCount: number;
    generatedAt: string;  // ISO timestamp
  };
}
```

**Sorting:**
- Insights sorted by severity (critical → warning → info)
- Within same severity, sort by property value (highest first)
- Portfolio-level insights appear first

**Filtering:**
- Only return insights that meet trigger conditions
- Skip properties with insufficient data
- Skip rules that don't apply (e.g., no loan = skip EMI rule)

---

## Edge Cases Summary

### Data Availability:
1. **Missing loan data**: Skip EMI-related rules
2. **Missing cashflow data**: Skip rental yield rules
3. **Missing valuation**: Use purchase price as fallback, but flag in metadata
4. **Missing net worth**: Skip concentration rules

### Calculation Edge Cases:
1. **Division by zero**: Skip rule (e.g., yield when value is 0)
2. **Negative values**: Handle gracefully (e.g., negative cash flow)
3. **Null values**: Skip rule or use fallback where appropriate
4. **Future dates**: Treat as invalid, skip rule

### Business Logic:
1. **New properties**: Skip stale valuation check (< 30 days)
2. **User override exists**: Lower severity for stale valuation
3. **Multiple loans**: Sum all EMIs for EMI-related rules
4. **Self-occupied properties**: Skip rental yield rules

---

## Implementation Notes

### 1. Performance
- Calculate insights on-demand (no background jobs)
- Cache results for 5 minutes to avoid repeated calculations
- Batch property queries to minimize database calls

### 2. Severity Thresholds
- Thresholds are configurable (can be adjusted based on market conditions)
- Consider location-specific thresholds (Mumbai vs Tier-2 cities)
- Consider property type-specific thresholds (residential vs commercial)

### 3. Historical Tracking
- For EMI > Rent rule, ideally track historical data
- For MVP, use current state as proxy (assume condition persists)
- Future: Store monthly snapshots to track persistence accurately

### 4. Localization
- All currency values in ₹ (INR)
- Use Indian number formatting (lakhs, crores)
- Dates in IST timezone

### 5. UI Display
- Show critical alerts first (red/orange)
- Warning alerts second (yellow)
- Info alerts last (blue)
- Allow users to dismiss insights (store in user preferences)
- Show "No insights" state when all clear

---

## Summary

This insights engine provides:
- ✅ 4 core rules for real estate portfolio health
- ✅ Clear severity levels (info, warning, critical)
- ✅ Actionable suggestions for each alert
- ✅ Property-specific and portfolio-level insights
- ✅ Comprehensive edge case handling
- ✅ Sample JSON output for all scenarios
- ✅ Production-ready rule definitions

The engine is lightweight, fast, and designed for real-time UI display without requiring background jobs or notifications.
