# WealthLens — Master Project Documentation

**Investment portfolio dashboard for Indian retail investors.**
Single source of truth for architecture, features, setup, and references.

---

## Phase Status

| Phase | Status | Date |
|-------|--------|------|
| **Phase 1** | ✅ COMPLETE — Live in production | March 2026 |
| **Phase 2** | 🚧 IN PROGRESS | Target: end of March 2026 |

### Phase 1 Feature Checklist (all ✅ Complete)
- ✅ Portfolio: Equity holdings (stocks, ETFs)
- ✅ Portfolio: Mutual Funds (24 schemes, NAV tracking)
- ✅ Portfolio: Gold (24k/22k, IBJA pricing)
- ✅ Portfolio: Fixed Deposits
- ✅ Portfolio: NPS, PPF, EPF
- ✅ Portfolio: Cash, Bonds
- ✅ Portfolio: Insurance policies
- ✅ Portfolio: Real Estate (with loans, rental cashflows, valuation)
- ✅ Portfolio: Liabilities tracking
- ✅ AI: Portfolio Copilot (natural language Q&A)
- ✅ AI: Daily & Weekly AI summaries
- ✅ AI: Stock Analyst
- ✅ Analytics: Portfolio Health Score
- ✅ Analytics: Stability Score
- ✅ Analytics: Sector, Geography, Market-Cap, MF exposure
- ✅ Analytics: Scenario modelling
- ✅ Payments: Razorpay subscription (Free/Pro/Premium)
- ✅ Payments: Capability-based feature gates
- ✅ Payments: Trial system
- ✅ Auth: Email + Phone OTP (MSG91)
- ✅ Auth: Session timeout
- ✅ UX: Demo mode
- ✅ UX: Dark mode
- ✅ UX: Onboarding flow
- ✅ UX: Mobile-responsive layout
- ✅ Infra: RLS on all tables, Vercel deployment, market data cron jobs

---

## Performance Hardening Update (May 2026)

Status: ✅ Completed (safe rollout, no navigation/flow changes)

### Scope completed

- ✅ `src/app/api/portfolio/upload/route.ts`
  - High-volume parsing logs gated to dev-only.
- ✅ `src/app/api/portfolio/upload/confirm/route.ts`
  - Removed redundant asset re-read in merge path.
  - Added active MF scheme cache.
  - Added request-scoped asset lookup cache (ISIN/symbol/name).
  - Added precomputed normalized scheme fields + cached ILIKE fallback.
  - Gated non-critical warnings/logs to dev-only.
- ✅ `src/hooks/useSubscription.ts`
  - Removed duplicate entitlements fetch by using shared capabilities state.
- ✅ `src/app/api/mf/schemes/list/route.ts`
  - Standardized cache headers across successful lookup responses.
- ✅ `src/app/portfolio/mutualfunds/page.tsx`
  - Deduplicated repeated holdings transform logic.
- ✅ `src/app/api/portfolio/data/route.ts`
  - Added additive opt-in `mode=lite` fast path (default behavior unchanged).
- ✅ `src/app/portfolio/cash/page.tsx`
  - Lite-first fetch with automatic fallback to full mode.
- ✅ `src/app/portfolio/fixeddeposits/page.tsx`
  - Lite-first fetch with automatic fallback to full mode.
- ✅ `src/app/portfolio/bonds/page.tsx`
  - Lite-first fetch with automatic fallback to full mode.

### Safety checks completed

