# Error States & Trust-Safe Fallbacks - Quick Reference

## 🎯 Core Principle
**Trust and clarity are more important than completeness.**

---

## 📋 Error State Categories

### 1. Data Not Available (Sync in Progress)
**Show**: "Data being consolidated"  
**Explain**: What is happening  
**Never**: Show zero values

**Example**:
```
[Spinner]
Data being consolidated
We're processing your portfolio data.
Last updated: Dec 24, 2024, 10:30 AM
```

---

### 2. Partial Data
**Show**: What IS available  
**Mention**: What is missing  
**Never**: Estimate missing values

**Example**:
```
⚠ Partial Data Available
Your portfolio shows data from:
• Zerodha (synced)
• HDFC Bank FDs (synced)

Data not yet available from:
• ICICI Direct
• Paytm Money

We're working to sync all accounts.
```

---

### 3. Calculation Not Reliable
**Show**: "[Calculation unavailable]"  
**Explain**: Why it's unavailable  
**Provide**: Clear path to fix

**Example**:
```
XIRR Calculation
[Calculation unavailable]

XIRR requires transaction history.
Your portfolio shows current holdings 
but no transaction data.

[Upload Transaction History]
```

---

### 4. No Holdings (New User)
**Show**: Friendly empty state  
**Provide**: Clear next-step CTA  
**Never**: Show charts/tables with zeros

**Example**:
```
[Wallet Icon]
Welcome to Your Portfolio
Get started by uploading your data.

You can upload from:
• CSV or Excel file
• Manual entry
• Connect broker account

[Upload Portfolio]
```

---

### 5. System or Sync Errors
**Show**: Last known data  
**Display**: Last updated timestamp  
**Reassure**: Data is safe

**Example**:
```
⚠ Unable to Sync Latest Data
We're having trouble syncing.
Your data is safe and secure.

Showing last known data:
Last updated: Dec 24, 2024, 10:30 AM

[Retry Sync] [Contact Support]

Net Worth: ₹45,20,000
(Last updated: Dec 24, 10:30 AM)
```

---

## 🤖 AI Behavior Rules

### Rule 1: Explain Uncertainty
✅ "Your portfolio shows partial data. Zerodha is synced, but ICICI Direct is still being processed."  
❌ "Portfolio value: ₹45,20,000" (doesn't mention partial)

### Rule 2: Reference Visible Data Only
✅ "Based on your uploaded holdings, equity allocation is 75%."  
❌ "Based on market trends, your portfolio should be worth ₹50L" (can't see this)

### Rule 3: Never Estimate Money Values
✅ "Your portfolio shows ₹45,20,000 from synced accounts. ICICI Direct is still being processed."  
❌ "Total: ₹50L (₹45L synced + estimated ₹5L from ICICI)" (estimates)

### Rule 4: Calm, Professional Tone
✅ "We're having trouble syncing. Your data is safe. Showing last known data."  
❌ "⚠️ ERROR: Data sync failed! Your portfolio may be incomplete!"

---

## 🎨 UI Requirements

### 1. Clear Messaging Instead of Zeros
❌ `Equity: ₹0`  
✅ `Equity data being consolidated`

### 2. Hide Charts When Incomplete
❌ Show empty chart  
✅ Show message: "Chart unavailable: Data being consolidated"

### 3. Show "Last Updated" Subtly
✅ Small, muted text below value  
✅ `(Last updated: Dec 24, 10:30 AM)`

### 4. Avoid Alarming Language
❌ "ERROR", "FAILED", "CRITICAL", "URGENT"  
✅ "Data being consolidated", "Partial data available", "Unable to sync"

---

## 🧩 Component Quick Reference

### Data Consolidation
```tsx
<DataConsolidationState lastUpdated={date} />
```

### Partial Data
```tsx
<PartialDataBanner 
  syncedAccounts={[...]}
  pendingAccounts={[...]}
/>
```

### Calculation Unavailable
```tsx
<CalculationUnavailable
  metric="XIRR"
  reason="Requires transaction history"
  actionLabel="Upload Transaction History"
  onAction={() => openUpload()}
/>
```

### Empty State
```tsx
<EmptyPortfolioState onUpload={() => openUpload()} />
```

### Sync Error
```tsx
<SyncErrorState
  lastUpdated={date}
  onRetry={() => retry()}
  onContactSupport={() => contact()}
/>
```

---

## ✅ Do's and Don'ts

### Do's ✅
- Show "Data being consolidated" (not zero)
- Explain what's missing explicitly
- Reassure users their data is safe
- Show last known data with timestamp
- Use calm, professional language
- Provide clear next steps

### Don'ts ❌
- Show zero values (misleading)
- Estimate missing values
- Use alarming language ("ERROR", "FAILED")
- Hide uncertainty
- Show empty charts/tables
- Guess financial numbers

---

## 🎨 Color Palette

### Warning (Amber)
- Background: `#FEF3C7`
- Border: `#F59E0B` (20% opacity)
- Text: `#92400E`
- Icon: `#F59E0B`

### Info (Blue)
- Background: `#EFF6FF`
- Border: `#2563EB` (20% opacity)
- Text: `#1E40AF`
- Icon: `#2563EB`

### Neutral (Gray)
- Background: `#F9FAFB`
- Border: `#E5E7EB`
- Text: `#6B7280`

---

## 📝 Language Examples

### Good ✅
- "Data being consolidated"
- "Partial data available"
- "Calculation unavailable"
- "Unable to sync latest data"
- "We're working to sync all accounts"
- "Your data is safe and secure"

### Bad ❌
- "ERROR: Data unavailable"
- "FAILED to load"
- "CRITICAL: Sync failed"
- "Portfolio value: ₹0"
- "No data available"
- "Something went wrong"

---

## 🎯 Success Criteria

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

## 📋 Implementation Checklist

### Components
- [ ] DataConsolidationState
- [ ] PartialDataBanner
- [ ] CalculationUnavailable
- [ ] EmptyPortfolioState
- [ ] SyncErrorState

### Integration
- [ ] Dashboard error states
- [ ] Holdings screens
- [ ] Analytics screens
- [ ] Portfolio upload

### AI Integration
- [ ] AI explains partial data
- [ ] AI explains calculation unavailability
- [ ] AI reassures during errors
- [ ] AI never estimates values

---

## 🔗 Related Documents

- **Full Specification**: `ERROR_STATES_AND_FALLBACKS_SPECIFICATION.md`
- **Visual Design Guide**: `ERROR_STATES_VISUAL_GUIDE.md`
- **Quick Reference**: This document

---

**Design Version**: Error States & Trust-Safe Fallbacks v1.0  
**Status**: Specification Complete  
**Next Steps**: Implement error state components









