# Error States, Empty States & Trust-Safe Fallbacks - Design Specification

## Core Philosophy

### The Golden Rule
**Trust and clarity are more important than completeness.**

```
❌ Show zero: "Equity: ₹0"
✅ Show message: "Equity data being consolidated"
```

### Three Pillars
1. **Never show misleading zero values**
2. **Explicitly communicate uncertainty**
3. **Calm, human language at all times**

---

## Error State Categories

### 1. Data Not Available (Sync in Progress)

**When**: Data is being fetched, processed, or synchronized

**User Experience**:
- Show "Data being consolidated" message
- Explain briefly what is happening
- Show loading state (not error state)
- Reassure user that data is safe

**Visual Design**:
```
┌─────────────────────────────────────────┐
│ Portfolio Summary                       │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │  [Loading spinner]                  │ │
│ │                                      │ │
│ │  Data being consolidated            │ │
│ │                                      │ │
│ │  We're processing your portfolio    │ │
│ │  data. This may take a few moments. │ │
│ │                                      │ │
│ │  Last updated: Dec 24, 2024, 10:30 AM│
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

**AI Behavior**:
- ✅ "Your portfolio data is being consolidated. Please wait a moment."
- ❌ "Portfolio value: ₹0" (misleading)

**Code Example**:
```tsx
{isLoading && (
  <div className="bg-white rounded-xl border border-[#E5E7EB] p-12 text-center">
    <div className="w-8 h-8 border-4 border-[#E5E7EB] border-t-[#2563EB] rounded-full animate-spin mx-auto mb-4" />
    <p className="text-base font-medium text-[#0F172A] mb-2">
      Data being consolidated
    </p>
    <p className="text-sm text-[#6B7280] mb-4">
      We're processing your portfolio data. This may take a few moments.
    </p>
    <p className="text-xs text-[#6B7280]">
      Last updated: {formatDate(lastUpdated)}
    </p>
  </div>
)}
```

---

### 2. Partial Data

**When**: Some data is available, but not all accounts/sources are synced

**User Experience**:
- Indicate partial availability clearly
- Mention what is missing (accounts, sources)
- Do NOT estimate missing values
- Show what IS available

**Visual Design**:
```
┌─────────────────────────────────────────┐
│ Portfolio Summary                       │
│                                         │
│ Net Worth: ₹45,20,000                   │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ ⚠ Partial Data Available            │ │
│ │                                      │ │
│ │ Your portfolio shows data from:     │ │
│ │ • Zerodha account (synced)          │ │
│ │ • HDFC Bank FDs (synced)            │ │
│ │                                      │ │
│ │ Data not yet available from:        │ │
│ │ • ICICI Direct account              │ │
│ │ • Paytm Money MF holdings           │ │
│ │                                      │ │
│ │ We're working to sync all accounts. │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

**AI Behavior**:
- ✅ "Your portfolio shows partial data. Zerodha and HDFC Bank are synced, but ICICI Direct and Paytm Money are still being processed."
- ❌ "Total portfolio: ₹45,20,000" (implies completeness)

**Code Example**:
```tsx
{hasPartialData && (
  <div className="bg-[#FEF3C7] border border-[#F59E0B]/20 rounded-xl p-4 mb-6">
    <div className="flex items-start gap-3">
      <InfoIcon className="w-5 h-5 text-[#F59E0B] flex-shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-semibold text-[#92400E] mb-2">
          Partial Data Available
        </p>
        <p className="text-sm text-[#92400E] mb-2">
          Your portfolio shows data from:
        </p>
        <ul className="text-sm text-[#92400E] space-y-1 mb-2 list-disc list-inside">
          {syncedAccounts.map(account => (
            <li key={account}>{account} (synced)</li>
          ))}
        </ul>
        <p className="text-sm text-[#92400E] mb-2">
          Data not yet available from:
        </p>
        <ul className="text-sm text-[#92400E] space-y-1 mb-2 list-disc list-inside">
          {pendingAccounts.map(account => (
            <li key={account}>{account}</li>
          ))}
        </ul>
        <p className="text-xs text-[#92400E] mt-2">
          We're working to sync all accounts.
        </p>
      </div>
    </div>
  </div>
)}
```

---

### 3. Calculation Not Reliable

