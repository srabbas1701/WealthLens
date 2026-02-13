# Dynamic Pricing Implementation

## Overview

This implementation removes all hardcoded pricing and plan names from the frontend, replacing them with dynamic data fetched from the `plans` table in Supabase.

**IMPORTANT**: All feature access checks are based on **capability keys**, NOT plan names. See `CAPABILITY_BASED_ACCESS_CONTROL.md` for details.

## Database Schema

### Expected `plans` Table Structure

```sql
CREATE TABLE IF NOT EXISTS public.plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,                    -- Internal name (e.g., 'free', 'premium')
  display_name TEXT NOT NULL,           -- Display name (e.g., 'Free', 'Premium')
  description TEXT,                      -- Optional description
  price_monthly NUMERIC,                 -- Monthly price (NULL for free tier)
  price_yearly NUMERIC,                  -- Yearly price (NULL if not available)
  currency TEXT DEFAULT 'INR',           -- Currency code (default: INR)
  features TEXT[],                       -- Array of feature strings
  is_active BOOLEAN DEFAULT true,        -- Whether plan is active
  display_order INTEGER,                 -- Order for display (lower = first)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### User Subscriptions (Source of plan_id)

**plan_id is read from `user_subscriptions`, not from the user profile.** Every logged-in user is assumed to have a row in `user_subscriptions`.

```sql
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  plan_id UUID REFERENCES public.plans(id) ON DELETE RESTRICT NOT NULL,
  status TEXT DEFAULT 'active',  -- e.g. 'active' | 'cancelled' | 'expired'
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_subscriptions_user_active 
  ON public.user_subscriptions(user_id, created_at DESC);
```

## Implementation Details

### 1. API Endpoints

#### `GET /api/plans`
- Fetches all active plans from the `plans` table
- Returns plans sorted by `display_order`
- Calculates yearly savings percentage automatically
- **Location**: `src/app/api/plans/route.ts`

#### `GET /api/plans/user`
- Fetches the current authenticated user's plan
- Returns plan details based on `plan_id` from **user_subscriptions** (not user profile)
- Requires authentication
- **Location**: `src/app/api/plans/user/route.ts`

### 2. TypeScript Types

**Location**: `src/types/plans.ts`

- `Plan` - Base plan interface matching database schema
- `PlanWithSavings` - Plan with computed savings fields
- `UserPlan` - User's plan with user_id and plan_id

### 3. React Hooks

#### `usePlans()`
- Fetches all active plans
- Returns: `{ plans, loading, error }`
- **Location**: `src/hooks/usePlans.ts`

#### `useSubscription()` (Updated)
- Fetches user's current plan based on `plan_id`
- Determines premium status from plan data
- Returns: `{ isPremium, loading, usage, plan }`
- **Location**: `src/hooks/useSubscription.ts`

### 4. Frontend Updates

#### Landing Page (`src/app/page.tsx`)
- Pricing section now fetches plans dynamically
- Displays plans in order from database
- Shows loading state while fetching
- Handles errors gracefully
- Automatically calculates and displays yearly savings

#### Terms Page (`src/app/terms/page.tsx`)
- Premium tier pricing fetched dynamically
- Features list comes from plan data
- Falls back to default features if plan data unavailable

## Usage Example

### Fetching Plans in a Component

```typescript
import { usePlans } from '@/hooks/usePlans';

function PricingComponent() {
  const { plans, loading, error } = usePlans();
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  
  return (
    <div>
      {plans.map(plan => (
        <div key={plan.id}>
          <h3>{plan.display_name}</h3>
          <p>{plan.description}</p>
          {plan.price_monthly && (
            <p>{plan.currency === 'INR' ? '₹' : plan.currency}{plan.price_monthly}/month</p>
          )}
        </div>
      ))}
    </div>
  );
}
```

### Checking User's Plan

```typescript
import { useSubscription } from '@/hooks/useSubscription';

