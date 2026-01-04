# Portfolio Pages Header & Currency Format Update

## Summary

Updating all portfolio pages to:
1. Use shared AppHeader component (same as landing page)
2. Implement currency format selector (Thousands, Lacs, Crores)
3. Use consistent currency formatting across all pages

## Implementation Status

### ✅ Completed
- Created `AppHeader` component with currency format selector
- Created `CurrencyProvider` context for global currency format
- Updated `layout.tsx` to include CurrencyProvider
- Updated `equity/page.tsx` (Stocks Holdings)
- Updated `mutualfunds/page.tsx`

### 🔄 In Progress
- `fixeddeposits/page.tsx` - Partially updated
- `bonds/page.tsx` - Needs update
- `etfs/page.tsx` - Needs update
- `cash/page.tsx` - Needs update
- `summary/page.tsx` - Needs update

## Files to Update

For each portfolio page, need to:
1. Import `AppHeader` and `useCurrency` from `@/components/AppHeader`
2. Add `const { formatCurrency } = useCurrency();` in component
3. Remove local `formatCurrency` function
4. Replace `<header>` with `<AppHeader />`
5. Add `pt-24` to `<main>` for fixed header spacing

## Currency Format Options

- **Thousands**: Shows amounts as ₹X.XXK (for amounts >= 1000)
- **Lacs**: Shows amounts as ₹X.XX L (for amounts >= 1L) or ₹X.XX Cr (for amounts >= 1Cr)
- **Crores**: Shows amounts as ₹X.XX Cr (for amounts >= 1Cr), ₹X.XX L (for amounts >= 1L), or ₹X.XXK (for amounts >= 1K)

Format is saved to localStorage and persists across sessions.








