# Advanced Exposure Analytics - Design Specification

## Core Philosophy

### The Golden Rule
**Asset ownership ≠ Asset exposure**

```
Dashboard shows: WHAT YOU OWN
Analytics shows: WHAT YOU'RE EXPOSED TO
```

These are **different questions** with **different answers**.

---

## Definitions (Critical)

### Asset Ownership
- **Equity (asset)**: Direct stock holdings only
  - Example: 100 shares of Reliance = ₹2,50,000
- **Mutual Funds (asset)**: Total MF investment value
  - Example: HDFC Flexi Cap Fund = ₹3,20,000

### Exposure
- **Equity Exposure**: Equity portion inside mutual funds
  - Example: HDFC Flexi Cap (85% equity) = ₹2,72,000 equity exposure
- **Debt Exposure**: Debt portion inside mutual funds
  - Example: HDFC Flexi Cap (15% debt) = ₹48,000 debt exposure

### Separation Rules
1. **Dashboard**: Shows only asset ownership (never exposure)
2. **Holdings Screens**: Shows only asset ownership (never exposure)
3. **Analytics Screens**: Shows both ownership AND exposure (clearly labeled)

---

## Screen 1: Portfolio Analytics Overview
**Route**: `/analytics/overview`

### Layout
```
┌────────────────────────────────────────────────────────────────┐
│ ← Back to Dashboard                                           │
│                                                                │
│ Portfolio Analytics                                            │
│ Advanced exposure insights for your portfolio                  │
│                                                                │
│ ⚠ Note: Analytics show exposure, not just ownership.          │
│   Values here may differ from dashboard asset values.          │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│ OWNERSHIP vs EXPOSURE                                          │
│                                                                │
│ This view helps you understand what you're EXPOSED to,        │
│ not just what you OWN.                                         │
│                                                                │
│ Example: You own ₹18,50,000 in Mutual Funds.                 │
│ But 85% of that is invested in equity by the fund.            │
│ So your equity EXPOSURE is ₹15,72,500.                       │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│ QUICK LINKS                                                    │
│                                                                │
│ [Mutual Fund Exposure Analytics →]                            │
│ [Sector Exposure Analysis →]                                   │
│ [Market Cap Exposure →]                                        │
│ [Geography Exposure →]                                         │
└────────────────────────────────────────────────────────────────┘
```

### Key Message
```
┌────────────────────────────────────────────────────────────────┐
│ ℹ Important: Analytics are for insights only                  │
│                                                                │
│ Your dashboard shows:                                          │
│ • Equity (direct holdings): ₹12,80,000                        │
│ • Mutual Funds: ₹18,50,000                                    │
│                                                                │
│ Analytics adds exposure data:                                  │
│ • Equity Exposure (via MF): ₹15,72,500                        │
│ • Debt Exposure (via MF): ₹2,77,500                          │
│                                                                │
│ ⚠ Dashboard values remain unchanged.                          │
└────────────────────────────────────────────────────────────────┘
```

---

## Screen 2: Mutual Fund Exposure Analytics
**Route**: `/analytics/mutualfund-exposure`

