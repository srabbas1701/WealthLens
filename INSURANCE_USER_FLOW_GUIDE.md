# Insurance Module - User Flow & Visual Guide

## User Journey

### 1. First Visit - Empty State

**Dashboard**
```
┌─────────────────────────────────────┐
│  LensOnWealth Portfolio              │
├─────────────────────────────────────┤
│                                     │
│  Liabilities & Protection           │
│  ┌──────────────┐ ┌──────────────┐ │
│  │ Liabilities  │ │ Insurance    │ │
│  │              │ │              │ │
│  │ Manage       │ │ View         │ │ ← NEW: Active link!
│  │ Liabilities  │ │ Insurance    │ │
│  └──────────────┘ └──────────────┘ │
│                                     │
└─────────────────────────────────────┘
```

**Click "View Insurance" →**

### 2. Insurance Dashboard - Empty

```
┌────────────────────────────────────────┐
│ Protection & Insurance                 │
│ Manage your insurance policies          │
│                                   [+ Add] │
├────────────────────────────────────────┤
│                                        │
│  No insurance policies added yet       │
│                                        │
│  ┌──────────────────────────────────┐ │
│  │  Add Your First Policy            │ │
│  └──────────────────────────────────┘ │
│                                        │
└────────────────────────────────────────┘
```

**Click "Add Insurance" →**

### 3. Add Insurance - Step 1: Category

```
┌────────────────────────────────────────┐
│  Select Category                       │
│  What type of insurance are you adding?│
│                                        │
│  Progress: [1][2][3][4][5]            │
│            ✓ Active                    │
├────────────────────────────────────────┤
│                                        │
│  ┌──────────────┐  ┌──────────────┐  │
│  │ 🧬 Life      │  │ 🏥 Health    │  │
│  │ Insurance    │  │ Insurance    │  │
│  └──────────────┘  └──────────────┘  │
│                                        │
│  ┌──────────────┐  ┌──────────────┐  │
│  │ 🚗 Motor     │  │ 🏠 Home      │  │
│  │ Insurance    │  │ Insurance    │  │
│  └──────────────┘  └──────────────┘  │
│                                        │
│  [Previous] Step 1 of 5 [Next]        │
└────────────────────────────────────────┘
```

**Select Life → Next →**

### 4. Add Insurance - Step 2: Details

```
┌────────────────────────────────────────┐
│  Policy Details                        │
│  Enter your policy information         │
│                                        │
│  Progress: [✓][2][3][4][5]            │
│             ✓ Active                   │
├────────────────────────────────────────┤
│                                        │
│  Policy Number *                       │
│  [POL123456789 ____________]          │
│                                        │
│  Provider Name *                       │
│  [HDFC Life ________________]         │
│                                        │
│  Policy Name *                         │
│  [Term Plan 1 Crore ________]         │
│                                        │
│  [Previous] Step 2 of 5 [Next]        │
└────────────────────────────────────────┘
```

**Fill in → Next →**

### 5. Add Insurance - Step 3: Coverage

```
┌────────────────────────────────────────┐
│  Coverage & Premium                    │
│  Set coverage amount and premium       │
│                                        │
│  Progress: [✓][✓][3][4][5]            │
│              ✓ Active                  │
├────────────────────────────────────────┤
│                                        │
│  Sum Assured (₹) *                     │
│  [10000000 ________________]           │
│                                        │
│  Annual Premium (₹) *                  │
│  [5000 ___________________]            │
│                                        │
│  Monthly Premium (₹)                   │
│  [Auto-calculated] ________]          │
│                                        │
│  Start Date *                          │
│  [2023-01-01 _____________]           │
│                                        │
│  End Date / Maturity                   │
│  [2040-01-01 _____________]           │
│                                        │
│  [Previous] Step 3 of 5 [Next]        │
└────────────────────────────────────────┘
```

**Fill in → Next →**

### 6. Add Insurance - Step 4: Nominee

```
┌────────────────────────────────────────┐
│  Nominee & Plan                        │
│  Nominee details and plan type         │
│                                        │
│  Progress: [✓][✓][✓][4][5]            │
│               ✓ Active                 │
├────────────────────────────────────────┤
│                                        │
│  Plan Type *                           │
│  [TERM ▼ _________________]            │
│  Options: TERM, ULIP, ENDOWMENT       │
│           WHOLE_LIFE, CHILD            │
│                                        │
│  Nominee Name                          │
│  [Spouse Name ____________]           │
│                                        │
│  Relation to Nominee                   │
│  [Spouse ________________]             │
│                                        │
│  Next Renewal Date                     │
│  [2024-01-01 _____________]           │
│                                        │
│  [Previous] Step 4 of 5 [Next]        │
└────────────────────────────────────────┘
```

**Fill in → Next →**

### 7. Add Insurance - Step 5: Document

