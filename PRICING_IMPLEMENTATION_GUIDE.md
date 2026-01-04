# Pricing Strategy - Implementation Guide

## Overview

This document provides implementation guidance for the WealthLens pricing strategy, focusing on trust-first monetization through soft paywalls and value-based upgrades.

---

## Landing Page Pricing Section

### Location
- **Section**: After "Trust & Security", before "Final CTA"
- **Design**: Dashboard-style tiles (not traditional pricing table)
- **Tone**: Calm, confident, no urgency

### Key Messages
1. "Free to start" (not "Start free trial")
2. "Upgrade when you need more" (not "Upgrade now")
3. "No credit card required"
4. "Cancel anytime"
5. "Your portfolio data is always visible"

### Implementation Status
✅ **Complete**: Pricing section added to landing page (`src/app/page.tsx`)

---

## In-Product Monetization Components

### 1. Advanced Analytics Paywall

**Component**: `PremiumPaywall.tsx` (to be created)

**Usage**:
```tsx
<PremiumPaywall 
  feature="Advanced Analytics"
  description="Get deeper insights into your portfolio"
  benefits={[
    "Sector exposure analysis",
    "Market cap breakdown",
    "Geography exposure",
    "MF exposure analytics"
  ]}
/>
```

**Location**: `/analytics/overview` and all analytics screens

**Behavior**:
- Show first 2 sections of analytics (preview)
- Display paywall card below preview
- Allow user to continue viewing free features
- No blocking or interruption

---

### 2. Portfolio Analyst Query Limit

**Component**: `QueryLimitBanner.tsx` (to be created)

**Usage**:
```tsx
<QueryLimitBanner 
  currentQueries={5}
  limit={5}
  onUpgrade={() => router.push('/upgrade')}
/>
```

**Location**: Floating "Get Help" button / Portfolio Analyst panel

**Behavior**:
- Track queries per month (free tier: 5/month)
- Show banner when limit reached
- Allow viewing previous queries
- Offer upgrade option (non-blocking)

---

### 3. Advanced Insights Paywall

**Component**: `InsightsPaywall.tsx` (to be created)

**Usage**:
```tsx
<InsightsPaywall 
  totalInsights={8}
  shownInsights={3}
  onUpgrade={() => router.push('/upgrade')}
/>
```

**Location**: Dashboard "Insights & Alerts" section

**Behavior**:
- Show first 3 insights (free tier)
- Display card: "You have X more insights available"
- Link to upgrade (non-blocking)
- Allow user to continue with free tier

---

### 4. Weekly Summary Paywall

**Component**: `WeeklySummaryPaywall.tsx` (to be created)

**Usage**:
```tsx
<WeeklySummaryPaywall 
  basicSummary={basicSummary}
  onUpgrade={() => router.push('/upgrade')}
/>
```

**Location**: Dashboard weekly summary section

**Behavior**:
- Show basic summary (2-3 key points) for free tier
- Display upgrade card for full deep dive
- Non-blocking, respectful

---

## Upgrade Flow

### Upgrade Modal Component

**Component**: `UpgradeModal.tsx` (to be created)

**Features**:
- Plan selection (Monthly/Yearly)
- Feature comparison
- Clear pricing
- "Continue with Free" option
- Trust signals

**Design**:
- Dashboard-style modal
- Calm, professional tone
- No urgency language
- Clear value proposition

---

## Subscription Management

### Subscription Status Page

**Route**: `/settings/subscription` (to be created)

**Features**:
- Current plan display
- Usage statistics (queries, insights)
- Upgrade/downgrade options
- Billing history
- Cancel subscription (easy, no friction)

---

## Backend Requirements

### Database Schema