function MyComponent() {
  const { isPremium, plan, loading } = useSubscription();
  
  if (loading) return <div>Loading...</div>;
  
  return (
    <div>
      {isPremium ? (
        <div>You have {plan?.display_name} plan</div>
      ) : (
        <div>You're on the free plan</div>
      )}
    </div>
  );
}
```

## Database Setup

### 1. Create Plans Table

Run this SQL in Supabase SQL Editor:

```sql
CREATE TABLE IF NOT EXISTS public.plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  price_monthly NUMERIC,
  price_yearly NUMERIC,
  currency TEXT DEFAULT 'INR',
  features TEXT[],
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user_subscriptions table (plan_id comes from here, not user profile)
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  plan_id UUID REFERENCES public.plans(id) ON DELETE RESTRICT NOT NULL,
  status TEXT DEFAULT 'active',
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user ON public.user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_plans_display_order ON public.plans(display_order);
```

### 2. Insert Default Plans

```sql
-- Free Plan
INSERT INTO public.plans (name, display_name, description, price_monthly, price_yearly, currency, features, display_order)
VALUES (
  'free',
  'Free',
  'Portfolio Visibility',
  0,
  0,
  'INR',
  ARRAY[
    'Complete portfolio tracking',
    'Net worth dashboard',
    'Asset-wise overview',
    'Full holdings tables',
    'Basic insights (3 per week)',
    'Portfolio analyst (5 queries/month)'
  ],
  1
);

-- Premium Plan
INSERT INTO public.plans (name, display_name, description, price_monthly, price_yearly, currency, features, display_order)
VALUES (
  'premium',
  'Premium',
  'Advanced Insights',
  499,
  4999,
  'INR',
  ARRAY[
    'Everything in Free, plus:',
    'Portfolio Health Score with detailed breakdown',
    'Stability & downside analysis',
    'Scenario-linked impact insights',
    'Advanced analytics (sector, market cap, geography)',
    'Unlimited portfolio analyst queries',
    'PDF reports & Excel exports'
  ],
  2
);
```

### 3. Ensure Every User Has a Subscription

```sql
-- Insert a subscription for each user who doesn't have one (e.g. default to free plan)
INSERT INTO public.user_subscriptions (user_id, plan_id)
SELECT u.id, (SELECT id FROM public.plans WHERE price_monthly = 0 OR price_monthly IS NULL LIMIT 1)
FROM public.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_subscriptions us WHERE us.user_id = u.id
);
```

## RLS Policies

If you need RLS on the plans table (optional, since plans are public data):

```sql
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read active plans
CREATE POLICY "Anyone can view active plans"
  ON public.plans FOR SELECT
  USING (is_active = true);
```

## Notes

1. **No Hardcoded Prices**: All pricing is now fetched from the database
2. **No Hardcoded Plan Names**: Plan names come from `display_name` field
3. **Capability-Based Access**: Feature checks use capability keys, not plan names (see `CAPABILITY_BASED_ACCESS_CONTROL.md`)
4. **Flexible Features**: Features are stored as an array in the database
5. **Automatic Calculations**: Yearly savings are calculated automatically
6. **Currency Support**: Supports different currencies (defaults to INR)
7. **Graceful Degradation**: Frontend handles missing data gracefully

## Capability-Based Access Control

**CRITICAL**: All feature access checks must use capability keys, not plan names.

- Use `useCapabilities()` hook to check specific capabilities
- Use `PremiumFeatureGate` component with `capabilityKey` prop
- See `CAPABILITY_BASED_ACCESS_CONTROL.md` for complete documentation

## Testing

1. Ensure `plans` table exists with at least one plan
2. Ensure `user_subscriptions` exists and every user has a row (plan_id comes from here)
3. Test `/api/plans` endpoint returns plans
4. Test `/api/plans/user` endpoint (requires authentication)
5. Verify landing page displays plans correctly
6. Verify terms page shows dynamic pricing
