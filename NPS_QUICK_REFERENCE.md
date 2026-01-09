# NPS Holdings - Quick Reference

**Page:** `/portfolio/nps`  
**Status:** ✅ Core Complete (Modals Pending)

---

## At a Glance

### What's Implemented ✅
- Complete NPS holdings page with Tier I/II display
- API routes for GET/POST/PUT/DELETE operations
- NAV auto-update service (mock data)
- Dark mode support
- Professional UI with expandable tiers
- Asset allocation dashboard
- Performance tracking (returns %)

### What's Pending ⏳
- Add/Edit modal (currently placeholder)
- Real NAV API integration (using mocks)

---

## Key Features

### Data Tracked
| Field | Description |
|-------|-------------|
| **PRAN** | 12-digit unique ID |
| **Tier I** | Mandatory, locked till 60 |
| **Tier II** | Optional, withdrawable |
| **Asset Classes** | E (Equity), C (Corporate), G (Govt), A (Alternative) |
| **Fund Managers** | HDFC, ICICI, SBI, UTI, LIC, Kotak, Birla, Max |
| **Allocation** | Auto Choice or Active Choice |
| **Schemes** | Per-scheme NAV, units, value, returns |

### UI Components
- **Overall Allocation:** 4 colored cards showing E/C/G/A split
- **Account Cards:** Expandable, showing PRAN and totals
- **Tier Tables:** Detailed scheme breakdown
- **Update NAVs Button:** One-click NAV refresh

---

## Quick Actions

### View Holdings
```
1. Navigate to /portfolio/nps
2. See all accounts with PRAN numbers
3. Click Tier I/II to expand schemes
4. View overall allocation at top
```

### Update NAVs
```
1. Click "Update NAVs" button
2. Wait for toast confirmation
3. See updated values & returns
```

### Delete Account
```
1. Click trash icon
2. Confirm in modal
3. Account removed
```

---

## API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/nps/holdings?user_id={id}` | Fetch all accounts |
| POST | `/api/nps/holdings` | Create new account |
| PUT | `/api/nps/holdings` | Update account |
| DELETE | `/api/nps/holdings?id={id}` | Delete account |
| POST | `/api/nps/update-navs` | Update all NAVs |

---

## Data Structure

```typescript
// Simplified view
NPS Account {
  pranNumber: "123456789012"
  tier1: {
    strategy: "auto" | "active"
    schemes: [{
      assetClass: "E" | "C" | "G" | "A"
      fundManager: "HDFC" | "ICICI" | ...
      allocation: 50%
      invested: ₹250,000
      units: 5523.4567
      nav: ₹45.2341
      value: ₹250,000
      returns: ₹50,000 (20%)
    }]
  }
  tier2?: { ... } // optional
}
```

---

## Asset Classes

| Code | Name | Risk | Typical NAV Range |
|------|------|------|-------------------|
| **E** | Equity | High | ₹42-46 |
| **C** | Corporate Bonds | Medium | ₹31-33 |
| **G** | Government Securities | Low | ₹37-39 |
| **A** | Alternative Funds | Medium-High | ₹27-29 |

---

## Fund Managers

1. HDFC Pension
2. ICICI Prudential
3. SBI Pension
4. UTI Retirement
5. LIC Pension
6. Kotak Mahindra
7. Aditya Birla
8. Max Life

---

## Color Coding

| Asset Class | Color | Hex |
|-------------|-------|-----|
| E (Equity) | Red | #DC2626 |
| C (Corporate) | Orange | #F59E0B |
| G (Government) | Green | #16A34A |
| A (Alternative) | Blue | #2563EB |

---

## Calculations

### Scheme Level
```
currentValue = units × currentNAV
returns = currentValue - investedAmount
returnsPercentage = (returns / investedAmount) × 100
```

### Tier Level
```
totalInvested = sum of all schemes' investedAmount
currentValue = sum of all schemes' currentValue
returns = currentValue - totalInvested
returnsPercentage = (returns / totalInvested) × 100
```