### Layout
```
┌────────────────────────────────────────────────────────────────┐
│ ← Back to Analytics                                           │
│                                                                │
│ Mutual Fund Exposure Analytics                                 │
│ Understanding what your mutual funds are invested in           │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│ YOUR MUTUAL FUND HOLDINGS (Asset Ownership)                    │
│                                                                │
│ Total Mutual Fund Value: ₹18,50,000                          │
│ Number of schemes: 22                                          │
│                                                                │
│ This is what you OWN. ✓                                        │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│ EXPOSURE BREAKDOWN (What your MFs invest in)                  │
│                                                                │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ Asset Class         Exposure Value    % of MF    % of    │ │
│ │                                      Holdings  Portfolio  │ │
│ ├──────────────────────────────────────────────────────────┤ │
│ │ Equity              ₹15,72,500       85.0%      34.8%    │ │
│ │ (via Mutual Funds)                                       │ │
│ ├──────────────────────────────────────────────────────────┤ │
│ │ Debt                ₹2,22,000        12.0%      4.9%     │ │
│ │ (via Mutual Funds)                                       │ │
│ ├──────────────────────────────────────────────────────────┤ │
│ │ Cash/Others         ₹55,500          3.0%       1.2%     │ │
│ │ (via Mutual Funds)                                       │ │
│ └──────────────────────────────────────────────────────────┘ │
│                                                                │
│ Total: ₹18,50,000 (matches your MF holdings) ✓               │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│ COMBINED VIEW (Ownership + Exposure)                           │
│                                                                │
│ ⚠ For reference only. Dashboard values remain unchanged.      │
│                                                                │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ Asset Type          Direct      Exposure      Combined   │ │
│ │                    Holdings     (via MF)      View       │ │
│ ├──────────────────────────────────────────────────────────┤ │
│ │ Equity              ₹12,80,000  ₹15,72,500   ₹28,52,500 │ │
│ │                     (owned)     (via MF)     (total exp) │ │
│ ├──────────────────────────────────────────────────────────┤ │
│ │ Debt                ₹0          ₹2,22,000    ₹2,22,000  │ │
│ │                     (owned)     (via MF)     (total exp) │ │
│ ├──────────────────────────────────────────────────────────┤ │
│ │ Mutual Funds        ₹18,50,000  —            —           │ │
│ │ (as asset class)                                         │ │
│ └──────────────────────────────────────────────────────────┘ │
│                                                                │
│ ℹ This "Combined View" is for analytics only.                 │
│   Your dashboard continues to show:                            │
│   • Equity: ₹12,80,000 (direct holdings)                     │
│   • Mutual Funds: ₹18,50,000 (total MF value)                │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│ SCHEME-WISE EXPOSURE BREAKDOWN                                 │
│                                                                │
│ ▼ HDFC Flexi Cap Fund (₹3,20,000)                            │
│   • Equity: ₹2,72,000 (85%)                                   │
│   • Debt: ₹38,400 (12%)                                       │
│   • Cash: ₹9,600 (3%)                                         │
│   Source: Fund factsheet as of Nov 30, 2024                    │
│                                                                │
│ ▶ Axis Bluechip Fund (₹2,90,000)                             │
│   Click to expand                                              │
│                                                                │
│ ▶ Parag Parikh Flexi Cap Fund (₹2,50,000)                    │
│   Click to expand                                              │
│                                                                │
│ [... 19 more schemes ...]                                     │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│ DATA SOURCE & ACCURACY                                         │
│                                                                │
│ Exposure data from: Fund factsheets (as of Nov 30, 2024)     │
│ Update frequency: Monthly                                      │
│ Accuracy: ±2% (fund allocations change daily)                 │
│                                                                │
│ ⚠ Exposure percentages are approximate. For exact holdings,   │
│   refer to individual fund factsheets.                         │
└────────────────────────────────────────────────────────────────┘
```

### Table Specifications

#### Exposure Breakdown Table
| Column | Width | Alignment | Format | Description |
|--------|-------|-----------|--------|-------------|
| Asset Class | 25% | Left | Text + label | E.g., "Equity (via MF)" |
| Exposure Value | 20% | Right | ₹X,XXX | Calculated amount |
| % of MF Holdings | 15% | Right | XX.X% | % of ₹18.5L |
| % of Portfolio | 15% | Right | XX.X% | % of total portfolio |

#### Combined View Table
| Column | Width | Alignment | Format | Description |
|--------|-------|-----------|--------|-------------|
| Asset Type | 25% | Left | Text | E.g., "Equity" |
| Direct Holdings | 20% | Right | ₹X,XXX | From dashboard |
| Exposure (via MF) | 20% | Right | ₹X,XXX | Calculated |
| Combined View | 20% | Right | ₹X,XXX | Sum (analytics only) |

### Calculation Formula
```
For each mutual fund:
  Equity Exposure = MF Value × Fund's Equity %
  Debt Exposure = MF Value × Fund's Debt %
  Other Exposure = MF Value × Fund's Other %

Total Equity Exposure = Sum of all MF equity exposures
```

### Example Calculation
```
HDFC Flexi Cap Fund:
  Value: ₹3,20,000
  Equity allocation: 85%
  → Equity Exposure = ₹3,20,000 × 0.85 = ₹2,72,000

Axis Bluechip Fund:
  Value: ₹2,90,000
  Equity allocation: 90%
  → Equity Exposure = ₹2,90,000 × 0.90 = ₹2,61,000

Total MF Equity Exposure = ₹2,72,000 + ₹2,61,000 + ... = ₹15,72,500
```

