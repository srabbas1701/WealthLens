# WealthLens (investment-copilot)

> **Phase 1 — Live** | **Phase 2 — In Progress** (target: March 2026)

**Investment portfolio dashboard for Indian retail investors.**
Unified net worth, holdings by asset class, advanced analytics, real estate tracking, and an AI Portfolio Analyst (Copilot).

### What shipped in Phase 1
- **Portfolio modules**: Equity, Mutual Funds, Gold, FDs, NPS, PPF, EPF, Bonds, ETFs, Cash, Insurance, Real Estate
- **AI layer**: Copilot chat, daily/weekly summaries, stock analyst
- **Analytics**: Health score, stability, sector/geo/marketcap/MF exposure, scenario modelling
- **Monetisation**: Razorpay subscriptions, Free/Pro/Premium tiers, trials, capability-based feature gates
- **Auth**: Email + MSG91 phone OTP, session timeout
- **UX**: Demo mode, dark mode, mobile layout, onboarding flow

---

## Quick start

```bash
npm install
npm run dev
```

Open **[http://localhost:5175](http://localhost:5175)** (dev server runs on port 5175).

### First-time setup

1. **Supabase** — Create a project at [supabase.com](https://supabase.com), run `supabase/schema.sql` in the SQL Editor.
2. **Environment** — Add `.env.local` in the project root:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```
3. **Optional (AI Copilot)** — Add `OPENAI_API_KEY=sk-...` and `OPENAI_MODEL=gpt-4o-mini` for natural-language portfolio Q&A.

---

## Tech stack

- **Next.js 16** (App Router), **TypeScript**, **React 19**
- **Tailwind CSS 4**, **Radix UI** (shadcn-style components), **Lucide** icons
- **Supabase** (PostgreSQL, Auth, RLS)
- **OpenAI** (optional) for Portfolio Analyst

---

## Full documentation

**All project details** — architecture, routes, API, features, design system, and a full index of existing docs — are in:

**[PROJECT.md](./PROJECT.md)** — master project documentation

Use it for:

- Application structure and routes
- Environment variables and Supabase setup
- Features (dashboard, holdings, analytics, Copilot, real estate, auth, etc.)
- Design system and wireframes
- API reference and documentation index

---

## Scripts

| Command      | Description                |
|-------------|----------------------------|
| `npm run dev`   | Start dev server (port 5175) |
| `npm run build` | Production build            |
| `npm start`     | Start production server     |
| `npm run lint`  | Run ESLint                  |

---

## Testing

### Mobile Layout Tests (Playwright)

Visual regression and layout tests for mobile viewports (375px, 390px, 430px) to ensure:
- Header does not overflow horizontally
- Mobile menu icon is visible and clickable
- Net Worth card fits within viewport
- Currency segmented control renders cleanly

**Prerequisites:**
```bash
npm install --save-dev @playwright/test
npx playwright install
```

**Run tests:**
```bash
npx playwright test tests/mobile-layout.spec.ts
```

**Generate initial snapshots:**
```bash
npx playwright test tests/mobile-layout.spec.ts --update-snapshots
```

**View test results:**
```bash
npx playwright show-report
```

Tests verify:
- **Landing page** (logged out): Header, mobile menu sheet with marketing links
- **Dashboard page** (logged in): Header, Net Worth card, currency unit toggle

Snapshots are stored in `tests/mobile-layout.spec.ts-snapshots/` and will fail if layout regresses.

---

## License & usage

Private project. See terms and privacy in the app (`/terms`, `/privacy`).
