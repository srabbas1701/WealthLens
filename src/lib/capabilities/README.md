# Capability checks – where everything connects

**Rule: Never check `plan === premium` (or tier or plan name) directly. Always use the shared `hasCapability(capabilityKey)` helper or `getUserEntitlements(userId)`.**

**Single source of truth:** `getUserEntitlements(userId)` in `@/lib/entitlements`. It returns a flat map of capability keys (booleans) and usage counters (`ai_remaining`, `scenario_remaining`). `hasCapability(userId, key)` delegates to it.

**Trial expiry:** Trial may expire at any time. The server always checks `user_trials.ends_at > now()` when computing entitlements and when incrementing usage. Do not rely on frontend state for trial status.

**Upgrade/downgrade:** Only update `user_subscriptions.plan_id` (e.g. via `PATCH /api/subscription/plan` with `{ plan_id }`). Do **not** touch data tables (holdings, portfolios, etc.). Entitlements auto-update via the resolver: `getUserEntitlements` reads `plan_id` → `plan_capabilities` → capabilities.

## Shared helper

- **Server (API, middleware):** `import { hasCapability, requireCapability } from '@/lib/capabilities/server'` and `import { FEATURE_ACCESS } from '@/config/feature-access'`
- **React (dashboard, buttons, gates):** `import { useCapabilities } from '@/lib/capabilities'` and `import { FEATURE_ACCESS } from '@/config/feature-access'` then `const { hasCapability } = useCapabilities(); if (hasCapability(FEATURE_ACCESS.DOWNLOAD.capability)) { ... }`

Use it everywhere: dashboard, buttons, API guards, LockedFeaturePage (module routes). Never check plan or premium directly.

## Backend logic (canonical)

```ts
async function hasCapability(userId: string, capability: string): Promise<boolean> {
  // 1. Check trial
  const trial = await getUserTrial(userId);
  if (trial?.is_active && trial.ends_at > now()) {
    return true; // limits handled separately
  }

  // 2. Else check plan
  const planId = await getUserPlan(userId);
  return await isCapabilityEnabled(planId, capability);
}
```

- **Trial**: `user_trials.is_active = true` AND `ends_at > now()` → grant **all** capabilities. Limits enforced separately.
- **Plan**: `plan_id` from `user_subscriptions` → capabilities from `plan_capabilities`. No plan names; only capability keys.

## API

| Endpoint | Purpose |
|----------|--------|
| **`GET /api/entitlements`** | **Authenticated.** Returns `getUserEntitlements(userId)` – flat map (capability booleans, `ai_remaining`, `scenario_remaining`, `trial`). **Frontend must use this only; do not infer entitlements.** Cached per request. |
| `GET /api/capabilities/user` | Legacy; prefer `/api/entitlements` for capability/trial data. |
| `GET /api/capabilities/check?key=<key>` | Single check: `hasCapability(userId, key)` → `{ hasAccess: boolean }`. |

## Standardized Paywall UX

**Module-level features** (Real Estate, Insurance, Liabilities, Analytics) use **LockedFeaturePage** — full-page, no modal. Navigate to the route → show locked page when user lacks capability. Same pattern as Notion, Figma, Stripe.

**Modal gating ONLY for:**
- Download attempts (PremiumDownloadModal)
- AI query limit exceeded (QueryLimitBanner / ShowPaywall banner)

**LockedFeaturePage** reads `upgradePlan` from `FEATURE_ACCESS` via the `feature` prop.

### Routes using LockedFeaturePage
| Route | Feature |
|-------|---------|
| `/portfolio/real-estate` | REAL_ESTATE |
| `/portfolio/insurance` | INSURANCE |
| `/liabilities` | LIABILITIES |
| `/analytics/*` | ANALYTICS_HEALTH |

```tsx
// In page component: guard BEFORE fetch
if (authStatus === 'authenticated' && !capabilitiesLoading && !hasCapability(FEATURE_ACCESS.REAL_ESTATE.capability)) {
  return <LockedFeaturePage title="Real Estate" feature="REAL_ESTATE" />;
}
```

## Paywall for inline / modal / banner

**ShowPaywall** — for Download modal, AI limit banner, insights limit. Copy from `@/lib/paywall-copy`.

```tsx
// Modal (download click when locked) — KEEP
<PremiumDownloadModal isOpen={open} onClose={() => setOpen(false)} />

// Banner (AI query limit exceeded) — KEEP
<QueryLimitBanner remaining={0} limit={15} />
```

## Frontend usage

```tsx
// Module page: LockedFeaturePage
if (!hasCapability(FEATURE_ACCESS.REAL_ESTATE.capability)) {
  return <LockedFeaturePage title="Real Estate" feature="REAL_ESTATE" />;
}

// Action (e.g. download): modal
if (!hasCapability(FEATURE_ACCESS.DOWNLOAD.capability)) {
  setShowPremiumModal(true);
}
```

Pattern: **`hasCapability(key) ? showFeature() : LockedFeaturePage | PremiumDownloadModal | QueryLimitBanner`**

## Paid action guards (never trust frontend)

For **paid actions** (AI help, downloads, scenarios), use **`requirePaidAction(capabilityKey)`** before executing:

1. Calls **`getUserEntitlements(userId)`** (cached per request).
2. If capability not allowed → **403** `Upgrade required`.
3. If capability has a trial limit and **remaining is 0** → **429** `Trial limit exceeded`.

**Guarded routes:**

| Route | Capability | Limit |
|-------|------------|-------|
| `POST /api/copilot/query` | `use_ai_help` | `ai_remaining` |
| `GET /api/portfolio/stability-analytics` | `run_scenarios` | `scenario_remaining` |
| `GET /api/portfolio/health-score` | `view_advanced_analytics` | — |

When adding a **download/export** API (PDF or Excel), guard it with `requirePaidAction(FEATURE_ACCESS.DOWNLOAD.capability)` at the start of the handler.

## API guards (capability only)

At the start of other protected routes, use `requireCapability`. Missing capability returns **403** with `{ error: 'Upgrade required' }`:

```ts
import { requireCapability, hasCapability } from '@/lib/capabilities/server';
import { FEATURE_ACCESS } from '@/config/feature-access';

// Option 1: requireCapability (gets session, checks capability, returns 401/403)
export async function GET(request: NextRequest) {
  const guard = await requireCapability(FEATURE_ACCESS.AI_HELP.capability);
  if (!guard.ok) return guard.response; // 401 Unauthorized or 403 { error: 'Upgrade required' }
  const { userId, supabase } = guard;
  // ... proceed
}

// Option 2: when you already have userId (e.g. from session elsewhere)
const supabase = await createClient();
const { data: { session } } = await supabase.auth.getSession();
if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
if (!(await hasCapability(session.user.id, FEATURE_ACCESS.AI_HELP.capability, supabase))) {
  return NextResponse.json({ error: 'Upgrade required' }, { status: 403 });
}
```

## Capability keys

Use `FEATURE_ACCESS.<FEATURE>.capability` from `@/config/feature-access` for capability keys. `CAPABILITY_KEYS` in `@/types/capabilities` remains for type definitions.

## Trial limits

When the user is on trial, the API includes `trial: { active: true, ends_at, limits }`. Use `limits` to enforce usage caps; capability checks only answer “can they use this feature?”.
