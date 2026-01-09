# Error States & Trust-Safe Fallbacks - Visual Design Guide

## Component Examples

### 1. Data Consolidation State

**Full Screen Example**:
```
┌─────────────────────────────────────────────────────────┐
│                                                          │
│                    [Spinner]                            │
│                                                          │
│              Data being consolidated                     │
│                                                          │
│        We're processing your portfolio data.            │
│        This may take a few moments.                      │
│                                                          │
│        Last updated: Dec 24, 2024, 10:30 AM             │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

**Inline Example** (within a card):
```
┌─────────────────────────────────────────┐
│ Net Worth                               │
│                                         │
│    [Spinner]                           │
│    Data being consolidated              │
│                                         │
│    Last updated: Dec 24, 10:30 AM      │
└─────────────────────────────────────────┘
```

**CSS**:
```css
.data-consolidation {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  text-align: center;
}

.data-consolidation-spinner {
  width: 2rem;
  height: 2rem;
  border: 4px solid #E5E7EB;
  border-top-color: #2563EB;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.data-consolidation-title {
  font-size: 1rem;
  font-weight: 500;
  color: #0F172A;
  margin-top: 1rem;
  margin-bottom: 0.5rem;
}

.data-consolidation-message {
  font-size: 0.875rem;
  color: #6B7280;
  margin-bottom: 1rem;
}

.data-consolidation-timestamp {
  font-size: 0.75rem;
  color: #6B7280;
}
```

---

### 2. Partial Data Banner

**Visual Design**:
```
┌─────────────────────────────────────────────────────────┐
│ ⚠ Partial Data Available                                │
│                                                          │
│ Your portfolio shows data from:                         │
│ • Zerodha account (synced)                              │
│ • HDFC Bank FDs (synced)                                │
│                                                          │
│ Data not yet available from:                            │
│ • ICICI Direct account                                  │
│ • Paytm Money MF holdings                              │
│                                                          │
│ We're working to sync all accounts.                     │
└─────────────────────────────────────────────────────────┘
```

**Color Scheme**:
- Background: `#FEF3C7` (light amber)
- Border: `#F59E0B` with 20% opacity
- Icon: `#F59E0B` (amber)
- Text: `#92400E` (dark amber)

**Layout**:
- Icon on left (flex-shrink-0)
- Content on right (flex-1)
- Lists with bullet points
- Clear separation between synced and pending

---

### 3. Calculation Unavailable

**Visual Design**:
```
┌─────────────────────────────────────────┐
│ XIRR Calculation                        │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ [Calculation unavailable]           │ │
│ │                                      │ │
│ │ XIRR requires transaction history   │ │
│ │ to calculate accurately.             │ │
│ │                                      │ │
│ │ Your portfolio shows current         │ │
│ │ holdings but no transaction data.    │ │
│ │                                      │ │
│ │ [Upload Transaction History]        │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

**Key Elements**:
- Clear heading: "XIRR Calculation"
- Muted background card: `#F9FAFB`
- Explicit message: "[Calculation unavailable]"
- Explanation of why
- Actionable CTA button

---

### 4. Empty State (New User)

**Visual Design**:
```
┌─────────────────────────────────────────────────────────┐
│                                                          │
│                    [Wallet Icon]                        │
│                                                          │
│            Welcome to Your Portfolio                     │
│                                                          │
│        Get started by uploading your portfolio data.    │
│                                                          │
│        You can upload from:                              │
│        • CSV or Excel file                               │
│        • Manual entry                                    │
│        • Connect your broker account                    │
│                                                          │
│        [Upload Portfolio]                                │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

**Design Principles**:
- Centered layout
- Large, friendly icon (16x16 or 20x20)
- Welcoming headline
- Clear instructions
- Prominent CTA button
- No charts or tables (avoid showing zeros)

---

### 5. Sync Error with Last Known Data

**Visual Design**:
```
┌─────────────────────────────────────────────────────────┐
│ ⚠ Unable to Sync Latest Data                           │
│                                                          │
│ We're having trouble syncing your latest portfolio data.│
│                                                          │
│ Your data is safe and secure.                            │
│                                                          │
│ Showing last known data:                                │
│ Last updated: Dec 24, 2024, 10:30 AM                    │
│                                                          │
│ [Retry Sync]  [Contact Support]                        │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                                                          │
│ Net Worth: ₹45,20,000                                   │
│                                                          │
│ (Last updated: Dec 24, 2024, 10:30 AM)                 │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

