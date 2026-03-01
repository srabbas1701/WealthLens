# Real Estate Module — Implementation Notes

## Architecture (Data Flow)
```
UI Modals → validation.ts → API Routes → Service Layer → Supabase DB
```

### Core DB Tables
| Table | Key Fields |
|---|---|
| `real_estate_assets` | purchase_price, purchase_date, ownership_percentage, city, state, pincode, co_owner_name, co_owner_relationship |
| `real_estate_loans` | loan_amount, interest_rate, emi, tenure_months, outstanding_balance |
| `real_estate_cashflows` | rental_status, monthly_rent, rent_start_date, escalation_percent, maintenance_monthly, property_tax_annual |

### Key Files
| File | Purpose |
|---|---|
| `src/components/real-estate/RealEstateAddModal.tsx` | 3-step Add Property modal |
| `src/components/real-estate/EditPropertyModal.tsx` | 3-step Edit Property modal |
| `src/components/real-estate/UpdateRentalModal.tsx` | Rental status + cashflow editor |
| `src/components/real-estate/AddOrUpdateLoanModal.tsx` | Loan add/update with EMI calculator |
| `src/constants/india-locations.ts` | States, cities-by-state, pincode prefix validation |
| `src/lib/real-estate/validation.ts` | Step-by-step form validation (with warnings[]) |
| `src/lib/real-estate/create-asset.ts` | Transactional asset creation |
| `src/lib/real-estate/update-asset.ts` | Asset update with field allowlist |
| `src/analytics/realEstatePropertyDetail.mapper.ts` | Maps analytics output → detail page data contract |
| `src/services/realEstateAnalytics.service.ts` | XIRR, yield, EMI-rent gap, unrealized gain |
| `src/app/portfolio/real-estate/[propertyId]/page.tsx` | Property detail page |

---

## Key Data Flow Rules

### Property Tax
- DB stores as **full annual** amount (`property_tax_annual`) — NOT ownership-adjusted
- Mapper converts to monthly for display: `(property_tax_annual / 12) × ownership`
- `UpdateRentalModal` receives raw `propertyTaxAnnual` — never the monthly/adjusted value
- **Critical**: if modal ever received the monthly value and multiplied by 12, it would halve the stored value on each save for co-owners

### Ownership Adjustment
- Ownership % adjusts: purchase_price, current_value, rent, outstanding_balance, registration_value
- EMI is **NOT** ownership-adjusted — you pay the full loan regardless of ownership share
- Gross yield: ownership cancels in numerator/denominator — same rate regardless of share

### Valuation Priority (high → low)
1. `user_override_value` (manual)
2. `(system_estimated_min + system_estimated_max) / 2`
3. `system_estimated_min`
4. `purchase_price` (fallback)

---

## Confirmed Bugs Fixed

### Session 1 (March 2026)
1. **Property tax corruption** — `UpdateRentalModal` received ownership-adjusted monthly value, ×12 it, saved back. Each edit halved the DB value for co-owners. Fixed: pass `propertyTaxAnnual` (raw) directly.
2. **Vacant status overwritten** — Modal auto-derived `rental_status` from rent amount. Vacant was impossible to preserve. Fixed: explicit 3-button status selector.
3. **rent_start_date missing from UpdateRentalModal** — XIRR silently skips all rent income if `rent_start_date` is absent. Added field + amber warning.
4. **escalation_percent collected but never used** — Labeled "reference only" in UI.
5. **Outstanding balance silent default** — Defaults to full loan amount if blank. Added amber warning in `AddOrUpdateLoanModal`.
6. **EMI auto-calculation missing** — Added "Calculate EMI" button: `P × r × (1+r)^n / ((1+r)^n − 1)`.
7. **XIRR rent loop off-by-one** — Rent loop started at `i=0`, EMI loop at `i=1`. Fixed rent to start at `i=1`.
8. **RERA regex too strict** — Rejected valid state-specific formats (e.g., MahaRERA `P51700012345`). Changed to 5–50 char freeform.

### Session 2 (March 2026)
1. **State field free-text** — Now a dropdown with all 36 Indian states/UTs.
2. **City not filtered by state** — Now uses `<datalist>` populated by `getCitiesForState(state)`. Free-text still allowed.
3. **Pincode not validated** — Now strips non-digits, enforces 6-digit format, and checks first 2 digits against state prefix map (`isPincodeValidForState`). Mismatch = amber warning (not hard error).
4. **Purchase date accepted 0001-01-01** — Added `min="1900-01-01"` + JS year range check (1900–today).
5. **Registration value allowed negatives** — Added JS guard: `< 0` → hard error.
6. **No joint owner details** — Added co-owner section when ownership < 100%: `co_owner_name` + `co_owner_relationship`. Saved via migration 020.

---

## India Locations (`src/constants/india-locations.ts`)
- `INDIA_STATES` — Array of all 36 states and UTs
- `CITIES_BY_STATE` — Major cities grouped by state (for datalist suggestions)
- `PINCODE_PREFIXES_BY_STATE` — First 2 digits of pincode expected per state
- `getCitiesForState(state)` — Returns city list for datalist
- `isPincodeValidForState(pincode, state)` — Returns `false` on clear mismatch (soft warning only)

---

## Migrations
| Migration | What it adds |
|---|---|
| `real_estate_schema.sql` | Initial schema (3 tables, enums, RLS) |
| `020_add_co_owner_fields.sql` | `co_owner_name TEXT`, `co_owner_relationship TEXT` on `real_estate_assets` |

**Migration 020 must be run in Supabase before co-owner fields will save.**

---

## Important Types

### `ValidationResult` (`src/types/real-estate.ts`)
```typescript
{ valid: boolean; errors: string[]; warnings?: string[] }
```

### `RealEstatePropertyDetailData` (`src/types/realEstatePropertyDetail.types.ts`)
Key fields added/changed:
- `propertyTaxMonthly` — ownership-adjusted monthly, display only
- `propertyTaxAnnual` — raw annual from DB, passed to `UpdateRentalModal`
- `rentalStatus`, `rentStartDate` — for modal state
- `coOwnerName`, `coOwnerRelationship` — from migration 020
