# Capability-Based Access Control

## Overview

All feature access checks are now based on **capability keys**, NOT plan names. This provides fine-grained control over features and makes it easy to add new capabilities or modify existing ones without changing code.

**CRITICAL RULES**
- **NEVER check plan names directly** anywhere in the app. Plan names are for display only.
- **NEVER check `plan === premium` or tier directly.** Use the shared **`hasCapability(capabilityKey)`** helper everywhere (dashboard, buttons, API guards). Import from `@/lib/capabilities`.

## Architecture

### Database Schema

#### `capabilities` Table
```sql
CREATE TABLE IF NOT EXISTS public.capabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,              -- Unique identifier (e.g., 'advanced_analytics')
  name TEXT NOT NULL,                    -- Human-readable name
  description TEXT,                       -- Optional description
  category TEXT,                          -- Optional category grouping
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `plan_capabilities` Junction Table
```sql
CREATE TABLE IF NOT EXISTS public.plan_capabilities (
  plan_id UUID REFERENCES public.plans(id) ON DELETE CASCADE,
  capability_id UUID REFERENCES public.capabilities(id) ON DELETE CASCADE,
  PRIMARY KEY (plan_id, capability_id)
);
```

#### `user_trials` Table (optional – for temporary Premium with limits)
When `user_trials.is_active = true` AND `now() < ends_at`, the user gets Premium capability keys with limits (see `trial.limits` in the API response).

```sql
CREATE TABLE IF NOT EXISTS public.user_trials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  ends_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_user_trials_user_active ON public.user_trials(user_id, is_active);
```

### Relationship Flow

```
user_subscriptions (user_id, plan_id) → plans → plan_capabilities → capabilities
```

A user's capabilities are determined by:
1. **Active trial** (optional): If `user_trials.is_active = true` AND `now() < ends_at`, the user temporarily gets **Premium capabilities with limits** (same capability keys as premium plans). Response includes `trial: { active: true, ends_at, limits }` so the app can enforce limits (e.g. analyst_queries_per_month).
2. Otherwise: User's **active subscription** in `user_subscriptions` (every logged-in user has a row).
3. `plan_id` from that subscription (not from user profile).
4. Plan's capabilities via `plan_capabilities` junction table.
5. Active capabilities from `capabilities` table.

**Trial limits** (when on trial): Use `trial.limits` from `/api/capabilities/user` or `useCapabilities().trialLimits` (e.g. `analyst_queries_per_month`, `insights_per_week`, `pdf_exports_per_month`) to enforce caps while still granting Premium capability keys.

## Implementation

### 1. TypeScript Types

**Location**: `src/types/capabilities.ts`

- `Capability` - Capability interface matching database schema
- `UserCapabilities` - User's capabilities with quick lookup
- `CAPABILITY_KEYS` - Constants for all capability keys

### 2. API Endpoints

#### `GET /api/capabilities/user`
- Returns all capabilities for the current authenticated user
- Includes `capability_keys` array for quick lookup
- **Location**: `src/app/api/capabilities/user/route.ts`

#### `GET /api/capabilities/check?key=advanced_analytics`
- Checks if user has a specific capability
- Returns `{ hasAccess: boolean }`
- **Location**: `src/app/api/capabilities/check/route.ts`

### 3. React Hooks

#### `useCapabilities()`
**Location**: `src/hooks/useCapabilities.ts`

```typescript
const {
  capabilities,        // Full UserCapabilities object
  loading,             // Loading state
  error,              // Error state
  hasCapability,      // (key: string) => boolean
  hasAllCapabilities, // (keys: string[]) => boolean
  hasAnyCapability,   // (keys: string[]) => boolean
  getCapability,      // (key: string) => Capability | undefined
  capabilityKeys,     // string[] for quick lookup
} = useCapabilities();
```

#### `useSubscription()` (Updated)
**Location**: `src/hooks/useSubscription.ts`

- Still provides `isPremium` for backward compatibility
- Now determines premium status based on capabilities, not plan names
- Checks for key premium capabilities like `advanced_analytics`, `unlimited_analyst`, etc.

### 4. Components

#### `PremiumFeatureGate`
**Location**: `src/components/PremiumFeatureGate.tsx`

Updated to use capability keys:

```typescript
<PremiumFeatureGate
  capabilityKey={CAPABILITY_KEYS.ADVANCED_ANALYTICS}
  preview={<PreviewContent />}
  featureName="Advanced Analytics"
  description="Unlock advanced analytics..."
>
  <FullContent />
</PremiumFeatureGate>
```

Supports:
- Single capability: `capabilityKey`
- Multiple (all required): `requireAll={[key1, key2]}`
- Multiple (any required): `requireAny={[key1, key2]}`

## Usage Examples

### Check Single Capability

```typescript
import { useCapabilities } from '@/hooks/useCapabilities';
import { CAPABILITY_KEYS } from '@/types/capabilities';