**Key Elements**:
- Warning banner at top (amber)
- Reassuring message about data safety
- Last updated timestamp prominent
- Two action buttons (primary: Retry, secondary: Support)
- Last known data shown below (with timestamp)

---

## Screen-Specific Implementations

### Dashboard

**When No Data**:
```tsx
{!hasData ? (
  <EmptyPortfolioState onUpload={() => openUploadModal()} />
) : isLoading ? (
  <DataConsolidationState lastUpdated={lastUpdated} />
) : hasPartialData ? (
  <>
    <PartialDataBanner 
      syncedAccounts={syncedAccounts}
      pendingAccounts={pendingAccounts}
    />
    <PortfolioSummary data={partialData} />
  </>
) : hasSyncError ? (
  <>
    <SyncErrorState 
      lastUpdated={lastKnownData.lastUpdated}
      onRetry={() => retrySync()}
      onContactSupport={() => contactSupport()}
    />
    <PortfolioSummary data={lastKnownData} />
  </>
) : (
  <PortfolioSummary data={completeData} />
)}
```

**Key Rules**:
- Never show zero values
- Hide charts when data incomplete
- Show last updated timestamps
- Use friendly empty state for new users

---

### Holdings Screens

**When Data Unavailable**:
```tsx
{isLoading ? (
  <div className="text-center py-12">
    <DataConsolidationState />
  </div>
) : hasError ? (
  <div className="text-center py-12">
    <SyncErrorState 
      lastUpdated={lastUpdated}
      onRetry={() => retrySync()}
    />
  </div>
) : holdings.length === 0 ? (
  <div className="text-center py-12">
    <p className="text-base text-[#6B7280] mb-2">
      No holdings data available
    </p>
    <p className="text-sm text-[#6B7280] mb-4">
      Holdings data is being consolidated.
    </p>
    <p className="text-xs text-[#6B7280]">
      Last updated: {formatDate(lastUpdated)}
    </p>
  </div>
) : (
  <HoldingsTable holdings={holdings} />
)}
```

---

### Analytics Screens

**When Calculation Unavailable**:
```tsx
{canCalculateXIRR ? (
  <div>
    <h3>XIRR: {xirr}%</h3>
  </div>
) : (
  <CalculationUnavailable
    metric="XIRR"
    reason="XIRR requires transaction history to calculate accurately. Your portfolio shows current holdings but no transaction data."
    actionLabel="Upload Transaction History"
    onAction={() => openUploadModal()}
  />
)}
```

