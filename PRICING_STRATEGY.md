# WealthLens Pricing Strategy

## Executive Summary

**Model**: Freemium with value-based upgrades  
**Philosophy**: Trust-first, adoption-first, monetize power users  
**Goal**: Maximize free adoption, monetize advanced insights (not basic visibility)

---

## Pricing Tiers

### 🆓 Free Tier: "Portfolio Visibility"
**Target**: All users, especially new investors

**Included**:
- ✅ Complete portfolio tracking (all asset types)
- ✅ Net worth dashboard with performance metrics
- ✅ Asset-wise overview (MF, Equity, FD, Others)
- ✅ Portfolio allocation visualization
- ✅ Basic insights & alerts (up to 3 per week)
- ✅ Full holdings tables (equity, MF, FD, summary)
- ✅ Manual investment entry
- ✅ Portfolio upload (CSV/Excel)
- ✅ Basic portfolio analyst (5 queries/month)

**Value Proposition**: "See everything you own, clearly and accurately"

---

### 💎 Premium Tier: "Advanced Insights"
**Price**: ₹499/month or ₹4,999/year (₹416/month, 17% savings)

**Target**: Power users, serious investors, HNIs

**Additional Features**:
- ✅ **Advanced Analytics Suite**
  - Sector exposure analysis
  - Market cap exposure breakdown
  - Geography exposure (India vs International)
  - Mutual fund exposure analytics (equity/debt breakdown)
  - Combined exposure views

- ✅ **Enhanced Portfolio Analyst**
  - Unlimited queries
  - Deep-dive explanations
  - Context-aware insights
  - Historical trend analysis
  - Goal alignment analysis

- ✅ **Advanced Insights**
  - Unlimited insights per week
  - Concentration risk analysis
  - Diversification recommendations
  - Tax optimization insights
  - Rebalancing suggestions

- ✅ **Weekly Deep Dives**
  - Detailed weekly summaries
  - Performance attribution
  - Risk-adjusted returns
  - Benchmark comparisons

- ✅ **Export & Reporting**
  - PDF portfolio reports
  - Excel exports with analytics
  - Custom date range reports
  - Tax-ready statements

**Value Proposition**: "Understand not just what you own, but how it all connects"

---

## Pricing Philosophy (Landing Page Messaging)

### Core Principles

1. **Free to Start, Always**
   - Basic portfolio visibility is free forever
   - No credit card required
   - No trial expiration anxiety

2. **Pay for Insights, Not Data**
   - Your portfolio data is yours, always visible
   - Premium unlocks deeper analysis and explanations
   - No paywall on basic tracking

3. **No Commissions, No Conflicts**
   - We don't execute trades
   - We don't earn from your investments
   - Our revenue is transparent: subscription only

4. **Upgrade When Ready**
   - Premium features are optional
   - Upgrade only if you want deeper insights
   - Cancel anytime, no questions asked

---

## Landing Page Implementation

### Section: "Simple, Transparent Pricing"

**Placement**: After "Trust & Security", before "Final CTA"

**Design**: Dashboard-style tile, not a pricing table

**Content Structure**:

```
┌─────────────────────────────────────────────────┐
│  Simple, Transparent Pricing                    │
│                                                 │
│  Free to start. Upgrade when you need more.     │
│                                                 │
│  ┌──────────────────┐  ┌──────────────────┐     │
│  │ Free             │  │ Premium          │     │
│  │                  │  │                  │     │
│  │ Portfolio        │  │ Everything in    │     │
│  │ Visibility       │  │ Free, plus:     │     │
│  │                  │  │                  │     │
│  │ • All holdings   │  │ • Advanced       │     │
│  │ • Net worth      │  │   Analytics      │     │
│  │ • Basic insights │  │ • Unlimited     │     │
│  │ • 5 queries/mo   │  │   Analyst        │     │
│  │                  │  │ • Deep insights  │     │
│  │                  │  │                  │     │
│  │ ₹0/month         │  │ ₹499/month       │     │
│  │                  │  │ or ₹4,999/year   │     │
│  └──────────────────┘  └──────────────────┘     │
│                                                 │
│  No credit card required. Cancel anytime.      │
└─────────────────────────────────────────────────┘
```