**When**: Metrics like IRR/XIRR cannot be calculated accurately

**User Experience**:
- Hide unreliable metrics (don't show zero or placeholder)
- Explain why calculation is unavailable
- Show what data is needed
- Provide clear path to fix

**Visual Design**:
```
┌─────────────────────────────────────────┐
│ Performance Metrics                     │
│                                         │
│ Total Portfolio Value: ₹45,20,000       │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ XIRR Calculation                     │ │
│ │                                      │ │
│ │ [Calculation unavailable]           │ │
│ │                                      │ │
│ │ XIRR requires transaction history   │ │
│ │ to calculate accurately.             │ │
│ │                                      │ │
│ │ Your portfolio shows current         │ │
│ │ holdings but no transaction data.    │ │
│ │                                      │ │
│ │ To see XIRR, please upload your      │ │
│ │ transaction history via Portfolio    │ │
│ │ Upload.                              │ │
│ │                                      │ │
│ │ [Upload Transaction History]        │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

**AI Behavior**:
- ✅ "XIRR calculation requires transaction history. Your portfolio shows current holdings but no transaction data. To see XIRR, please upload transaction history."
- ❌ "XIRR: 0%" or "XIRR: N/A" (unclear why)

**Code Example**:
```tsx
{!canCalculateXIRR && (
  <div className="bg-white rounded-xl border border-[#E5E7EB] p-6">
    <h3 className="text-base font-semibold text-[#0F172A] mb-4">
      XIRR Calculation
    </h3>
    <div className="bg-[#F9FAFB] rounded-lg border border-[#E5E7EB] p-4">
      <p className="text-sm text-[#475569] mb-2">
        [Calculation unavailable]
      </p>
      <p className="text-sm text-[#475569] mb-2">
        XIRR requires transaction history to calculate accurately.
      </p>
      <p className="text-sm text-[#475569] mb-4">
        Your portfolio shows current holdings but no transaction data.
      </p>
      <button
        onClick={() => openUploadModal()}
        className="px-4 py-2 bg-[#2563EB] text-white rounded-lg text-sm font-medium hover:bg-[#1E40AF]"
      >
        Upload Transaction History
      </button>
    </div>
  </div>
)}
```

---

### 4. No Holdings (New User)

**When**: User has no portfolio data yet

**User Experience**:
- Friendly empty state
- Clear next-step CTA
- No charts or tables (avoid showing zeros)
- Welcoming, not alarming

**Visual Design**:
```
┌─────────────────────────────────────────┐
│                                         │
│         [Illustration/Icon]             │
│                                         │
│    Welcome to Your Portfolio            │
│                                         │
│    Get started by uploading your        │
│    portfolio data.                      │
│                                         │
│    You can upload from:                 │
│    • CSV or Excel file                  │
│    • Manual entry                       │
│    • Connect your broker account        │
│                                         │
│    [Upload Portfolio]                   │
│                                         │
└─────────────────────────────────────────┘
```

**AI Behavior**:
- ✅ "Welcome! To get started, upload your portfolio data. You can upload from a CSV file, enter manually, or connect your broker account."
- ❌ "Portfolio value: ₹0" or "No data available" (feels like error)

**Code Example**:
```tsx
{!hasData && (
  <div className="bg-white rounded-xl border border-[#E5E7EB] p-12 text-center">
    <WalletIcon className="w-16 h-16 text-[#6B7280] mx-auto mb-6" />
    <h2 className="text-2xl font-semibold text-[#0F172A] mb-3">
      Welcome to Your Portfolio
    </h2>
    <p className="text-base text-[#6B7280] mb-6 max-w-md mx-auto">
      Get started by uploading your portfolio data.
    </p>
    <p className="text-sm text-[#6B7280] mb-6">
      You can upload from:
    </p>
    <ul className="text-sm text-[#6B7280] space-y-2 mb-8">
      <li>• CSV or Excel file</li>
      <li>• Manual entry</li>
      <li>• Connect your broker account</li>
    </ul>
    <button
      onClick={() => openUploadModal()}
      className="px-6 py-3 bg-[#2563EB] text-white rounded-lg font-medium hover:bg-[#1E40AF]"
    >
      Upload Portfolio
    </button>
  </div>
)}
```

---

### 5. System or Sync Errors

**When**: API errors, network failures, sync failures

**User Experience**:
- Show last known data (if available)
- Display last updated timestamp prominently
- Reassure user their data is safe
- Provide retry option
- Avoid alarming language

**Visual Design**:
```
┌─────────────────────────────────────────┐
│ Portfolio Summary                       │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ ⚠ Unable to Sync Latest Data        │ │
│ │                                      │ │
│ │ We're having trouble syncing your    │ │
│ │ latest portfolio data.               │ │
│ │                                      │ │
│ │ Your data is safe and secure.        │ │
│ │                                      │ │
│ │ Showing last known data:             │ │
│ │ Last updated: Dec 24, 2024, 10:30 AM│ │
│ │                                      │ │
│ │ [Retry Sync] [Contact Support]      │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ Net Worth: ₹45,20,000                   │
│ (Last updated: Dec 24, 2024, 10:30 AM) │
└─────────────────────────────────────────┘
```

**AI Behavior**:
- ✅ "We're having trouble syncing your latest data. Your data is safe. Showing last known data from Dec 24, 2024, 10:30 AM."
- ❌ "Error: Failed to sync" or "Data unavailable" (alarming)

**Code Example**:
```tsx
{hasSyncError && (
  <div className="bg-[#FEF3C7] border border-[#F59E0B]/20 rounded-xl p-4 mb-6">
    <div className="flex items-start gap-3">
      <AlertTriangleIcon className="w-5 h-5 text-[#F59E0B] flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-sm font-semibold text-[#92400E] mb-2">
          Unable to Sync Latest Data
        </p>
        <p className="text-sm text-[#92400E] mb-2">
          We're having trouble syncing your latest portfolio data.
        </p>
        <p className="text-sm text-[#92400E] mb-3">
          Your data is safe and secure.
        </p>
        <p className="text-sm text-[#92400E] mb-3">
          Showing last known data:
        </p>
        <p className="text-xs text-[#92400E] mb-4">
          Last updated: {formatDate(lastUpdated)}
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => retrySync()}
            className="px-4 py-2 bg-[#2563EB] text-white rounded-lg text-sm font-medium hover:bg-[#1E40AF]"
          >
            Retry Sync
          </button>
          <button
            onClick={() => contactSupport()}
            className="px-4 py-2 bg-white border border-[#E5E7EB] text-[#0F172A] rounded-lg text-sm font-medium hover:bg-[#F6F8FB]"
          >
            Contact Support
          </button>
        </div>
      </div>
    </div>
  </div>
)}