---

## Screen 3: Sector Exposure Analysis
**Route**: `/analytics/sector-exposure`

### Layout
```
┌────────────────────────────────────────────────────────────────┐
│ ← Back to Analytics                                           │
│                                                                │
│ Sector Exposure Analysis                                       │
│ Which sectors are you exposed to?                              │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│ SECTOR EXPOSURE (Direct Equity + MF Equity Exposure)          │
│                                                                │
│ ⚠ This combines direct equity holdings with equity exposure   │
│    from mutual funds. Use for risk assessment only.            │
│                                                                │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ Sector            Direct    Via MF      Total     % of   │ │
│ │                   Equity    Exposure    Exposure  Total  │ │
│ ├──────────────────────────────────────────────────────────┤ │
│ │ Technology        ₹3,20,000 ₹4,50,000  ₹7,70,000  27.0% │ │
│ │                   (owned)   (via MF)   (total)           │ │
│ ├──────────────────────────────────────────────────────────┤ │
│ │ Banking/Finance   ₹4,50,000 ₹3,80,000  ₹8,30,000  29.1% │ │
│ │                   (owned)   (via MF)   (total)           │ │
│ ├──────────────────────────────────────────────────────────┤ │
│ │ FMCG              ₹1,20,000 ₹2,10,000  ₹3,30,000  11.6% │ │
│ │                   (owned)   (via MF)   (total)           │ │
│ ├──────────────────────────────────────────────────────────┤ │
│ │ Pharma            ₹0        ₹1,85,000  ₹1,85,000  6.5%  │ │
│ │                   (owned)   (via MF)   (total)           │ │
│ ├──────────────────────────────────────────────────────────┤ │
│ │ Others            ₹3,90,000 ₹3,47,500  ₹7,37,500  25.8% │ │
│ │                   (owned)   (via MF)   (total)           │ │
│ └──────────────────────────────────────────────────────────┘ │
│                                                                │
│ Total Equity Exposure: ₹28,52,500                             │
│ (₹12,80,000 direct + ₹15,72,500 via MF)                      │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│ CONCENTRATION RISK                                             │
│                                                                │
│ ⚠ Banking/Finance: 29.1% of total equity exposure             │
│   (Higher than recommended 25% single-sector limit)            │
│                                                                │
│ ℹ Technology: 27.0% of total equity exposure                  │
│   (Near recommended 25% single-sector limit)                   │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│ DATA SOURCE & LIMITATIONS                                      │
│                                                                │
│ Direct equity sector data: From your holdings                  │
│ MF equity sector data: Aggregated from fund factsheets         │
│ Accuracy: ±5% (fund holdings change daily)                     │
│                                                                │
│ ⚠ Sector classifications may vary between sources.            │
│   Use for directional insights, not precise allocation.        │
└────────────────────────────────────────────────────────────────┘
```

---

## Screen 4: Market Cap Exposure
**Route**: `/analytics/marketcap-exposure`

### Layout
```
┌────────────────────────────────────────────────────────────────┐
│ ← Back to Analytics                                           │
│                                                                │
│ Market Cap Exposure Analysis                                   │
│ Large cap, mid cap, or small cap exposure?                     │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│ MARKET CAP EXPOSURE (Direct Equity + MF Equity Exposure)      │
│                                                                │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ Market Cap        Direct    Via MF      Total     % of   │ │
│ │                   Equity    Exposure    Exposure  Total  │ │
│ ├──────────────────────────────────────────────────────────┤ │
│ │ Large Cap         ₹8,50,000 ₹10,50,000 ₹19,00,000 66.6% │ │
│ │ (Top 100 stocks)  (owned)   (via MF)   (total)          │ │
│ ├──────────────────────────────────────────────────────────┤ │
│ │ Mid Cap           ₹3,20,000 ₹4,20,000  ₹7,40,000  25.9% │ │
│ │ (101-250)         (owned)   (via MF)   (total)          │ │
│ ├──────────────────────────────────────────────────────────┤ │
│ │ Small Cap         ₹1,10,000 ₹1,02,500  ₹2,12,500  7.5%  │ │
│ │ (251+)            (owned)   (via MF)   (total)          │ │
│ └──────────────────────────────────────────────────────────┘ │
│                                                                │
│ Total Equity Exposure: ₹28,52,500                             │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│ RISK PROFILE                                                   │
│                                                                │
│ ✓ Large Cap Dominant (66.6%)                                  │
│   Lower volatility, stable returns                             │
│                                                                │
│ ℹ Mid Cap Allocation (25.9%)                                  │
│   Moderate volatility, growth potential                        │
│                                                                │
│ ⚠ Small Cap Allocation (7.5%)                                 │
│   Higher volatility, higher risk                               │
└────────────────────────────────────────────────────────────────┘
```

