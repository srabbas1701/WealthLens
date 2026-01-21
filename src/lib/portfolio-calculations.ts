/**
 * Portfolio Calculation Utilities
 * 
 * DESIGN PHILOSOPHY:
 * ==================
 * All portfolio values are computed from ONLY two trusted fields:
 * - quantity: Number of units held
 * - average_buy_price: Price paid per unit
 * 
 * WHY WE IGNORE CALCULATED CSV COLUMNS:
 * =====================================
 * 1. "Current Value" / "Market Value" - Changes with market prices, unreliable at upload time
 * 2. "P&L" / "Returns" - Calculated from current value, which we don't trust
 * 3. "Day Change" - Daily fluctuation, not relevant for holdings
 * 4. Any "Value" column - Could be current or invested, ambiguous
 * 
 * INDIAN NUMBER FORMAT HANDLING:
 * ==============================
 * Indian financial data comes in various formats:
 * - With commas: "1,50,000" (Indian) or "150,000" (Western)
 * - With symbols: "₹1,50,000" or "Rs. 1,50,000"
 * - With units: "1.5L" (Lakhs), "1.5Cr" (Crores), "1.5K" (Thousands)
 * - Negative: "-1,000" or "(1,000)"
 * 
 * CALCULATION RULES:
 * ==================
 * 1. invested_value = quantity × average_buy_price (ALWAYS computed, never trusted from file)
 * 2. current_value = quantity × current_market_price (for equity) or invested_value (for others)
 * 3. total_portfolio_value = SUM(current_value for equity, invested_value for others)
 * 4. allocation_percentage = (holding_value / total_portfolio_value) × 100
 * 5. All percentages must sum to 100% (with rounding tolerance)
 * 
 * NO TRADING LANGUAGE - This is for understanding, not execution
 */

// ============================================================================
// NUMBER PARSING - INDIAN FORMAT SUPPORT
// ============================================================================

/**
 * Normalize Indian number format to absolute INR value
 * 
 * Handles:
 * - Indian comma format: "1,50,000" → 150000
 * - Western comma format: "150,000" → 150000
 * - Currency symbols: "₹1,50,000", "Rs. 1,50,000" → 150000
 * - Unit suffixes: "1.5L" → 150000, "1.5Cr" → 15000000, "1.5K" → 1500
 * - Negative: "-1,000" or "(1,000)" → -1000
 * - Spaces and special characters: cleaned
 * 
 * @param value - Raw value from CSV/Excel (string or number)
 * @returns Normalized absolute number in INR, or null if invalid
 */
