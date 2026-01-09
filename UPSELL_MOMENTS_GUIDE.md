# In-Product Upsell Moments - Implementation Guide

## Overview

Trust-first, non-intrusive upsell components that appear only on user-initiated actions. Never block core functionality or use aggressive tactics.

---

## Components Created

### 1. `PremiumUpsell.tsx`
**Purpose**: General-purpose upsell component

**Variants**:
- `inline`: Small banner within content
- `card`: Larger card with benefits list

**Usage**:
```tsx
<PremiumUpsell
  feature="Advanced Analytics"
  description="Get deeper insights into your portfolio"
  benefits={[
    "Sector exposure analysis",
    "Market cap breakdown",
    "Geography exposure"
  ]}
  variant="card"
/>
```

---

### 2. `QueryLimitBanner.tsx`
**Purpose**: Shows when user reaches free tier query limit

**Usage**:
```tsx
<QueryLimitBanner
  currentQueries={5}
  limit={5}
  resetDate="January 1, 2025"
/>
```

**Location**: Portfolio Analyst panel, FloatingCopilot component

---

### 3. `InsightsLimitBanner.tsx`
**Purpose**: Shows when user has more insights than free tier limit

**Usage**:
```tsx
<InsightsLimitBanner
  totalInsights={8}
  shownInsights={3}
/>
```

**Location**: Dashboard "Insights & Alerts" section

---

### 4. `PremiumFeatureGate.tsx`
**Purpose**: Wraps premium features with preview + upsell

**Usage**:
```tsx
<PremiumFeatureGate
  hasAccess={isPremium}
  preview={<BasicAnalyticsPreview />}
  featureName="Advanced Analytics"
  description="Get deeper exposure insights"
  benefits={["Sector analysis", "Market cap breakdown"]}
>
  <FullAdvancedAnalytics />
</PremiumFeatureGate>
```

---

## Upsell Moments

### 1. "Explain More" Interactions

**Location**: Analytics screens, Holdings tables

**Trigger**: User clicks "Why?" or "Explain" button

**Implementation**:
```tsx
// In analytics/sector-exposure/page.tsx
<button onClick={() => setShowExplanation(!showExplanation)}>
  Why?
</button>

{showExplanation && (
  <div>
    {/* Basic explanation for free users */}
    <p>Your Banking sector exposure is 29% because...</p>
    
    {/* Premium upsell for deeper analysis */}
    {!isPremium && (
      <PremiumUpsell
        feature="Deep Sector Analysis"
        description="Get detailed breakdown of sector exposure, concentration risks, and diversification recommendations"
        benefits={[
          "Historical sector trends",
          "Concentration risk alerts",
          "Diversification suggestions"
        ]}
        variant="inline"
      />
    )}
  </div>
)}
```

---

### 2. Exposure Analytics Views

**Location**: `/analytics/overview` and all analytics screens

**Trigger**: User navigates to analytics (user-initiated)

**Implementation**:
```tsx
// In analytics/overview/page.tsx
import PremiumFeatureGate from '@/components/PremiumFeatureGate';

<PremiumFeatureGate
  hasAccess={isPremium}
  preview={
    <div>
      <h3>Analytics Overview</h3>
      <p>Basic ownership vs exposure comparison shown here...</p>
      {/* Show first 2 analytics cards as preview */}
    </div>
  }
  featureName="Advanced Analytics Suite"
  description="Unlock full exposure analytics including sector, market cap, and geography breakdowns"
  benefits={[
    "Sector exposure analysis",
    "Market cap exposure breakdown",
    "Geography exposure (India vs International)",
    "MF exposure analytics (equity/debt breakdown)"
  ]}
>
  {/* Full analytics content */}
  <AnalyticsCards />
</PremiumFeatureGate>
```

---

### 3. Historical Performance Views

**Location**: Dashboard performance section, Holdings detail pages

**Trigger**: User clicks "View Performance History" or "See Trends"

**Implementation**:
```tsx
// In dashboard or holdings page
{userClicksViewHistory && (
  <>
    {isPremium ? (
      <PerformanceHistoryChart />
    ) : (
      <>
        <p className="text-sm text-[#6B7280] mb-4">
          View last 30 days performance
        </p>
        <PremiumUpsell
          feature="Historical Performance Analysis"
          description="See performance trends, attribution, and benchmark comparisons"
          benefits={[
            "Multi-year performance charts",
            "Performance attribution",
            "Benchmark comparisons",
            "Risk-adjusted returns"
          ]}
          variant="card"
        />
      </>
    )}
  </>
)}
```

