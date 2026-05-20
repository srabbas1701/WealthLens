# WealthLensAI - Claude Code Project Memory

## Phase Status
- **Phase 1: COMPLETE** — Launched & live as of March 2026
- **Phase 2: IN PROGRESS** — Target: end of March 2026

### Phase 1 — What Shipped
| Area | Features |
|------|----------|
| Portfolio | Equity, Mutual Funds, Gold, Fixed Deposits, NPS, PPF, EPF, Cash, Bonds, ETFs, Insurance, Real Estate |
| AI | Portfolio Copilot (chat), Daily/Weekly AI Summaries, Stock Analyst |
| Analytics | Health Score, Stability Score, Sector/Geography/Market-Cap/MF Exposure, Scenario Modelling |
| Payments | Razorpay subscription, Free/Pro/Premium plans, Capability-based access control, Trial system |
| Auth | Email + Phone OTP (MSG91), Session timeout |
| UX | Demo mode, Dark mode, Onboarding flow, Mobile-responsive layout |
| Infra | Supabase RLS on all tables, Vercel deployment, Market data cron jobs |

---

## Overview
Financial intelligence app: gold price tracking, mutual fund analysis
across 24 schemes (infrastructure, mid-cap, small-cap, healthcare,
manufacturing), and investment portfolio insights.

## Stack
Next.js (App Router) + Supabase PostgreSQL + Supabase Auth
Deployed on Vercel (frontend) + Supabase Cloud (backend)

## Development Info
- Framework      : Next.js (App Router)
- Local Port     : 5175
- Dev Command    : npm run dev  (defined as: next dev --port 5175)
- Built with     : Cursor + Claude (Anthropic)
- Original source: D:\3. AIGF Fellowship\Investment Portfolio\Cursor\investment-copilot

---

## Local Development
- Start : npm run dev
- URL   : http://localhost:5175
- Needs : .env.local with Supabase keys (see Environment Variables below)

## Domain Focus
- Gold price data ingestion and real-time display
- Mutual fund scheme tracking (24 schemes across multiple categories)
- Investment portfolio dashboard with AI-powered insights
- Supabase RLS policy hardening

## Key Conventions - Next.js
- App Router only (app/ directory) - no Pages Router
- Server Components by default for all data fetching
- Add use client only when strictly necessary (interactivity, browser APIs)
- TypeScript always - no `any` types
- Consistent API response shape: { data, error, status }
- No console.log in production code

## Key Conventions - Supabase
- RLS enabled on ALL tables without exception
- SUPABASE_SERVICE_ROLE_KEY: server-side only, never expose to client
- NEXT_PUBLIC_SUPABASE_ANON_KEY: client-side authenticated reads only
- All schema changes via numbered SQL migrations in:
  src\persistence\wealthlensai\migrations\

## Environment Variables
- NEXT_PUBLIC_SUPABASE_URL       (Client) Supabase project URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY  (Client) Public anon key
- SUPABASE_SERVICE_ROLE_KEY      (Server only) Admin key - never expose
- NEXT_PUBLIC_APP_URL            (Client) Deployed Vercel URL

## Deployment
- Local      : http://localhost:5175
- Production : Vercel (auto-deploy on main branch) + Supabase Cloud

## Watch Out For
- RLS policies must be added for every new table
- Supabase functions need explicit search_path to avoid security warnings
- Gold price API calls must be cached to avoid rate limits
- Service role key must stay strictly server-side

## Persistence Location
src\persistence\wealthlensai\
  migrations\   <- Numbered SQL files (001_create_gold_prices.sql, etc.)
  policies\     <- RLS policy definitions (one file per table)
  seeds\        <- Dev seed data

## Migrations — Two Directories (Important)
There are TWO migration directories in this project:
- `supabase/migrations/` — Supabase CLI format (used by `supabase db push`)
- `src/persistence/wealthlensai/migrations/` — Project-organized, numbered docs (33 files, source of truth for documentation)

When adding new schema changes, add to BOTH directories.

## Claude Code Instructions
- Check persistence\wealthlensai\migrations\ before any schema changes
- Never edit .env.local - only suggest variable names to add
- Run code-review skill before every PR
- Run release skill before every production deploy
