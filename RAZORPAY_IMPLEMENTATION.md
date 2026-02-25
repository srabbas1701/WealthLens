# LensOnWealth — Razorpay Implementation Guide

**Version:** 2.0  
**Last Updated:** February 2026  
**Stack:** Next.js 14 · TypeScript · Supabase · Razorpay Subscriptions v2

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Environment Variables & Secret Keys](#2-environment-variables--secret-keys)
3. [Database Schema & Migrations](#3-database-schema--migrations)
4. [Subscription Plans Setup](#4-subscription-plans-setup)
5. [Payment Flow — End to End](#5-payment-flow--end-to-end)
6. [API Endpoints](#6-api-endpoints)
7. [Webhook Handler](#7-webhook-handler)
8. [Upgrade & Plan Change Logic](#8-upgrade--plan-change-logic)
9. [Frontend — Pricing Page](#9-frontend--pricing-page)
10. [Frontend — Upgrade Page](#10-frontend--upgrade-page)
11. [Entitlements & Access Control](#11-entitlements--access-control)
12. [Performance Optimizations](#12-performance-optimizations)
13. [Known Constraints & Edge Cases](#13-known-constraints--edge-cases)
14. [Testing Checklist](#14-testing-checklist)

---

## 1. Architecture Overview

### Design Principles

```
RULE 1: Webhook is the ONLY source of truth for subscription activation.
RULE 2: create-subscription NEVER overwrites an active subscription's tier or status.
RULE 3: Closing Razorpay checkout without paying = zero DB change to active plan.
RULE 4: Upgrades use pending_* columns — promoted to active only after payment confirmed.
RULE 5: Downgrades are blocked entirely at API level.
```

### System Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    SUBSCRIPTION SYSTEM                          │
└─────────────────────────────────────────────────────────────────┘

NEW SUBSCRIBER:
User → /upgrade → create-subscription API
  → Razorpay subscription created
  → DB: upsert { status: 'pending', tier: 'pro' }
  → Razorpay checkout opens
  → User pays
  → Webhook fires → DB: { status: 'active', current_period_end }
  → User redirected to dashboard ✓

UPGRADING USER (e.g. Pro Monthly → Premium):
User → /upgrade → create-subscription API
  → Razorpay subscription created
  → DB: update ONLY { pending_tier, pending_billing_cycle, pending_razorpay_subscription_id }
  → Active row (tier=pro, status=active) UNTOUCHED
  → Razorpay checkout opens
  → User CLOSES without paying → NOTHING changes → Pro still active ✓
  → User pays → Webhook fires
  → DB: promote pending_tier → tier, clear pending_* columns
  → subscription_history row inserted ✓
```

### Key Files

| File | Purpose |
|------|---------|
| `/api/payments/create-subscription/route.ts` | Creates Razorpay subscription, stores pending intent |
| `/api/payments/webhook/route.ts` | Activates subscriptions after confirmed payment |
| `/api/plans/route.ts` | Returns all available plans (public, no auth) |
| `/api/plans/user/route.ts` | Returns current user's subscription (auth required) |
| `/api/entitlements/route.ts` | Returns feature capabilities for current user |
| `/app/upgrade/page.tsx` | Upgrade/payment UI page |
| `/components/home/PricingSection.tsx` | Homepage pricing cards with plan-aware states |
| `/hooks/usePlans.ts` | Fetches plans + current subscription for UI |
| `/hooks/useCapabilities.ts` | Cached entitlements hook with 5-minute TTL |

---

## 2. Environment Variables & Secret Keys

### `.env.local` (Development)

```bash
# ─── Supabase ───────────────────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...            # Public anon key (safe to expose)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...                 # Secret — NEVER expose to client

# ─── Razorpay ───────────────────────────────────────────────────
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx               # Test: rzp_test_ / Live: rzp_live_
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx         # Secret — server only, never expose
RAZORPAY_WEBHOOK_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx     # Set in Razorpay Dashboard → Webhooks

# ─── Razorpay Plan IDs ──────────────────────────────────────────
# Create these in Razorpay Dashboard → Subscriptions → Plans
RAZORPAY_PRO_MONTHLY_PLAN=plan_xxxxxxxxxxxx
RAZORPAY_PRO_ANNUAL_PLAN=plan_xxxxxxxxxxxx
RAZORPAY_PREMIUM_MONTHLY_PLAN=plan_xxxxxxxxxxxx
RAZORPAY_PREMIUM_ANNUAL_PLAN=plan_xxxxxxxxxxxx

# ─── App ────────────────────────────────────────────────────────
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Vercel Production Environment Variables

Set these in Vercel Dashboard → Project → Settings → Environment Variables:

```
NEXT_PUBLIC_SUPABASE_URL          → Production value
NEXT_PUBLIC_SUPABASE_ANON_KEY     → Production value
SUPABASE_SERVICE_ROLE_KEY         → Production value (mark as Secret)
RAZORPAY_KEY_ID                   → rzp_live_xxxx (Production value)
RAZORPAY_KEY_SECRET               → Production value (mark as Secret)
RAZORPAY_WEBHOOK_SECRET           → Production value (mark as Secret)
RAZORPAY_PRO_MONTHLY_PLAN         → Live plan ID
RAZORPAY_PRO_ANNUAL_PLAN          → Live plan ID
RAZORPAY_PREMIUM_MONTHLY_PLAN     → Live plan ID
RAZORPAY_PREMIUM_ANNUAL_PLAN      → Live plan ID
NEXT_PUBLIC_APP_URL               → https://lensonwealth.com
```

### Razorpay Dashboard Setup

1. **Create Plans** (Dashboard → Subscriptions → Plans):
   - Pro Monthly: ₹199/month, `period: monthly, interval: 1`
   - Pro Annual: ₹1,552/year, `period: yearly, interval: 1`
   - Premium Monthly: ₹499/month, `period: monthly, interval: 1`
   - Premium Annual: ₹3,892/year, `period: yearly, interval: 1`

2. **Configure Webhook** (Dashboard → Settings → Webhooks):
   - URL: `https://lensonwealth.com/api/payments/webhook`
   - Secret: same value as `RAZORPAY_WEBHOOK_SECRET` in env
   - Events to enable:
     - `subscription.authenticated`
     - `subscription.charged`
     - `subscription.completed`
     - `subscription.updated`
     - `subscription.halted`

3. **Note on ICICI UPI:** ICICI Bank UPI Autopay has NPCI approval delays (2-4 weeks per activation). Users on ICICI Bank should use Google Pay, PhonePe (non-ICICI account), Netbanking, or Card instead.

---

## 3. Database Schema & Migrations

### `plans` Table

```sql
-- Reference table for all available subscription plans
CREATE TABLE plans (
  id TEXT PRIMARY KEY,                    -- 'free', 'pro', 'premium'
  name TEXT NOT NULL,                     -- Display name
  monthly_price NUMERIC,                  -- INR per month (null for free)
  annual_price NUMERIC,                   -- INR per year (null for free)
  razorpay_plan_id TEXT,                  -- Razorpay plan ID (monthly)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed data
INSERT INTO plans (id, name, monthly_price, annual_price) VALUES
  ('free',    'Free',    0,   null),
  ('pro',     'Pro',     199, 1552),
  ('premium', 'Premium', 499, 3892);
```

### `user_subscriptions` Table

```sql
-- One row per user (PRIMARY KEY = user_id)
CREATE TABLE user_subscriptions (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tier TEXT REFERENCES plans(id),           -- Current active tier
  status TEXT DEFAULT 'inactive',           -- active | pending | cancelled | halted | inactive
  started_at TIMESTAMPTZ DEFAULT NOW(),
  billing_cycle TEXT,                       -- monthly | yearly
  current_period_end TIMESTAMPTZ,
  razorpay_subscription_id TEXT,            -- Active Razorpay sub ID
  payment_provider TEXT DEFAULT 'razorpay',
  updated_at TIMESTAMPTZ WITH TIME ZONE DEFAULT NOW(),

  -- Pending upgrade columns (safe upgrade architecture)
  -- These store INTENT only — never affect active plan access
  pending_tier TEXT,                        -- Target tier when upgrade pending
  pending_billing_cycle TEXT,               -- Target billing cycle when upgrade pending
  pending_razorpay_subscription_id TEXT,    -- Razorpay sub ID for pending upgrade

  -- Constraints
  CONSTRAINT user_subscriptions_billing_cycle_check
    CHECK (billing_cycle = ANY (ARRAY['monthly'::text, 'yearly'::text, 'annual'::text]))
);
```

### `subscription_history` Table

```sql
-- Audit trail — every plan change recorded here
CREATE TABLE subscription_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event TEXT NOT NULL,                      -- created | activated | upgraded | cancelled | halted
  from_tier TEXT,
  to_tier TEXT,
  from_billing_cycle TEXT,
  to_billing_cycle TEXT,
  razorpay_subscription_id TEXT,
  occurred_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_subscription_history_user_id ON subscription_history(user_id);
```

### Full Migration Script (Run in Order)

```sql
-- Step 1: Add pending upgrade columns
ALTER TABLE user_subscriptions
  ADD COLUMN IF NOT EXISTS pending_tier TEXT;

ALTER TABLE user_subscriptions
  ADD COLUMN IF NOT EXISTS pending_billing_cycle TEXT;

ALTER TABLE user_subscriptions
  ADD COLUMN IF NOT EXISTS pending_razorpay_subscription_id TEXT;

-- Step 2: Fix billing_cycle CHECK constraint to accept 'annual'
ALTER TABLE user_subscriptions
  DROP CONSTRAINT IF EXISTS user_subscriptions_billing_cycle_check;

ALTER TABLE user_subscriptions
  ADD CONSTRAINT user_subscriptions_billing_cycle_check
  CHECK (billing_cycle = ANY (ARRAY['monthly'::text, 'yearly'::text, 'annual'::text]));

-- Step 3: Create history table
CREATE TABLE IF NOT EXISTS subscription_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event TEXT NOT NULL,
  from_tier TEXT,
  to_tier TEXT,
  from_billing_cycle TEXT,
  to_billing_cycle TEXT,
  razorpay_subscription_id TEXT,
  occurred_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscription_history_user_id
  ON subscription_history(user_id);
```

### Useful Diagnostic Queries

```sql
-- Check a user's current subscription (by phone)
SELECT us.user_id, us.tier, us.status, us.billing_cycle,
       us.current_period_end, us.razorpay_subscription_id,
       us.pending_tier, us.pending_razorpay_subscription_id
FROM user_subscriptions us
JOIN auth.users au ON au.id = us.user_id
WHERE au.phone = '919810155042';

-- Manually restore a subscription to active (emergency fix)
UPDATE user_subscriptions
SET status = 'active', tier = 'pro'
WHERE user_id = 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx';

-- View upgrade history for a user
SELECT event, from_tier, to_tier, from_billing_cycle,
       to_billing_cycle, occurred_at
FROM subscription_history
WHERE user_id = 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
ORDER BY occurred_at DESC;

-- Count users by plan
SELECT tier, status, COUNT(*) 
FROM user_subscriptions 
GROUP BY tier, status;
```

---

## 4. Subscription Plans Setup

### Plan Hierarchy

```
free (rank 0) → pro (rank 1) → premium (rank 2)

Rules:
- Users can only move UP (free→pro, free→premium, pro→premium)
- Downgrades are blocked at API level
- Same plan + same cycle = blocked ("already subscribed")
- Same plan + different cycle = allowed (monthly→annual switch)
```

### Capabilities Matrix

| Capability | Free | Pro | Premium |
|---|---|---|---|
| Basic portfolio tracking | ✓ | ✓ | ✓ |
| Equity & MF tracking | ✓ | ✓ | ✓ |
| Retirement visibility | ✓ | ✓ | ✓ |
| Real estate tracking | — | ✓ | ✓ |
| Gold tracking | — | ✓ | ✓ |
| Liabilities tracking | — | ✓ | ✓ |
| Advanced reporting | — | ✓ | ✓ |
| Sector/market exposure | — | ✓ | ✓ |
| Capital gains summaries | — | ✓ | ✓ |
| Scenario comparison | — | ✓ | ✓ |
| PDF & Excel exports | — | ✓ | ✓ |
| AI data assistant | — | — | ✓ |
| Weekly summaries | — | — | ✓ |
| Priority support | — | — | ✓ |

---

## 5. Payment Flow — End to End

### New Subscriber Flow

```
1. User visits /upgrade?plan=pro
2. Selects Monthly or Yearly billing
3. Clicks "Proceed to Payment"
4. POST /api/payments/create-subscription
   { planId: 'pro', billingCycle: 'monthly', userId: '...' }
5. API creates Razorpay subscription (status: created)
6. API upserts user_subscriptions:
   { tier: 'pro', status: 'pending', razorpay_subscription_id: 'sub_xxx' }
7. Frontend receives { subscriptionId, checkoutOptions }
8. Razorpay checkout modal opens
9a. User PAYS → Razorpay fires webhook
    → DB: { status: 'active', current_period_end: ... }
    → subscription_history: { event: 'activated', from_tier: 'free', to_tier: 'pro' }
    → Frontend polls /api/plans/user until plan_id != 'free'
    → Success screen shown → redirect to dashboard
9b. User CLOSES modal without paying
    → DB stays as { status: 'pending' }
    → User can retry later — same pending row reused
```

### Upgrade Flow (Active Subscriber)

```
1. Pro user visits /upgrade?plan=premium (only Premium shown)
2. Selects billing cycle
3. Clicks "Proceed to Payment"
4. POST /api/payments/create-subscription
   { planId: 'premium', billingCycle: 'monthly', userId: '...' }
5. API detects existing active subscription (isCurrentlyActive = true)
6. API creates Razorpay subscription for premium plan
7. API updates ONLY pending columns:
   { pending_tier: 'premium',
     pending_billing_cycle: 'monthly',
     pending_razorpay_subscription_id: 'sub_yyy' }
   ← tier and status are NEVER touched here
8. Razorpay checkout opens
9a. User CLOSES without paying
    → DB: { tier: 'pro', status: 'active' } UNCHANGED ✓
    → pending_* columns retain intent (safe — webhook will use them if user pays later)
9b. User PAYS → webhook fires
    → Webhook finds row by pending_razorpay_subscription_id = 'sub_yyy'
    → subscription_history: { event: 'upgraded', from_tier: 'pro', to_tier: 'premium' }
    → DB: { tier: 'premium', status: 'active', billing_cycle: 'monthly',
             razorpay_subscription_id: 'sub_yyy',
             pending_tier: null, pending_billing_cycle: null,
             pending_razorpay_subscription_id: null }
    → Frontend polls → success screen ✓
```

---

## 6. API Endpoints

### `POST /api/payments/create-subscription`

**Purpose:** Creates Razorpay subscription + stores DB intent.  
**Auth:** Requires `userId` in request body (validated against session in future improvement).

**Request:**
```typescript
{
  planId: 'pro' | 'premium',
  billingCycle: 'monthly' | 'yearly' | 'annual',  // all accepted, normalized to monthly|yearly
  userId: string   // UUID from Supabase auth
}
```

**Response (success):**
```typescript
{
  subscriptionId: string,
  checkoutOptions: {
    key: string,                 // Razorpay key_id for frontend
    subscription_id: string,     // Pass directly to Razorpay checkout
    short_url: string | null
  }
}
```

**Response (errors):**
```typescript
{ error: 'Downgrade not supported. Please contact support.' }     // 400
{ error: 'You are already on this plan and billing cycle.' }       // 400
{ error: 'Plan not found or not configured' }                      // 400
{ error: 'Payment error', details: string }                        // 500
```

**Safety rules enforced:**
- Downgrade blocked (plan rank check)
- Same plan + same cycle blocked
- Active subscribers: only `pending_*` columns written
- New subscribers: upsert with `status: 'pending'`

---

### `POST /api/payments/webhook`

**Purpose:** The ONLY place that activates subscriptions.  
**Auth:** Razorpay signature verification (no user auth).

See Section 7 for full documentation.

---

### `GET /api/plans`

**Purpose:** Returns all plans for pricing page display.  
**Auth:** None (public).

**Response:**
```typescript
{
  plans: Array<{
    id: string,
    name: string,
    monthly_price: number,
    annual_price: number,
    razorpay_plan_id: string | null
  }>
}
```

---

### `GET /api/plans/user`

**Purpose:** Returns current user's subscription for UI display.  
**Auth:** Session JWT (Supabase).  
**Note:** For display ONLY — do not use for feature gating.

**Response (paid plan):**
```typescript
{
  plan_id: string,         // 'pro' | 'premium'
  plan_name: string,
  tier: string,
  status: string,          // 'active' | 'pending' | etc.
  billing_cycle: string,   // 'monthly' | 'yearly'
  current_period_end: string,  // ISO timestamp
  monthly_price: number,
  annual_price: number,
  plan: { id, name, monthly_price, annual_price }
}
```

**Response (free user):**
```typescript
{ plan_id: 'free', tier: 'free' }
```

---

### `GET /api/entitlements`

**Purpose:** Returns feature capabilities for the current user.  
**Auth:** Session JWT.  
**Cache:** `Cache-Control: private, max-age=300, stale-while-revalidate=60`

**Response:**
```typescript
{
  plan: 'free' | 'pro' | 'premium',
  capabilities: {
    manage_real_estate: boolean,
    manage_gold: boolean,
    manage_liabilities: boolean,
    view_sector_exposure: boolean,
    view_mf_exposure: boolean,
    view_market_cap_exposure: boolean,
    view_portfolio_health: boolean,
    view_stability_analysis: boolean,
    run_scenarios: boolean,
    view_premium_analytics: boolean,
    export_reports: boolean,
    ai_assistant: boolean
  }
}
```

---

## 7. Webhook Handler

**File:** `/api/payments/webhook/route.ts`  
**Runtime:** Node.js (required for Razorpay signature verification)

### Handled Events

| Event | Action |
|-------|--------|
| `subscription.authenticated` | Set status = active |
| `subscription.charged` | Set status = active + update period dates |
| `subscription.completed` | Set status = active |
| `subscription.updated` | Set status = active |
| `subscription.halted` | Set status = halted |

### Three Lookup Flows

```
FLOW 1 — Upgrade (pending_razorpay_subscription_id match):
  Query: WHERE pending_razorpay_subscription_id = webhook_sub_id
  Action: Promote pending_tier → tier, clear pending_* columns
          Insert subscription_history { event: 'upgraded' }

FLOW 2 — New subscription (razorpay_subscription_id match):
  Query: WHERE razorpay_subscription_id = webhook_sub_id
  Action: Set status = 'active', update period dates
          Insert subscription_history { event: 'activated' }

FLOW 3 — Notes fallback (no row found by ID):
  Query: Use notes.user_id from webhook payload
  Action: Update by user_id using notes.plan_id + notes.billing_cycle
  Use case: Race condition safety net
```

### Security

```typescript
// Signature verification — runs before any DB operations
const valid = Razorpay.validateWebhookSignature(rawBody, signature, secret);
if (!valid) return 401;

// Always return 200 to Razorpay to prevent retries on handled events
// Even on DB errors, return { received: true } with status 200
```

### Webhook Payload Structure

```typescript
// Razorpay sends nested entity — handle both formats
payload?.payload?.subscription?.entity   // standard format
payload?.payload?.subscription           // sometimes entity is missing
```

---

## 8. Upgrade & Plan Change Logic

### Plan Rank System

```typescript
const PLAN_RANK: Record<string, number> = { free: 0, pro: 1, premium: 2 };

// Downgrade check (blocked):
if (PLAN_RANK[newPlan] < PLAN_RANK[currentTier]) → reject

// Same plan same cycle (blocked):
if (tier === planId && billing_cycle === billingCycle) → reject

// Same plan different cycle (allowed — monthly→annual switch):
if (tier === planId && billing_cycle !== billingCycle) → allow
```

### Monthly → Annual Upgrade

```
User on Pro Monthly wants Pro Annual:

1. Homepage pricing: "Switch to Annual — Save 35%" banner
   → Links to /upgrade?plan=pro&cycle=yearly

2. Upgrade page reads ?cycle=yearly URL param
   → billingCycle state initializes to 'yearly'
   → Pro plan shown (same tier, different cycle allowed)

3. create-subscription called with { planId: 'pro', billingCycle: 'yearly' }
   → New Razorpay annual subscription created
   → pending_razorpay_subscription_id stored
   → Active Pro Monthly untouched

4. After payment → webhook promotes pending → active with yearly cycle
```

### Billing Cycle Normalization

```typescript
// API accepts all three formats, normalizes internally:
'annual'  → 'yearly'  (stored in DB)
'yearly'  → 'yearly'  (stored in DB)
'monthly' → 'monthly' (stored in DB)

// DB CHECK constraint accepts: 'monthly', 'yearly', 'annual'
```

---

## 9. Frontend — Pricing Page

**File:** `/components/home/PricingSection.tsx`

### Props

```typescript
interface PricingSectionProps {
  plans: PricingPlan[];
  loading: boolean;
  error: string | null;
  currentSubscription?: CurrentSubscription | null;  // null for logged-out users
  isLoggedIn?: boolean;
}
```

### Card States (for logged-in users)

| User State | Free Card | Pro Card | Premium Card |
|---|---|---|---|
| Free user | Normal CTA | "Upgrade to Pro" (blue) | "Upgrade to Premium" |
| Pro Monthly | "Included in plan" | Green border + "✓ Current Plan" + "Switch to Annual" banner | "Upgrade to Premium" |
| Pro Annual | "Included in plan" | Green border + "✓ Current Plan" + renewal date | "Upgrade to Premium" |
| Premium | "Not available" greyed | "Lower plan" greyed | Green border + "✓ Current Plan" |

### Switch to Annual Banner

Appears INSIDE the Pro card when `isMonthlyPro = true`:
- Shows savings amount (₹836/year) and percentage (35%)
- Links to `/upgrade?plan=pro&cycle=yearly`
- Hidden for Annual or Premium users

### usePlans Hook

```typescript
// Homepage usage — pass true to fetch current subscription:
const { plans, loading, error, currentSubscription } = usePlans(!!user);

// Pass to PricingSection:
<PricingSection
  plans={plans}
  loading={loading}
  error={error}
  currentSubscription={currentSubscription}
  isLoggedIn={!!user}
/>
```

---

## 10. Frontend — Upgrade Page

**File:** `/app/upgrade/page.tsx`

### URL Parameters

| Param | Values | Effect |
|-------|--------|--------|
| `?plan=pro` | `pro`, `premium` | Pre-selects plan card |
| `?cycle=yearly` | `yearly`, `monthly` | Pre-selects billing toggle |

### Plan Filtering Logic

```typescript
const PLAN_RANK = { free: 0, pro: 1, premium: 2 };
const currentUserRank = PLAN_RANK[currentSub?.tier ?? 'free'];

paidPlans = allPaidPlans.filter((p) => {
  const planRank = PLAN_RANK[p.name.toLowerCase()];
  // Show higher plans always
  if (planRank > currentUserRank) return true;
  // Show same plan only if switching to annual
  if (planRank === currentUserRank &&
      currentSub?.status === 'active' &&
      currentSub?.billing_cycle !== billingCycle &&
      billingCycle === 'yearly') return true;
  return false;
});
```

**Result:**
- Free user → sees Pro + Premium
- Pro Monthly → sees Pro (when yearly toggle) + Premium
- Pro Annual → sees only Premium
- Premium → sees "You're on Premium" screen, no plans shown

### Payment State Machine

```
idle → processing → verifying → success
                             ↘ timeout (30s)
       ↘ error
```

### Polling After Payment

```typescript
// Polls /api/plans/user every 2 seconds for up to 30 seconds
// Stops when plan_id !== 'free'
// Timeout screen shown after 30 seconds (activation usually < 5 seconds)
```

### Critical Variable Ordering

```typescript
// MUST be in this exact order — cycleParam used in useState initializer
const searchParams = useSearchParams();
const planParam = searchParams.get('plan');
const cycleParam = searchParams.get('cycle');   // ← BEFORE any useState

// billingCycle state uses cycleParam:
const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>(
  cycleParam === 'yearly' ? 'yearly' : 'monthly'
);
```

---

## 11. Entitlements & Access Control

### useCapabilities Hook

```typescript
// Has module-level cache with 5-minute TTL
// Prevents flash of "free" state on navigation
// Cache keyed by user ID, cleared on logout

const cache = new Map<string, { data: Capabilities; expiresAt: number }>();

function useCapabilities() {
  // Returns capabilities object + loading state
  // Uses cache on repeat calls within TTL
}

// Call this on logout:
export function clearEntitlementsCache() {
  cache.clear();
}
```

### Feature Gating Pattern

```typescript
// In page components:
const { capabilities, loading } = useCapabilities();

if (loading) return <LoadingState />;

if (!capabilities.manage_real_estate) {
  return <UpgradeModal feature="Real Estate" requiredPlan="pro" />;
}

// Render actual feature
```

### UpgradeModal

```typescript
// Used across: Real Estate, Gold, Liabilities, Insurance,
//              Sector Exposure, Market Cap, Health, Stability, Scenarios

<UpgradeModal
  isOpen={showModal}
  onClose={() => setShowModal(false)}
  feature="Real Estate Tracking"
  requiredPlan="pro"   // or 'premium'
/>
// Internally links to /upgrade?plan=pro or /upgrade?plan=premium
```

---

## 12. Performance Optimizations

### Entitlements Caching (5-minute TTL)

```typescript
// Module-level cache in useCapabilities.ts
// First load: fetch from API (~300ms)
// Subsequent loads: instant from cache
// Cache-Control header on API: max-age=300
```

### Dashboard Load Optimizations

```typescript
// BEFORE: 3 sequential internal HTTP fetches → 4.23 seconds
// AFTER: Direct DB calls + parallel queries → ~1.2 seconds

// 1. Eliminated internal HTTP fetches for daily/weekly summaries
//    → Direct DB calls via getDailySummary(), getWeeklySummary()

// 2. Parallelized metrics + holdings queries:
const [metrics, holdings] = await Promise.all([
  getPortfolioMetrics(portfolioId),
  getHoldings(portfolioId)
]);

// 3. Auth context: 3 sequential queries → Promise.all
const [userData, portfolio, snapshot] = await Promise.all([
  supabase.from('users').select(...),
  supabase.from('portfolios').select(...).maybeSingle(),
  supabase.from('onboarding_snapshots').select(...).maybeSingle()
]);
```

### Prefetch Noise Elimination

```typescript
// Disabled prefetch on all bucket summary links in dashboard
// Prevents ~10 background requests on every dashboard load
<Link href={`/portfolio/summary?bucket=${bucket}`} prefetch={false}>
```

---

## 13. Known Constraints & Edge Cases

### ICICI Bank UPI Issue
NPCI Autopay approval for ICICI Bank takes 2-4 weeks. Affected users should use Google Pay/PhonePe linked to non-ICICI account, or Netbanking/Card. Note shown on upgrade page.

### Vercel Free Tier Limits
- Serverless function timeout: 10 seconds
- Cold starts add ~500ms on first request
- Webhook must respond within 5 seconds — current implementation is well within limits

### Supabase Free Tier
- 500MB database limit
- Row-level security enforced — always use `createAdminClient()` for server-side operations that need to bypass RLS

### Phone-Only Auth
LensOnWealth uses phone OTP authentication via MSG91. Supabase requires email internally, so an internal email (`{phone}@lensonwealth.internal`) is generated. Never query `auth.users` by email for real users — always use phone or user_id.

### Pending Columns After Checkout Dismissal
After a user opens and closes Razorpay without paying, `pending_tier` and `pending_razorpay_subscription_id` remain set. This is intentional — if the user returns to pay later, the webhook finds the row correctly. These columns only become harmful if a new upgrade is initiated without clearing them first. The create-subscription API always overwrites pending columns on a new upgrade attempt, so this is safe.

### billing_cycle Values
The DB CHECK constraint and code must stay in sync:
- DB accepts: `'monthly'`, `'yearly'`, `'annual'`
- Code normalizes `'annual'` → `'yearly'` before storing
- All new code should store `'yearly'` (not `'annual'`) for consistency

---

## 14. Testing Checklist

### Before Every Release

```
□ Free user:
  □ Homepage pricing shows normal upgrade buttons
  □ /upgrade shows Pro + Premium plans
  □ Gold/Real Estate/Liabilities show UpgradeModal
  □ Analytics locked pages show UpgradeModal

□ Pro Monthly user:
  □ Homepage pricing → Pro card green + "✓ Current Plan · Monthly"
  □ "Switch to Annual" banner inside Pro card
  □ Free card shows "Included in plan"
  □ Premium card shows "Upgrade to Premium"
  □ /upgrade → only Premium shown
  □ /upgrade?plan=pro&cycle=yearly → Pro Annual shown
  □ Open Razorpay → close without paying → Pro still active (CRITICAL)
  □ Check DB: tier=pro, status=active, pending_tier=premium ✓

□ Pro Annual user:
  □ Homepage pricing → Pro card green + "✓ Current Plan · Annual"
  □ No "Switch to Annual" banner
  □ /upgrade → only Premium shown

□ Premium user:
  □ Homepage pricing → Premium card green + "✓ Current Plan"
  □ Pro card greyed out "Lower plan"
  □ /upgrade → "You're on Premium" screen

□ Payment completion:
  □ Webhook fires after payment
  □ subscription_history row inserted
  □ pending_* columns cleared after upgrade
  □ Success screen shows correct plan name
```

### Emergency Recovery SQL

```sql
-- Restore active subscription manually (use when webhook fails)
UPDATE user_subscriptions
SET status = 'active',
    tier = 'pro'           -- or 'premium'
WHERE user_id = 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx';

-- Check what happened (subscription history)
SELECT * FROM subscription_history
WHERE user_id = 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
ORDER BY occurred_at DESC
LIMIT 10;

-- Clear stuck pending upgrade
UPDATE user_subscriptions
SET pending_tier = null,
    pending_billing_cycle = null,
    pending_razorpay_subscription_id = null
WHERE user_id = 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx';
```

---

*This document covers the complete Razorpay implementation as of February 2026.  
Update this file whenever payment flow, DB schema, or entitlements change.*