---

### 4. Advanced Risk or Health Analysis

**Location**: Dashboard insights, Analytics screens

**Trigger**: User clicks "View Risk Analysis" or "Portfolio Health"

**Implementation**:
```tsx
// In dashboard insights section
{userClicksRiskAnalysis && (
  <>
    {isPremium ? (
      <AdvancedRiskAnalysis />
    ) : (
      <>
        <div className="bg-[#F6F8FB] rounded-lg p-4 mb-4">
          <p className="text-sm text-[#475569]">
            Basic risk indicators: Concentration risk detected in Banking sector (29%)
          </p>
        </div>
        <PremiumUpsell
          feature="Advanced Risk Analysis"
          description="Get comprehensive risk assessment and health scoring"
          benefits={[
            "Portfolio health score",
            "Risk-adjusted returns",
            "Diversification score",
            "Tax efficiency analysis"
          ]}
          variant="card"
        />
      </>
    )}
  </>
)}
```

---

### 5. Monthly Insight Usage Limits

**Location**: Dashboard "Insights & Alerts" section

**Trigger**: User has more than 3 insights (free tier limit)

**Implementation**:
```tsx
// In dashboard/page.tsx
import InsightsLimitBanner from '@/components/InsightsLimitBanner';

<section className="mb-16 bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
  <div className="px-6 py-4 border-b border-[#E5E7EB]">
    <h2 className="text-lg font-semibold text-[#0F172A]">Insights & Alerts</h2>
  </div>
  
  <div className="divide-y divide-[#E5E7EB]">
    {portfolio.insights.slice(0, 3).map((insight) => (
      // Show first 3 insights
    ))}
  </div>
  
  {/* Show banner if more insights available */}
  <InsightsLimitBanner
    totalInsights={portfolio.insights.length}
    shownInsights={3}
  />
</section>
```

---

## Subscription Status Hook

Create a hook to check subscription status (mock for now):

```tsx
// src/hooks/useSubscription.ts
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';

export function useSubscription() {
  const { user } = useAuth();
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    // TODO: Replace with actual API call
    // const response = await fetch(`/api/subscription/status?user_id=${user.id}`);
    // const data = await response.json();
    // setIsPremium(data.tier === 'premium');

    // Mock for now
    setIsPremium(false);
    setLoading(false);
  }, [user?.id]);

  return { isPremium, loading };
}
```

---

## Copy Guidelines

### ✅ Do's

- "Unlock deeper analysis"
- "Available in Premium"
- "Get advanced insights"
- "Upgrade when ready"
- "See all insights"

### ❌ Don'ts

- "Limited time offer"
- "Only X spots left"
- "Upgrade now or lose access"
- "Act fast"
- "Don't miss out"

### Tone Examples

**✅ Good**:
```
"Unlock deeper analysis
Get sector exposure breakdown, market cap analysis, and geography exposure insights."
```

**❌ Bad**:
```
"🚨 LIMITED TIME! Upgrade now to unlock premium features!"
```

---

## Visual Guidelines

### Inline Upsell
- Background: `#F6F8FB`
- Border: `#E5E7EB`
- Text: Calm, professional
- CTA: Subtle blue link, not button

### Card Upsell
- White card with border
- Icon: Subtle blue sparkle
- Benefits: Bullet list
- CTA: Soft blue button

### Banner
- Non-intrusive background
- Info icon
- Clear message
- Subtle CTA link

---

## Integration Checklist

### Dashboard
- [ ] Add `InsightsLimitBanner` to Insights section
- [ ] Add premium gate to historical performance (if implemented)
- [ ] Add premium gate to advanced risk analysis (if implemented)

### Analytics
- [ ] Add `PremiumFeatureGate` to analytics overview
- [ ] Add inline upsell to "Explain" interactions
- [ ] Add premium gate to detailed analytics screens

### Portfolio Analyst
- [ ] Add `QueryLimitBanner` to FloatingCopilot
- [ ] Track query usage
- [ ] Show banner at limit

### Holdings
- [ ] Add inline upsell to "Explain" buttons
- [ ] Add premium gate to historical performance views

---

## Testing Checklist

- [ ] Upsells appear only on user-initiated actions
- [ ] No blocking of core functionality
- [ ] Copy is calm and respectful
- [ ] Visual design matches dashboard style
- [ ] Mobile responsive
- [ ] Premium users don't see upsells
- [ ] Free users can continue using free features

---

**Status**: Components created, ready for integration  
**Approach**: Trust-first, value-based, non-intrusive









