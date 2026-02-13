# Advanced Analytics - Quick Summary

## What Is This?

**Phase 2 feature** that shows **exposure analysis**, not asset ownership.

---

## The Core Concept

### What You OWN vs What You're EXPOSED TO

```
Example:

You OWN:
├─ Equity (direct): ₹12,80,000
└─ Mutual Funds: ₹18,50,000

But your Mutual Funds invest 85% in equity...

So you're EXPOSED TO:
├─ Equity (direct): ₹12,80,000
├─ Equity (via MF): ₹15,72,500 ← 85% of ₹18.5L
└─ Total Equity Exposure: ₹28,52,500
```

---

## The Golden Rule

```
┌────────────────────────────────────────────────┐
│                                                │
│   DASHBOARD VALUES NEVER CHANGE                │
│                                                │
│   Dashboard = Ownership (what you bought)      │
│   Analytics = Exposure (what you're exposed to│
│                                                │
└────────────────────────────────────────────────┘
```

---

## Screens Designed

### 1. Analytics Overview
- Entry point
- Explains ownership vs exposure
- Links to detailed screens

### 2. Mutual Fund Exposure Analytics
- Shows equity/debt/other exposure from MFs
- Scheme-wise breakdown
- Combined view (for reference only)

### 3. Sector Exposure
- Which sectors you're exposed to
- Direct equity + MF exposure
- Concentration risk alerts

### 4. Market Cap Exposure
- Large/Mid/Small cap exposure
- Risk profile assessment

### 5. Geography Exposure
- India vs International
- Optional feature

---

## Key Design Decisions

### 1. Clear Separation
✅ Dashboard shows ownership  
✅ Analytics shows exposure  
❌ Never mix the two

### 2. Explicit Labels
✅ "Equity (direct holdings)"  
✅ "Equity Exposure (via MF)"  
❌ Never just "Equity" when showing combined

### 3. Warning Banners
Every analytics screen has:
```
⚠ ANALYTICS VIEW
This shows exposure, not asset ownership.
Dashboard values remain unchanged.
```

### 4. Data Source Transparency
- Shows where data comes from (factsheets)
- Shows data age (as of Nov 30, 2024)
- Shows confidence level (High/Medium/Low)
- Shows missing data count

---

## Example: Mutual Fund Exposure Screen

```
YOUR MUTUAL FUND HOLDINGS
Total Value: ₹18,50,000 ← Matches dashboard ✓

EXPOSURE BREAKDOWN
├─ Equity (via MF): ₹15,72,500 (85%)
├─ Debt (via MF): ₹2,22,000 (12%)
└─ Other (via MF): ₹55,500 (3%)

COMBINED VIEW (Analytics only)
Direct Equity:        ₹12,80,000
+ Equity via MF:      ₹15,72,500
= Total Exposure:     ₹28,52,500

⚠ Dashboard continues to show:
  • Equity: ₹12,80,000
  • Mutual Funds: ₹18,50,000
```

---

## Data Sources

### Where Exposure Data Comes From
1. **Fund Factsheets** (monthly)
   - Published by AMCs
   - Shows asset allocation
   - Typically 1-30 days old

2. **AMFI Website**
   - Category classifications
   - Asset class mandates

3. **Portfolio Holdings** (quarterly)
   - Sector exposure
   - Market cap exposure

### Accuracy
- Best case: ±2% (recent factsheet)
- Typical: ±5% (allocations change daily)
- Worst case: ±10% (using category estimates)

---

## Missing Data Handling

If factsheet unavailable:
1. Show warning
2. Use category-based estimates
3. Reduce confidence level
4. Allow user to see which schemes have missing data

Example fallback:
- Large Cap Fund → 95% equity, 5% cash
- Flexi Cap Fund → 85% equity, 15% debt/cash
- Debt Fund → 5% equity, 95% debt

---

## User Flow

```
1. User on Dashboard
   ↓
2. Sees "View Advanced Analytics" link
   ↓
3. Lands on Analytics Overview
   ↓ (reads explanation)
4. Clicks "Mutual Fund Exposure"
   ↓
5. Sees exposure breakdown
   ↓
6. Understands: "Ah, my MFs are 85% in equity!"
   ↓
7. Checks Combined View
   ↓
8. Realizes: "I have ₹28.5L equity exposure, not just ₹12.8L"
   ↓
9. Returns to Dashboard
   ↓
10. Dashboard still shows: Equity ₹12.8L, MF ₹18.5L ✓
```

---

## Navigation

```
Dashboard
  └─> Analytics Overview
       ├─> MF Exposure Analytics
       ├─> Sector Exposure
       ├─> Market Cap Exposure
       └─> Geography Exposure
```

Breadcrumbs:
`Dashboard > Analytics > [Screen Name]`

---

## Design Consistency

- **Same colors** as dashboard
- **Same typography** (Inter font)
- **Same table styling** as holdings screens
- **Same professional feel**

Analytics-specific additions:
- Warning banners
- Data quality indicators
- "(via MF)" labels
- Confidence levels

---

## Testing Checklist

Before launch:
- [ ] Dashboard values unchanged when analytics enabled
- [ ] All exposure numbers labeled "(via MF)"
- [ ] Warning banners visible on all analytics screens
- [ ] Data quality indicators showing
- [ ] Missing data handling works
- [ ] Category-based fallback works
- [ ] First-time user sees education modal
- [ ] Export functions work
- [ ] Mobile view functional

---

## Implementation Priority

**Phase 2** (after MVP):
1. Analytics Overview (foundation)
2. MF Exposure Analytics (core feature)
3. Sector Exposure (high value)
4. Market Cap Exposure (nice to have)
5. Geography Exposure (optional)

---

## Why This Matters

### Without Exposure Analytics
User thinks:
- "I have 28% equity, 41% MF"
- "Seems balanced!"

Reality:
- MFs are 85% equity
- Actual equity exposure: 63%
- **Risk is higher than user thinks**

### With Exposure Analytics
User knows:
- "I have 28% direct equity, 41% MF"
- "But MFs invest 85% in equity"
- "So my real equity exposure is 63%"
- **User can make informed decisions**

---

## Key Principle

```
Ownership = What you bought
Exposure = What you're betting on

Show ownership by default.
Show exposure in analytics.
Never confuse the two.
```

---

**Status**: Specification Complete  
**Phase**: 2 (Post-MVP)  
**Dependencies**: Factsheet data integration  
**Design Version**: Analytics v1.0

