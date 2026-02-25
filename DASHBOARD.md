# Dashboard Screen Specification — Premium User

**Last Updated:** February 2026  
**Source:** `src/app/dashboard/page.tsx`  
**Access:** Authenticated users with a portfolio; users without portfolio are redirected to `/onboarding`.

---

## Overview

The Dashboard is the main portfolio view that answers three questions:

1. **"Am I okay?"** — Net worth, health score, allocation
2. **"What changed?"** — Performance, insights
3. **"Do I need to do anything?"** — Insights & alerts, quick actions

---

## Section Layout (Top to Bottom)

### 1. Header

| Element | Description |
|---------|-------------|
| Title | "Dashboard" |
| Greeting | Dynamic greeting + user name |
| Date range | "Last 12 months" |

---

### 2. Currency Unit Toggle (Mobile-first)

- **Location:** Below title on mobile (`md:hidden`); in AppHeader on desktop
- **Options:** Raw | Lacs | Crores
- **Hint:** "Tap to change units" (first visit)

---

### 3. Verification Banner

- Non-blocking verification prompt (e.g., phone/email verification)
- Shown when applicable via `VerificationBanner` component

---

### 4. Quick Actions — Manage Your Portfolio

Card with gradient background (emerald/blue).

**Primary actions:**
- **Upload Documents** — Opens portfolio upload modal (CAS, broker CSV/Excel)
- **Add Investments** — Link to `/portfolio/holdings/add`
- **Add Liability** — Link to `/liabilities` *(Pro+ capability: `manage_liabilities`)*; free users see upgrade prompt
- **Update Prices** — Fetches stock/ETF prices from Yahoo Finance; shows loading/success state

**Footer hints:**
- Upload: CAS statements, broker statements (CSV/Excel)
- Add: FD, EPF, PPF, NPS, Gold, Bonds, and more

---

### 5. Net Worth Hero

- **Label:** "Total Net Worth"
- **Formula:** `Net Worth = Assets (excluding Insurance) − Liabilities`
- **Value:** Large formatted number
- **Change:** Last 12 months change (amount + %) when available
- **Fallback:** `DataConsolidationMessage` when data is inconsistent

---

### 6. Portfolio Health Score Widget *(Pro+ capability: `view_advanced_analytics`)*

**Premium users see:**
- Circular progress ring (0–100)
- Total score with colour coding:
  - ≥70: Green (Excellent)
  - ≥55: Amber (Fair)
  - &lt;55: Red (Needs review)
- Grade label: Excellent structure | Well-balanced | Moderate health | High concentration risk
- Expandable breakdown of 7 pillars:
  - Asset Allocation
  - Concentration Risk
  - Diversification & Overlap
  - Market Cap Balance
  - Sector Balance
  - Geography Balance
  - Investment Quality
- Link: "View detailed analysis" → `/analytics/health`

**Free users:** Section is hidden.

---

### 7. Top-Level Bucket Cards

Grid of allocation buckets (links to `/portfolio/summary?bucket=<bucket>`):

| Bucket | Description |
|--------|-------------|
| Growth Assets | Stocks, equity MF, equity ETF |
| Income & Allocation | FD, EPF, PPF, NPS, Debt/Hybrid MF |
| Real Assets | Property, Land, REITs |
| Commodities | Gold, Silver |
| Cash & Liquidity | Savings, Liquid funds |

- Each card shows: bucket name, value, percentage
- **Percentages always sum to 100%** — display values are normalized so that when rounded to whole numbers they total exactly 100 (largest bucket absorbs any rounding remainder)
- Sorted by value descending (largest first)
- Category info tooltip on each bucket
- Real Asset card has "+ Add Real Estate" hint

---

### 8. Portfolio Allocation

- **Title:** "Portfolio Allocation"
- Interactive pie chart + legend (7 cols)
- Hover highlights corresponding segment and legend row
- Same allocation data as bucket cards; percentages in legend normalized to sum to 100%

---

### 9. Liabilities & Protection

**Section title:** "Liabilities & Protection"  
Subtitle: "Loans, EMIs, and insurance coverage that impact your financial safety."

#### Card 1: Liabilities
- Total Outstanding, Monthly EMI
- **Pro+:** "Manage Liabilities" → `/liabilities`
- **Free:** Upgrade prompt (Pro plan)

#### Card 2: Insurance
- Manage life, health, other policies
- **Pro+:** "View Insurance" → `/portfolio/insurance`
- **Free:** Upgrade prompt (Pro plan)

---

### 10. Net Worth Outlook (Next 12 Months)

- Projected net worth change over 12 months (based on liabilities/EMIs)
- Message varies:
  - Stable if no change
  - Improvement amount if loan repayments reduce debt
- Assumes no new investments or loans
- Link: "View details →" `/liabilities`

---

### 11. Performance Snapshot

- **Portfolio XIRR** — Calculated from holdings since portfolio creation/update
- Subtext: "Since [date] • All asset classes"
- Fallback: "Add holdings to calculate XIRR" or "Requires at least 30 days of data"

---

### 12. Insights & Alerts

- Up to 3 insights (expandable)
- Types: info, opportunity, warning
- If &gt;3 insights: `InsightsLimitBanner` with upsell
- Onboarding hint: "Portfolio insights are generated based on your holdings..."

---

### 13. View Advanced Analytics Link

- Button: "View Advanced Analytics" → `/analytics/overview`
- Subtext: "Explore exposure analytics: sector, market cap, and geography breakdowns"

---

### 14. Floating Copilot *(Premium capability: `use_ai_help`)*

- Floating AI chat button (top-right)
- Shown only when user has `use_ai_help` capability
- Supports `openHelp=true` URL param to open copilot from header help button
- Source: `"dashboard"`

---

## Premium vs Free — Capability Map

| Feature | Free | Pro | Premium |
|--------|------|-----|---------|
| Net Worth, Buckets, Allocation | ✅ | ✅ | ✅ |
| Portfolio Health Score | ❌ | ✅ | ✅ |
| Add Liability (direct link) | ❌ | ✅ | ✅ |
| Manage Liabilities (full) | ❌ | ✅ | ✅ |
| Manage Insurance | ❌ | ✅ | ✅ |
| Floating Copilot (AI Help) | ❌ | ❌ | ✅ |

---

## Data Sources

| Data | API/Source |
|------|------------|
| Portfolio metrics, holdings, allocation | `/api/portfolio/data` |
| Daily/weekly summaries | Same API (optimised response) |
| Portfolio health score | `fetchPortfolioHealthScore()` |
| Liabilities | `getLiabilities()` (localStorage) |
| Net worth timeline | `generateNetWorthTimeline()` |

---

## Caching & Performance

- **Client cache TTL:** 2 minutes
- **Health score:** Cached for session (until cache expires or user uploads)
- **Cache key:** User ID; cleared on upload success

---

## Related Pages

- `/portfolio/summary` — Bucket drill-down, All Investments
- `/analytics/health` — Full health score analysis
- `/analytics/overview` — Advanced analytics
- `/liabilities` — Liabilities management, Net Worth Outlook
- `/portfolio/insurance` — Insurance dashboard
- `/portfolio/holdings/add` — Add investments
