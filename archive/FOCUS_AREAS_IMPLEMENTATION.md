# "What to Focus On First" Section Implementation

**Date**: January 2025  
**Status**: ✅ Complete

---

## Overview

Added a new "What to Focus On First" section to the Portfolio Health Score page. This section highlights the top 2 focus areas based on highest impact score, using optimization-oriented language.

---

## Implementation

### 1. Focus Areas Generator

**File**: `src/lib/portfolio-intelligence/focus-areas.ts`

Main function: `generateFocusAreas(topRisks: Deduction[])`

- Takes top risks from health score
- Sorts by impact (highest first)
- Returns maximum 2 focus areas
- Each focus area includes:
  - Title (risk reason)
  - Explanation (why this matters)
  - Impact score
  - Action hint (optimization-oriented language)
  - Risk level

**Action Hints** (Optimization-Oriented):
- "Review portfolio allocation to improve diversification"
- "Review mutual fund holdings to identify and reduce overlap"
- "Review asset allocation mix to align with your goals"
- "Review sector exposure to improve diversification"
- "Review market cap distribution to balance risk and return"
- "Review geographic diversification to reduce country risk"
- "Monitor investment quality metrics and performance trends"

### 2. Focus Area Card Component

**File**: `src/components/analytics/FocusAreaCard.tsx`

Specialized component for focus areas:
- Gradient background (blue to indigo)
- Target icon to emphasize focus/priority
- Displays title, explanation, and action hint
- Shows impact score
- Color-coded by risk level

### 3. Portfolio Health Score Page Updates

**Changes**:
- Added import for `FocusAreaCard` and `generateFocusAreas`
- Generate focus areas from top risks
- Added new section after score explanation
- Section displays maximum 2 focus areas in a grid

### 4. Section Headers

**File**: `src/constants/analyticsCopy.ts`

Added new section header:
- `focusAreas: 'What to Focus On First'`

---

## Language Guidelines

### Optimization-Oriented Language Used

✅ **Review** - "Review portfolio allocation", "Review mutual fund holdings"
✅ **Improve** - "Improve diversification", "Improve diversification"
✅ **Monitor** - "Monitor investment quality metrics"
✅ **Identify** - "Identify and reduce overlap", "Identify optimization opportunities"
✅ **Align** - "Align with your goals"
✅ **Balance** - "Balance risk and return"

❌ **NOT Used**:
- "Buy", "Sell", "Exit", "Invest" (directive language)
- "Must", "Should", "Need to" (prescriptive language)
- "Warning", "Critical", "Urgent" (alarmist language)

---

## Selection Logic

1. Takes all top risks from health score
2. Sorts by impact score (highest first)
3. Selects top 2 items
4. Generates focus areas with explanations and action hints

---

## Positioning

The section is placed:
- After the "Portfolio Health Score Summary" (with score explanation)
- Before the "Pillar Breakdown" section
- This positioning helps users see what to focus on before diving into detailed breakdowns

---

## Files Created/Modified

### Created
- `src/lib/portfolio-intelligence/focus-areas.ts` - Focus areas generation logic
- `src/components/analytics/FocusAreaCard.tsx` - Focus area card component

### Modified
- `src/app/analytics/health/page.tsx` - Added focus areas section
- `src/constants/analyticsCopy.ts` - Added section header

---

## Testing

### Checklist
- [x] Maximum 2 focus areas displayed
- [x] Selected based on highest impact score
- [x] Uses optimization-oriented language
- [x] Section positioned appropriately
- [x] Component renders correctly
- [x] Dark mode support
- [x] Responsive layout
- [x] No linter errors
- [x] SEBI-compliant language

---

**Last Updated**: January 2025