---

## Screen 5: Geography Exposure (Optional)
**Route**: `/analytics/geography-exposure`

### Layout
```
┌────────────────────────────────────────────────────────────────┐
│ ← Back to Analytics                                           │
│                                                                │
│ Geography Exposure Analysis                                    │
│ India vs International exposure                                │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│ GEOGRAPHY EXPOSURE (Direct Equity + MF Equity Exposure)       │
│                                                                │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ Geography         Direct    Via MF      Total     % of   │ │
│ │                   Equity    Exposure    Exposure  Total  │ │
│ ├──────────────────────────────────────────────────────────┤ │
│ │ India             ₹12,80,000 ₹14,20,000 ₹27,00,000 94.7%│ │
│ │                   (owned)    (via MF)   (total)          │ │
│ ├──────────────────────────────────────────────────────────┤ │
│ │ International     ₹0        ₹1,52,500  ₹1,52,500  5.3%  │ │
│ │ (US, EU, etc.)    (owned)   (via MF)   (total)          │ │
│ └──────────────────────────────────────────────────────────┘ │
│                                                                │
│ Total Equity Exposure: ₹28,52,500                             │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│ ℹ International exposure comes from:                           │
│   • Parag Parikh Flexi Cap Fund (foreign stocks: ~30%)        │
│   • Motilal Oswal Nasdaq 100 FOF (US tech: 100%)             │
└────────────────────────────────────────────────────────────────┘
```

---

## Data Source & Calculation

### Where Exposure Data Comes From

```
┌────────────────────────────────────────────────────────────────┐
│ Mutual Fund Exposure Data Sources:                            │
│                                                                │
│ 1. Fund Factsheets (monthly)                                  │
│    - Published by AMCs                                         │
│    - Shows asset allocation breakdown                          │
│    - Typically 1-30 days old                                  │
│                                                                │
│ 2. AMFI Website (for standardized data)                       │
│    - Category classifications                                  │
│    - Asset class mandates                                      │
│                                                                │
│ 3. Fund Portfolio Holdings (quarterly)                         │
│    - Detailed sector exposure                                  │
│    - Market cap exposure                                       │
│    - Top holdings                                              │
│                                                                │
│ Limitations:                                                   │
│ • Data is historical (not real-time)                          │
│ • Allocations change daily                                     │
│ • Accuracy: ±2-5%                                             │
└────────────────────────────────────────────────────────────────┘
```

### Calculation Logic

```typescript
// Pseudo-code for exposure calculation

function calculateMFExposure(mutualFunds) {
  let totalEquityExposure = 0;
  let totalDebtExposure = 0;
  let totalOtherExposure = 0;
  
  for (const fund of mutualFunds) {
    const factsheet = getLatestFactsheet(fund.isin);
    
    if (factsheet.available) {
      totalEquityExposure += fund.currentValue * factsheet.equityPercentage;
      totalDebtExposure += fund.currentValue * factsheet.debtPercentage;
      totalOtherExposure += fund.currentValue * factsheet.otherPercentage;
    } else {
      // Use category-based estimates
      const categoryDefaults = getCategoryDefaults(fund.category);
      totalEquityExposure += fund.currentValue * categoryDefaults.equityPercentage;
      totalDebtExposure += fund.currentValue * categoryDefaults.debtPercentage;
    }
  }
  
  return {
    equity: totalEquityExposure,
    debt: totalDebtExposure,
    other: totalOtherExposure,
    dataQuality: calculateDataQuality()
  };
}
```

