/**
 * Stock Price Service
 * 
 * Handles fetching and storing EOD (End of Day) stock prices for NSE stocks.
 * 
 * DESIGN PHILOSOPHY:
 * ==================
 * 1. Prices are fetched once per day (previous trading day closing price)
 * 2. Prices are shared across all users (not user-specific)
 * 3. Prices are cached in database to avoid redundant API calls
 * 4. If price fetch fails, we keep the last known price (never default to avg_buy_price)
 * 
 * PRICE SOURCE:
 * =============
 * For MVP, we'll use a free API. Options:
 * - Alpha Vantage (free tier: 5 calls/min, 500 calls/day)
 * - Yahoo Finance (unofficial API, may be rate-limited)
 * - NSE India official API (if available)
 * 
 * FUTURE EXTENSIBILITY:
 * ====================
 * This service can be extended to support:
 * - Real-time pricing (WebSocket feeds)
 * - Multiple exchanges (BSE, NSE)
 * - Historical price data
 * - Price alerts
 */

/**
 * CRITICAL INVARIANT:
 * Yahoo chart API returns arrays of historical data.
 * The ONLY valid EOD price is the LAST timestamp paired
 * with the LAST close value.
 *
 * Never use index 0, find(), or filtered values.
 * Any deviation WILL corrupt prices silently.
 */

import { createAdminClient } from '@/lib/supabase/server';

// ============================================================================
// TYPES
// ============================================================================

export interface StockPrice {
  symbol: string;
  price: number;
  priceDate: string; // ISO date string (YYYY-MM-DD)
  lastUpdated: string; // ISO timestamp
}

export interface PriceUpdateResult {
  symbol: string;
  success: boolean;
  price?: number;
  priceDate?: string;
  error?: string;
}

// ============================================================================
// PRICE FETCHING (EXTERNAL API)
// ============================================================================

/**
 * Convert a Date to YYYY-MM-DD in IST (Asia/Kolkata).
 *
 * We prefer Intl timeZone formatting (timezone-safe). IST has no DST, but Intl
 * is still the most robust approach across environments.
 */
