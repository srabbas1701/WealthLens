# Stock Price Daily Update Implementation

## Overview

This document describes the stock price update system that uses EOD (End of Day) prices from the previous trading day to calculate portfolio valuations.

## Architecture

### Database Schema

**Table: `stock_prices`**
- Stores daily closing prices for NSE stocks
- Shared across all users (not user-specific)
- One price per symbol per trading day
- Indexed for fast lookups by symbol and date

### Key Components

1. **Stock Price Service** (`src/lib/stock-prices.ts`)
   - Fetches prices from external API
   - Stores prices in database
   - Provides helper functions for price lookups

2. **Price Update API** (`src/app/api/stocks/prices/update/route.ts`)
   - Endpoint to trigger daily price updates
   - Can be called manually or via cron job
   - Updates prices for all unique stock symbols in holdings

3. **Portfolio Data API** (`src/app/api/portfolio/data/route.ts`)
   - Automatically fetches and applies stock prices when serving portfolio data
   - Updates `current_value` in holdings table based on latest prices
   - Falls back gracefully if prices are unavailable

## Data Flow

1. **Daily Price Update** (scheduled):
   ```
   Cron Job → POST /api/stocks/prices/update
   → Fetches prices for all symbols
   → Stores in stock_prices table
   ```

2. **Portfolio Data Request**:
   ```
   GET /api/portfolio/data
   → Fetches holdings
   → For equity holdings: looks up prices from stock_prices
   → Calculates current_value = quantity × current_price
   → Updates holdings.current_value
   → Returns portfolio with accurate valuations
   ```

3. **New Holding Creation**:
   ```
   POST /api/portfolio/upload/confirm
   → Creates holding with invested_value
   → For equity: fetches current price
   → Sets current_value = quantity × current_price
   ```

## Price Source Integration

### Current Status: Placeholder Implementation

The `fetchStockPriceFromAPI()` function in `src/lib/stock-prices.ts` currently returns `null` as a placeholder. You need to integrate with an actual stock price API.

### Recommended APIs

1. **Alpha Vantage** (Free tier available)
   - 5 calls/min, 500 calls/day
   - Requires API key
   - Endpoint: `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol={SYMBOL}.NS&apikey={KEY}`

2. **Yahoo Finance** (Unofficial, free)
   - No API key required
   - May be rate-limited
   - Example: `https://query1.finance.yahoo.com/v8/finance/chart/{SYMBOL}.NS`

3. **NSE India Official API** (If available)
   - Most accurate for Indian stocks
   - Check NSE website for official API access

### Implementation Steps

1. **Choose an API provider** and get API key if needed
2. **Update `fetchStockPriceFromAPI()`** in `src/lib/stock-prices.ts`:
   ```typescript
   async function fetchStockPriceFromAPI(symbol: string): Promise<{ price: number; date: string } | null> {
     try {
       const apiKey = process.env.STOCK_API_KEY; // Add to .env
       const url = `https://api.example.com/quote/${symbol}.NS?apikey=${apiKey}`;
       
       const response = await fetch(url);
       const data = await response.json();
       
       // Parse response based on API format
       const price = parseFloat(data.close || data.price);
       
       if (!price || isNaN(price) || price <= 0) {
         throw new Error('Invalid price');
       }
       
       return {
         price,
         date: getPreviousTradingDay(),
       };
     } catch (error) {
       console.error(`Failed to fetch price for ${symbol}:`, error);
       return null;
     }
   }
   ```

3. **Add API key to environment variables**:
   ```env
   STOCK_API_KEY=your_api_key_here
   ```

4. **Test the integration**:
   ```bash
   curl -X POST http://localhost:3000/api/stocks/prices/update \
     -H "Content-Type: application/json" \
     -d '{"symbols": ["RELIANCE", "TCS"]}'
   ```

## Scheduling Daily Updates

### Option 1: Cron Job (Recommended for Production)

Set up a cron job to call the update endpoint daily after market close (e.g., 6 PM IST):

```bash
# Add to crontab (crontab -e)
0 18 * * 1-5 curl -X POST https://your-domain.com/api/stocks/prices/update
```

### Option 2: Vercel Cron (If using Vercel)

Create `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/stocks/prices/update",
    "schedule": "0 18 * * 1-5"
  }]
}
```

### Option 3: Manual Trigger

For testing, you can manually trigger updates:
```bash
curl -X POST http://localhost:3000/api/stocks/prices/update
```

## Fallback Behavior

The system is designed to be resilient:

1. **If price fetch fails**: Uses last known price from database
2. **If no price in database**: Uses `invested_value` temporarily (will be updated on next successful fetch)
3. **If API is down**: Portfolio still renders, just shows invested_value
4. **Never blocks UI**: Price updates happen asynchronously

## Monitoring

### Logs

All price operations are logged with clear prefixes:
- `[Stock Price Service]` - Service-level operations
- `[Price Update API]` - API endpoint operations
- `[Portfolio Data API]` - Portfolio data operations

### Key Metrics to Monitor

1. **Price update success rate**: Check logs for failed updates
2. **Price freshness**: Ensure prices are updated daily
3. **Missing prices**: Monitor warnings about unavailable prices

### Health Check

Check price update status:
```bash
curl http://localhost:3000/api/stocks/prices/update
```

Returns:
```json
{
  "success": true,
  "priceDate": "2025-01-03",
  "pricesCount": 150,
  "lastUpdated": "2025-01-03T18:30:00Z"
}
```

## Testing

### Test Price Update

```bash
# Update specific symbols
curl -X POST http://localhost:3000/api/stocks/prices/update \
  -H "Content-Type: application/json" \
  -d '{"symbols": ["RELIANCE", "TCS", "INFY"]}'
```

### Verify Prices in Database

```sql
SELECT symbol, closing_price, price_date, last_updated
FROM stock_prices
WHERE price_date = CURRENT_DATE - 1
ORDER BY symbol;
```

### Test Portfolio Valuation

1. Create a portfolio with equity holdings
2. Call `/api/portfolio/data?user_id={userId}`
3. Verify `currentValue` ≠ `investedValue` for equity holdings
4. Verify P&L is calculated correctly

## Troubleshooting

### Prices Not Updating

1. Check API key is set correctly
2. Verify API is accessible (test with curl)
3. Check rate limits (free APIs have limits)
4. Review logs for error messages

### Prices Showing as Invested Value

1. Ensure price update API has been called
2. Check `stock_prices` table has data
3. Verify symbols match (case-sensitive, NSE format)
4. Check portfolio data API logs for warnings

### Performance Issues

1. Price updates are batched (200ms delay between requests)
2. Consider caching prices in memory for high-traffic scenarios
3. Use database indexes (already created)
4. Consider background job queue for large updates

## Future Enhancements

1. **Real-time Pricing**: WebSocket integration for live prices
2. **Multiple Exchanges**: Support for BSE, NSE, etc.
3. **Historical Data**: Store price history for charts
4. **Price Alerts**: Notify users of significant price movements
5. **Caching Layer**: Redis cache for frequently accessed prices

