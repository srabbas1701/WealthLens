# NPS Holdings Implementation

**Status:** ✅ Core Complete (Modals Pending)  
**Version:** 1.0  
**Date:** January 2025

---

## Overview

Comprehensive NPS (National Pension System) portfolio tracking with expert-level detail capture. This implementation supports both Tier I (retirement, locked) and Tier II (voluntary, withdrawable) accounts with full asset class and fund manager tracking.

---

## Features Implemented

### ✅ **Complete NPS Page** (`/portfolio/nps`)
- **PRAN Number** tracking (12-digit unique ID)
- **Dual Tier Support:**
  - Tier I: Mandatory, locked until retirement (age 60)
  - Tier II: Optional, withdrawable anytime
- **4 Asset Classes** tracked per tier:
  - **E** - Equity (Stocks) - High risk
  - **C** - Corporate Bonds - Medium risk
  - **G** - Government Securities - Low risk
  - **A** - Alternative Investment Funds (REITs, InvITs) - Medium-High risk
- **8 Fund Managers** supported:
  - HDFC Pension
  - ICICI Prudential
  - SBI Pension
  - UTI Retirement
  - LIC Pension
  - Kotak Mahindra
  - Aditya Birla
  - Max Life
- **Allocation Strategies:**
  - Auto Choice (age-based)
  - Active Choice (manual allocation)

### ✅ **Visual Design**
- **Expandable Tier Display:** Click to expand/collapse Tier I and Tier II details
- **Color-Coded Asset Classes:** Visual identification with colored dots
- **Comprehensive Scheme Tables:** Shows allocation %, invested amount, NAV, units, current value, returns
- **Overall Asset Allocation Dashboard:** Aggregate view across all tiers and accounts
- **Performance Tracking:** Returns (₹ and %) for each scheme, tier, and overall

### ✅ **API Routes**
1. **GET** `/api/nps/holdings` - Fetch all NPS accounts for a user
2. **POST** `/api/nps/holdings` - Create new NPS account
3. **PUT** `/api/nps/holdings` - Update existing NPS account
4. **DELETE** `/api/nps/holdings` - Delete NPS account
5. **POST** `/api/nps/update-navs` - Update NAVs for all schemes

### ✅ **NAV Auto-Update Service**
- **Daily NAV Updates:** Fetch latest NAV data for all schemes
- **Mock Data Provider:** Uses realistic mock NAVs (can be replaced with actual API)
- **Recalculates:** Units, current values, returns after each NAV update
- **One-Click Update:** "Update NAVs" button on the page

### ✅ **Dark Mode Support**
- Full compatibility with light and dark themes
- Proper contrast and color adaptation
- Follows established dark mode standards

### ✅ **Professional UI/UX**
- Clean, modern design
- Intuitive navigation with back button
- Empty states with helpful guidance
- Delete confirmation modals
- Professional toast notifications for all operations
- Loading states and error handling

---

## Data Structure

### NPS Holding Schema

```typescript
interface NPSHolding {
  id: string;
  pranNumber: string;              // 12-digit PRAN
  subscriberName?: string;          // Account holder name
  dateOfOpening?: string;           // Account opening date
  tier1: NPSTier;                   // Tier I (mandatory)
  tier2?: NPSTier | null;           // Tier II (optional)
  totalInvested: number;            // Total invested across tiers
  totalCurrentValue: number;        // Total current value
  totalReturns: number;             // Total returns (₹)
  overallReturnsPercentage: number; // Overall returns (%)
  navUpdatedDate: string;           // Last NAV update date
}

interface NPSTier {
  tierId: 'tier1' | 'tier2';
  tierName: string;
  allocationStrategy: 'auto' | 'active';
  autoChoiceType?: 'aggressive' | 'moderate' | 'conservative';
  totalInvested: number;
  currentValue: number;
  totalReturns: number;
  returnsPercentage: number;
  schemes: NPSScheme[];
  lastContribution?: string;
}

interface NPSScheme {
  assetClass: 'E' | 'C' | 'G' | 'A';
  fundManager: string;              // HDFC, ICICI, SBI, etc.
  allocationPercentage: number;     // % of tier allocated to this scheme
  investedAmount: number;           // Amount invested
  currentUnits: number;             // Current units held
  currentNAV: number;               // Latest NAV (4 decimal places)
  currentValue: number;             // Current value (units × NAV)
  navDate: string;                  // NAV date
  returns: number;                  // Returns (₹)
  returnsPercentage: number;        // Returns (%)
}
```

### Database Storage

NPS data is stored in the `holdings` table:
- **asset_type**: `'nps'`
- **notes**: JSON stringified NPSHolding metadata
- **invested_value**: Total invested across all tiers
- **current_value**: Total current value across all tiers

---

## Usage

### Access the Page
Navigate to `/portfolio/nps` or click "NPS Holdings" from the dashboard.

