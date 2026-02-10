# Capability checks – where everything connects

**Rule: Never check `plan === premium` (or tier or plan name) directly. Always use the shared `hasCapability(capabilityKey)` helper or `getUserEntitlements(userId)`.**

**Single source of truth:** `getUserEntitlements(userId)` in `@/lib/entitlements`. It returns a flat map of capability keys (booleans) and usage counters (`ai_remaining`, `scenario_remaining`). `hasCapability(userId, key)` delegates to it.

**Trial expiry:** Trial may expire at any time. The server always checks `user_trials.ends_at > now()` when computing entitlements and when incrementing usage. Do not rely on frontend state for trial status.

**Upgrade/downgrade:** Only update `user_subscriptions.plan_id` (e.g. via `PATCH /api/subscription/plan` with `{ plan_id }`). Do **not** touch data tables (holdings, portfolios, etc.). Entitlements auto-update via the resolver: `getUserEntitlements` reads `plan_id` → `plan_capabilities` → capabilities.

## Shared helper

- **Server (API, middleware):** `import { hasCapability, requireCapability, CAPABILITY_KEYS } from '@/lib/capabilities'`
- **React (dashboard, buttons, gates):** `import { useCapabilities, CAPABILITY_KEYS } from '@/lib/capabilities'` then `const { hasCapability } = useCapabilities(); if (hasCapability(CAPABILITY_KEYS.PDF_REPORTS)) { ... }`

Use it everywhere: dashboard, buttons, API guards, PremiumFeatureGate. Never check plan or premium directly.

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

## Paywall (single component, no inline copy)

**All locked actions must route through `ShowPaywall(reason, capability)`.** No inline hardcoded upgrade messages.

- Copy is centralised in `@/lib/paywall-copy` (`getPaywallCopy(reason, capability)`).
- Reasons: `feature_locked` | `download_locked` | `limit_reached` | `insights_limit` | `trial_exceeded`.
- Variants: `inline` | `card` | `modal` | `banner`.

```tsx
import ShowPaywall from '@/components/ShowPaywall';
import { CAPABILITY_KEYS } from '@/lib/capabilities';

// Gate a feature (card below preview)
<ShowPaywall reason="feature_locked" capability={CAPABILITY_KEYS.PDF_REPORTS} variant="card" />

// Modal (e.g. on download click when locked)
<ShowPaywall reason="download_locked" capability={CAPABILITY_KEYS.PDF_REPORTS} variant="modal" isOpen={open} onClose={() => setOpen(false)} />

// Banner (limit reached)
<ShowPaywall reason="limit_reached" capability={CAPABILITY_KEYS.USE_AI_HELP} variant="banner" bannerDetail="You've used all 15 queries." />
```

Use **PremiumFeatureGate** (wraps content + ShowPaywall card) or **PremiumDownloadModal** (ShowPaywall modal) where they fit; otherwise use **ShowPaywall** directly.

## Frontend usage

```tsx
import { useCapabilities, CAPABILITY_KEYS } from '@/lib/capabilities';

function MyComponent() {
  const { hasCapability } = useCapabilities();

  const canUseAI = hasCapability(CAPABILITY_KEYS.USE_AI_HELP);
  if (canUseAI) {
    return <AIAssistant />;
  }
  return <ShowPaywall reason="feature_locked" capability={CAPABILITY_KEYS.USE_AI_HELP} variant="card" />;
}
```

Pattern: **`hasCapability(key) ? showFeature() : ShowPaywall(reason, capability)`**

## Paid action guards (never trust frontend)

For **paid actions** (AI help, downloads, scenarios), use **`requirePaidAction(capabilityKey)`** before executing:

1. Calls **`getUserEntitlements(userId)`** (cached per request).
2. If capability not allowed → **403** `Upgrade required`.
3. If capability has a trial limit and **remaining is 0** → **429** `Trial limit exceeded`.

**Guarded routes:**

| Route | Capability | Limit |
|-------|------------|-------|
| `POST /api/copilot/query` | `use_ai_help` | `ai_remaining` |
| `GET /api/portfolio/stability-analytics` | `scenario_analysis` | `scenario_remaining` |
| `GET /api/portfolio/health-score` | `portfolio_health_score` | — |

When adding a **download/export** API (PDF or Excel), guard it with `requirePaidAction(CAPABILITY_KEYS.PDF_REPORTS)` or `EXCEL_EXPORTS` at the start of the handler.

## API guards (capability only)

At the start of other protected routes, use `requireCapability`. Missing capability returns **403** with `{ error: 'Upgrade required' }`:

```ts
import { requireCapability, hasCapability, CAPABILITY_KEYS } from '@/lib/capabilities';

// Option 1: requireCapability (gets session, checks capability, returns 401/403)
export async function GET(request: NextRequest) {
  const guard = await requireCapability(CAPABILITY_KEYS.USE_AI_HELP);
  if (!guard.ok) return guard.response; // 401 Unauthorized or 403 { error: 'Upgrade required' }
  const { userId, supabase } = guard;
  // ... proceed
}

// Option 2: when you already have userId (e.g. from session elsewhere)
const supabase = await createClient();
const { data: { session } } = await supabase.auth.getSession();
if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
if (!(await hasCapability(session.user.id, CAPABILITY_KEYS.USE_AI_HELP, supabase))) {
  return NextResponse.json({ error: 'Upgrade required' }, { status: 403 });
}
```

## Capability keys

Defined in `@/types/capabilities` and re-exported from `@/lib/capabilities`. Use `CAPABILITY_KEYS.*` instead of raw strings.

## Trial limits

When the user is on trial, the API includes `trial: { active: true, ends_at, limits }`. Use `limits` to enforce usage caps; capability checks only answer “can they use this feature?”.
