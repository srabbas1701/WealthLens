# How to Update Stock Prices from Yahoo Finance

## Quick Steps

### Option 1: Using Browser (Easiest)

1. Open your browser
2. Navigate to: `http://localhost:5175/api/stocks/prices/update`
3. The page will show a JSON response with update results
4. Check the browser console (F12) for detailed logs

### Option 2: Using curl (Terminal)

```bash
curl -X POST http://localhost:5175/api/stocks/prices/update
```

### Option 3: Using PowerShell (Windows)

```powershell
Invoke-WebRequest -Uri "http://localhost:5175/api/stocks/prices/update" -Method POST
```

### Option 4: Using Browser Developer Tools

1. Open your browser (F12)
2. Go to Console tab
3. Run:
```javascript
fetch('/api/stocks/prices/update', { method: 'POST' })
  .then(r => r.json())
  .then(data => console.log('Update Results:', data));
```

## What Happens

1. The API fetches all unique stock symbols from your holdings
2. For each symbol, it:
   - Maps NSE symbol to Yahoo symbol (e.g., `HDFCBANK` → `HDFCBANK.NS`)
   - Calls Yahoo Finance API
   - Stores the price in `stock_prices` table
3. Returns a summary of successful/failed updates

## Expected Response

```json
{
  "success": true,
  "priceDate": "2025-01-03",
  "updated": 19,
  "failed": 0,
  "results": [
    {
      "symbol": "HDFCBANK",
      "success": true,
      "price": 1650.25,
      "priceDate": "2025-01-03"
    },
    ...
  ]
}
```

## Troubleshooting

### If prices still show as avg_buy_price:

1. **Check server logs** - Look for errors in your terminal/console
2. **Verify Yahoo Finance API** - The API might be rate-limited or blocked
3. **Check database** - Verify prices are stored:
   ```sql
   SELECT symbol, closing_price, price_date, price_source 
   FROM stock_prices 
   ORDER BY price_date DESC 
   LIMIT 10;
   ```

### Common Issues:

1. **CORS Errors** - Yahoo Finance might block requests from browser
   - Solution: The API runs server-side, so this shouldn't be an issue

2. **Rate Limiting** - Yahoo Finance may rate-limit requests
   - Solution: The code has 200ms delay between requests

3. **Invalid Symbols** - Some symbols might not exist on Yahoo Finance
   - Solution: Check logs for which symbols failed

4. **Network Issues** - Yahoo Finance API might be down
   - Solution: Try again later or check Yahoo Finance status

## After Updating Prices

1. **Refresh your dashboard** - Prices should now show correctly
2. **Check P&L** - Should show non-zero values
3. **Verify in database** - Confirm prices are stored

## Schedule Daily Updates

To automate daily updates, set up a cron job or scheduled task:

### Using Vercel Cron (if deployed on Vercel)

Add to `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/stocks/prices/update",
    "schedule": "0 18 * * 1-5"
  }]
}
```

### Using Windows Task Scheduler

1. Open Task Scheduler
2. Create Basic Task
3. Set trigger: Daily at 6:00 PM
4. Action: Start a program
5. Program: `curl.exe`
6. Arguments: `-X POST http://localhost:5175/api/stocks/prices/update`