function MyComponent() {
  const { hasCapability, loading } = useCapabilities();
  
  if (loading) return <div>Loading...</div>;
  
  if (hasCapability(CAPABILITY_KEYS.ADVANCED_ANALYTICS)) {
    return <AdvancedAnalyticsView />;
  }
  
  return <BasicAnalyticsView />;
}
```

### Check Multiple Capabilities (All Required)

```typescript
const { hasAllCapabilities } = useCapabilities();

if (hasAllCapabilities([
  CAPABILITY_KEYS.ADVANCED_ANALYTICS,
  CAPABILITY_KEYS.PDF_REPORTS,
])) {
  // User has both capabilities
}
```

### Check Multiple Capabilities (Any Required)

```typescript
const { hasAnyCapability } = useCapabilities();

if (hasAnyCapability([
  CAPABILITY_KEYS.UNLIMITED_ANALYST,
  CAPABILITY_KEYS.ADVANCED_INSIGHTS,
])) {
  // User has at least one of these capabilities
}
```

### Using PremiumFeatureGate

```typescript
import PremiumFeatureGate from '@/components/PremiumFeatureGate';
import { CAPABILITY_KEYS } from '@/types/capabilities';

<PremiumFeatureGate
  capabilityKey={CAPABILITY_KEYS.PDF_REPORTS}
  preview={<div>Preview of PDF export...</div>}
  featureName="PDF Reports"
  description="Export your portfolio as a professional PDF report"
  benefits={[
    'Professional formatting',
    'Includes all analytics',
    'Share with advisors',
  ]}
>
  <PDFExportButton />
</PremiumFeatureGate>
```

## Standard Capability Keys

Defined in `src/types/capabilities.ts`:

```typescript
export const CAPABILITY_KEYS = {
  // Analytics
  ADVANCED_ANALYTICS: 'advanced_analytics',
  SECTOR_EXPOSURE: 'sector_exposure',
  MARKET_CAP_EXPOSURE: 'market_cap_exposure',
  GEOGRAPHY_EXPOSURE: 'geography_exposure',
  
  // Portfolio Analyst
  UNLIMITED_ANALYST: 'unlimited_analyst',
  ANALYST_QUERIES: 'analyst_queries',
  
  // Insights
  ADVANCED_INSIGHTS: 'advanced_insights',
  UNLIMITED_INSIGHTS: 'unlimited_insights',
  
  // Reports & Exports
  PDF_REPORTS: 'pdf_reports',
  EXCEL_EXPORTS: 'excel_exports',
  
  // Health & Risk
  PORTFOLIO_HEALTH_SCORE: 'portfolio_health_score',
  STABILITY_ANALYSIS: 'stability_analysis',
  SCENARIO_ANALYSIS: 'scenario_analysis',
  
  // Weekly Summaries
  WEEKLY_DEEP_DIVES: 'weekly_deep_dives',
} as const;
```

## Database Setup

### 1. Create Capabilities Table

```sql
CREATE TABLE IF NOT EXISTS public.capabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_capabilities_key ON public.capabilities(key);
CREATE INDEX IF NOT EXISTS idx_capabilities_active ON public.capabilities(is_active);
```

### 2. Create Plan-Capabilities Junction Table

```sql
CREATE TABLE IF NOT EXISTS public.plan_capabilities (
  plan_id UUID REFERENCES public.plans(id) ON DELETE CASCADE,
  capability_id UUID REFERENCES public.capabilities(id) ON DELETE CASCADE,
  PRIMARY KEY (plan_id, capability_id)
);

