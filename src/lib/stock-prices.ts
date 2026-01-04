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
 * Get previous trading day date
 * 
 * Returns the most recent trading day (excludes weekends).
 * For MVP, we'll use yesterday if it's a weekday, otherwise go back to Friday.
 */
export function getPreviousTradingDay(): string {
  const today = new Date();
  let date = new Date(today);
  date.setDate(date.getDate() - 1);
  
  // If yesterday was Sunday (0) or Saturday (6), go back to Friday
  while (date.getDay() === 0 || date.getDay() === 6) {
    date.setDate(date.getDate() - 1);
  }
  
  return date.toISOString().split('T')[0]; // YYYY-MM-DD
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
    const priceDate = getPreviousTradingDay();
    
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
    
    // Try multiple fields for previous close price (Yahoo Finance API can vary)
    // Priority: chartPreviousClose (EOD previous close) > regularMarketPreviousClose > previousClose > regularMarketPrice
    // Note: chartPreviousClose is the correct field for previous trading day close price in Yahoo Finance v8 API
    let price = meta.chartPreviousClose || meta.regularMarketPreviousClose || meta.previousClose || meta.regularMarketPrice;
    
    // If still no price, try getting from indicators/quote data
    if (!price && result.indicators && result.indicators.quote && result.indicators.quote.length > 0) {
      const quotes = result.indicators.quote[0];
      if (quotes.close && Array.isArray(quotes.close) && quotes.close.length > 0) {
        // Get the last available close price (filter out null/undefined values)
        const closePrices = quotes.close.filter((p: number | null | undefined) => p !== null && p !== undefined && !isNaN(p) && p > 0);
        if (closePrices.length > 0) {
          price = closePrices[closePrices.length - 1];
          console.log(`[Stock Price Service] Using last close price from indicators for ${symbol}: ${price}`);
        }
      }
    }
    
    const timestamp = meta.regularMarketTime || meta.chartPreviousCloseTime || Math.floor(Date.now() / 1000);
    
    if (!price || isNaN(price) || price <= 0) {
      // Log the actual meta data for debugging (limited to avoid spam)
      const metaPreview = {
        chartPreviousClose: meta.chartPreviousClose,
        regularMarketPreviousClose: meta.regularMarketPreviousClose,
        previousClose: meta.previousClose,
        regularMarketPrice: meta.regularMarketPrice,
        currency: meta.currency,
        symbol: meta.symbol,
      };
      console.error(`[Stock Price Service] Invalid price for ${symbol}. Meta preview:`, JSON.stringify(metaPreview));
      throw new Error(`Invalid price from Yahoo Finance: price=${price}, tried: chartPreviousClose=${meta.chartPreviousClose}, regularMarketPreviousClose=${meta.regularMarketPreviousClose}, previousClose=${meta.previousClose}, regularMarketPrice=${meta.regularMarketPrice}`);
    }
    
    // Convert timestamp to date string
    const priceDateFromTimestamp = new Date(timestamp * 1000).toISOString().split('T')[0];
    
    console.log(`[Stock Price Service] ✓ Yahoo EOD: ${symbol} = ₹${price.toFixed(2)} (${priceDateFromTimestamp})`);
    
    return {
      price: parseFloat(price.toFixed(2)),
      date: priceDateFromTimestamp,
      timestamp: timestamp,
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
 * @param priceDate - Optional date (defaults to previous trading day)
 * @returns Stock price or null if not found
 */
export async function getStockPrice(
  symbol: string,
  priceDate?: string
): Promise<StockPrice | null> {
  try {
    const supabase = createAdminClient();
    const targetDate = priceDate || getPreviousTradingDay();
    
    // Try to get price for the specific date
    const { data, error } = await supabase
      .from('stock_prices')
      .select('symbol, closing_price, price_date, last_updated, price_source')
      .eq('symbol', symbol.toUpperCase())
      .eq('price_date', targetDate)
      .single();
    
    if (error || !data) {
      // Try to get the most recent price for this symbol (even if stale)
      // This ensures we never default to avg_buy_price
      // Use .maybeSingle() instead of .single() to handle cases where no rows exist
      const { data: latestData, error: latestError } = await supabase
        .from('stock_prices')
        .select('symbol, closing_price, price_date, last_updated, price_source')
        .eq('symbol', symbol.toUpperCase())
        .order('price_date', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (latestData && !latestError) {
        // Only log if price is more than 3 days old (stale data warning)
        const priceDate = new Date(latestData.price_date);
        const daysOld = (Date.now() - priceDate.getTime()) / (1000 * 60 * 60 * 24);
        if (daysOld > 3) {
          console.warn(`[Stock Price Service] Using stale price for ${symbol}: ₹${latestData.closing_price} (${latestData.price_date}, ${daysOld.toFixed(0)} days old)`);
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
    }
    
    return {
      symbol: data.symbol,
      price: data.closing_price,
      priceDate: data.price_date,
      lastUpdated: data.last_updated,
    };
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
  const priceDate = getPreviousTradingDay();
  
  console.log(`[Stock Price Service] Starting price update for ${symbols.length} symbols`);
  console.log(`[Stock Price Service] Target date: ${priceDate}`);
  
  // Check which symbols need updates
  const supabase = createAdminClient();
  const { data: existingPrices } = await supabase
    .from('stock_prices')
    .select('symbol')
    .eq('price_date', priceDate)
    .in('symbol', symbols.map(s => s.toUpperCase()));
  
  const existingSymbols = new Set(
    (existingPrices || []).map(p => p.symbol.toUpperCase())
  );
  
  const symbolsToUpdate = symbols.filter(s => !existingSymbols.has(s.toUpperCase()));
  
  console.log(`[Stock Price Service] ${symbolsToUpdate.length} symbols need updates`);
  
  // Update prices (with rate limiting for free APIs)
  for (const symbol of symbolsToUpdate) {
    try {
      // Fetch price from API
      const priceData = await fetchStockPriceFromAPI(symbol);
      
      if (priceData) {
        // Store in database with YAHOO_EOD source
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
  console.log(`[Stock Price Service] Price date used: ${priceDate} (Yahoo EOD)`);
  
  return results;
}

/**
 * Get stock prices for multiple symbols
 * 
 * @param symbols - Array of NSE stock symbols
 * @returns Map of symbol to price (or null if not found)
 */
export async function getStockPrices(
  symbols: string[]
): Promise<Map<string, StockPrice | null>> {
  const prices = new Map<string, StockPrice | null>();
  
  for (const symbol of symbols) {
    const price = await getStockPrice(symbol);
    prices.set(symbol.toUpperCase(), price);
  }
  
  return prices;
}