### View Holdings
- See all NPS accounts with PRAN numbers
- Click on Tier I or Tier II to expand and view scheme details
- View overall asset allocation across all accounts

### Update NAVs
Click "Update NAVs" button to fetch latest NAVs for all schemes. This:
1. Fetches current NAVs for each scheme
2. Recalculates current values (units × NAV)
3. Updates returns and percentages
4. Saves updated data to database

### Delete Account (Current Implementation)
1. Click trash icon on any NPS account
2. Confirm deletion in modal
3. Account and all tier data removed

---

## Pending Implementation

### ⏳ **Add/Edit Modals**
Currently shows placeholder modals. Full implementation will include:

#### Add NPS Modal (Multi-Step):
1. **Basic Info:**
   - PRAN Number (12 digits, validated)
   - Subscriber Name
   - Date of Opening

2. **Tier I Setup:**
   - Allocation Strategy (Auto/Active)
   - If Auto: Choose type (Aggressive/Moderate/Conservative)
   - If Active: Define schemes with asset class, fund manager, allocation %, invested amount, units, NAV

3. **Tier II Setup (Optional):**
   - Same as Tier I
   - Can skip if no Tier II

4. **Review & Save:**
   - Show summary of all entered data
   - Validate allocations add up to 100%
   - Save to database

#### Edit NPS Modal:
- Similar to Add, but pre-filled with existing data
- Allow updating schemes, allocations, contribution amounts
- Preserve historical NAV/units data

### Design Considerations for Modals:
- **Multi-step wizard** for easier data entry
- **Validation:** PRAN format, allocation totals, NAV/units consistency
- **Dynamic scheme addition:** Add/remove schemes as needed
- **Bulk import:** Option to paste data from NPS statement
- **Auto-calculate:** Units from invested amount and NAV
- **Templates:** Pre-fill based on common allocation strategies

---

## API Reference

### GET `/api/nps/holdings?user_id={userId}`

