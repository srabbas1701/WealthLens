# Score Explanations Implementation

**Date**: January 2025  
**Status**: ✅ Complete

---

## Overview

Added "Why this score?" explanation blocks to both Portfolio Health Score and Stability Score sections. These explanations are generated directly from API data and use neutral, educational language.

---

## Implementation

### 1. Score Explanation Generator

**File**: `src/lib/portfolio-intelligence/score-explanations.ts`

Two main functions:

#### `generateHealthScoreExplanation(healthScore: PortfolioHealthScore)`
- Analyzes pillar breakdown to identify strengths (score >= 75) and weaknesses (score < 60)
- Extracts key deductions for weak pillars
- Generates summary based on total score
- Returns:
  - `summary`: Overall explanation of the score
  - `positiveFactors`: Up to 3 strong pillars/areas
  - `areasForAttention`: Up to 3 areas that need review

#### `generateStabilityScoreExplanation(stabilityData: StabilityAnalysis)`
- Analyzes stability metrics (capital-protected %, market-linked %)
- Evaluates credit risk exposure
- Assesses retirement contribution
- Generates summary based on stability score
- Returns:
  - `summary`: Overall explanation of the score
  - `contributingFactors`: Up to 3 factors that contribute to stability
  - `considerations`: Up to 3 factors that may need review

### 2. Score Explanation Component

**File**: `src/components/analytics/ScoreExplanation.tsx`

Reusable component that displays:
- "Why this score?" header with info icon
- Summary paragraph
- Contributing Factors section (with checkmark icons)
- Areas for Review section (with info icons)

Features:
- Blue-themed informational styling
- Responsive layout
- Dark mode support
- Accepts either `positiveFactors`/`areasForAttention` OR `contributingFactors`/`considerations`

### 3. Integration

#### Portfolio Health Score Page
- Explanation block added below the score gauge
- Generated from `healthScore.pillarBreakdown` and `healthScore.topRisks`
- Shows which pillars are strong and which need attention

#### Stability Analytics Page
- Explanation block added below the stability score display
- Generated from stability metrics, credit risk, and retirement data
- Shows contributing factors and considerations

---

## Language & Compliance

### Guidelines Followed
✅ **Neutral, educational language**
- "reflects", "indicates", "shows"
- No directive language

✅ **No investment advice**
- Uses "may benefit from review"
- Uses "could be improved"
- No "should", "must", "buy", "sell" language

✅ **Data-driven**
- All explanations derived from actual API data
- Specific percentages and metrics included
- No generic statements

### Example Language
- ✅ "Your portfolio health score of 72 reflects a generally healthy portfolio structure."
- ✅ "Asset Allocation Balance is strong (85/100)"
- ✅ "Portfolio has 15% in stability-oriented assets (lower stability contribution)"
- ❌ "You should increase your equity allocation"
- ❌ "Your portfolio needs more diversification"

---

## Files Created/Modified

### Created
- `src/lib/portfolio-intelligence/score-explanations.ts` - Explanation generation logic
- `src/components/analytics/ScoreExplanation.tsx` - Reusable explanation component

### Modified
- `src/app/analytics/health/page.tsx` - Added explanation block
- `src/app/analytics/stability/page.tsx` - Added explanation block

---

## Testing

### Checklist
- [x] Explanations generated from API data
- [x] Language is neutral and educational
- [x] No investment advice wording
- [x] Component renders correctly
- [x] Dark mode support
- [x] Responsive layout
- [x] No linter errors

---

**Last Updated**: January 2025