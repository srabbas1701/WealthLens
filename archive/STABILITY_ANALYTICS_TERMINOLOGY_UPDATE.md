# Stability Analytics Terminology Update

**Date**: January 2025  
**Status**: ✅ Complete

---

## Changes Made

### 1. Terminology Updates

**Changed**: "Capital-Protected" → "Stability-Oriented Assets"

**Rationale**: 
- More financially accurate
- Avoids implying full capital protection
- Better reflects that instruments like NPS are policy-backed, not guaranteed

### 2. Files Updated

#### Frontend Files
- `src/app/analytics/stability/page.tsx`
  - Updated labels from "Capital-Protected" to "Stability-Oriented Assets"
  - Updated section title from "Asset Protection Breakdown" to "Asset Stability Breakdown"
  - Added InfoTooltip component with clarification
  - Updated comment in file header

#### Backend Files
- `src/lib/portfolio-intelligence/ui-copy.ts`
  - Updated STABILITY_COPY constants
  - Added `stabilityOrientedTooltip` with compliance disclaimer
  - Updated explanation text to clarify policy-backed instruments
  - Updated insights text

- `src/lib/portfolio-intelligence/stability-analytics.ts`
  - Updated comments to use "stability-oriented" terminology
  - Added note about policy-backed instruments
  - Updated insight message

- `src/lib/portfolio-intelligence/asset-normalization.ts`
  - Updated comment about stability flags

#### Components
- `src/components/analytics/InfoTooltip.tsx` (NEW)
  - Reusable tooltip component for informational tooltips

---

## Compliance & Accuracy Improvements

### Before
- Used "Capital-Protected" which could imply full capital protection
- No clarification about policy-backed instruments
- Could mislead users about guarantees

### After
- Uses "Stability-Oriented Assets" - more accurate
- Clear tooltip explaining policy-backed instruments are not guaranteed
- Compliant with financial accuracy requirements
- Clarifies that NPS and similar instruments are subject to policy changes

---

## Tooltip Content

The new tooltip explains:
> "Stability-oriented assets include FDs (bank-guaranteed), PPF/EPF (government-backed), and policy-backed instruments like NPS. Note: Policy-backed instruments are not guaranteed and subject to policy changes and market conditions."

---

## Testing Checklist

- [x] All "Capital-Protected" labels updated to "Stability-Oriented Assets"
- [x] Tooltip added with compliance disclaimer
- [x] Copy updated to avoid implying full capital protection
- [x] Comments updated in backend files
- [x] No hardcoded strings (all from constants)
- [x] Financial accuracy verified
- [x] Compliance-safe language

---

**Last Updated**: January 2025