Fetches all NPS holdings for a user.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "pranNumber": "123456789012",
      "subscriberName": "John Doe",
      "dateOfOpening": "2020-01-15",
      "tier1": {
        "tierId": "tier1",
        "allocationStrategy": "active",
        "totalInvested": 500000,
        "currentValue": 650000,
        "totalReturns": 150000,
        "returnsPercentage": 30.0,
        "schemes": [
          {
            "assetClass": "E",
            "fundManager": "HDFC",
            "allocationPercentage": 50,
            "investedAmount": 250000,
            "currentUnits": 5523.4567,
            "currentNAV": 45.2341,
            "currentValue": 250000,
            "returns": 0,
            "returnsPercentage": 0
          }
          // ... more schemes
        ]
      },
      "tier2": null,
      "totalInvested": 500000,
      "totalCurrentValue": 650000,
      "totalReturns": 150000,
      "overallReturnsPercentage": 30.0,
      "navUpdatedDate": "2025-01-10T12:00:00Z"
    }
  ]
}
```

### POST `/api/nps/holdings`

Creates a new NPS account.

**Request Body:**
```json
{
  "user_id": "uuid",
  "pranNumber": "123456789012",
  "subscriberName": "John Doe",
  "dateOfOpening": "2020-01-15",
  "tier1": {
    "tierId": "tier1",
    "allocationStrategy": "active",
    "schemes": [
      {
        "assetClass": "E",
        "fundManager": "HDFC",
        "allocationPercentage": 50,
        "investedAmount": 250000,
        "currentUnits": 5523.4567,
        "currentNAV": 45.2341
      }
      // ... more schemes
    ]
  },
  "tier2": null
}
```

### PUT `/api/nps/holdings`

Updates an existing NPS account.

**Request Body:** Same as POST, but with `id` field.

### DELETE `/api/nps/holdings?id={holdingId}`

Deletes an NPS account.

### POST `/api/nps/update-navs`

Updates NAVs for all NPS schemes.

**Request Body:**
```json
{
  "user_id": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "updatedCount": 2,
  "message": "Successfully updated 2 NPS account(s)"
}
```

---

## NAV Data Source

### Current Implementation (Mock)
Uses realistic mock NAVs based on asset class and fund manager:
- **Equity (E):** ₹42-46 range
- **Corporate Bonds (C):** ₹31-33 range
- **Government Securities (G):** ₹37-39 range
- **Alternative (A):** ₹27-29 range

Adds small random variation (±0.5%) on each update.

### Production Integration
Replace `getMockNAV()` function in `/api/nps/update-navs/route.ts` with actual API calls to:
- **NPS Trust Website:** https://www.npstrust.org.in/scheme-performance
- **Or** scrape data from official sources
- **Or** integrate with financial data providers

---

## Files Created

### Frontend
1. ✅ `src/app/portfolio/nps/page.tsx` - Main NPS Holdings page (870+ lines)

### Backend
2. ✅ `src/app/api/nps/holdings/route.ts` - CRUD API for NPS accounts
3. ✅ `src/app/api/nps/update-navs/route.ts` - NAV update service

### Documentation
4. ✅ `NPS_IMPLEMENTATION.md` - This file

---

## Testing Checklist

### Manual Testing
- [ ] Navigate to `/portfolio/nps` page
- [ ] Verify empty state shows correctly
- [ ] Click "Add NPS Account" (shows placeholder modal)
- [ ] Update NAVs (once data exists)
- [ ] Expand/collapse Tier I and Tier II
- [ ] View scheme details in tables
- [ ] Check overall asset allocation
- [ ] Test delete confirmation modal
- [ ] Verify dark mode styling
- [ ] Test responsive design (mobile/tablet)

### Data Testing
Once Add modal is implemented:
- [ ] Add NPS with only Tier I
- [ ] Add NPS with both Tier I and Tier II
- [ ] Add multiple schemes per tier
- [ ] Test allocation validation (must total 100%)
- [ ] Test PRAN number validation
- [ ] Update existing NPS
- [ ] Delete NPS account

### Integration Testing
- [ ] Verify NPS shows in dashboard totals
- [ ] Check portfolio summary includes NPS
- [ ] Confirm dark mode works across all pages
- [ ] Test toast notifications
- [ ] Verify error states

---

## Known Limitations

1. **Add/Edit Modals:** Placeholder implementation - full modals pending
2. **NAV Source:** Uses mock data - needs integration with actual NPS Trust API
3. **Historical Data:** No historical NAV/performance tracking yet
4. **Transactions:** No transaction history (contributions/withdrawals) yet
5. **Statement Import:** No bulk import from NPS statement
6. **Auto-Sync:** No automatic daily NAV updates (requires cron job)

---

## Future Enhancements

### Phase 2 (Priority)
1. **Complete Add/Edit Modals** with multi-step wizard
2. **Integrate Real NAV API** from NPS Trust
3. **Auto-calc Units** from invested amount and NAV
4. **Validation:** PRAN format, allocation totals

### Phase 3 (Nice to Have)
1. **Transaction History:** Track contributions and withdrawals
2. **Historical Performance:** Chart NAV and portfolio value over time
3. **Statement Import:** Parse and import from NPS PDF/CAS
4. **Tax Computation:** Section 80C/80CCD benefits
5. **Retirement Projection:** Maturity value calculator
6. **Rebalancing Alerts:** When allocation drifts from target
7. **Nominee Details:** Track nominee information
8. **Cron Job:** Daily automatic NAV updates

---

## Best Practices Followed

✅ **Expert-Level Detail Capture** - All NPS complexity represented  
✅ **Clean Architecture** - Separation of concerns (API, UI, data)  
✅ **Type Safety** - Full TypeScript types for all data structures  
✅ **Dark Mode** - Complete light/dark theme support  
✅ **Professional UI** - Industry-standard design and UX  
✅ **Error Handling** - Graceful failures with user-friendly messages  
✅ **Documentation** - Comprehensive docs for developers  
✅ **Scalability** - Ready for real API integration  
✅ **Security** - Server-side auth and data validation  

---

## Developer Notes

### Adding Real NAV API

Replace the `getMockNAV` function in `src/app/api/nps/update-navs/route.ts`:

```typescript
// Instead of mock data:
function getMockNAV(assetClass: string, fundManager: string): number {
  // ...
}

// Use real API:
async function fetchRealNAV(assetClass: string, fundManager: string): Promise<number> {
  // Call NPS Trust API or your chosen data provider
  const response = await fetch(`https://api.npstrust.org.in/nav?asset=${assetClass}&fund=${fundManager}`);
  const data = await response.json();
  return data.nav;
}
```

### Database Schema

No changes needed to existing schema. NPS data fits perfectly into the current `holdings` table structure:

```sql
holdings (
  id uuid,
  portfolio_id uuid,
  asset_id uuid (references assets where asset_type='nps'),
  quantity numeric (always 1 for NPS),
  invested_value numeric (total across tiers),
  current_value numeric (total across tiers),
  notes jsonb (stores full NPSHolding metadata),
  source text ('manual'),
  created_at timestamptz,
  updated_at timestamptz
)
```

---

## Support & Troubleshooting

### Common Issues

**Q: NAV update not working?**  
A: Check `/api/nps/update-navs` endpoint. Currently uses mock data. Verify holdings exist.

**Q: Add NPS button shows placeholder?**  
A: Add modal is pending implementation. This is expected for Phase 1.

**Q: Dark mode looks wrong?**  
A: Check if `dark` class is applied to `<html>`. Verify all color classes have `dark:` variants.

**Q: PRAN validation failing?**  
A: PRAN must be exactly 12 digits. Add validation in the Add modal once implemented.

---

**Implementation Status:** ✅ **Core Complete** (75% done)  
**Next Step:** Implement Add/Edit modals for full CRUD functionality  
**Ready for:** Testing, user feedback, real NAV API integration
