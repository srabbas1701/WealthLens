# Risk & Observations Sections Refactor

**Date**: January 2025  
**Status**: ✅ Complete

---

## Overview

Refactored "Key Risks" and "Key Observations" sections to:
- Order items by impact (highest first)
- Add "Why this matters" explanations
- Reduce alarmist tone
- Ensure data-backed insights

---

## Changes Made

### 1. New Risk Explanation System

**File**: `src/lib/portfolio-intelligence/risk-explanations.ts`

Two main functions:

#### `getRiskExplanation(deduction: Deduction)`
- Generates "Why this matters" explanations for health score risks
- Category-based explanations (concentration, diversification, allocation, etc.)
- Neutral, educational tone
- No alarmist language

#### `getStabilityObservationExplanation(insight: string)`
- Generates explanations for stability observations
- Insight-based explanations
- Focuses on education, not warnings

### 2. Enhanced Insight Card Component

**File**: `src/components/analytics/RiskInsightCard.tsx` (NEW)

Replaces generic `InsightCard` with specialized component:
- Displays title (risk/observation text)
- Shows "Why this matters" explanation
- Displays impact score (for risks)
- Uses appropriate icons (AlertTriangle for high severity, Info for others)
- Cleaner, less alarmist styling

### 3. Stability Insights Enhancement

**File**: `src/lib/portfolio-intelligence/stability-insights.ts` (NEW)

- Adds impact scoring to stability insights
- Categorizes insights by type
- Enables sorting by impact
- Calculates impact based on actual metrics

### 4. Portfolio Health Score Page Updates

**Changes**:
- Risks now sorted by impact (highest first)
- Uses `RiskInsightCard` instead of `InsightCard`
- Each risk shows explanation via `getRiskExplanation()`
- Impact displayed for context

### 5. Stability Analytics Page Updates

**Changes**:
- Observations enhanced with impact scores
- Sorted by impact (highest first)
- Uses `RiskInsightCard` component
- Each observation shows explanation
- Reduced from all insights to top 3 (by impact)

---

## Language Improvements

### Before (Alarmist)
- ❌ "High risk detected"
- ❌ "Critical issue"
- ❌ "Warning: Portfolio imbalance"

### After (Neutral, Educational)
- ✅ "High concentration increases portfolio vulnerability to individual asset performance."
- ✅ "Overlap reduces diversification benefits and may increase correlated risk."
- ✅ "Asset allocation balance affects portfolio risk and return characteristics."

---

## Data-Backed Explanations

All explanations are generated based on:
- **Risk category** (for health score risks)
- **Actual metrics** (for stability observations)
- **Impact scores** (calculated from data)

No generic, one-size-fits-all messages.

---

## Files Created/Modified

### Created
- `src/lib/portfolio-intelligence/risk-explanations.ts` - Explanation generators
- `src/lib/portfolio-intelligence/stability-insights.ts` - Insight enhancement
- `src/components/analytics/RiskInsightCard.tsx` - Enhanced insight card

### Modified
- `src/app/analytics/health/page.tsx` - Updated Key Risks section
- `src/app/analytics/stability/page.tsx` - Updated Key Observations section

---

## Impact Scoring

### Health Score Risks
- Already have impact scores from deductions
- Sorted by impact (highest first)
- Top 3 displayed

### Stability Observations
- Impact calculated based on metrics:
  - Stability-oriented assets: Based on percentage
  - Market-linked: Based on percentage
  - Credit risk: Based on risk level
  - Retirement: Based on percentage
  - Stability score: Based on score value
- Sorted by impact (highest first)
- Top 3 displayed

---

## Testing

### Checklist
- [x] Risks sorted by impact (highest first)
- [x] Observations sorted by impact (highest first)
- [x] Explanations added to all items
- [x] Tone is neutral and educational
- [x] No alarmist language
- [x] All insights are data-backed
- [x] Component renders correctly
- [x] Dark mode support
- [x] Responsive layout
- [x] No linter errors

---

**Last Updated**: January 2025