**Table**: `subscriptions`
```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  tier TEXT NOT NULL DEFAULT 'free', -- 'free' | 'premium'
  status TEXT NOT NULL DEFAULT 'active', -- 'active' | 'cancelled' | 'expired'
  billing_period TEXT, -- 'monthly' | 'yearly'
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Table**: `subscription_usage`
```sql
CREATE TABLE subscription_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  month DATE NOT NULL, -- YYYY-MM-01 format
  analyst_queries INTEGER DEFAULT 0,
  insights_viewed INTEGER DEFAULT 0,
  analytics_views INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, month)
);
```

### API Endpoints

**GET `/api/subscription/status`**
- Returns current subscription tier and usage

**POST `/api/subscription/upgrade`**
- Initiates upgrade flow
- Creates subscription record
- Redirects to payment gateway

**POST `/api/subscription/cancel`**
- Cancels subscription
- Keeps access until period end
- No immediate revocation

**GET `/api/subscription/usage`**
- Returns current month usage
- Used for paywall logic

---

## Feature Flags

### Implementation

Use environment variables or database flags:

```typescript
// Feature access check
function hasFeatureAccess(userId: string, feature: string): boolean {
  const subscription = getSubscription(userId);
  
  if (feature === 'advanced_analytics') {
    return subscription.tier === 'premium';
  }
  
  if (feature === 'unlimited_analyst') {
    return subscription.tier === 'premium';
  }
  
  if (feature === 'advanced_insights') {
    return subscription.tier === 'premium';
  }
  
  return true; // Free tier access
}
```

---

## Payment Integration

### Recommended: Razorpay (India)

**Why Razorpay**:
- Indian payment gateway
- Supports UPI, cards, netbanking
- Subscription management built-in
- Good documentation

**Alternative**: Stripe (if international expansion planned)

### Integration Steps

1. Create Razorpay account
2. Get API keys
3. Install Razorpay SDK
4. Create subscription plans in Razorpay dashboard
5. Implement webhook handler for payment events
6. Update subscription status in database

---

## Copy Guidelines

### Do's ✅

- "Free to start"
- "Upgrade when you need more"
- "Your portfolio data is always visible"
- "Cancel anytime"
- "No credit card required"
- "Upgrade only when ready"

### Don'ts ❌

- "Limited time offer"
- "Only X spots left"
- "Upgrade now or lose access"
- "Act fast"
- "Don't miss out"
- "Exclusive deal"

### Tone

- **Calm**: No urgency, no pressure
- **Confident**: Clear value, no hype
- **Respectful**: User's choice, not pushy
- **Transparent**: Clear pricing, no surprises

---

## Testing Checklist

### Landing Page
- [ ] Pricing section displays correctly
- [ ] Mobile responsive
- [ ] Trust messages visible
- [ ] No urgency language

### In-Product Paywalls
- [ ] Advanced Analytics paywall shows preview
- [ ] Query limit banner appears at limit
- [ ] Insights paywall shows after 3 insights
- [ ] Weekly summary paywall shows basic summary
- [ ] All paywalls are non-blocking

### Upgrade Flow
- [ ] Upgrade modal displays correctly
- [ ] Plan selection works
- [ ] Payment integration functional
- [ ] Subscription status updates

### Subscription Management
- [ ] Status page shows current plan
- [ ] Usage statistics accurate
- [ ] Cancel flow is easy
- [ ] Access continues until period end

---

## Analytics to Track

### Adoption Metrics
- Free tier signups
- Portfolio uploads (free tier)
- Active users (free tier)
- Feature usage (free tier)

### Conversion Metrics
- Free → Premium conversion rate
- Time to upgrade (days from signup)
- Feature usage before upgrade
- Paywall click-through rate

### Retention Metrics
- Premium churn rate
- Premium renewal rate
- Feature engagement (premium)
- Downgrade rate (premium → free)

---

## Next Steps

1. **Phase 1**: Landing page pricing section ✅ (Complete)
2. **Phase 2**: Create paywall components
3. **Phase 3**: Implement subscription database schema
4. **Phase 4**: Build subscription management page
5. **Phase 5**: Integrate payment gateway
6. **Phase 6**: Add feature flags and access control
7. **Phase 7**: Implement usage tracking
8. **Phase 8**: Test and optimize

---

**Status**: Strategy defined, landing page complete, ready for in-product implementation  
**Approach**: Trust-first, value-based, no-pressure monetization