```
┌────────────────────────────────────────┐
│  Upload Document                       │
│  Upload your policy document (optional)│
│                                        │
│  Progress: [✓][✓][✓][✓][5]            │
│                ✓ Active                │
├────────────────────────────────────────┤
│                                        │
│  Policy Document (PDF)                 │
│                                        │
│  ┌──────────────────────────────────┐ │
│  │  📤 Click to upload PDF           │ │
│  │  (or drag & drop)                 │ │
│  └──────────────────────────────────┘ │
│                                        │
│  [Previous] Step 5 of 5 [Add Policy]  │
└────────────────────────────────────────┘
```

**Skip or upload → Add Policy →**

### 8. Insurance Dashboard - With Policy

```
┌────────────────────────────────────────┐
│ Protection & Insurance                 │
│ Manage your insurance policies          │
│                                   [+ Add] │
├────────────────────────────────────────┤
│                                        │
│  Life Cover: ₹1.00 Cr                  │
│  Health Coverage: ₹0.00                │
│  Annual Premium: ₹5,000                │
│  Active Policies: 1                    │
│                                        │
│  ┌────────────────────────────────┐   │
│  │ Group by: Category ▼           │   │
│  └────────────────────────────────┘   │
│                                        │
│  🧬 Life Insurance                     │
│  ┌────────────────────────────────┐   │
│  │ Term Plan 1 Crore       ✓Active │   │
│  │ HDFC Life • POL123456789        │   │
│  │                                 │   │
│  │ Sum Assured: ₹1,00,00,000       │   │
│  │ Annual Premium: ₹5,000          │   │
│  │ Expires in: 5475 days           │   │
│  └────────────────────────────────┘   │
│                                        │
└────────────────────────────────────────┘
```

**Click policy →**

### 9. Policy Detail - View Mode

```
┌────────────────────────────────────────┐
│ 🧬 Term Plan 1 Crore            [Edit] │
│ Life Insurance                          │
│ HDFC Life • Policy #POL123456789       │
│                              ✓ ACTIVE  │
├────────────────────────────────────────┤
│                                        │
│  ┌──────────┐ ┌──────────┐            │
│  │ Sum      │ │ Annual   │            │
│  │ Assured  │ │ Premium  │            │
│  │ ₹1 Cr    │ │ ₹5,000   │            │
│  └──────────┘ └──────────┘            │
│                                        │
│  ┌──────────┐ ┌──────────┐            │
│  │ Provider │ │ Expires  │            │
│  │ HDFC Life│ │ 5475 days│            │
│  └──────────┘ └──────────┘            │
│                                        │
│  Policy Details                        │
│  Start: 01 Jan 2023                    │
│  End: 01 Jan 2040                      │
│  Nominee: Spouse (Spouse)              │
│  Monthly: ₹417                         │
│                                        │
│  [Back] [Delete Policy]               │
└────────────────────────────────────────┘
```

**Click Edit →**

### 10. Policy Detail - Edit Mode

```
┌────────────────────────────────────────┐
│ 🧬 Term Plan 1 Crore            ← Back │
├────────────────────────────────────────┤
│                                        │
│  Policy Details                        │
│                                        │
│  Policy Name                           │
│  [Term Plan 1 Crore ________]         │
│                                        │
│  Provider Name                         │
│  [HDFC Life ________________]         │
│                                        │
│  Sum Assured (₹)                       │
│  [10000000 ________________]           │
│                                        │
│  Annual Premium (₹)                    │
│  [5000 ___________________]            │
│                                        │
│  End Date                              │
│  [2040-01-01 _____________]           │
│                                        │
│  Next Renewal                          │
│  [2024-01-01 _____________]           │
│                                        │
│  Nominee Name                          │
│  [Spouse ________________]             │
│                                        │
│                    [Cancel] [Save]    │
└────────────────────────────────────────┘
```

**Edit fields → Save →**

### 11. Dashboard - With Alerts

```
┌────────────────────────────────────────┐
│ Protection & Insurance                 │
├────────────────────────────────────────┤
│                                        │
│  ⚠️ 1 policy(ies) expiring in 30 days  │
│  Consider renewing before expiry       │
│                                        │
│  ℹ️ Life cover below recommended       │
│  Your: ₹50L, Recommended: ₹1 Cr       │
│                                        │
│  KPI Metrics                           │
│  [Life] [Health] [Premium] [Active]   │
│                                        │
│  [Group by: Category ▼]                │
│                                        │
│  🧬 Life Insurance                     │
│  [Term Plan... ✓Active Exp in 15d]    │
│                                        │
│  🏥 Health Insurance                   │
│  [No policies yet]                     │
│                                        │
└────────────────────────────────────────┘
```

---

## Alert Examples

### Alert Type 1: Expiring Soon
```
┌────────────────────────────────────────┐
│ ⚠️ 2 policy(ies) expiring in 30 days   │
│ Consider renewing before expiry        │
│ to avoid coverage gap                  │
└────────────────────────────────────────┘
```

### Alert Type 2: Expired
```
┌────────────────────────────────────────┐
│ 🔴 2 policy(ies) have expired          │
│ Your coverage has lapsed. Consider     │
│ renewing immediately.                  │
└────────────────────────────────────────┘
```