export function parseIndianNumber(value: unknown): number | null {
  // Handle null/undefined/empty
  if (value === null || value === undefined || value === '') {
    return null;
  }
  
  // If already a valid number, return it
  if (typeof value === 'number') {
    return isNaN(value) || !isFinite(value) ? null : value;
  }
  
  // Convert to string and clean
  let str = String(value).trim();
  
  // Handle empty string after trim
  if (str === '' || str === '-' || str === '+') {
    return null;
  }
  
  // Track negative
  let isNegative = false;
  
  // Check for negative formats
  if (str.startsWith('-')) {
    isNegative = true;
    str = str.substring(1).trim();
  } else if (str.startsWith('(') && str.endsWith(')')) {
    // Accounting format: (1000) = -1000
    isNegative = true;
    str = str.substring(1, str.length - 1).trim();
  }
  
  // Remove currency symbols and common prefixes
  str = str
    .replace(/^₹\s*/i, '')           // ₹ symbol
    .replace(/^rs\.?\s*/i, '')       // Rs or Rs.
    .replace(/^inr\s*/i, '')         // INR prefix
    .replace(/^rupees?\s*/i, '')     // Rupees/Rupee
    .trim();
  
  // Check for unit suffixes BEFORE removing commas
  // This handles "1.5L", "1.5 Lakh", "2Cr", "2 Crore", "1.5K", etc.
  const unitMultipliers: { pattern: RegExp; multiplier: number }[] = [
    // Crores (1 Cr = 10,000,000)
    { pattern: /^([\d.,]+)\s*(?:cr|crore|crores)$/i, multiplier: 10000000 },
    // Lakhs (1 L = 100,000)
    { pattern: /^([\d.,]+)\s*(?:l|lakh|lakhs|lac|lacs)$/i, multiplier: 100000 },
    // Thousands (1 K = 1,000)
    { pattern: /^([\d.,]+)\s*(?:k|thousand|thousands)$/i, multiplier: 1000 },
    // Millions (1 M = 1,000,000) - for international data
    { pattern: /^([\d.,]+)\s*(?:m|million|millions)$/i, multiplier: 1000000 },
    // Billions (1 B = 1,000,000,000) - for international data
    { pattern: /^([\d.,]+)\s*(?:b|billion|billions)$/i, multiplier: 1000000000 },
  ];
  
  for (const { pattern, multiplier } of unitMultipliers) {
    const match = str.match(pattern);
    if (match) {
      // Extract the numeric part and parse it
      const numericPart = match[1].replace(/,/g, '');
      const baseValue = parseFloat(numericPart);
      if (!isNaN(baseValue)) {
        const result = baseValue * multiplier;
        return isNegative ? -result : result;
      }
    }
  }
  
  // Remove all commas (handles both Indian "1,50,000" and Western "150,000")
  str = str.replace(/,/g, '');
  
  // Remove any remaining spaces
  str = str.replace(/\s/g, '');
  
  // Handle percentage (remove % and treat as decimal)
  if (str.endsWith('%')) {
    str = str.slice(0, -1);
    const pctValue = parseFloat(str);
    if (!isNaN(pctValue)) {
      // Return percentage as decimal (50% → 0.5) - useful for allocation
      return isNegative ? -pctValue : pctValue;
    }
    return null;
  }
  
  // Parse the final cleaned string
  const result = parseFloat(str);
  
  if (isNaN(result) || !isFinite(result)) {
    return null;
  }
  
  return isNegative ? -result : result;
}

/**
 * Parse quantity value (must be positive)
 * 
 * @param value - Raw quantity value
 * @returns Positive quantity or null if invalid
 */
export function parseQuantity(value: unknown): number | null {
  const num = parseIndianNumber(value);
  
  // Quantity must be positive
  if (num === null || num <= 0) {
    return null;
  }
  
  return num;
}

/**
 * Parse price value (must be non-negative)
 * 
 * @param value - Raw price value
 * @returns Non-negative price or null if invalid
 */
export function parsePrice(value: unknown): number | null {
  const num = parseIndianNumber(value);
  
  // Price must be non-negative
  if (num === null || num < 0) {
    return null;
  }
  
  return num;
}

// ============================================================================
// PORTFOLIO CALCULATIONS
// ============================================================================

/**
 * Calculate invested value from quantity and price
 * 
 * CORE CALCULATION - This is the ONLY way invested_value should be computed
 * 
 * @param quantity - Number of units
 * @param averagePrice - Price per unit
 * @returns invested_value = quantity × averagePrice
 */
export function calculateInvestedValue(quantity: number, averagePrice: number): number {
  // Validate inputs
  if (quantity <= 0 || averagePrice < 0 || !isFinite(quantity) || !isFinite(averagePrice)) {
    return 0;
  }
  
  return quantity * averagePrice;
}

/**
 * Calculate weighted average price when merging holdings
 * 
 * Used when:
 * - Same asset appears multiple times in CSV
 * - User uploads additional holdings for existing asset
 * 
 * Formula: (qty1 × price1 + qty2 × price2) / (qty1 + qty2)
 * 
 * @param existingQty - Existing quantity
 * @param existingPrice - Existing average price
 * @param newQty - New quantity to add
 * @param newPrice - New average price
 * @returns Weighted average price
 */
export function calculateWeightedAveragePrice(
  existingQty: number,
  existingPrice: number,
  newQty: number,
  newPrice: number
): number {
  const totalQty = existingQty + newQty;
  
  if (totalQty <= 0) {
    return 0;
  }
  
  const totalValue = (existingQty * existingPrice) + (newQty * newPrice);
  return totalValue / totalQty;
}