---

## Missing Data Handling

### If Factsheet Unavailable
```
┌────────────────────────────────────────────────────────────────┐
│ ⚠ Exposure data unavailable for 3 schemes                     │
│                                                                │
│ • Scheme ABC (₹1,20,000) - Factsheet not found               │
│ • Scheme XYZ (₹80,000) - Data older than 60 days             │
│ • Scheme PQR (₹50,000) - AMC not supported                   │
│                                                                │
│ Using category-based estimates for these schemes.              │
│ Accuracy may be lower (±10%).                                 │
└────────────────────────────────────────────────────────────────┘
```

### Category-Based Fallback
```
If factsheet unavailable:
  - Large Cap Fund → Assume 95% equity, 5% cash
  - Mid Cap Fund → Assume 90% equity, 10% cash
  - Flexi Cap Fund → Assume 85% equity, 15% debt/cash
  - Debt Fund → Assume 5% equity, 95% debt
  - Hybrid Fund → Assume 65% equity, 35% debt
```

---

## Navigation & Access

### Entry Points

1. **From Dashboard**
```
Dashboard
  └─> "View Advanced Analytics" link (footer/sidebar)
       └─> Analytics Overview
```

2. **From Portfolio Summary**
```
Portfolio Summary
  └─> "Analyze Exposure" button
       └─> MF Exposure Analytics
```

3. **From Holdings Screens**
```
Mutual Funds Holdings
  └─> "View Exposure Breakdown" button
       └─> MF Exposure Analytics
```

### Breadcrumbs
```
Every analytics screen shows:
Dashboard > Analytics > [Screen Name]

Example:
Dashboard > Analytics > Mutual Fund Exposure Analytics
```

---

## Warning Banners

### Top of Every Analytics Screen
```
┌────────────────────────────────────────────────────────────────┐
│ ⚠ ANALYTICS VIEW                                              │
│                                                                │
│ This screen shows exposure analysis, not asset ownership.      │
│ Values here may differ from dashboard and holdings screens.    │
│                                                                │
│ Dashboard values remain authoritative for:                     │
│ • Portfolio value                                              │
│ • Asset allocation                                             │
│ • P&L calculations                                             │
└────────────────────────────────────────────────────────────────┘
```

### If Data Quality Is Low
```
┌────────────────────────────────────────────────────────────────┐
│ ⚠ DATA QUALITY WARNING                                        │
│                                                                │
│ Exposure data is incomplete or outdated.                       │
│ Confidence level: Low (40%)                                    │
│                                                                │
│ 8 of 22 schemes using estimated allocations.                  │
│ Last factsheet update: 45 days ago                            │
│                                                                │
│ [View data quality details]                                    │
└────────────────────────────────────────────────────────────────┘
```

---

## Design System (Consistent with Dashboard)

### Colors
```css
/* Same as dashboard */
--primary-brand: #0A2540
--background: #F6F8FB
--card: #FFFFFF
--primary-action: #2563EB
--success: #16A34A
--warning: #F59E0B
--muted: #6B7280
--border: #E5E7EB

/* Analytics-specific */
--analytics-highlight: #EFF6FF (light blue for "via MF" labels)
--direct-holdings: #0F172A (dark - for owned assets)
--exposure: #6B7280 (gray - for exposure via MF)
```

### Typography
```
Font: Inter (same as dashboard)
Labels: 500 (medium)
Data: 400 (regular) with tabular-nums
Headers: 600 (semibold)
```

### Table Styling
```
Same as Holdings screens:
- Row height: 64px
- Borders: #E5E7EB
- Hover: #F9FAFB background
- Alignment: Numbers right, text left
```

---

## User Education

### First-Time Visit
```
┌────────────────────────────────────────────────────────────────┐
│ 👋 Welcome to Analytics                                       │
│                                                                │
│ Analytics help you understand your EXPOSURE, not just what    │
│ you own.                                                       │
│                                                                │
│ Key differences:                                               │
│                                                                │
│ Dashboard shows:                                               │
│ • Equity: ₹12,80,000 (your direct stock holdings)            │
│ • Mutual Funds: ₹18,50,000 (your MF investments)             │
│                                                                │
│ Analytics reveals:                                             │
│ • Your MFs invest 85% in equity = ₹15,72,500 equity exposure │
│ • So your total equity exposure = ₹28,52,500                 │
│                                                                │
│ [Got it, don't show again]  [Learn more]                     │
└────────────────────────────────────────────────────────────────┘
```