### Account Level
```
totalInvested = tier1.totalInvested + tier2.totalInvested
totalCurrentValue = tier1.currentValue + tier2.currentValue
totalReturns = totalCurrentValue - totalInvested
overallReturnsPercentage = (totalReturns / totalInvested) × 100
```

---

## Dark Mode Classes

### Backgrounds
- Light: `bg-white`, `bg-[#F6F8FB]`, `bg-[#F9FAFB]`
- Dark: `dark:bg-[#0F172A]`, `dark:bg-[#1E293B]`, `dark:bg-[#334155]`

### Text
- Light: `text-[#0F172A]`, `text-[#6B7280]`
- Dark: `dark:text-[#F8FAFC]`, `dark:text-[#94A3B8]`

### Borders
- Light: `border-[#E5E7EB]`
- Dark: `dark:border-[#334155]`

---

## Common Workflows

### 1. First-Time User
```
1. Empty state shows
2. Click "Add Your First NPS Account"
3. (Modal implementation pending)
4. Enter PRAN, tiers, schemes
5. Save → Account appears on page
```

### 2. Regular User
```
1. View all accounts
2. Expand tiers to see schemes
3. Click "Update NAVs" periodically
4. Track returns over time
```

### 3. Editing Account
```
1. Click edit icon
2. (Modal implementation pending)
3. Update schemes/allocations
4. Save changes
```

---

## Validation Rules (When Modals Implemented)

### PRAN
- ✅ Must be exactly 12 digits
- ✅ Numeric only
- ✅ Unique per user

### Allocation
- ✅ All schemes in a tier must total 100%
- ✅ Each scheme: 0-100%
- ✅ Tier I Equity: max 75%
- ✅ Tier II Equity: max 100%

### Schemes
- ✅ At least 1 scheme per tier
- ✅ Each scheme must have: asset class, fund manager, allocation, invested amount, units, NAV

---

## Testing Scenarios

### Scenario 1: Tier I Only
```
PRAN: 123456789012
Tier I: Active Choice
  - E (HDFC): 50%, ₹2,50,000
  - C (ICICI): 30%, ₹1,50,000
  - G (SBI): 20%, ₹1,00,000
Tier II: None
```

### Scenario 2: Both Tiers
```
PRAN: 987654321098
Tier I: Auto Choice (Moderate)
  - E: 50%, ₹5,00,000
  - C: 25%, ₹2,50,000
  - G: 25%, ₹2,50,000
Tier II: Active Choice
  - E: 100%, ₹1,00,000
```

### Scenario 3: Multiple Schemes
```
PRAN: 555666777888
Tier I: Active Choice
  - E (HDFC): 25%
  - E (ICICI): 25%
  - C (SBI): 25%
  - G (UTI): 25%
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Page not loading | Check user is authenticated |
| Empty state | No holdings yet - add first account |
| NAV update fails | Check console logs, verify holdings exist |
| Add button does nothing | Modal pending implementation (expected) |
| Dark mode broken | Verify `dark` class on `<html>` |

---

## Files to Modify

### For Real NAV API
- `src/app/api/nps/update-navs/route.ts`
- Replace `getMockNAV()` with actual API call

### For Add/Edit Modals
- Create `src/components/NPSAddModal.tsx`
- Create `src/components/NPSEditModal.tsx`
- Update `src/app/portfolio/nps/page.tsx` to use modals

---

## Performance Notes

- **Expandable Tiers:** Only renders table when expanded (good for performance)
- **NAV Updates:** Processes one holding at a time (scalable)
- **Mock Data:** Instant response (real API may be slower)
- **Calculations:** Done server-side, cached in database

---

## Next Steps

1. ✅ Test the current page
2. ⏳ Implement Add/Edit modals
3. ⏳ Integrate real NAV API
4. ⏳ Add transaction history
5. ⏳ Historical performance charts

---

**Questions?** See `NPS_IMPLEMENTATION.md` for full details.