/**
 * Calculate allocation percentage
 * 
 * @param holdingValue - Value of the holding
 * @param totalPortfolioValue - Total portfolio value
 * @returns Percentage (0-100) with 2 decimal precision
 */
export function calculateAllocationPercentage(
  holdingValue: number,
  totalPortfolioValue: number
): number {
  if (totalPortfolioValue <= 0 || holdingValue < 0) {
    return 0;
  }
  
  const percentage = (holdingValue / totalPortfolioValue) * 100;
  
  // Round to 2 decimal places
  return Math.round(percentage * 100) / 100;
}

/**
 * Normalize allocation percentages to sum to 100%
 * 
 * Due to rounding, percentages may not sum exactly to 100.
 * This function adjusts the largest value to ensure sum = 100.
 * 
 * @param allocations - Array of { key, percentage } objects
 * @returns Array with normalized percentages summing to 100
 */
export function normalizeAllocations<T extends { percentage: number }>(
  allocations: T[]
): T[] {
  if (allocations.length === 0) {
    return [];
  }
  
  // Calculate current sum
  const currentSum = allocations.reduce((sum, a) => sum + a.percentage, 0);
  
  // If already 100 (or very close), return as-is
  if (Math.abs(currentSum - 100) < 0.01) {
    return allocations;
  }
  
  // If sum is 0, can't normalize
  if (currentSum === 0) {
    return allocations;
  }
  
  // Find the largest allocation (we'll adjust this one)
  let maxIndex = 0;
  let maxValue = allocations[0].percentage;
  
  for (let i = 1; i < allocations.length; i++) {
    if (allocations[i].percentage > maxValue) {
      maxValue = allocations[i].percentage;
      maxIndex = i;
    }
  }
  
  // Calculate adjustment needed
  const adjustment = 100 - currentSum;
  
  // Create new array with adjusted value
  return allocations.map((a, i) => {
    if (i === maxIndex) {
      return {
        ...a,
        percentage: Math.round((a.percentage + adjustment) * 100) / 100,
      };
    }
    return a;
  });
}

// ============================================================================
// HOLDING GROUPING & DEDUPLICATION
// ============================================================================

export interface HoldingIdentity {
  isin?: string;
  symbol?: string;
  name: string;
}

/**
 * Generate a unique key for a holding based on identity
 * 
 * Priority: ISIN > Symbol > Name
 * 
 * @param holding - Holding with identity fields
 * @returns Unique key string
 */
export function getHoldingKey(holding: HoldingIdentity): string {
  // ISIN is most reliable (globally unique)
  if (holding.isin && holding.isin.trim()) {
    return `isin:${holding.isin.trim().toUpperCase()}`;
  }
  
  // Symbol is second priority (unique within exchange)
  if (holding.symbol && holding.symbol.trim()) {
    return `symbol:${holding.symbol.trim().toUpperCase()}`;
  }
  
  // Name is fallback (normalized)
  return `name:${holding.name.trim().toLowerCase().replace(/\s+/g, '_')}`;
}

export interface GroupedHolding extends HoldingIdentity {
  quantity: number;
  average_price: number;
  invested_value: number;
  asset_type: string;
  rowIndices: number[];  // Track which CSV rows were merged
}

/**
 * Group and merge holdings by identity
 * 
 * When multiple rows have the same asset identity:
 * - Merge quantities
 * - Calculate weighted average price
 * - Recompute invested_value
 * 
 * @param holdings - Array of parsed holdings
 * @returns Array of grouped/merged holdings
 */