---

## API Requirements

### Endpoints Needed

```
GET /api/analytics/mutualfund-exposure
Response:
{
  "totalMFValue": 1850000,
  "exposure": {
    "equity": 1572500,
    "debt": 222000,
    "other": 55500
  },
  "schemeWiseBreakdown": [
    {
      "schemeId": "123",
      "schemeName": "HDFC Flexi Cap",
      "value": 320000,
      "exposure": {
        "equity": 272000,
        "debt": 38400,
        "other": 9600
      },
      "dataSource": "factsheet",
      "asOfDate": "2024-11-30",
      "confidence": "high"
    }
  ],
  "dataQuality": {
    "confidence": 0.92,
    "schemesWithData": 20,
    "schemesMissingData": 2,
    "oldestDataDate": "2024-10-15"
  }
}

GET /api/analytics/sector-exposure
Response:
{
  "directEquity": {
    "technology": 320000,
    "banking": 450000,
    ...
  },
  "mfExposure": {
    "technology": 450000,
    "banking": 380000,
    ...
  },
  "combined": {
    "technology": 770000,
    "banking": 830000,
    ...
  }
}
```

---

## Implementation Checklist

- [ ] Build Analytics Overview page
- [ ] Build MF Exposure Analytics page
- [ ] Build Sector Exposure page
- [ ] Build Market Cap Exposure page
- [ ] Build Geography Exposure page
- [ ] Add factsheet data ingestion
- [ ] Add category-based fallback logic
- [ ] Add data quality indicators
- [ ] Add warning banners
- [ ] Add first-time user education
- [ ] Add "Back to Dashboard" links
- [ ] Test that dashboard values never change
- [ ] Test that labels clearly distinguish exposure vs ownership

---

## Testing Scenarios

### Scenario 1: Dashboard vs Analytics Values
```
Setup:
- Direct equity: ₹10,00,000
- Mutual funds: ₹20,00,000 (90% equity exposure)

Dashboard should show:
- Equity: ₹10,00,000
- Mutual Funds: ₹20,00,000

Analytics should show:
- Direct Equity: ₹10,00,000
- Equity Exposure (via MF): ₹18,00,000
- Combined Equity Exposure: ₹28,00,000

✓ Dashboard values unchanged
✓ Analytics adds exposure layer
✓ Clear labeling ("via MF")
```

### Scenario 2: Missing Factsheet Data
```
Setup:
- 3 schemes with factsheet data
- 2 schemes without factsheet data

Expected behavior:
- Show warning banner
- Use category-based estimates for 2 schemes
- Show confidence level: "Medium (60%)"
- Allow user to see which schemes have missing data
```

### Scenario 3: User Confusion Prevention
```
User action: Sees ₹28,52,500 total equity exposure
User thinks: "But dashboard shows ₹12,80,000 equity!"

Prevention:
- Warning banner at top
- Clear labels: "Direct Equity" vs "Equity Exposure (via MF)"
- Tooltip on hover explains difference
- Link to "Learn more about exposure analytics"
```

---

## Success Criteria

1. **Zero dashboard impact**: Dashboard values never change due to exposure analytics
2. **Clear labeling**: Every exposure number labeled "(via MF)" or similar
3. **No silent merging**: Direct holdings and MF exposure always shown separately first
4. **Data transparency**: Source and confidence level always visible
5. **User education**: First-time visitors understand difference between ownership and exposure

---

**Design Version**: Advanced Analytics v1.0  
**Status**: Specification Complete  
**Phase**: 2 (Post-MVP)  
**Dependency**: Requires factsheet data integration

---

## Key Principle (Repeat)

```
┌────────────────────────────────────────────────────────────────┐
│                                                                │
│              DASHBOARD ≠ ANALYTICS                             │
│                                                                │
│    Dashboard: What you OWN                                     │
│    Analytics: What you're EXPOSED TO                           │
│                                                                │
│    Never mix the two.                                          │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

