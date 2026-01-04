# Data-Heavy Holdings Screens - Design Specification

## Philosophy
These screens are NOT marketing. They are truth.
Every number must be verifiable. Every column must have a purpose.
Users come here to audit, not to be impressed.

---

## Screen 1: Portfolio Summary Screen
**Route**: `/portfolio/summary`

### Layout
```
┌────────────────────────────────────────────────────────────────┐
│ HEADER                                                         │
│ Portfolio Summary                                              │
│ Last updated: Dec 25, 2024, 3:45 PM                           │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│ SUMMARY TOTALS                                                 │
│                                                                │
│ Total Portfolio Value        ₹45,20,000                       │
│ Total Invested Amount        ₹42,00,000                       │
│ Total Unrealized Gain/Loss   ₹3,20,000 (+7.62%)              │
│ Number of Holdings           47                                │
│                                                                │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│ ASSET-WISE BREAKDOWN                                           │
│                                                                │
│ ▼ Mutual Funds                      ₹18,50,000      41%  [→]  │
│   22 holdings                                                  │
│   Invested: ₹17,20,000  |  Gain: ₹1,30,000 (+7.56%)          │
│                                                                │
│ ▶ Equity                            ₹12,80,000      28%  [→]  │
│   15 holdings                                                  │
│   Invested: ₹11,50,000  |  Gain: ₹1,30,000 (+11.30%)         │
│                                                                │
│ ▶ Fixed Deposits                    ₹10,20,000      23%  [→]  │
│   8 holdings                                                   │
│   Invested: ₹10,00,000  |  Gain: ₹20,000 (+2.00%)            │
│                                                                │
│ ▶ Others                            ₹3,70,000       8%   [→]  │
│   2 holdings                                                   │
│   Invested: ₹3,30,000   |  Gain: ₹40,000 (+12.12%)           │
│                                                                │
└────────────────────────────────────────────────────────────────┘

[Download Full Statement]  [Export to Excel]
```

### Interaction Rules
1. **Collapse/Expand**: Click asset name or chevron to toggle
2. **Click Arrow (→)**: Navigate to asset-specific holdings screen
3. **When Expanded**: Shows top 5 holdings + "View all X holdings" link

### Data Requirements
- **All numbers must sum correctly**
- If data is stale, show warning: "Data as of [date]"
- If any holding has missing data, show count: "2 holdings incomplete"

### Typography & Spacing
- Font: Inter, tabular nums
- Row height: 64px for collapsed, 120px for expanded
- Padding: 24px
- Number alignment: Right-aligned
- Text alignment: Left-aligned

### Colors
- Background: #FFFFFF
- Border: #E5E7EB
- Text: #0F172A
- Muted: #6B7280
- Positive: #16A34A
- Negative: #DC2626

---

## Screen 2: Equity Holdings Screen
**Route**: `/portfolio/equity`

### Layout
```
┌────────────────────────────────────────────────────────────────┐
│ ← Back to Portfolio Summary          [Download] [Filter]      │
│                                                                │
│ Equity Holdings                                                │
│ 15 holdings  •  Total Value: ₹12,80,000  •  41% of portfolio │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│ Group by: [None ▼] [Account ▼] [Alphabetical ▼]              │
│ Sort by: [Current Value ▼]                                    │
└────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│ Instrument Name      Qty      Avg Cost    Current    Invested    P&L      % Port│
│                              (per unit)    Value      Value                       │
├─────────────────────────────────────────────────────────────────────────────────┤
│ Reliance Industries  150      ₹2,450     ₹3,67,500   ₹3,67,500   ₹0       8.1% │
│ NSE: RELIANCE                                                     (0.00%)        │
│ Account: Zerodha                                                                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│ HDFC Bank Ltd        200      ₹1,580     ₹3,16,000   ₹3,16,000   ₹0       7.0% │
│ NSE: HDFCBANK                                                     (0.00%)        │
│ Account: Zerodha                                                                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│ Infosys Limited      100      ₹1,520     ₹1,52,000   ₹1,52,000   ₹0       3.4% │
│ NSE: INFY                                                         (0.00%)        │
│ Account: Groww                                                                   │
├─────────────────────────────────────────────────────────────────────────────────┤
│ TCS Limited          80       ₹3,650     ₹2,92,000   ₹2,92,000   ₹0       6.5% │
│ NSE: TCS                                                          (0.00%)        │
│ Account: Zerodha                                                                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│ [... 11 more rows ...]                                                          │
└─────────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│ TOTAL                                 ₹12,80,000   ₹11,50,000  ₹1,30,000    │
│                                                                (+11.30%)    │
└────────────────────────────────────────────────────────────────┘

Verification: Total matches dashboard equity value (₹12,80,000) ✓
```