**Key Messages**:
- "Free to start" (not "Start free trial")
- "Upgrade when you need more" (not "Upgrade now")
- "No credit card required"
- "Cancel anytime"

**Tone**: Calm, confident, no urgency

---

## In-Product Monetization

### Strategy: Soft Paywalls After Value Experience

**Principle**: Show value first, then offer upgrade

### 1. Advanced Analytics Paywall

**Location**: `/analytics/overview` and all analytics screens

**Trigger**: User clicks "View Advanced Analytics" from dashboard

**Implementation**:
```
┌─────────────────────────────────────────────────┐
│  Advanced Analytics                             │
│                                                 │
│  [Analytics content preview - first 2 sections] │
│                                                 │
│  ┌───────────────────────────────────────────┐ │
│  │  Unlock Full Analytics                    │ │
│  │                                            │ │
│  │  Get deeper insights into your portfolio:  │ │
│  │  • Sector exposure analysis               │ │
│  │  • Market cap breakdown                    │ │
│  │  • Geography exposure                      │ │
│  │  • MF exposure analytics                   │ │
│  │                                            │ │
│  │  [Upgrade to Premium]                      │ │
│  │                                            │ │
│  │  ₹499/month or ₹4,999/year                 │ │
│  │  Cancel anytime                            │ │
│  └───────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

**Copy**: Respectful, value-focused, no urgency

---

### 2. Portfolio Analyst Paywall

**Location**: Floating "Get Help" button

**Trigger**: User exceeds 5 queries/month (free tier limit)

**Implementation**:
```
┌─────────────────────────────────────────────────┐
│  Portfolio Analyst                              │
│                                                 │
│  You've used 5 queries this month.             │
│                                                 │
│  Upgrade to Premium for unlimited queries      │
│  and deeper portfolio insights.                │
│                                                 │
│  [Upgrade to Premium]  [Continue with Free]    │
│                                                 │
│  Free tier: 5 queries/month                     │
│  Premium: Unlimited queries + advanced insights│
└─────────────────────────────────────────────────┘
```

**Copy**: Informative, not restrictive

---

### 3. Advanced Insights Paywall

**Location**: Dashboard "Insights & Alerts" section

**Trigger**: User has more than 3 insights available

**Implementation**:
```
┌─────────────────────────────────────────────────┐
│  Insights & Alerts                              │
│                                                 │
│  [First 3 insights shown]                       │
│                                                 │
│  ┌───────────────────────────────────────────┐ │
│  │  You have 5 more insights available       │ │
│  │                                            │ │
│  │  Upgrade to Premium to see all insights   │ │
│  │  including concentration risk analysis,    │ │
│  │  diversification recommendations, and     │ │
│  │  tax optimization insights.                 │ │
│  │                                            │ │
│  │  [View All Insights]                       │ │
│  └───────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

**Copy**: Value-focused, not pushy

---

### 4. Weekly Summary Paywall

**Location**: Dashboard weekly summary section

**Trigger**: User clicks "View Weekly Summary" (free tier shows basic summary)

