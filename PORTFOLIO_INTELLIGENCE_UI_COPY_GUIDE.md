# Portfolio Intelligence UI Copy Guide

**Status**: ✅ Complete  
**Last Updated**: January 2025

---

## Overview

This guide documents the compliant UI copy system for the Portfolio Intelligence platform. All copy follows strict compliance rules to avoid investment advice language.

---

## 🔵 Global Copy Rules

### ❌ Never Use
- Buy
- Sell
- Exit
- Invest (as a directive)

### ✅ Always Use
- Consider
- Review
- Monitor
- Rebalance
- Optimize

### Tone
- **Informative**: Provide insights, not directives
- **Neutral**: No urgency or pressure
- **Reassuring**: Build confidence, not anxiety

### Disclaimers
- Add "For insight only" where appropriate
- Add "For portfolio insight only" for analytics
- Add trust statement footer on all analytics screens

---

## 📋 Copy by Section

### 1. Portfolio Health Score

**Title**: `Portfolio Health Score`

**Description**: 
> This score reflects how balanced, diversified, stable, and resilient your overall portfolio is — across market and non-market investments.

**Subline**: 
> Based on current holdings. For portfolio insight only.

**Grade Labels & Insights**:

| Score | Label | Range | Insight |
|-------|-------|-------|---------|
| 80-100 | Excellent | 80–100 | Your portfolio is well-diversified with healthy stability and manageable risk. |
| 65-79 | Good | 65–79 | Your portfolio is generally healthy, with a few areas that can be optimized. |
| 50-64 | Fair | 50–64 | Your portfolio shows moderate risk concentration and could benefit from better balance. |
| <50 | Needs Attention | <50 | Your portfolio has elevated risk and structural imbalances that need review. |

**Pillar Tooltips & Insights**: See `src/lib/portfolio-intelligence/ui-copy.ts` for full pillar-level copy.

---

### 2. Ownership vs Exposure

**Header**: `Ownership vs Exposure`

**Description**: 
> This view shows what you own directly versus what you are exposed to through underlying investments.

**Info Callout**: 
> Exposure reflects underlying asset allocation, not ownership value.

**Insight Examples**:
- "Although you own ₹88.1L in mutual funds, your actual equity exposure is ₹74.9L."
- "Your total equity exposure is higher than it appears from direct holdings alone."

---

### 3. Mutual Fund Exposure Analytics

**Section Title**: `What Your Mutual Funds Are Invested In`

**Labels**:
- **Equity Exposure**: "Major portion of your mutual fund value is linked to equity markets."
- **Debt Exposure**: "A portion of your mutual funds provides income stability."
- **Cash/Others**: "Small allocation helps with liquidity and rebalancing."

**Overlap Insights**:
- 🟢 Excellent: "Minimal overlap across funds."
- 🟡 Good: "Some funds invest in similar stocks."
- 🔴 Fair: "High overlap detected — diversification benefit is limited."

**Style Drift**:
- "This fund's actual holdings differ from its stated category."
- "Large-cap labeled funds with significant mid/small exposure increase volatility."

---

### 4. Sector Exposure Analytics

**Header**: `Sector Exposure (Direct + Mutual Funds)`

**Benchmark Note**: "Compared against broad market benchmarks."

**Concentration Alerts**:
- 🔴 **High**: "This sector exceeds recommended diversification limits."
- 🟡 **Near Threshold**: "Sector exposure is approaching concentration limits."

**Footer**: "High sector exposure can increase portfolio volatility during sector downturns."

---

### 5. Market Cap Exposure Analytics

**Header**: `Market Capitalization Exposure`

**Risk Profile Cards**:
- **Large Cap Dominant**: "Lower volatility, relatively stable returns."
- **Mid Cap Tilt**: "Moderate volatility with higher growth potential."
- **Small Cap Exposure**: "Higher volatility and return variability."

**Footer**: "Market cap mix influences portfolio volatility more than returns."

---

### 6. Geography Exposure Analytics

**Header**: `Geographic Exposure`

**Insights**:
- 🟢 Excellent: "Your portfolio benefits from international diversification."
- 🟡 Good: "Limited international exposure reduces currency diversification."
- 🔴 Fair: "Portfolio is almost entirely dependent on domestic markets."

**Source Note**: "International exposure typically comes via mutual funds and ETFs."

---

### 7. Stability & Safety Analytics

**Header**: `Stability & Capital Protection`