### Column Specifications

| Column | Width | Alignment | Format | Sortable |
|--------|-------|-----------|--------|----------|
| Instrument Name | 30% | Left | Text + Symbol | Yes |
| Quantity | 10% | Right | Number, 2 decimals | Yes |
| Avg Cost | 12% | Right | ₹X,XXX | Yes |
| Current Value | 15% | Right | ₹X,XXX | Yes (default) |
| Invested Value | 15% | Right | ₹X,XXX | Yes |
| P&L | 13% | Right | ₹X,XXX (+Y%) | Yes |
| % Portfolio | 5% | Right | XX.X% | Yes |

### Interaction Rules
1. **Click row**: Expand to show transaction history
2. **Click column header**: Sort ascending/descending
3. **Group by Account**: Shows subtotals per account
4. **Group by Alphabetical**: A-Z sections with subtotals

### Data Integrity
- **Current Value must equal**: Quantity × Current Price
- **Invested Value must equal**: Quantity × Average Cost
- **P&L must equal**: Current Value - Invested Value
- **% Portfolio must sum to**: Equity's % in total portfolio
- If price data is stale, show: "⚠ Price as of [date]"

### Missing Data Handling
```
If Current Price unavailable:
  Current Value: "—"
  P&L: "—"
  Show note: "Current price unavailable"

If Avg Cost unavailable:
  Invested Value: Estimated from transactions
  Show note: "⚠ Average cost computed from transaction history"
```

---

## Screen 3: Mutual Fund Holdings Screen
**Route**: `/portfolio/mutualfunds`

### Layout
```
┌────────────────────────────────────────────────────────────────┐
│ ← Back to Portfolio Summary          [Download] [Filter]      │
│                                                                │
│ Mutual Fund Holdings                                           │
│ 22 holdings  •  Total Value: ₹18,50,000  •  41% of portfolio │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│ Group by: [None ▼] [AMC ▼] [Category ▼]                      │
│ Sort by: [Current Value ▼]                                    │
└────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────────┐
│ Scheme Name           AMC        Current    Invested   XIRR    P&L      % Port   │
│                                  Value      Value                                 │
├──────────────────────────────────────────────────────────────────────────────────┤
│ HDFC Flexi Cap Fund   HDFC MF    ₹3,20,000  ₹2,80,000  12.8%  ₹40,000  7.1%    │
│ Direct - Growth                                                (+14.29%)          │
│ Category: Flexi Cap  •  Folio: 12345/67                                          │
├──────────────────────────────────────────────────────────────────────────────────┤
│ Axis Bluechip Fund    Axis MF    ₹2,90,000  ₹2,70,000  8.5%   ₹20,000  6.4%    │
│ Direct - Growth                                                (+7.41%)           │
│ Category: Large Cap  •  Folio: 23456/78                                          │
├──────────────────────────────────────────────────────────────────────────────────┤
│ Parag Parikh Flexi    PPFAS MF   ₹2,50,000  ₹2,30,000  15.2%  ₹20,000  5.5%    │
│ Cap Fund - Direct                                              (+8.70%)           │
│ Category: Flexi Cap  •  Folio: 34567/89                                          │
├──────────────────────────────────────────────────────────────────────────────────┤
│ Mirae Asset Large     Mirae MF   ₹2,20,000  ₹2,00,000  10.1%  ₹20,000  4.9%    │
│ Cap Fund - Direct                                              (+10.00%)          │
│ Category: Large Cap  •  Folio: 45678/90                                          │
├──────────────────────────────────────────────────────────────────────────────────┤
│ [... 18 more rows ...]                                                           │
└──────────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│ TOTAL                             ₹18,50,000   ₹17,20,000   ₹1,30,000       │
│                                                              (+7.56%)        │
└────────────────────────────────────────────────────────────────┘

Note: XIRR calculated from transaction history. Does not reflect current market value.
Verification: Total matches dashboard mutual fund value (₹18,50,000) ✓
```

### Column Specifications