- ✅ Lint checks passed on all touched files.
- ✅ Existing default `/api/portfolio/data` path remains unchanged.
- ✅ Lite mode is additive and opt-in only.
- ✅ Onboarding deep-link behavior (`?add=1`, `from=onboarding`) untouched.
- ✅ No routing/back-button flow modifications in this optimization batch.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Getting Started](#3-getting-started)
4. [Environment & Configuration](#4-environment--configuration)
5. [Application Structure](#5-application-structure)
6. [Features & Modules](#6-features--modules)
7. [Design System](#7-design-system)
8. [Data & Backend](#8-data--backend)
9. [API Reference](#9-api-reference)
10. [Documentation Index](#10-documentation-index)

---

## 1. Project Overview

### What It Is

**WealthLens** (product name; repo: `investment-copilot`) is a full-stack investment portfolio dashboard built for **Indian retail investors**. It provides:

- **Unified net worth** across asset classes (equity, mutual funds, fixed deposits, NPS, PPF, EPF, gold, bonds, ETFs, cash, real estate, insurance, liabilities).
- **Holdings screens** per asset with CRUD, sorting, grouping, and verification-oriented data tables.
- **Advanced analytics** for exposure (sector, geography, market cap, MF breakdown, health, stability, scenarios).
- **AI-powered Portfolio Analyst** (Copilot) for natural-language questions over portfolio data, with guardrails.
- **Real estate** tracking: properties, loans, cashflows, valuations, XIRR, sell-vs-hold simulation.
- **Dark mode**, responsive layout, and a consistent design system.

### Brand

- **Product name:** WealthLens (rebranded from WealthLensAI).
- **Positioning:** Finance-first; AI is a capability, not the product name.
- **Design:** Calm, premium, data-first, professional (no gradients/glassmorphism).

### Key Principles

- **Data screens = truth:** Numbers are verifiable; columns have clear purpose.
- **Ownership vs exposure:** Dashboard shows what you *own*; analytics show what you’re *exposed to* (e.g. equity inside MFs).
- **Compliance:** Copilot uses guardrails (no investment advice).

---

## 2. Tech Stack

| Layer        | Technology |
|-------------|------------|
| **Framework** | Next.js 16 (App Router) |
| **Language**  | TypeScript 5 |
| **UI**        | React 19, Tailwind CSS 4, Radix UI (via shadcn-style components) |
| **Icons**     | Lucide React |
| **Backend / DB** | Supabase (PostgreSQL, Auth, RLS) |
| **AI**        | OpenAI (GPT-4o-mini default) for Copilot |
| **Deploy**    | Netlify (Next.js plugin) |
| **Other**     | TanStack Virtual (lists), jspdf/xlsx (export), xirr for returns |

### Main Dependencies

- `@supabase/ssr`, `@supabase/supabase-js` — Supabase client and SSR
- `openai` — Copilot
- `@tanstack/react-virtual` — Virtualized holdings lists
- `jspdf`, `xlsx` — PDF/Excel export
- `class-variance-authority`, `clsx`, `tailwind-merge` — Styling utilities

---

## 3. Getting Started

### Prerequisites

- Node.js 20+
- npm (or yarn/pnpm/bun)
- Supabase project (see [Supabase Setup](#supabase))
- Optional: OpenAI API key for AI Copilot

### Commands

```bash
# Install
npm install

# Development (port 5175)
npm run dev

# Build
npm run build

# Start production
npm start

# Lint
npm run lint
```

**Dev URL:** [http://localhost:5175](http://localhost:5175) (not 3000).

### First-Time Setup Order

1. Clone repo and `npm install`.
2. Create Supabase project and run schema (see [Environment & Configuration](#4-environment--configuration) and [Data & Backend](#8-data--backend)).
3. Add `.env.local` with Supabase (and optional OpenAI) variables.
4. Run `npm run dev` and open the app; sign up / log in.

---

## 4. Environment & Configuration

### Required (Supabase)

Create `.env.local` in project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

- **Project URL** and **anon key:** Supabase Dashboard → Settings → API.
- **Service role key:** Same page; keep secret (server-only).

### Optional (AI Copilot)

```env
OPENAI_API_KEY=sk-your-api-key-here
OPENAI_MODEL=gpt-4o-mini
```

Without these, the Copilot falls back to template-based responses.

### Other (as needed)

- **Phone/SMS auth:** See `MSG91_PHONE_AUTH_DOCUMENTATION.md` for MSG91/widget env vars.
- **Payments (e.g. Razorpay):** `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `NEXT_PUBLIC_APP_URL`.
- **Stock data:** `STOCK_API_KEY` if using an external price API.

Never commit `.env.local` or real keys.

---

## 5. Application Structure

### High-Level Layout

```
investment-copilot/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/                # API routes
│   │   ├── dashboard/          # Main dashboard
│   │   ├── portfolio/          # Holdings & asset pages
│   │   ├── analytics/          # Exposure & analytics
│   │   ├── auth/, login/, signup/, onboarding/
│   │   ├── account/, about/, privacy/, terms/, security/, roadmap/
│   │   ├── liabilities/
│   │   ├── demo/               # Demo portfolio flows
│   │   └── layout.tsx, globals.css, page.tsx
│   ├── components/             # React components
│   │   ├── ui/                 # Base UI (button, card, input, etc.)
│   │   ├── analytics/          # Analytics-specific
│   │   ├── real-estate/        # Real estate modals & UI
│   │   └── ...                 # AppHeader, FloatingCopilot, modals, etc.
│   ├── lib/                    # Core logic & clients
│   │   ├── supabase/           # Supabase client (browser/server/middleware)
│   │   ├── auth/               # Auth context, logout
│   │   ├── portfolio-intelligence/  # Health, stability, scenarios, exposure
│   │   ├── real-estate/        # Create/update asset, cashflow, loan, valuation
│   │   ├── db/                 # DB helpers (e.g. copilot context)
│   │   └── ...                 # xirr, currency, PDF, etc.
│   ├── services/               # Real estate, gold, analytics services
│   ├── analytics/              # Mappers & engines (real estate, net worth)
│   ├── hooks/                  # useSessionTimeout, useSubscription, etc.
│   ├── contexts/               # CopilotContext
│   ├── types/                  # TypeScript types (DB, copilot, real estate, etc.)
│   ├── constants/              # Copy, banks, gold ETFs, risk colors
│   ├── utils/                  # Helpers
│   ├── middleware.ts           # Auth middleware
│   └── data/                   # Demo portfolio data
├── supabase/
│   ├── schema.sql              # Main schema
│   ├── migrations/             # SQL migrations
│   ├── seed.sql
│   └── SETUP.md
├── ai/                         # Python AI copilot (guardrails, tests)
├── public/
└── PROJECT.md                  # This file
```

### Routes (App Router)

| Path | Purpose |
|------|--------|
| `/` | Landing |
| `/login`, `/signup` | Auth |
| `/onboarding` | Onboarding |
| `/dashboard` | Main dashboard (net worth, tiles, allocation, insights) |
| `/portfolio/summary` | Portfolio summary |
| `/portfolio/equity`, `/portfolio/stocks` | Equity/stock holdings |
| `/portfolio/mutualfunds` | Mutual funds |
| `/portfolio/fixeddeposits` | Fixed deposits |
| `/portfolio/etfs` | ETFs |
| `/portfolio/bonds` | Bonds |
| `/portfolio/nps` | NPS |
| `/portfolio/ppf` | PPF |
| `/portfolio/epf` | EPF |
| `/portfolio/gold` | Gold |
| `/portfolio/cash` | Cash |
| `/portfolio/real-estate` | Real estate list |
| `/portfolio/real-estate/[propertyId]` | Property detail (XIRR, sell/hold, edit) |
| `/portfolio/insurance` | Insurance list |
| `/portfolio/insurance/add`, `/portfolio/insurance/[id]` | Add/edit insurance |
| `/portfolio/upload` | Bulk upload |
| `/liabilities` | Liabilities |
| `/analytics/overview` | Analytics overview |
| `/analytics/mutualfund-exposure`, `/analytics/sector-exposure`, etc. | Exposure analytics |
| `/analytics/health`, `/analytics/stability`, `/analytics/scenarios` | Health, stability, scenarios |
| `/account` | Account/settings |
| `/about`, `/privacy`, `/terms`, `/security`, `/roadmap` | Static/info |
| `/demo/*` | Demo portfolio flows |

### API Routes (under `/api`)

Grouped by domain:

- **Auth:** `auth/check-duplicate`, `auth/phone-login`, `auth/verify-email`, `auth/verify-phone`, `auth/verify-phone-otp`
- **Copilot:** `copilot/query`, `copilot/summary`, `copilot/daily-summary`, `copilot/weekly-summary`
- **Portfolio:** `portfolio/data`, `portfolio/health-score`, `portfolio/stability-analytics`, `portfolio/upload`, `portfolio/upload/confirm`
- **MF:** `mf/create`, `mf/update`, `mf/delete/[id]`, `mf/navs/update`, `mf/schemes/list`, `mf/schemes/update`, `mf/isin/backfill`
- **Stocks:** `stocks/create`, `stocks/update`, `stocks/delete/[id]`, `stocks/prices/update`, `stocks/search`
- **ETF:** `etf/create`, `etf/update`, `etf/delete/[id]`, `etf/nav`
- **Fixed deposits:** `fixed-deposits`
- **Bonds:** `bonds/delete/[id]`
- **NPS:** `nps/holdings`, `nps/update-navs`
- **PPF:** `ppf/holdings`
- **EPF:** `epf/holdings`
- **Gold:** `gold/holdings`, `gold/prices/update`
- **Real estate:** `real-estate/assets`, `real-estate/assets/[id]`, `real-estate/assets/[id]/valuation`, `real-estate/assets/[id]/cashflow`, `real-estate/assets/[id]/loan`, `real-estate/cashflows/[id]`, `real-estate/loans/[id]`, `real-estate/valuation/update-quarterly`
- **Manual investments:** `investments/manual`
- **Onboarding:** `onboarding/understanding`
- **System:** `system/market-data/status`
- **Analytics:** `analytics/web-vitals`
- **Admin:** `admin/fix-user-auth`, `admin/mf/metadata-stats`

---

## 6. Features & Modules

### 6.1 Dashboard

- **Hero net worth** (total portfolio value, change over period).
- **Asset tiles:** Mutual Funds, Equity, Fixed Deposits, Others (and equivalents) with value and % allocation; click-through to holdings.
- **Portfolio allocation** (e.g. donut + breakdown).
- **Performance:** e.g. portfolio XIRR.
- **Insights & alerts** (e.g. FD maturing, concentration, risk alignment).
- **Header:** Date range, currency, theme toggle, Copilot entry.

Ref: `WIREFRAME_LAYOUT.md`, `DESIGN_SYSTEM.md`.

### 6.2 Holdings (Data Screens)

- **Summary:** `/portfolio/summary` — totals, asset-wise breakdown, expand/collapse, export.
- **Per-asset screens:** Equity, MF, FD, ETFs, Bonds, NPS, PPF, EPF, Gold, Cash, Real estate, Insurance.
- **Design:** Data-first tables, sortable/groupable, verification-focused, consistent typography (tabular numbers, alignment).
- **CRUD:** Add/Edit/Delete per asset type; modals and inline where specified.

Ref: `DATA_SCREENS_SPECIFICATION.md`, `DATA_HOLDINGS_QUICK_REFERENCE.md`, `DATA_SCREENS_QUICK_REFERENCE.md`.

### 6.3 Advanced Analytics

- **Ownership vs exposure:** Dashboard = ownership; analytics = exposure (e.g. equity/debt inside MFs).
- **Screens:** Overview, Mutual Fund Exposure, Sector Exposure, Market Cap Exposure, Geography Exposure, Health, Stability, Scenarios.
- **Concepts:** Focus areas, health score, stability, scenario analysis.

Ref: `ADVANCED_ANALYTICS_SPECIFICATION.md`, `ADVANCED_ANALYTICS_QUICK_REFERENCE.md`, `ADVANCED_ANALYTICS_IMPLEMENTATION_COMPLETE.md`.

### 6.4 AI Copilot (Portfolio Analyst)

- **Role:** Answer natural-language questions about the user’s portfolio (holdings, allocation, risk, goals).
- **Backend:** OpenAI (e.g. GPT-4o-mini); uses portfolio context; guardrails to avoid investment advice.
- **Fallback:** Template-based responses when OpenAI is not configured or on error.
- **UI:** Floating “Get Help” / “Portfolio Analyst” entry; query and summary APIs.

Ref: `AI_COPILOT_SETUP.md`, `AI_COPILOT_IMPLEMENTATION_COMPLETE.md`, `AI_EXPERIENCE_LAYER_SPECIFICATION.md`. Python guardrails: `ai/copilot/`.

### 6.5 Real Estate

- **List:** Properties with key metrics.
- **Detail:** Per-property page: overview, valuation, loans, cashflows, XIRR (appreciation), **Sell vs Hold** simulation (up to 50 years, assumptions persisted).
- **CRUD:** Add/Edit property (multi-step); add/edit loans, rental/cashflow, valuation updates.
- **Valuation:** Manual or periodic (e.g. quarterly); triggers and service logic.
- **Export:** Real estate data export.

Ref: `REAL_ESTATE_QUICK_START.md`, `REAL_ESTATE_IMPLEMENTATION_GUIDE.md`, `REAL_ESTATE_API_REFERENCE.md`, `PROPERTY_VALUATION_EXPLAINED.md`, `REAL_ESTATE_XIRR_EXPLANATION.md`, and other `REAL_ESTATE_*.md` docs.

### 6.6 Insurance

- List, add, edit; types and coverage tracking.  
Ref: `INSURANCE_IMPLEMENTATION_SUMMARY.md`, `INSURANCE_USER_FLOW_GUIDE.md`.

### 6.7 Liabilities

- Liabilities view and add-edit (e.g. `AddLiabilityModal`).  
Ref: Liabilities-related docs.

### 6.8 Auth & Onboarding

- **Auth:** Email/password and phone OTP (Supabase Auth); optional MSG91 for SMS.
- **Onboarding:** Understanding step, checklist, optional snapshots.
- **Session:** Timeout and logout handling; unified logout.

Ref: `supabase/SETUP.md`, `AUTH_FIX_GUIDE.md`, `MSG91_PHONE_AUTH_DOCUMENTATION.md`, `UNIFIED_LOGOUT_IMPLEMENTATION.md`.

### 6.9 Premium / Upsell

- Gated features, upsell moments, query limits, premium download.  
Ref: `UPSELL_MOMENTS_GUIDE.md`, `PRICING_STRATEGY.md`, `PremiumFeatureGate`, `PremiumUpsell`.

### 6.10 Export & PDF

- Portfolio/holdings export (Excel, PDF); real estate export.  
Ref: `src/lib/pdf/`, `src/exports/realEstate.export.ts`.

---

## 7. Design System

- **Colors:** Wealth Blue primary (`#0F3B5F`); light backgrounds; semantic success/warning/destructive.
- **Typography:** Inter; tabular numbers for finance; clear hierarchy (hero numbers, headings, body, caption).
- **Layout:** Tile-based dashboard; max width 1280px; 12-column grid; consistent padding/gaps.
- **Components:** Cards, primary/secondary/tile buttons, status badges, progress bars; minimal shadows, no gradients/glassmorphism.
- **Dark mode:** Supported; theme toggle; color mapping and standards documented.
- **Accessibility:** Contrast, focus states, semantic HTML, reduced motion where applicable.

Ref: `DESIGN_SYSTEM.md`, `DARK_MODE_STANDARDS.md`, `DARK_MODE_COLOR_MAPPING.md`, `WIREFRAME_LAYOUT.md`.

---

## 8. Data & Backend

### Supabase

- **Schema:** `supabase/schema.sql` (tables, RLS, triggers). Apply via Supabase SQL Editor or migrations.
- **Core entities:** `auth.users` → `public.users` → `portfolios` → holdings and assets; `portfolio_metrics`, `portfolio_insights`, `market_context`, `copilot_sessions`, etc.
- **RLS:** Per-user data access; service role for admin/backend jobs.
- **Migrations:** `supabase/migrations/` for incremental changes.

Ref: `supabase/SETUP.md`, `SUPABASE_TYPES_GENERATION.md`.

### Regenerating Types

After schema changes:

```bash
supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/database.ts
```

### Key Client Usage

- **Browser:** `src/lib/supabase/client.ts`
- **Server:** `src/lib/supabase/server.ts`
- **Middleware:** `src/lib/supabase/middleware.ts`

---

## 9. API Reference

- **Copilot:** `POST /api/copilot/query` (body: user message + context).
- **Portfolio data:** `GET /api/portfolio/data` (aggregated portfolio for dashboard/copilot).
- **Real estate:** See `REAL_ESTATE_API_REFERENCE.md` for assets, valuation, cashflows, loans.
- **MF/Stocks/ETF/FD/Bonds/NPS/PPF/EPF/Gold:** Create/update/delete and specialty endpoints under `src/app/api/`.

All API routes live under `src/app/api/`; use middleware and RLS for auth.

---

## 10. Documentation Index

Below is a grouped index of current `.md` files for quick reference. Use this master doc as the entry point; then open the specific doc when needed.

**Note:** Older implementation summaries and fix docs have been moved to `archive/` for reference.

### Core product & design

| Document | Description |
|----------|-------------|
| `PROJECT.md` | **This file** — master project doc |
| `README.md` | Quick start and link to PROJECT.md |
| `WEALTHLENS_REBRANDING_COMPLETE.md` | Rebrand to WealthLens |
| `EQUITY_HOLDINGS_DESIGN.md` | Equity holdings design |

### Analytics

| Document | Description |
|----------|-------------|
| `ADVANCED_ANALYTICS_IMPLEMENTATION_COMPLETE.md` | Implementation summary |

### AI Copilot

| Document | Description |
|----------|-------------|
| `AI_EXPERIENCE_LAYER_SPECIFICATION.md` | AI UX spec |
| `AI_EXPERIENCE_LAYER_QUICK_REFERENCE.md` | Quick ref |
| `AI_EXPERIENCE_LAYER_VISUAL_GUIDE.md` | Visual guide |

### Real estate

| Document | Description |
|----------|-------------|
| `REAL_ESTATE_QUICK_START.md` | Quick start |
| `REAL_ESTATE_IMPLEMENTATION_GUIDE.md` | Implementation guide |
| `REAL_ESTATE_API_REFERENCE.md` | API reference |
| `PROPERTY_VALUATION_EXPLAINED.md` | Valuation explained |
| `REAL_ESTATE_XIRR_EXPLANATION.md` | XIRR for real estate |
| `QUICK_PROPERTY_VALUE_GUIDE.md` | Property value guide |

### Auth & Supabase

| Document | Description |
|----------|-------------|
| `supabase/SETUP.md` | Supabase project and schema setup |
| `MSG91_PHONE_AUTH_DOCUMENTATION.md` | Phone/SMS auth (MSG91) |

### Holdings & asset-specific

| Document | Description |
|----------|-------------|
| `NPS_QUICK_REFERENCE.md` | NPS quick reference |
| `INSURANCE_IMPLEMENTATION_SUMMARY.md`, `INSURANCE_QUICK_REFERENCE.md`, `INSURANCE_USER_FLOW_GUIDE.md` | Insurance |
| `MANUAL_INVESTMENTS_GUIDE.md`, `MANUAL_INVESTMENTS_QUICK_REFERENCE.md` | Manual investments |

### UI, UX & errors

| Document | Description |
|----------|-------------|
| `DARK_MODE_STANDARDS.md`, `DARK_MODE_COLOR_MAPPING.md` | Dark mode |
| `ERROR_STATES_AND_FALLBACKS_SPECIFICATION.md` | Error states spec |
| `ERROR_STATES_QUICK_REFERENCE.md`, `ERROR_STATES_VISUAL_GUIDE.md` | Error refs |
| `UPSELL_MOMENTS_GUIDE.md` | Upsell and premium |

### Other

| Document | Description |
|----------|-------------|
| `CAPABILITY_BASED_ACCESS_CONTROL.md` | Capability-based access |
| `ASSET_CLASSIFICATION_QUICK_REFERENCE.md`, `ASSET_CLASSIFICATION_IMPLEMENTATION.md` | Asset classification |
| `NOTIFICATION_SYSTEM.md` | Notifications |
| `PRICING_STRATEGY.md`, `PRICING_IMPLEMENTATION_GUIDE.md` | Pricing |
| `NET_WORTH_AGGREGATOR_USAGE.md` | Net worth aggregation |
| `MF_ISIN_BACKFILL_README.md` | MF ISIN backfill |
| `archive/` | Archived implementation docs and fix summaries |

---

**Document version:** 1.0  
**Last updated:** May 2026  
**Maintained as:** Single master reference for the WealthLens (investment-copilot) project.