export function groupHoldings(
  holdings: Array<{
    isin?: string;
    symbol?: string;
    name: string;
    quantity: number;
    average_price: number;
    asset_type: string;
    rowIndex: number;
  }>
): GroupedHolding[] {
  const groups = new Map<string, GroupedHolding>();
  
  for (const holding of holdings) {
    const key = getHoldingKey(holding);
    
    const existing = groups.get(key);
    
    if (existing) {
      // Merge with existing
      const newAvgPrice = calculateWeightedAveragePrice(
        existing.quantity,
        existing.average_price,
        holding.quantity,
        holding.average_price
      );
      
      existing.quantity += holding.quantity;
      existing.average_price = newAvgPrice;
      existing.invested_value = calculateInvestedValue(existing.quantity, newAvgPrice);
      existing.rowIndices.push(holding.rowIndex);
      
      // Prefer more specific identity info
      if (holding.isin && !existing.isin) {
        existing.isin = holding.isin;
      }
      if (holding.symbol && !existing.symbol) {
        existing.symbol = holding.symbol;
      }
    } else {
      // Create new group
      groups.set(key, {
        isin: holding.isin,
        symbol: holding.symbol,
        name: holding.name,
        quantity: holding.quantity,
        average_price: holding.average_price,
        invested_value: calculateInvestedValue(holding.quantity, holding.average_price),
        asset_type: holding.asset_type,
        rowIndices: [holding.rowIndex],
      });
    }
  }
  
  return Array.from(groups.values());
}

// ============================================================================
// PORTFOLIO METRICS CALCULATION
// ============================================================================

export interface PortfolioMetrics {
  totalInvestedValue: number;
  equityPct: number;
  debtPct: number;
  goldPct: number;
  cashPct: number;
  hybridPct: number;
  otherPct: number;
  riskScore: number;
  riskLabel: 'Conservative' | 'Moderate' | 'Growth' | 'Aggressive';
  diversificationScore: number;
  topHoldingPct: number;
}

/**
 * Map asset_type to asset_class for allocation calculation
 * 
 * @deprecated Use classifyAsset from @/lib/asset-classification instead
 * This function is kept for backward compatibility but should be migrated
 */
export function getAssetClass(assetType: string): 'equity' | 'debt' | 'gold' | 'cash' | 'hybrid' | 'other' {
  // Map old asset types to old format for backward compatibility
  const mapping: Record<string, 'equity' | 'debt' | 'gold' | 'cash' | 'hybrid' | 'other'> = {
    'equity': 'equity',
    'mutual_fund': 'equity',  // Most MFs are equity-oriented
    'index_fund': 'equity',
    'etf': 'equity',
    'fd': 'debt',
    'bond': 'debt',
    'ppf': 'debt',
    'epf': 'debt',
    'gold': 'gold',
    'nps': 'hybrid',
    'cash': 'cash',
    'other': 'other',
  };
  
  return mapping[assetType] || 'other';
}

/**
 * Calculate comprehensive portfolio metrics
 * 
 * @param holdings - Array of holdings with invested_value and asset_type
 * @returns Complete portfolio metrics
 */