| Column | Width | Alignment | Format | Sortable |
|--------|-------|-----------|--------|----------|
| Scheme Name | 35% | Left | Full name + Plan | Yes |
| AMC | 12% | Left | Short name | Yes |
| Current Value | 13% | Right | ₹X,XXX | Yes (default) |
| Invested Value | 13% | Right | ₹X,XXX | Yes |
| XIRR | 8% | Right | XX.X% | Yes |
| P&L | 14% | Right | ₹X,XXX (+Y%) | Yes |
| % Portfolio | 5% | Right | XX.X% | Yes |

### XIRR Calculation Note
```
Display rules:
- If transaction history available: Show XIRR
- If < 1 year of data: Show "—" with note "< 1 year"
- If data incomplete: Show "⚠" with tooltip "XIRR may be inaccurate"

Below table:
"XIRR (Extended Internal Rate of Return) reflects annualized 
returns accounting for timing of investments and redemptions."
```

### Grouping Examples

#### By AMC
```
▼ HDFC Mutual Fund (5 schemes, ₹6,20,000)
  - HDFC Flexi Cap Fund    ₹3,20,000
  - HDFC Mid Cap Fund      ₹1,50,000
  - HDFC Small Cap Fund    ₹1,50,000

▼ Axis Mutual Fund (3 schemes, ₹4,10,000)
  - Axis Bluechip Fund     ₹2,90,000
  - Axis Mid Cap Fund      ₹1,20,000
```

#### By Category
```
▼ Large Cap (8 schemes, ₹7,80,000)
  - HDFC Bluechip Fund     ₹3,20,000
  - Axis Bluechip Fund     ₹2,90,000
  ...

▼ Flexi Cap (6 schemes, ₹5,40,000)
  - HDFC Flexi Cap Fund    ₹3,20,000
  - Parag Parikh Flexi Cap ₹2,50,000
  ...
```

---

## Fixed Deposit Holdings Screen
**Route**: `/portfolio/fixeddeposits`

### Layout
```
┌────────────────────────────────────────────────────────────────┐
│ ← Back to Portfolio Summary          [Download] [Filter]      │
│                                                                │
│ Fixed Deposit Holdings                                         │
│ 8 holdings  •  Total Value: ₹10,20,000  •  23% of portfolio  │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│ Sort by: [Maturity Date ▼]                                    │
│ Show: [All ▼] [Maturing in 60 days ▼] [Maturing in 90 days]  │
└────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────────┐
│ Bank/Institution    Principal   Rate    Start Date   Maturity    Current   Days  │
│                                                      Date         Value     Left  │
├──────────────────────────────────────────────────────────────────────────────────┤
│ HDFC Bank           ₹2,00,000   7.25%   Jan 15,2023  Jan 15,2026  ₹2,45,000  385 │
│ FD No: 123456789                                                                  │
│ Interest: Cumulative  •  TDS: Applicable                                          │
├──────────────────────────────────────────────────────────────────────────────────┤
│ ICICI Bank          ₹1,50,000   7.00%   Mar 01,2023  Mar 01,2026  ₹1,82,250  451 │
│ FD No: 987654321                                                                  │
│ Interest: Cumulative  •  TDS: Applicable                                          │
├──────────────────────────────────────────────────────────────────────────────────┤
│ SBI                 ₹1,50,000   6.75%   Jun 10,2024  Jun 10,2025  ₹1,60,125  167 │
│ FD No: 456789123                                                  ⚠ Mat. in 60d   │
│ Interest: Cumulative  •  TDS: Applicable                                          │
├──────────────────────────────────────────────────────────────────────────────────┤
│ [... 5 more rows ...]                                                            │
└──────────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│ TOTAL PRINCIPAL: ₹10,00,000  •  TOTAL CURRENT VALUE: ₹10,20,000│
│ WEIGHTED AVG RATE: 7.05%     •  3 FDs maturing in next 90 days │
└────────────────────────────────────────────────────────────────┘

Note: Current value includes accrued interest as of today.
Verification: Total matches dashboard FD value (₹10,20,000) ✓
```

### Column Specifications

| Column | Width | Alignment | Format | Sortable |
|--------|-------|-----------|--------|----------|
| Bank/Institution | 20% | Left | Name + FD No | Yes |
| Principal | 13% | Right | ₹X,XXX | Yes |
| Rate | 8% | Right | X.XX% | Yes |
| Start Date | 12% | Right | MMM DD, YYYY | Yes |
| Maturity Date | 12% | Right | MMM DD, YYYY | Yes (default) |
| Current Value | 13% | Right | ₹X,XXX | Yes |
| Days Left | 8% | Right | XXX days | Yes |