**Implementation**:
```
┌─────────────────────────────────────────────────┐
│  Weekly Portfolio Summary                       │
│                                                 │
│  [Basic summary shown - 2-3 key points]         │
│                                                 │
│  ┌───────────────────────────────────────────┐ │
│  │  Get the Full Weekly Deep Dive            │ │
│  │                                            │ │
│  │  Premium members get:                     │ │
│  │  • Performance attribution                │ │
│  │  • Risk-adjusted returns                  │ │
│  │  • Benchmark comparisons                  │ │
│  │  • Detailed trend analysis                │ │
│  │                                            │ │
│  │  [Upgrade to Premium]                     │ │
│  └───────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

**Copy**: Educational, not salesy

---

## Upgrade Flow Design

### Principles

1. **Context-Aware**: Show upgrade option where value is clear
2. **No Interruption**: Never block access to free features
3. **Respectful**: "Upgrade when ready" not "Upgrade now"
4. **Transparent**: Clear pricing, no hidden fees

### Upgrade Modal Design

```
┌─────────────────────────────────────────────────┐
│  Upgrade to Premium                             │
│                                                 │
│  Unlock advanced insights and analytics         │
│                                                 │
│  ✓ Advanced Analytics Suite                    │
│    Sector, market cap, geography exposure       │
│                                                 │
│  ✓ Unlimited Portfolio Analyst                 │
│    Deep-dive explanations, unlimited queries     │
│                                                 │
│  ✓ Advanced Insights                            │
│    Concentration risk, diversification, tax     │
│                                                 │
│  ✓ Weekly Deep Dives                            │
│    Performance attribution, benchmarks          │
│                                                 │
│  ┌───────────────────────────────────────────┐ │
│  │  Choose Your Plan                         │ │
│  │                                            │ │
│  │  [Monthly]  [Yearly - Save 17%]           │ │
│  │                                            │ │
│  │  ₹499/month                                │ │
│  │  or                                        │ │
│  │  ₹4,999/year (₹416/month)                 │ │
│  │                                            │ │
│  │  [Continue with Free]  [Upgrade Now]      │ │
│  └───────────────────────────────────────────┘ │
│                                                 │
│  Cancel anytime. No questions asked.            │
└─────────────────────────────────────────────────┘
```

---

## Trust & Compliance

### SEBI Compliance

- ✅ No investment advice
- ✅ No execution services
- ✅ No AUM-based fees
- ✅ No commission structure
- ✅ Transparent subscription model

### Trust Signals

- "Read-only access" (no execution)
- "No commissions" (no conflicts)
- "Cancel anytime" (no lock-in)
- "Your data, always visible" (no paywall on basics)

---

## Pricing Psychology

### What Works

1. **Free Forever**: Basic visibility never expires
2. **Value-Based**: Pay for insights, not data
3. **No Pressure**: Upgrade when ready, not now
4. **Transparent**: Clear pricing, no surprises

### What to Avoid

1. ❌ "Limited time offer"
2. ❌ "Only X spots left"
3. ❌ "Upgrade now or lose access"
4. ❌ Complex pricing tiers
5. ❌ Hidden fees or charges

---

## Success Metrics

### Adoption Metrics
- Free tier signups
- Portfolio uploads (free tier)
- Active users (free tier)

### Conversion Metrics
- Free → Premium conversion rate
- Time to upgrade (days from signup)
- Feature usage before upgrade

### Retention Metrics
- Premium churn rate
- Premium renewal rate
- Feature engagement (premium)

---

## Implementation Checklist

### Landing Page
- [ ] Add "Simple, Transparent Pricing" section
- [ ] Use dashboard-style tiles (not pricing table)
- [ ] Emphasize "Free to start"
- [ ] Include trust signals

### In-Product
- [ ] Implement Advanced Analytics paywall
- [ ] Implement Portfolio Analyst query limit
- [ ] Implement Advanced Insights paywall
- [ ] Implement Weekly Summary paywall
- [ ] Create upgrade modal component
- [ ] Add subscription management page

### Backend
- [ ] Create subscription table
- [ ] Implement tier checking middleware
- [ ] Add feature flags for premium features
- [ ] Create payment integration (Razorpay/Stripe)

---

## Next Steps

1. **Phase 1**: Landing page pricing philosophy section
2. **Phase 2**: In-product soft paywalls
3. **Phase 3**: Payment integration
4. **Phase 4**: Subscription management
5. **Phase 5**: Analytics and optimization

---

**Status**: Strategy defined, ready for implementation  
**Approach**: Trust-first, value-based, no-pressure monetization








