/**
 * Stock Helper Functions
 * 
 * Utility functions for stock operations (price fetching, name resolution, etc.)
 */

import { createAdminClient } from '@/lib/supabase/server';
import { getStockPrice } from '@/lib/stock-prices';

/**
 * Fetch current stock price
 * Uses the existing stock-prices service
 */
export async function fetchStockPrice(symbol: string): Promise<number> {
  try {
    const priceData = await getStockPrice(symbol);
    return priceData?.price || 0;
  } catch (error) {
    console.error(`[Stock Helpers] Failed to fetch stock price for ${symbol}:`, error);
    return 0;
  }
}

/**
 * Fetch stock name from symbol
 * 
 * Strategy:
 * 1. Check if asset already exists in database
 * 2. If not, format symbol nicely (e.g., "HDFCBANK" -> "HDFC Bank")
 * 3. Could be extended to fetch from external API
 */
export async function fetchStockName(symbol: string): Promise<string> {
  try {
    const supabase = createAdminClient();
    
    // Check if asset already exists
    const { data: existingAsset } = await supabase
      .from('assets')
      .select('name')
      .eq('symbol', symbol.toUpperCase())
      .eq('asset_type', 'equity')
      .maybeSingle();
    
    if (existingAsset?.name) {
      return existingAsset.name;
    }
    
    // Format symbol nicely (basic approach)
    // e.g., "HDFCBANK" -> "HDFC Bank", "RELIANCE" -> "Reliance"
    const formatted = formatSymbolToName(symbol);
    return formatted;
  } catch (error) {
    console.error(`[Stock Helpers] Failed to fetch stock name for ${symbol}:`, error);
    return formatSymbolToName(symbol);
  }
}

/**
 * Format symbol to a readable name
 * Basic formatting - can be enhanced with a stocks master database
 */
function formatSymbolToName(symbol: string): string {
  // Remove common suffixes
  let name = symbol
    .replace(/BANK$/i, ' Bank')
    .replace(/LTD$/i, ' Ltd')
    .replace(/LIMITED$/i, ' Limited')
    .replace(/CORP$/i, ' Corp')
    .replace(/INC$/i, ' Inc');
  
  // Add spaces before capital letters (basic camelCase handling)
  name = name.replace(/([a-z])([A-Z])/g, '$1 $2');
  
  // Capitalize first letter of each word
  name = name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
  
  return name || symbol;
}

/**
 * Calculate portfolio allocation for a holding
 * 
 * @param userId - User ID
 * @param currentValue - Current value of the holding
 * @returns Allocation percentage (0-100)
 * 
 * Note: This is a simplified calculation. In production, allocation
 * is calculated by the portfolio aggregation utility for consistency.
 */
export async function calculateAllocation(
  userId: string, 
  currentValue: number
): Promise<number> {
  try {
    const supabase = createAdminClient();
    
    // Get user's primary portfolio
    const { data: portfolio } = await supabase
      .from('portfolios')
      .select('id')
      .eq('user_id', userId)
      .eq('is_primary', true)
      .single();
    
    if (!portfolio) {
      return 0;
    }
    
    // Get total portfolio value from holdings
    const { data: holdings, error } = await supabase
      .from('holdings')
      .select('current_value')
      .eq('portfolio_id', portfolio.id);
    
    if (error || !holdings || holdings.length === 0) {
      return 0;
    }

    // Calculate total portfolio value
    const totalValue = holdings.reduce((sum, holding) => {
      return sum + (Number(holding.current_value) || 0);
    }, 0);

    if (totalValue === 0) return 0;
    
    return (currentValue / totalValue) * 100;
  } catch (error) {
    console.error('[Stock Helpers] Failed to calculate allocation:', error);
    return 0;
  }
}