### Maturity Alerts
```
If maturity < 30 days: Red badge "Mat. in 30d"
If maturity < 60 days: Yellow badge "Mat. in 60d"
If maturity < 90 days: Blue badge "Mat. in 90d"
```

---

## Global Design Rules

### Typography
```css
Font: Inter
Weights: 
  - 400 (regular) for body text
  - 500 (medium) for labels
  - 600 (semibold) for headers
  - NO 700 (bold)

Sizes:
  - Table headers: 14px
  - Table data: 14px
  - Table subtext: 12px
  - Page headers: 24px

Number display:
  - font-variant-numeric: tabular-nums
  - All numbers right-aligned
  - Consistent decimal places
```

### Colors
```css
/* Text */
--primary-text: #0F172A
--secondary-text: #475569
--muted-text: #6B7280

/* Status */
--positive: #16A34A
--negative: #DC2626
--neutral: #6B7280
--warning: #F59E0B

/* Background */
--page-bg: #F6F8FB
--card-bg: #FFFFFF
--row-hover: #F9FAFB

/* Borders */
--border: #E5E7EB
--border-strong: #D1D5DB
```

### Table Styling
```css
/* Row */
height: 64px
padding: 16px 20px
border-bottom: 1px solid #E5E7EB

/* Header */
background: #F9FAFB
font-weight: 500
text-transform: uppercase
font-size: 12px
letter-spacing: 0.05em

/* Hover */
background: #F9FAFB
cursor: pointer

/* Expanded Row */
background: #F6F8FB
```

### Spacing
```
Container padding: 24px
Section gaps: 32px
Table cell padding: 12px 16px
Card padding: 24px
```

### Data Validation
Every screen must show:
1. **Last updated timestamp**
2. **Verification checksum** (totals match dashboard)
3. **Data completeness status** (X of Y holdings have complete data)
4. **Source clarity** (where data came from)

### Error States
```
Missing data: "—" (em dash)
Stale data: "⚠" icon + tooltip with date
Error: "Error loading data" + retry button
Empty: "No holdings in this category"
```

---

## Navigation Structure

```
Dashboard (overview only)
  │
  ├─> Portfolio Summary (/portfolio/summary)
  │     │
  │     ├─> Mutual Funds Holdings (/portfolio/mutualfunds)
  │     ├─> Equity Holdings (/portfolio/equity)
  │     ├─> Fixed Deposits Holdings (/portfolio/fixeddeposits)
  │     └─> Others Holdings (/portfolio/others)
  │
  └─> (Other dashboard sections)
```

### Breadcrumbs
```
Every holdings screen shows:
Dashboard > Portfolio Summary > [Asset Type] Holdings
```

---

## Export Functionality

### Download Options
1. **Excel (.xlsx)** - Full data with formatting
2. **CSV (.csv)** - Raw data, machine-readable
3. **PDF (.pdf)** - Statement format

### Export includes:
- All columns visible on screen
- Grouping maintained
- Totals and subtotals
- Timestamp and verification data
- Source attribution

---

## Mobile Considerations

### On mobile (<768px):
1. **Horizontal scroll** for tables (preserve all columns)
2. **Sticky first column** (instrument/scheme name)
3. **Collapsible rows** for details
4. **Filter shortcuts** at top

**Do NOT**:
- Hide columns
- Truncate important data
- Remove grouping options

---

## Trust Indicators

Every screen must have:

```
┌────────────────────────────────────────────────────────────────┐
│ ✓ Data verified • Last updated: Dec 25, 2024, 3:45 PM        │
│ ℹ All values computed from transaction history                │
│ ⚠ 2 holdings have incomplete data (view details)              │
└────────────────────────────────────────────────────────────────┘
```

### Verification Badge
If totals match dashboard:
```
✓ Totals verified against dashboard
```

If totals don't match:
```
⚠ Warning: Totals do not match dashboard
  Dashboard shows: ₹18,50,000
  This screen shows: ₹18,48,500
  Difference: ₹1,500 (0.08%)
```

---

## Implementation Priority

1. **Portfolio Summary Screen** (critical)
2. **Equity Holdings Screen** (most requested)
3. **Mutual Fund Holdings Screen** (most complex)
4. **Fixed Deposit Holdings Screen** (time-sensitive)

---

**Design Version**: Data Screens v1.0  
**Status**: Specification Complete  
**Next Step**: Implementation  

These screens prioritize **accuracy over aesthetics** and **clarity over creativity**.