### Alert Type 3: Low Life Cover
```
┌────────────────────────────────────────┐
│ ℹ️ Life cover below recommended        │
│ Your cover: ₹50,00,000                 │
│ Recommended: ₹1,00,00,000 (10x income) │
└────────────────────────────────────────┘
```

### Alert Type 4: Low Health Cover
```
┌────────────────────────────────────────┐
│ ℹ️ Health cover below ₹5,00,000        │
│ Consider increasing coverage           │
│ for better protection                  │
└────────────────────────────────────────┘
```

---

## Status Badges

### ✅ Active (Green)
```
┌────────────────────────────────────────┐
│  ✓ ACTIVE                              │
│ [Green background, checkmark]         │
└────────────────────────────────────────┘
```

### 🔴 Expired (Red)
```
┌────────────────────────────────────────┐
│  EXPIRED                               │
│ [Red background, serious tone]        │
└────────────────────────────────────────┘
```

### 🟠 Lapsed (Orange)
```
┌────────────────────────────────────────┐
│  LAPSED                                │
│ [Orange background, caution tone]     │
└────────────────────────────────────────┘
```

### ⚪ Inactive (Gray)
```
┌────────────────────────────────────────┐
│  INACTIVE                              │
│ [Gray background, neutral tone]       │
└────────────────────────────────────────┘
```

---

## Category Icons

| Category | Icon | Example |
|----------|------|---------|
| Life Insurance | 🧬 | Term, ULIP |
| Health Insurance | 🏥 | Individual, Family |
| Motor Insurance | 🚗 | 4-wheeler, 2-wheeler |
| Home Insurance | 🏠 | Buildings, Contents |
| Travel Insurance | ✈️ | Domestic, International |
| Personal Accident | ⚠️ | Accidental coverage |
| Other | 📋 | Miscellaneous |

---

## Grouping Options

### Group by Category
```
🧬 Life Insurance (2 policies)
   • Term Plan 1 Crore
   • ULIP Plan

🏥 Health Insurance (1 policy)
   • Family Floater ₹10L

🚗 Motor Insurance (1 policy)
   • Car Insurance
```

### Group by Status
```
✓ ACTIVE (3 policies)
   • All your active coverage

🔴 EXPIRED (1 policy)
   • Needs renewal

🟠 LAPSED (0 policies)
   • None
```

---

## Mobile Layout

### Dashboard (Mobile)
```
┌──────────────────┐
│ Protection       │
│ [+ Add]          │
├──────────────────┤
│ Life: ₹1 Cr      │
│ Health: ₹5L      │
│ Premium: ₹5K     │
│ Active: 2        │
├──────────────────┤
│ ⚠️ Expiring soon  │
├──────────────────┤
│ 🧬 Life Ins.     │
│ [Policy 1      →]│
│ [Policy 2      →]│
├──────────────────┤
│ 🏥 Health Ins.   │
│ [Policy 1      →]│
└──────────────────┘
```

### Add Policy (Mobile - Step View)
```
┌──────────────────┐
│ Select Category  │
│ What type? 1/5   │
├──────────────────┤
│ [🧬 Life]        │
│ [🏥 Health]      │
│ [🚗 Motor]       │
│ [🏠 Home]        │
│ [✈️ Travel]      │
│                  │
│ [Prev] [Next]   │
└──────────────────┘
```

---

## Dark Mode

### Example: Active Policy (Dark)
```
┌────────────────────────────────────────┐
│ Background: #1E293B (dark slate)       │
│ Text: #F8FAFC (off-white)              │
│ Accent: #2563EB (blue)                 │
│                                        │
│ 🧬 Term Plan 1 Crore        ✓ ACTIVE  │
│ HDFC Life • POL123456789               │
│                                        │
│ ₹1,00,00,000 | ₹5,000/year | +5475d  │
│                                        │
│ [Dark theme applied throughout]       │
└────────────────────────────────────────┘
```

---

## Responsive Breakpoints

| Size | Layout | Columns |
|------|--------|---------|
| Mobile (< 640px) | Single | 1 |
| Tablet (640-1024px) | 2-col | 2 |
| Desktop (> 1024px) | 3-col | 3-4 |

All text sizes scale appropriately.

---

## Touch-Friendly Design

✅ Buttons: Minimum 44x44px for touch
✅ Spacing: 16px gap between interactive elements
✅ Inputs: Large enough for mobile typing
✅ Modals: Full-width on mobile, centered on desktop

---

## Accessibility

✅ Semantic HTML (buttons, forms, sections)
✅ Color contrast ratios > 4.5:1
✅ Keyboard navigation support
✅ ARIA labels for icons
✅ Form labels properly associated

---

## Summary

**Complete User Experience from signup to ongoing management:**
1. Empty state → clear CTA
2. 5-step guided form → no confusion
3. Clear dashboard → insights at glance
4. Smart alerts → timely reminders
5. Easy edit/delete → control over data
6. Mobile-first → works everywhere
7. Dark mode → comfortable any time
8. Accessible → for all users