**Key Insights**:
- 🟢 Excellent: "A significant portion of your wealth is capital-protected."
- 🔵 Good: "Stable assets provide downside resilience."
- 🟡 Fair: "Portfolio relies heavily on market-linked assets."

**Explanation**: "Capital-protected assets help preserve wealth during market stress."

**Credit Risk**:
- Low: "Credit risk exposure is minimal and well-managed."
- Medium: "Some credit risk exists but remains acceptable."
- High: "Review credit risk exposure in bonds."

**Retirement**:
- Good: "Your retirement allocation provides tax efficiency and stability."
- Low: "Review retirement allocation for tax efficiency."

---

### 8. Liquidity & Lock-In Analytics

**Header**: `Liquidity & Accessibility`

**Liquidity Status**:
- 🟢 Excellent: "You have sufficient liquid assets for short-term needs."
- 🟡 Good: "Liquidity is adequate but limited."
- 🔴 Fair: "Most of your wealth is locked for the long term."

**Emergency Fund**: "Your liquid assets can cover approximately {X} months of expenses."

**Locked Wealth**:
- Note: "Locked assets provide stability but limit short-term access."
- Recommendation: "Maintain a balance between locked and liquid assets."

---

### 9. Overlap & Redundancy Analyzer

**Header**: `Portfolio Simplification Insights`

**Messages**:
- 🟢 Excellent: "Your portfolio is lean and efficient."
- 🟡 Good: "Some investments serve similar purposes."
- 🔴 Fair: "Multiple holdings duplicate exposure."

**Nudge**: "Portfolio simplicity often improves clarity without reducing diversification."

**Disclaimer**: "Review overlap for insights only — not a recommendation to change holdings."

---

### 10. Investment Quality Scanner

**Header**: `Investment Quality Scanner`

**Categories**:
- **High Quality**: "Strong fundamentals and consistent behavior."
- **Monitor**: "Shows mixed signals. Worth tracking."
- **Warning**: "Displays persistent weakness or inconsistency."

**Footer**: "Quality signals focus on long-term characteristics, not short-term performance."

---

### 11. Scenario Simulator

**Header**: `Scenario Impact Analysis`

**Description**: "Illustrates how your portfolio may behave under different market conditions."

**Scenarios**:
- Market Decline: "If markets decline by {X}%, your portfolio may decline approximately {Y}%."
- Sector Stress: "Sector-specific stress could impact your portfolio unevenly."
- Rate Shock: "Interest rate changes may affect debt and bond holdings."

**Disclaimer**: "Scenarios are hypothetical and for risk understanding only."

---

## 🔚 Trust Statement (Global Footer)

**Text**: 
> WealthLens analytics are designed to help you understand and evaluate your portfolio structure. They do not constitute investment advice.

**Usage**: 
- Display at the bottom of all analytics screens
- Small, subtle font
- Link to terms/privacy if needed

---

## 📁 Implementation

### File: `src/lib/portfolio-intelligence/ui-copy.ts`

This file contains all UI copy constants organized by section. Use the exported constants and helper functions in your components.

### Usage Example

```typescript
import { HEALTH_SCORE_COPY, getGradeInfo, getPillarInsight } from '@/lib/portfolio-intelligence/ui-copy';

// Get grade info
const gradeInfo = getGradeInfo(score);
// Returns: { label: 'Excellent', range: '80–100', color: 'green', insight: '...' }

// Get pillar insight
const insight = getPillarInsight('asset_allocation', pillarScore);
// Returns appropriate insight based on score
```

### Health Score Integration

```typescript
import { getGradeDisplayLabel } from '@/lib/portfolio-intelligence/health-score';

// Convert internal grade to display label
const displayLabel = getGradeDisplayLabel(healthScore.grade);
// 'Poor' → 'Needs Attention'
```

---

## ✅ Compliance Checklist

Before deploying any analytics screen, verify:

- [ ] No "buy", "sell", "exit", "invest" (as directive)
- [ ] Uses "review", "consider", "monitor", "rebalance", "optimize"
- [ ] Includes "For insight only" or "For portfolio insight only"
- [ ] Tone is informative, neutral, reassuring
- [ ] Trust statement footer included
- [ ] No urgency language ("act now", "urgent")
- [ ] No trading language
- [ ] Focus on understanding, not action

---

## 📝 Notes

- All copy is stored in TypeScript constants for type safety
- Copy is easily updatable in one place
- Helper functions provide dynamic insights based on scores
- Grade labels map internal values to user-facing labels
- All insights are conditional and score-based

---

**Last Updated**: January 2025  
**Maintained By**: Portfolio Intelligence Team