{lastKnownData && (
  <div className="bg-white rounded-xl border border-[#E5E7EB] p-6">
    <p className="text-3xl font-semibold text-[#0F172A] number-emphasis">
      {formatCurrency(lastKnownData.netWorth)}
    </p>
    <p className="text-xs text-[#6B7280] mt-2">
      (Last updated: {formatDate(lastKnownData.lastUpdated)})
    </p>
  </div>
)}
```

---

## AI Behavior Rules

### Rule 1: Explain Uncertainty, Don't Hide It

**✅ Good**:
```
"Your portfolio shows partial data. Zerodha account is synced, 
but ICICI Direct is still being processed. We're working to 
sync all accounts."
```

**❌ Bad**:
```
"Portfolio value: ₹45,20,000"
(Doesn't mention partial data)
```

---

### Rule 2: Reference Visible Data Only

**✅ Good**:
```
"Based on your uploaded holdings, your equity allocation is 75%. 
To see XIRR, please upload transaction history."
```

**❌ Bad**:
```
"Based on market trends, your portfolio should be worth ₹50,00,000"
(References data user can't see)
```

---

### Rule 3: Never Infer or Estimate Money Values

**✅ Good**:
```
"Your portfolio shows ₹45,20,000 from synced accounts. 
ICICI Direct account is still being processed."
```

**❌ Bad**:
```
"Your total portfolio is approximately ₹50,00,000 
(₹45,20,000 synced + estimated ₹4,80,000 from ICICI Direct)"
(Estimates missing values)
```

---

### Rule 4: Calm, Professional, Reassuring Tone

**✅ Good**:
```
"We're having trouble syncing your latest data. 
Your data is safe. Showing last known data from Dec 24, 2024."
```

**❌ Bad**:
```
"⚠️ ERROR: Data sync failed! Your portfolio may be incomplete!"
(Alarming, unprofessional)
```

---

## UI Requirements

### 1. Clear Messaging Instead of Zeros

**❌ Bad**:
```tsx
<p>Equity: ₹0</p>
<p>Mutual Funds: ₹0</p>
```

**✅ Good**:
```tsx
{hasData ? (
  <p>Equity: {formatCurrency(equity)}</p>
) : (
  <p className="text-[#6B7280]">Equity data being consolidated</p>
)}
```

---

### 2. Hide Charts When Data is Incomplete

**❌ Bad**:
```tsx
<DonutChart data={allocation} />
// Shows empty chart or zeros
```

**✅ Good**:
```tsx
{hasCompleteData ? (
  <DonutChart data={allocation} />
) : (
  <div className="text-center py-12">
    <p className="text-[#6B7280]">
      Chart unavailable: Data is being consolidated
    </p>
  </div>
)}
```

---

### 3. Show "Last Updated" Timestamps Subtly

**✅ Good**:
```tsx
<div>
  <p className="text-3xl font-semibold">
    {formatCurrency(netWorth)}
  </p>
  <p className="text-xs text-[#6B7280] mt-2">
    Last updated: {formatDate(lastUpdated)}
  </p>
</div>
```

**Design**:
- Small, muted text (#6B7280)
- Below main value
- Not prominent (doesn't distract)

---

### 4. Avoid Alarming Language

**❌ Bad**:
- "ERROR"
- "FAILED"
- "CRITICAL"
- "URGENT"
- "WARNING: Data may be incorrect"

**✅ Good**:
- "Data being consolidated"
- "Partial data available"
- "Unable to sync latest data"
- "Calculation unavailable"
- "We're working to sync all accounts"

---

## Component Library

### 1. Loading State (Data Consolidation)

```tsx
function DataConsolidationState({ lastUpdated }: { lastUpdated?: Date }) {
  return (
    <div className="bg-white rounded-xl border border-[#E5E7EB] p-12 text-center">
      <div className="w-8 h-8 border-4 border-[#E5E7EB] border-t-[#2563EB] rounded-full animate-spin mx-auto mb-4" />
      <p className="text-base font-medium text-[#0F172A] mb-2">
        Data being consolidated
      </p>
      <p className="text-sm text-[#6B7280] mb-4">
        We're processing your portfolio data. This may take a few moments.
      </p>
      {lastUpdated && (
        <p className="text-xs text-[#6B7280]">
          Last updated: {formatDate(lastUpdated)}
        </p>
      )}
    </div>
  );
}
```

---

### 2. Partial Data Banner

```tsx
function PartialDataBanner({ 
  syncedAccounts, 
  pendingAccounts 
}: { 
  syncedAccounts: string[];
  pendingAccounts: string[];
}) {
  return (
    <div className="bg-[#FEF3C7] border border-[#F59E0B]/20 rounded-xl p-4">
      <div className="flex items-start gap-3">
        <InfoIcon className="w-5 h-5 text-[#F59E0B] flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-[#92400E] mb-2">
            Partial Data Available
          </p>
          <p className="text-sm text-[#92400E] mb-2">
            Your portfolio shows data from:
          </p>
          <ul className="text-sm text-[#92400E] space-y-1 mb-2 list-disc list-inside">
            {syncedAccounts.map(account => (
              <li key={account}>{account} (synced)</li>
            ))}
          </ul>
          <p className="text-sm text-[#92400E] mb-2">
            Data not yet available from:
          </p>
          <ul className="text-sm text-[#92400E] space-y-1 mb-2 list-disc list-inside">
            {pendingAccounts.map(account => (
              <li key={account}>{account}</li>
            ))}
          </ul>
          <p className="text-xs text-[#92400E] mt-2">
            We're working to sync all accounts.
          </p>
        </div>
      </div>
    </div>
  );
}
```

---

### 3. Calculation Unavailable

```tsx
function CalculationUnavailable({ 
  metric,
  reason,
  actionLabel,
  onAction
}: {
  metric: string;
  reason: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="bg-white rounded-xl border border-[#E5E7EB] p-6">
      <h3 className="text-base font-semibold text-[#0F172A] mb-4">
        {metric} Calculation
      </h3>
      <div className="bg-[#F9FAFB] rounded-lg border border-[#E5E7EB] p-4">
        <p className="text-sm text-[#475569] mb-2">
          [Calculation unavailable]
        </p>
        <p className="text-sm text-[#475569] mb-4">
          {reason}
        </p>
        <button
          onClick={onAction}
          className="px-4 py-2 bg-[#2563EB] text-white rounded-lg text-sm font-medium hover:bg-[#1E40AF]"
        >
          {actionLabel}
        </button>
      </div>
    </div>
  );
}
```

---

### 4. Empty State (New User)

```tsx
function EmptyPortfolioState({ onUpload }: { onUpload: () => void }) {
  return (
    <div className="bg-white rounded-xl border border-[#E5E7EB] p-12 text-center">
      <WalletIcon className="w-16 h-16 text-[#6B7280] mx-auto mb-6" />
      <h2 className="text-2xl font-semibold text-[#0F172A] mb-3">
        Welcome to Your Portfolio
      </h2>
      <p className="text-base text-[#6B7280] mb-6 max-w-md mx-auto">
        Get started by uploading your portfolio data.
      </p>
      <p className="text-sm text-[#6B7280] mb-6">
        You can upload from:
      </p>
      <ul className="text-sm text-[#6B7280] space-y-2 mb-8">
        <li>• CSV or Excel file</li>
        <li>• Manual entry</li>
        <li>• Connect your broker account</li>
      </ul>
      <button
        onClick={onUpload}
        className="px-6 py-3 bg-[#2563EB] text-white rounded-lg font-medium hover:bg-[#1E40AF]"
      >
        Upload Portfolio
      </button>
    </div>
  );
}
```

---

### 5. Sync Error State

```tsx
function SyncErrorState({ 
  lastUpdated,
  onRetry,
  onContactSupport
}: {
  lastUpdated: Date;
  onRetry: () => void;
  onContactSupport: () => void;
}) {
  return (
    <div className="bg-[#FEF3C7] border border-[#F59E0B]/20 rounded-xl p-4 mb-6">
      <div className="flex items-start gap-3">
        <AlertTriangleIcon className="w-5 h-5 text-[#F59E0B] flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-[#92400E] mb-2">
            Unable to Sync Latest Data
          </p>
          <p className="text-sm text-[#92400E] mb-2">
            We're having trouble syncing your latest portfolio data.
          </p>
          <p className="text-sm text-[#92400E] mb-3">
            Your data is safe and secure.
          </p>
          <p className="text-sm text-[#92400E] mb-3">
            Showing last known data:
          </p>
          <p className="text-xs text-[#92400E] mb-4">
            Last updated: {formatDate(lastUpdated)}
          </p>
          <div className="flex gap-2">
            <button
              onClick={onRetry}
              className="px-4 py-2 bg-[#2563EB] text-white rounded-lg text-sm font-medium hover:bg-[#1E40AF]"
            >
              Retry Sync
            </button>
            <button
              onClick={onContactSupport}
              className="px-4 py-2 bg-white border border-[#E5E7EB] text-[#0F172A] rounded-lg text-sm font-medium hover:bg-[#F6F8FB]"
            >
              Contact Support
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## Implementation Checklist

### Error States
- [ ] Data consolidation loading state
- [ ] Partial data banner component
- [ ] Calculation unavailable component
- [ ] Sync error state component
- [ ] Empty state component

### UI Requirements
- [ ] Never show zero values (use messages instead)
- [ ] Hide charts when data incomplete
- [ ] Show "Last updated" timestamps subtly
- [ ] Avoid alarming language

### AI Integration
- [ ] AI explains uncertainty explicitly
- [ ] AI references visible data only
- [ ] AI never estimates money values
- [ ] AI uses calm, professional tone

---

## Success Criteria

### Trust Indicators
- Users don't panic when seeing error states
- Users understand what's happening
- Users trust their data is safe
- Users know what to do next

### Quality Indicators
- No misleading zero values shown
- Uncertainty is explicitly communicated
- Language is calm and professional
- AI increases confidence, not confusion

---

**Design Version**: Error States & Trust-Safe Fallbacks v1.0  
**Status**: Specification Complete  
**Next Steps**: Implement error state components