**Key Rules**:
- Hide unreliable metrics (don't show zero)
- Explain why calculation unavailable
- Provide clear path to fix

---

## Language Guidelines

### Do's ✅

**Data Consolidation**:
- "Data being consolidated"
- "We're processing your portfolio data"
- "This may take a few moments"

**Partial Data**:
- "Partial data available"
- "Your portfolio shows data from..."
- "Data not yet available from..."
- "We're working to sync all accounts"

**Calculation Unavailable**:
- "[Calculation unavailable]"
- "XIRR requires transaction history"
- "To see XIRR, please upload transaction history"

**Sync Errors**:
- "Unable to sync latest data"
- "We're having trouble syncing"
- "Your data is safe and secure"
- "Showing last known data"

**Empty State**:
- "Welcome to Your Portfolio"
- "Get started by uploading"
- "You can upload from..."

---

### Don'ts ❌

**Never Use**:
- "ERROR"
- "FAILED"
- "CRITICAL"
- "URGENT"
- "WARNING: Data may be incorrect"
- "Portfolio value: ₹0"
- "No data available" (too vague)
- "Something went wrong" (unhelpful)

---

## AI Response Examples

### Scenario 1: Partial Data

**User sees**: Partial data banner

**AI says** (if user asks):
```
"Your portfolio shows partial data. Zerodha and HDFC Bank 
accounts are synced, but ICICI Direct and Paytm Money are 
still being processed. We're working to sync all accounts. 
Your data is safe."
```

**Tone**: Calm, informative, reassuring

---

### Scenario 2: Calculation Unavailable

**User sees**: XIRR calculation unavailable

**AI says** (if user asks):
```
"XIRR calculation requires transaction history to calculate 
accurately. Your portfolio shows current holdings but no 
transaction data. To see XIRR, please upload your transaction 
history via Portfolio Upload."
```

**Tone**: Clear, helpful, actionable

---

### Scenario 3: Sync Error

**User sees**: Sync error with last known data

**AI says** (if user asks):
```
"We're having trouble syncing your latest portfolio data. 
Your data is safe and secure. We're showing last known data 
from Dec 24, 2024, 10:30 AM. You can retry the sync or 
contact support if the issue persists."
```

**Tone**: Reassuring, transparent, helpful

---

## Color Palette

### Error States
- **Warning (Amber)**: `#FEF3C7` background, `#F59E0B` border, `#92400E` text
- **Info (Blue)**: `#EFF6FF` background, `#2563EB` border, `#1E40AF` text
- **Neutral (Gray)**: `#F9FAFB` background, `#E5E7EB` border, `#6B7280` text

### Icons
- **Warning**: `#F59E0B` (amber)
- **Info**: `#2563EB` (blue)
- **Loading**: `#2563EB` (blue spinner)

---

## Typography

### Headings
- **Error State Title**: `text-base font-semibold` (16px, 600 weight)
- **Empty State Title**: `text-2xl font-semibold` (24px, 600 weight)

### Body Text
- **Primary Message**: `text-sm` (14px, 400 weight)
- **Secondary Message**: `text-xs` (12px, 400 weight)
- **Timestamp**: `text-xs text-[#6B7280]` (12px, muted gray)

### Buttons
- **Primary CTA**: `text-sm font-medium` (14px, 500 weight)
- **Secondary Action**: `text-sm font-medium` (14px, 500 weight)

---

## Spacing & Layout

### Padding
- **Full Screen State**: `p-12` (3rem / 48px)
- **Banner/Alert**: `p-4` (1rem / 16px)
- **Card Content**: `p-6` (1.5rem / 24px)

### Margins
- **Between Elements**: `mb-6` (1.5rem / 24px)
- **Within Lists**: `space-y-2` (0.5rem / 8px)

### Icon Sizing
- **Large Icons** (empty state): `w-16 h-16` (4rem / 64px)
- **Medium Icons** (banners): `w-5 h-5` (1.25rem / 20px)
- **Small Icons** (inline): `w-4 h-4` (1rem / 16px)

---

## Animation Guidelines

### Loading Spinner
- **Duration**: 1s linear infinite
- **Easing**: Linear
- **Color**: `#2563EB` (blue) on `#E5E7EB` (light gray) background

### Fade In
- **Duration**: 200ms
- **Easing**: Ease-in-out
- **Use**: When error state appears

### No Animations For
- Error messages (appear immediately)
- Warning banners (appear immediately)
- Critical information (no delay)

---

## Accessibility

### ARIA Labels
```tsx
<div 
  role="status" 
  aria-live="polite"
  aria-label="Data being consolidated"
>
  <DataConsolidationState />
</div>
```

### Focus Management
- Error states should be focusable
- Action buttons should be keyboard accessible
- Screen readers should announce state changes

### Color Contrast
- All text meets WCAG AA standards
- Icons have sufficient contrast
- Buttons have clear focus states

---

## Implementation Checklist

### Components
- [ ] `DataConsolidationState` component
- [ ] `PartialDataBanner` component
- [ ] `CalculationUnavailable` component
- [ ] `EmptyPortfolioState` component
- [ ] `SyncErrorState` component

### Integration
- [ ] Dashboard error states
- [ ] Holdings screens error states
- [ ] Analytics screens error states
- [ ] Portfolio upload error states

### AI Integration
- [ ] AI explains partial data
- [ ] AI explains calculation unavailability
- [ ] AI reassures during sync errors
- [ ] AI never estimates missing values

---

**Design Version**: Error States Visual Guide v1.0  
**Status**: Complete  
**Next Steps**: Implement error state components