CREATE INDEX IF NOT EXISTS idx_plan_capabilities_plan ON public.plan_capabilities(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_capabilities_capability ON public.plan_capabilities(capability_id);
```

### 3. Insert Capabilities

```sql
-- Analytics Capabilities
INSERT INTO public.capabilities (key, name, description, category) VALUES
  ('advanced_analytics', 'Advanced Analytics', 'Access to advanced analytics suite', 'analytics'),
  ('sector_exposure', 'Sector Exposure Analysis', 'View sector-wise exposure breakdown', 'analytics'),
  ('market_cap_exposure', 'Market Cap Exposure', 'View market cap exposure analysis', 'analytics'),
  ('geography_exposure', 'Geography Exposure', 'View geography exposure analysis', 'analytics');

-- Portfolio Analyst Capabilities
INSERT INTO public.capabilities (key, name, description, category) VALUES
  ('unlimited_analyst', 'Unlimited Analyst Queries', 'Unlimited portfolio analyst queries', 'analyst'),
  ('analyst_queries', 'Limited Analyst Queries', 'Limited portfolio analyst queries (5/month)', 'analyst');

-- Insights Capabilities
INSERT INTO public.capabilities (key, name, description, category) VALUES
  ('advanced_insights', 'Advanced Insights', 'Access to advanced portfolio insights', 'insights'),
  ('unlimited_insights', 'Unlimited Insights', 'Unlimited insights per week', 'insights');

-- Reports & Exports
INSERT INTO public.capabilities (key, name, description, category) VALUES
  ('pdf_reports', 'PDF Reports', 'Export portfolio as PDF reports', 'exports'),
  ('excel_exports', 'Excel Exports', 'Export portfolio data to Excel', 'exports');

-- Health & Risk
INSERT INTO public.capabilities (key, name, description, category) VALUES
  ('portfolio_health_score', 'Portfolio Health Score', 'Access to portfolio health score', 'health'),
  ('stability_analysis', 'Stability Analysis', 'Access to stability analysis', 'health'),
  ('scenario_analysis', 'Scenario Analysis', 'Access to scenario-based analysis', 'health');

-- Weekly Summaries
INSERT INTO public.capabilities (key, name, description, category) VALUES
  ('weekly_deep_dives', 'Weekly Deep Dives', 'Access to weekly deep dive summaries', 'summaries');
```

### 4. Assign Capabilities to Plans

```sql
-- Free Plan Capabilities
INSERT INTO public.plan_capabilities (plan_id, capability_id)
SELECT 
  (SELECT id FROM public.plans WHERE name = 'free'),
  id
FROM public.capabilities
WHERE key IN ('analyst_queries'); -- Only limited queries

-- Premium Plan Capabilities
INSERT INTO public.plan_capabilities (plan_id, capability_id)
SELECT 
  (SELECT id FROM public.plans WHERE name = 'premium'),
  id
FROM public.capabilities
WHERE key IN (
  'advanced_analytics',
  'sector_exposure',
  'market_cap_exposure',
  'geography_exposure',
  'unlimited_analyst',
  'advanced_insights',
  'unlimited_insights',
  'pdf_reports',
  'excel_exports',
  'portfolio_health_score',
  'stability_analysis',
  'scenario_analysis',
  'weekly_deep_dives'
);
```

## Migration Guide

### From Plan-Based to Capability-Based

**Before (❌ Don't do this):**
```typescript
// ❌ NEVER check plan names
if (plan.name.toLowerCase().includes('premium')) {
  // Show feature
}

// ❌ NEVER use plan names for access control
const { isPremium } = useSubscription();
if (isPremium) {
  // Show feature
}
```

**After (✅ Do this):**
```typescript
// ✅ Always check capabilities
const { hasCapability } = useCapabilities();
if (hasCapability(CAPABILITY_KEYS.ADVANCED_ANALYTICS)) {
  // Show feature
}
```

### Important Rules

1. **NEVER check `plan.name`** - Plan names are for display only
2. **NEVER check `plan.display_name`** - Display names are for UI only
3. **ALWAYS use capabilities** - All access control must go through `plan_capabilities`
4. **Use `useCapabilities()` hook** - For checking specific capabilities
5. **Use `PremiumFeatureGate`** - For feature gating with capability keys

### Updating Components

1. Replace `isPremium` checks with `hasCapability(capabilityKey)`
2. Use `PremiumFeatureGate` with `capabilityKey` prop
3. Import `CAPABILITY_KEYS` from `@/types/capabilities`

## Benefits

1. **Fine-Grained Control**: Control individual features independently
2. **Easy Updates**: Add/modify capabilities without code changes
3. **Flexible Plans**: Create custom plans with different capability combinations
4. **Better Testing**: Test capabilities independently
5. **Future-Proof**: Easy to add new capabilities as the app grows

## Best Practices

1. **NEVER check plan names** - Plan names (`plan.name`, `plan.display_name`) are for display only
2. **Always use capability keys** - All feature access must go through `plan_capabilities` table
3. **Use constants** from `CAPABILITY_KEYS` instead of magic strings
4. **Check capabilities**, not `isPremium` for specific features
5. **Use `PremiumFeatureGate`** for feature gating with upsells
6. **Capabilities come from `plan_capabilities`** - Based on user's active plan, never from plan names
7. **Document new capabilities** when adding them

## Anti-Patterns (❌ Don't Do This)

```typescript
// ❌ NEVER check plan names
if (plan.name.toLowerCase().includes('premium')) { }
if (plan.display_name === 'Premium') { }

// ❌ NEVER use plan names to determine access
const isPremium = plan.name.includes('premium');

// ❌ NEVER find plans by name
const premiumPlan = plans.find(p => p.name.includes('premium'));
```

## Correct Patterns (✅ Do This)

```typescript
// ✅ Check capabilities
const { hasCapability } = useCapabilities();
if (hasCapability(CAPABILITY_KEYS.ADVANCED_ANALYTICS)) { }

// ✅ Use price for display/styling (not access control)
const hasPrice = plan.price_monthly > 0;

// ✅ Find plans by price or other attributes (not name)
const premiumPlan = plans.find(p => p.price_monthly > 0);
```