export function calculatePortfolioMetrics(
  holdings: Array<{
    invested_value: number;
    asset_type: string;
    name?: string;
  }>
): PortfolioMetrics {
  // Calculate total portfolio value
  const totalInvestedValue = holdings.reduce((sum, h) => sum + h.invested_value, 0);
  
  // Group by asset class
  const byClass: Record<string, number> = {
    equity: 0,
    debt: 0,
    gold: 0,
    cash: 0,
    hybrid: 0,
    other: 0,
  };
  
  holdings.forEach(h => {
    const assetClass = getAssetClass(h.asset_type);
    byClass[assetClass] += h.invested_value;
  });
  
  // Calculate percentages
  const equityPct = totalInvestedValue > 0 ? (byClass.equity / totalInvestedValue) * 100 : 0;
  const debtPct = totalInvestedValue > 0 ? (byClass.debt / totalInvestedValue) * 100 : 0;
  const goldPct = totalInvestedValue > 0 ? (byClass.gold / totalInvestedValue) * 100 : 0;
  const cashPct = totalInvestedValue > 0 ? (byClass.cash / totalInvestedValue) * 100 : 0;
  const hybridPct = totalInvestedValue > 0 ? (byClass.hybrid / totalInvestedValue) * 100 : 0;
  const otherPct = totalInvestedValue > 0 ? (byClass.other / totalInvestedValue) * 100 : 0;
  
  // Calculate top holding percentage
  const holdingValues = holdings.map(h => h.invested_value).sort((a, b) => b - a);
  const topHoldingPct = totalInvestedValue > 0 && holdingValues.length > 0
    ? (holdingValues[0] / totalInvestedValue) * 100
    : 0;
  
  // Calculate risk score (0-100)
  // Higher equity = higher risk, higher concentration = higher risk
  const riskScore = Math.min(100, Math.round(
    equityPct * 0.7 +           // Equity weight (max 70 points)
    hybridPct * 0.35 +          // Hybrid is half as risky
    goldPct * 0.2 +             // Gold has some volatility
    topHoldingPct * 0.3         // Concentration adds risk (max 30 points)
  ));
  
  // Determine risk label
  let riskLabel: 'Conservative' | 'Moderate' | 'Growth' | 'Aggressive';
  if (riskScore < 25) {
    riskLabel = 'Conservative';
  } else if (riskScore < 50) {
    riskLabel = 'Moderate';
  } else if (riskScore < 75) {
    riskLabel = 'Growth';
  } else {
    riskLabel = 'Aggressive';
  }
  
  // Calculate diversification score (0-100)
  // More holdings = better, lower concentration = better, more asset classes = better
  const numHoldings = holdings.length;
  const numAssetClasses = Object.values(byClass).filter(v => v > 0).length;
  
  const diversificationScore = Math.min(100, Math.round(
    Math.min(50, numHoldings * 5) +           // Up to 50 points for number of holdings
    (100 - topHoldingPct) * 0.3 +              // Up to 30 points for low concentration
    numAssetClasses * 4                         // Up to 20 points for asset class diversity
  ));
  
  return {
    totalInvestedValue,
    equityPct: Math.round(equityPct * 100) / 100,
    debtPct: Math.round(debtPct * 100) / 100,
    goldPct: Math.round(goldPct * 100) / 100,
    cashPct: Math.round(cashPct * 100) / 100,
    hybridPct: Math.round(hybridPct * 100) / 100,
    otherPct: Math.round(otherPct * 100) / 100,
    riskScore,
    riskLabel,
    diversificationScore,
    topHoldingPct: Math.round(topHoldingPct * 100) / 100,
  };
}

// ============================================================================
// DISPLAY FORMATTING
// ============================================================================

/**
 * Format number as Indian currency for display
 * 
 * @param amount - Amount in INR
 * @param options - Formatting options
 * @returns Formatted string like "₹1.5L" or "₹15,00,000"
 */
export function formatIndianCurrency(
  amount: number,
  options: {
    compact?: boolean;      // Use L/Cr notation
    decimals?: number;      // Decimal places for compact
    showSymbol?: boolean;   // Include ₹ symbol
  } = {}
): string {
  const {
    compact = true,
    decimals = 2,
    showSymbol = true,
  } = options;
  
  const symbol = showSymbol ? '₹' : '';
  const absAmount = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  
  if (compact) {
    if (absAmount >= 10000000) {
      // Crores
      return `${sign}${symbol}${(absAmount / 10000000).toFixed(decimals)} Cr`;
    }
    if (absAmount >= 100000) {
      // Lakhs
      return `${sign}${symbol}${(absAmount / 100000).toFixed(decimals)} L`;
    }
    if (absAmount >= 1000) {
      // Thousands with Indian formatting
      return `${sign}${symbol}${absAmount.toLocaleString('en-IN')}`;
    }
    return `${sign}${symbol}${absAmount.toFixed(decimals)}`;
  }
  
  // Full Indian number format
  return `${sign}${symbol}${absAmount.toLocaleString('en-IN', {
    maximumFractionDigits: decimals,
    minimumFractionDigits: 0,
  })}`;
}

/**
 * Format percentage for display
 * 
 * @param percentage - Percentage value (0-100)
 * @param decimals - Decimal places
 * @returns Formatted string like "45.5%"
 */
export function formatPercentage(percentage: number, decimals: number = 1): string {
  return `${percentage.toFixed(decimals)}%`;
}











