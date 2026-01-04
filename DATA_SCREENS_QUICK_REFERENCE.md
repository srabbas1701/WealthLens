# Data Screens - Quick Reference

## What Are These Screens?

These are **NOT** the dashboard. These are where users go to **verify and audit** their portfolio.

Think of them as:
- ❌ **NOT**: Marketing pages or pretty visualizations
- ✅ **YES**: Spreadsheet-like data tables, professional statements

---

## The 4 Screens Designed

### 1. **Portfolio Summary** (`/portfolio/summary`)
**Purpose**: Overview of all assets in one place

**What it shows**:
- Total portfolio value
- Total invested amount
- Total gains/losses
- Asset-wise breakdown (collapsible)
  - Mutual Funds
  - Equity
  - Fixed Deposits
  - Others

**Layout**: Expandable/collapsible sections, like an accordion

---

### 2. **Equity Holdings** (`/portfolio/equity`)
**Purpose**: Every stock you own, with full transparency

**Columns**:
1. Instrument Name (e.g., "Reliance Industries")
2. Quantity (e.g., 150 shares)
3. Avg Cost (₹2,450 per share)
4. Current Value (₹3,67,500)
5. Invested Value (₹3,67,500)
6. P&L (₹0 / 0%)
7. % of Portfolio (8.1%)

**Features**:
- Sort by any column
- Group by account (Zerodha, Groww, etc.)
- Group alphabetically
- Every row is clickable for details

---

### 3. **Mutual Fund Holdings** (`/portfolio/mutualfunds`)
**Purpose**: Every MF scheme you own, with XIRR

**Columns**:
1. Scheme Name (full name)
2. AMC (e.g., "HDFC MF")
3. Current Value
4. Invested Value
5. XIRR (annualized return %)
6. P&L (gain/loss)
7. % of Portfolio

**Features**:
- Sort by any column
- Group by AMC (fund house)
- Group by Category (Large Cap, Flexi Cap, etc.)
- XIRR calculated from transaction history

---

### 4. **Fixed Deposit Holdings** (`/portfolio/fixeddeposits`)
**Purpose**: Track FDs and maturity dates

**Columns**:
1. Bank/Institution
2. Principal Amount
3. Interest Rate
4. Start Date
5. Maturity Date
6. Current Value (principal + accrued interest)
7. Days Left

**Features**:
- Sort by maturity date
- Filter: "Maturing in 60 days"
- Alerts for upcoming maturities
- Shows accrued interest

---

## Key Design Principles

### 1. **Data Clarity**
- All numbers use tabular nums (line up perfectly)
- Right-aligned numbers
- Left-aligned text
- Consistent decimal places

### 2. **Trust-First**
- Every screen shows "Last updated" timestamp
- Totals verified against dashboard
- If data is incomplete, explicitly say so
- No assumptions or inferred data

### 3. **Spreadsheet-Like**
- Clean table layout
- Sortable columns
- Grouping options
- Export to Excel/CSV

### 4. **No Decoration**
- No charts
- No AI insights
- No visual fluff
- Just data

---

## What Makes These Different from Dashboard?

| Feature | Dashboard | Data Screens |
|---------|-----------|--------------|
| Purpose | Quick overview | Full audit |
| Charts | Yes | No |
| Tables | Summary only | Full detail |
| Insights | AI-generated | None |
| Data shown | Top 5 holdings | ALL holdings |
| Grouping | None | Multiple options |
| Sorting | None | Every column |
| Export | No | Yes (Excel/CSV/PDF) |

---

## User Journey

```
User opens app
  ↓
Sees Dashboard (quick overview)
  ↓
"Looks good, but let me verify..."
  ↓
Clicks on asset tile
  ↓
Lands on data-heavy screen (full holdings)
  ↓
Sorts, groups, verifies numbers
  ↓
"Yes, this is accurate" ✓
```

---

## Trust Indicators

Every screen shows:

```
✓ Data verified • Last updated: Dec 25, 2024, 3:45 PM
ℹ All values computed from transaction history
⚠ 2 holdings have incomplete data (view details)
```

If totals don't match dashboard:
```
⚠ Warning: Totals do not match dashboard
  Dashboard shows: ₹18,50,000
  This screen shows: ₹18,48,500
  Difference: ₹1,500 (0.08%)
```

---

## Example: Equity Holdings Table

```
┌──────────────────────────────────────────────────────────────┐
│ Instrument Name   Qty   Avg Cost  Current   P&L      % Port │
├──────────────────────────────────────────────────────────────┤
│ Reliance Ind      150   ₹2,450    ₹3,67,500 ₹0       8.1%  │
│ NSE: RELIANCE                               (0.00%)         │
│ Account: Zerodha                                            │
├──────────────────────────────────────────────────────────────┤
│ HDFC Bank         200   ₹1,580    ₹3,16,000 ₹0       7.0%  │
│ NSE: HDFCBANK                               (0.00%)         │
│ Account: Zerodha                                            │
├──────────────────────────────────────────────────────────────┤
│ TOTAL                           ₹12,80,000  ₹1,30,000      │
│                                            (+11.30%)        │
└──────────────────────────────────────────────────────────────┘

Verification: Total matches dashboard equity value ✓
```

---

## Color Palette (Same as Dashboard)

```
Text:       #0F172A (dark slate)
Muted:      #6B7280 (gray)
Positive:   #16A34A (green)
Negative:   #DC2626 (red)
Border:     #E5E7EB (light gray)
Background: #F6F8FB (neutral)
Card:       #FFFFFF (white)
```

---

## Typography Rules

```
Font: Inter (only)
Weights:
  - 400 (regular) for data
  - 500 (medium) for labels
  - 600 (semibold) for headers

Sizes:
  - Page title: 24px
  - Table headers: 14px
  - Table data: 14px
  - Subtext: 12px

Numbers:
  - Tabular nums (fixed width)
  - Right-aligned
  - Consistent decimals
```

---

## Export Options

Every screen has:
1. **Download button** → Choose format
2. **Excel (.xlsx)** → With formatting
3. **CSV (.csv)** → Raw data
4. **PDF (.pdf)** → Statement format

---

## Mobile Behavior

On mobile:
- ✅ Horizontal scroll (preserve ALL columns)
- ✅ Sticky first column
- ✅ Collapsible rows
- ❌ NO hiding columns
- ❌ NO truncating data

**Why?** Users need full data access, even on mobile.

---

## Implementation Status

- [x] Specification complete
- [x] Design documented
- [ ] Components to build
- [ ] API endpoints needed
- [ ] Testing required

---

## Next Steps

1. Review specification
2. Approve design approach
3. Begin implementation:
   - Start with Portfolio Summary
   - Then Equity Holdings
   - Then Mutual Funds
   - Finally FDs

---

**Key Takeaway**: These screens are about **trust, not marketing**. Every number must be verifiable. Every column must have a purpose. No decoration, just data.

