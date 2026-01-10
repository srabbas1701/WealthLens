# ETF Price Update Fix

## Problem
The "Update Today" button on the ETF Holdings page was not working, and all ETF prices remained unchanged (showing same buy and current values with 0% gains).

## Root Cause
ETFs were being treated inconsistently across the codebase:
- ETFs trade on stock exchanges with ticker symbols (like NIFTYBEES, PSUBNKBEES, CPSEETF)
- The **stock price update API** only fetched holdings with `asset_type = 'equity'`, excluding ETFs
- The **portfolio data API** was treating ETFs like mutual funds, trying to fetch NAVs by ISIN
- The **MF NAV update API** was including ETFs but they don't have ISINs like mutual funds

## Solution
ETFs should be treated like stocks since they:
1. Trade on exchanges (NSE/BSE)
2. Use ticker symbols for trading
3. Have real-time market prices (not NAVs)
4. Get prices from Yahoo Finance like stocks

## Changes Made

### 1. Stock Price Update API (`src/app/api/stocks/prices/update/route.ts`)
**Before:**
```typescript
.eq('assets.asset_type', 'equity')
```

**After:**
```typescript
.in('assets.asset_type', ['equity', 'etf'])
```

- Now fetches both equity stocks and ETFs for price updates
- Updated documentation to reflect it handles both stocks and ETFs
- Updated logging messages to mention "stocks & ETFs"

### 2. Portfolio Data API (`src/app/api/portfolio/data/route.ts`)
**Before:**
```typescript
// Section 3.5: Only equity
const equityHoldings = holdings.filter((h: any) => {
  const asset = h.assets as any;
  return asset?.asset_type === 'equity' && asset?.symbol;
});

// Section 3.6: Included ETFs with MFs
const allMFHoldings = holdings.filter((h: any) => {
  const asset = h.assets as any;
  return asset?.asset_type === 'mutual_fund' || asset?.asset_type === 'index_fund' || asset?.asset_type === 'etf';
});
```

**After:**
```typescript
// Section 3.5: Both equity and ETFs
const equityHoldings = holdings.filter((h: any) => {
  const asset = h.assets as any;
  return (asset?.asset_type === 'equity' || asset?.asset_type === 'etf') && asset?.symbol;
});

// Section 3.6: Only MFs and index funds (removed ETF)
const allMFHoldings = holdings.filter((h: any) => {
  const asset = h.assets as any;
  return asset?.asset_type === 'mutual_fund' || asset?.asset_type === 'index_fund';
});
```

- ETFs now get prices from stock_prices table (section 3.5) along with equity
- ETFs removed from MF NAV fetching (section 3.6)
- Added comment explaining ETFs are handled separately

### 3. MF NAV Update API (`src/app/api/mf/navs/update/route.ts`)
**Before:**
```typescript
.in('assets.asset_type', ['mutual_fund', 'index_fund', 'etf'])
```

**After:**
```typescript
.in('assets.asset_type', ['mutual_fund', 'index_fund'])
```

- Removed ETFs from MF NAV updates
- Added comment explaining ETFs use stock price API

## Testing Steps

1. **Navigate to ETF Holdings page** (`/portfolio/etfs`)
2. **Click "Update Prices" button**
3. **Verify in terminal logs:**
   - Should see: `[Price Update API] Found X unique stock and ETF symbols from holdings`
   - Should include ETF symbols like NIFTYBEES, PSUBNKBEES, etc.
   - Should show successful price updates for ETFs
4. **Check ETF page after update:**
   - Current NAV should differ from Avg Buy Price (if market moved)
   - Gain/Loss should show actual values (not ₹0)
   - "Price as of" date should show today's date
5. **Refresh page** - values should persist

## Database Schema
ETFs are stored in the database as:
```sql
assets table:
- asset_type = 'etf'
- symbol = ticker symbol (e.g., 'NIFTYBEES', 'PSUBNKBEES')
- isin = optional (may or may not be present)

stock_prices table:
- symbol = ticker symbol
- price = closing price
- price_date = trading day date
- price_source = 'Yahoo_Finance_EOD'
```

## Impact

### ✅ Fixed
- ETF price updates now work correctly
- ETF "Update Prices" button is functional
- ETF current values reflect market prices
- ETF gain/loss calculations are accurate
- Price date displays correctly on ETF page

### ✅ No Breaking Changes
- Equity stocks continue to work as before
- Mutual funds continue to use NAV updates via ISIN
- Backward compatible with existing data

## Future Considerations

1. **Scheduled Updates**: Consider setting up a cron job to auto-update prices daily
2. **Price Source**: All prices come from Yahoo Finance (appending .NS for NSE symbols)
3. **Trading Hours**: Price updates use previous trading day's closing price
4. **Error Handling**: Failed updates are logged but don't block successful ones

## Files Modified
1. `src/app/api/stocks/prices/update/route.ts` - Main price update API
2. `src/app/api/portfolio/data/route.ts` - Portfolio data fetching
3. `src/app/api/mf/navs/update/route.ts` - MF NAV updates (exclude ETFs)

No changes needed to frontend components - they already had correct API calls.