function formatYYYYMMDDInIST(date: Date): string {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);

    const year = parts.find((p) => p.type === 'year')?.value;
    const month = parts.find((p) => p.type === 'month')?.value;
    const day = parts.find((p) => p.type === 'day')?.value;

    if (!year || !month || !day) throw new Error('Missing date parts');
    return `${year}-${month}-${day}`;
  } catch {
    // Fallback: IST is fixed UTC+5:30, so manual offset is deterministic.
    const istOffsetMs = 5.5 * 60 * 60 * 1000;
    const ist = new Date(date.getTime() + istOffsetMs);
    const yyyy = ist.getUTCFullYear();
    const mm = String(ist.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(ist.getUTCDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
}

/**
 * Yahoo returns timestamps in seconds (Unix epoch). Convert to IST YYYY-MM-DD.
 */
function yahooTimestampToISTPriceDate(timestampSeconds: number): string {
  return formatYYYYMMDDInIST(new Date(timestampSeconds * 1000));
}

/**
 * Convert UNIX seconds → IST → YYYY-MM-DD
 */
function istDateStringFromUnix(tsSeconds: number): string {
  return formatYYYYMMDDInIST(new Date(tsSeconds * 1000));
}

/**
 * Get previous trading day date (in IST timezone)
 * 
 * Returns the most recent trading day (excludes weekends).
 * Uses IST timezone (GMT+5:30) to determine the current date.
 */
export function getPreviousTradingDay(): string {
  // Get current UTC time
  const now = new Date();
  
  // Convert UTC to IST (GMT+5:30)
  // IST is UTC+5:30, so we add 5 hours 30 minutes to get IST time
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const istTimeMs = now.getTime() + istOffsetMs;
  const istDate = new Date(istTimeMs);
  
  // Extract IST date components (using UTC methods because we already added offset)
  const istYear = istDate.getUTCFullYear();
  const istMonth = istDate.getUTCMonth();
  const istDay = istDate.getUTCDate();
  const istHours = istDate.getUTCHours();
  const istMinutes = istDate.getUTCMinutes();
  
  // Start with yesterday in IST
  let targetYear = istYear;
  let targetMonth = istMonth;
  let targetDay = istDay - 1;
  
  // Handle month/year boundaries
  if (targetDay < 1) {
    targetMonth -= 1;
    if (targetMonth < 0) {
      targetMonth = 11;
      targetYear -= 1;
    }
    // Get last day of previous month
    const daysInPrevMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
    targetDay = daysInPrevMonth;
  }
  
  // Create a date object for this date (day of week is same everywhere)
  // Use noon UTC to avoid timezone edge cases
  let checkDate = new Date(Date.UTC(targetYear, targetMonth, targetDay, 12, 0, 0));
  let dayOfWeek = checkDate.getUTCDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
  
  // Keep going back until we find a weekday (Mon-Fri)
  while (dayOfWeek === 0 || dayOfWeek === 6) {
    targetDay -= 1;
    if (targetDay < 1) {
      targetMonth -= 1;
      if (targetMonth < 0) {
        targetMonth = 11;
        targetYear -= 1;
      }
      const daysInPrevMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
      targetDay = daysInPrevMonth;
    }
    checkDate = new Date(Date.UTC(targetYear, targetMonth, targetDay, 12, 0, 0));
    dayOfWeek = checkDate.getUTCDay();
  }
  
  const result = `${targetYear}-${String(targetMonth+1).padStart(2,'0')}-${String(targetDay).padStart(2,'0')}`;
  
  return result;
}

/**
 * Map NSE symbol to Yahoo Finance symbol
 * 
 * Yahoo Finance requires .NS suffix for NSE stocks
 * 
 * @param nseSymbol - NSE stock symbol (e.g., 'RELIANCE', 'TCS', 'NSE: HDFCBANK')
 * @returns Yahoo Finance symbol (e.g., 'RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS')
 */
function mapNseToYahooSymbol(nseSymbol: string): string {
  // Remove common prefixes: "NSE: ", "BSE: ", etc.
  let cleanSymbol = nseSymbol.replace(/^(NSE|BSE):\s*/i, '').trim();
  // Ensure symbol is uppercase and add .NS suffix
  cleanSymbol = cleanSymbol.toUpperCase().trim();
  return `${cleanSymbol}.NS`;
}

/**
 * Fetch stock price from Yahoo Finance Quote API
 * 
 * Uses Yahoo Finance free API (no authentication required)
 * Fetches previous trading day closing price (regularMarketPreviousClose)
 * 
 * @param symbol - NSE stock symbol (e.g., 'RELIANCE', 'TCS')
 * @returns Stock price with date or null if fetch fails
 */
async function fetchStockPriceFromAPI(symbol: string): Promise<{ price: number; date: string; timestamp: number } | null> {
  try {
    const yahooSymbol = mapNseToYahooSymbol(symbol);
    
    // Yahoo Finance Quote API endpoint
    // Using v8/finance/chart endpoint which provides quote data
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=1d&range=5d`;
    
    console.log(`[Stock Price Service] Fetching Yahoo Finance price for ${symbol} (${yahooSymbol})`);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Yahoo Finance API returned ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Yahoo Finance response structure:
    // {
    //   chart: {
    //     result: [{
    //       meta: {
    //         chartPreviousClose: number,  // Previous trading day closing price (EOD)
    //         regularMarketPrice: number,  // Current/latest price
    //         regularMarketTime: number (Unix timestamp)
    //       },
    //       ...
    //     }]
    //   }
    // }
    
    if (!data?.chart?.result || !Array.isArray(data.chart.result) || data.chart.result.length === 0) {
      throw new Error('Invalid Yahoo Finance response: missing result data');
    }
    
    const result = data.chart.result[0];
    const meta = result?.meta;
    
    if (!meta) {
      throw new Error('Invalid Yahoo Finance response: missing meta data');
    }
    
    // HARDENED: Always parse chart arrays to derive date (prevents stale data corruption)
    // Read chart.result[0].timestamp and chart.result[0].indicators.quote[0].close
    const timestamps = result.timestamp;
    const quote = result.indicators?.quote?.[0];
    const closes = quote?.close;
    
    // Validate both arrays exist
    if (!Array.isArray(timestamps) || !Array.isArray(closes)) {
      throw new Error(`[YahooInvariant] Missing timestamp/close arrays for ${symbol}. timestamps: ${Array.isArray(timestamps) ? 'exists' : 'missing'}, closes: ${Array.isArray(closes) ? 'exists' : 'missing'}`);
    }
    
    // Validate both arrays have equal non-zero length
    if (timestamps.length === 0 || closes.length === 0) {
      throw new Error(`[YahooInvariant] Empty timestamp/close arrays for ${symbol}. timestamps.length=${timestamps.length}, closes.length=${closes.length}`);
    }
    
    if (timestamps.length !== closes.length) {
      throw new Error(`[YahooInvariant] Mismatched array lengths for ${symbol}. timestamps.length=${timestamps.length}, closes.length=${closes.length}`);
    }
    
    // Find the LAST index where close[index] is not null AND timestamp exists
    let lastValidIndex = -1;
    for (let i = timestamps.length - 1; i >= 0; i--) {
      const ts = timestamps[i];
      const close = closes[i];
      if (
        ts !== null && ts !== undefined && typeof ts === 'number' && !isNaN(ts) && ts > 0 &&
        close !== null && close !== undefined && typeof close === 'number' && !isNaN(close) && close > 0
      ) {
        lastValidIndex = i;
        break;
      }
    }
    
    if (lastValidIndex === -1) {
      throw new Error(`[YahooInvariant] No valid timestamp/close pair found for ${symbol}`);
    }
    
    const yahooTimestamp = timestamps[lastValidIndex];
    const yahooClose = closes[lastValidIndex];
    
    // Derive yahooPriceDate from the timestamp
    const yahooPriceDate = istDateStringFromUnix(yahooTimestamp);
    
    // SANITY CHECK: Compute current IST date and check if Yahoo data is stale
    const currentISTDate = formatYYYYMMDDInIST(new Date());
    const yahooDateObj = new Date(yahooPriceDate + 'T00:00:00');
    const currentDateObj = new Date(currentISTDate + 'T00:00:00');
    const daysDiff = (currentDateObj.getTime() - yahooDateObj.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysDiff > 1) {
      // Log warning and return null to skip upsert
      console.warn(`[StockPrice][STALE_YAHOO] SYMBOL=${symbol} yahoo_date=${yahooPriceDate} close=${yahooClose}`);
      return null;
    }
    
    // DEBUG LOG for accepted symbol
    console.log(`[StockPrice][ACCEPTED] SYMBOL=${symbol} yahoo_ts=${yahooTimestamp} yahoo_date_ist=${yahooPriceDate} close=${yahooClose}`);
    
    // Validate price
    if (!yahooClose || isNaN(yahooClose) || yahooClose <= 0) {
      throw new Error(`[YahooInvariant] Invalid close price for ${symbol} at index ${lastValidIndex}: ${yahooClose}`);
    }
    
    // CRITICAL: price_date ALWAYS equals yahoo_date_ist
    // closing_price ALWAYS equals the close for that timestamp
    return {
      price: parseFloat(yahooClose.toFixed(2)),
      date: yahooPriceDate,
      timestamp: yahooTimestamp,
    };
    
  } catch (error) {
    console.error(`[Stock Price Service] ✗ Failed to fetch Yahoo Finance price for ${symbol}:`, error);
    return null;
  }
}

// ============================================================================
// DATABASE OPERATIONS
// ============================================================================

/**
 * Get stock price from database
 * 
 * @param symbol - NSE stock symbol
 * @param priceDate - Optional date (defaults to latest available price)
 * @returns Stock price or null if not found
 */
export async function getStockPrice(
  symbol: string,
  priceDate?: string
): Promise<StockPrice | null> {
  try {
    const supabase = createAdminClient();

    // If a specific date is requested, fetch that row.
    if (priceDate) {
      const { data, error } = await supabase
        .from('stock_prices')
        .select('symbol, closing_price, price_date, last_updated, price_source')
        .eq('symbol', symbol.toUpperCase())
        .eq('price_date', priceDate)
        .maybeSingle();

      if (data && !error) {
        return {
          symbol: data.symbol,
          price: data.closing_price,
          priceDate: data.price_date,
          lastUpdated: data.last_updated,
        };
      }
      // Fall through to latest if not found.
    }

    // Default behavior: return the latest available price for this symbol.
    // This avoids any assumptions about "previous trading day" and trusts the DB/Yahoo-derived dates.
    const { data: latestData, error: latestError } = await supabase
      .from('stock_prices')
      .select('symbol, closing_price, price_date, last_updated, price_source')
      .eq('symbol', symbol.toUpperCase())
      .order('price_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestData && !latestError) {
      // Only log if price is more than 3 days old (stale data warning)
      const latestPriceDate = new Date(latestData.price_date);
      const daysOld = (Date.now() - latestPriceDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysOld > 3) {
        console.warn(
          `[Stock Price Service] Using stale price for ${symbol}: ₹${latestData.closing_price} (${latestData.price_date}, ${daysOld.toFixed(0)} days old)`
        );
      }
      return {
        symbol: latestData.symbol,
        price: latestData.closing_price,
        priceDate: latestData.price_date,
        lastUpdated: latestData.last_updated,
      };
    }

    if (latestError) {
      console.warn(`[Stock Price Service] Error fetching latest price for ${symbol}:`, latestError);
    }

    return null;
  } catch (error) {
    console.error(`[Stock Price Service] Error getting price for ${symbol}:`, error);
    return null;
  }
}

/**
 * Store stock price in database
 * 
 * @param symbol - NSE stock symbol
 * @param price - Closing price
 * @param priceDate - Trading date
 * @param priceSource - Source of the price (default: 'YAHOO_EOD')
 */
export async function storeStockPrice(
  symbol: string,
  price: number,
  priceDate: string,
  priceSource: string = 'YAHOO_EOD'
): Promise<boolean> {
  try {
    const supabase = createAdminClient();
    
    const { error } = await supabase
      .from('stock_prices')
      .upsert({
        symbol: symbol.toUpperCase(),
        closing_price: price,
        price_date: priceDate,
        price_source: priceSource,
        last_updated: new Date().toISOString(),
      }, {
        onConflict: 'symbol,price_date',
      });
    
    if (error) {
      console.error(`[Stock Price Service] Error storing price for ${symbol}:`, error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error(`[Stock Price Service] Error storing price for ${symbol}:`, error);
    return false;
  }
}

/**
 * Update stock prices for a list of symbols
 * 
 * Fetches prices from external API and stores them in database.
 * Only updates if price for today's trading day is missing.
 * 
 * @param symbols - Array of NSE stock symbols
 * @returns Array of update results
 */
export async function updateStockPrices(symbols: string[]): Promise<PriceUpdateResult[]> {
  const results: PriceUpdateResult[] = [];
  
  console.log(`[Stock Price Service] Starting price update for ${symbols.length} symbols`);

  // IMPORTANT PRODUCT RULE:
  // Yahoo Finance is the single source of truth for stock price dates.
  // We always fetch Yahoo, derive the IST price_date from the Yahoo timestamp,
  // and upsert (symbol, price_date). This makes both cron runs deterministic.
  const symbolsToUpdate = symbols;
  
  // Update prices (with rate limiting for free APIs)
  for (const symbol of symbolsToUpdate) {
    try {
      // Fetch price from API
      const priceData = await fetchStockPriceFromAPI(symbol);
      
      if (priceData) {
        // Store in database with YAHOO_EOD source
        // Note: [StockPrice][ACCEPTED] log is already emitted in fetchStockPriceFromAPI
        const stored = await storeStockPrice(symbol, priceData.price, priceData.date, 'YAHOO_EOD');
        
        if (stored) {
          results.push({
            symbol,
            success: true,
            price: priceData.price,
            priceDate: priceData.date,
          });
          console.log(`[Stock Price Service] ✓ Updated ${symbol}: ₹${priceData.price} (Yahoo EOD: ${priceData.date})`);
        } else {
          results.push({
            symbol,
            success: false,
            error: 'Failed to store price in database',
          });
        }
      } else {
        results.push({
          symbol,
          success: false,
          error: 'Failed to fetch price from Yahoo Finance API',
        });
      }
      
      // Rate limiting: wait 200ms between requests (for free API tiers)
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (error) {
      console.error(`[Stock Price Service] Error updating ${symbol}:`, error);
      results.push({
        symbol,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
  
  const successCount = results.filter(r => r.success).length;
  const failureCount = results.filter(r => !r.success).length;
  
  console.log(`[Stock Price Service] Update complete: ${successCount} succeeded, ${failureCount} failed`);
  
  return results;
}

/**
 * Get stock prices for multiple symbols (OPTIMIZED: Batch query)
 * 
 * @param symbols - Array of NSE stock symbols
 * @returns Map of symbol to price (or null if not found)
 */
export async function getStockPrices(
  symbols: string[]
): Promise<Map<string, StockPrice | null>> {
  const prices = new Map<string, StockPrice | null>();
  
  if (symbols.length === 0) {
    return prices;
  }
  
  try {
    const supabase = createAdminClient();
    const upperSymbols = symbols.map(s => s.toUpperCase());
    

    // IMPORTANT PRODUCT RULE:
    // Do NOT assume any "previous trading day" for stocks. Always use the latest stored
    // Yahoo-derived IST price_date per symbol.
    //
    // Fetch all rows for the requested symbols ordered by (symbol ASC, price_date DESC),
    // then take the first row per symbol.
    const { data: rows, error } = await supabase
      .from('stock_prices')
      .select('symbol, closing_price, price_date, last_updated, price_source')
      .in('symbol', upperSymbols)
      .order('symbol', { ascending: true })
      .order('price_date', { ascending: false });

    const latestBySymbol = new Map<string, StockPrice>();
    if (rows && !error) {
      for (const row of rows) {
        const sym = row.symbol.toUpperCase();
        if (!latestBySymbol.has(sym)) {
          latestBySymbol.set(sym, {
            symbol: row.symbol,
            price: row.closing_price,
            priceDate: row.price_date,
            lastUpdated: row.last_updated,
          });
        }
      }
    }

    for (const symbol of upperSymbols) {
      prices.set(symbol, latestBySymbol.get(symbol) || null);
    }

    return prices;
  } catch (error) {
    console.error(`[Stock Price Service] Error getting batch prices:`, error);
    // Fallback: return empty map (will use invested_value as fallback)
    return prices;
  }
}

