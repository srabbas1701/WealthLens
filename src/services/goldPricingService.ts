/**
 * Gold Pricing Service
 * 
 * Centralized service for IBJA (India Bullion and Jewellers Association) gold rates.
 * 
 * RULES (NON-NEGOTIABLE):
 * - All prices normalized to ₹ per gram
 * - IBJA rates only (not international spot, not city jeweller prices)
 * - Supported purities: 999 (24K), 995 (23.8K), 916 (22K), 750 (18K)
 * - IBJA publishes in ₹/10g format, we normalize to ₹/gram
 * 
 * @module services/goldPricingService
 */

export type GoldPurity = '999' | '995' | '916' | '750';
export type GoldSession = 'AM' | 'PM';

export type GoldPriceSource = 'IBJA' | 'MCX_PROXY';

export interface IBJAGoldRates {
  date: string; // YYYY-MM-DD
  gold_24k: number; // ₹ per gram (999 purity)
  gold_22k: number; // ₹ per gram (916 purity)
  gold_23_8k?: number; // ₹ per gram (995 purity)
  gold_18k?: number; // ₹ per gram (750 purity)
  source: GoldPriceSource;
  session: GoldSession | null; // null for MCX_PROXY
  last_updated: string; // ISO timestamp
  isIndicative?: boolean; // true for MCX_PROXY, false for IBJA
}

export interface GoldPriceValidationResult {
  valid: boolean;
  error?: string;
  normalizedRates?: IBJAGoldRates;
}

/**
 * Purity mapping to IBJA standard
 */
const PURITY_MAP: Record<string, GoldPurity> = {
  '24k': '999',
  '24K': '999',
  '999': '999',
  '23.8k': '995',
  '23.8K': '995',
  '995': '995',
  '22k': '916',
  '22K': '916',
  '916': '916',
  '18k': '750',
  '18K': '750',
  '750': '750',
};

/**
 * Sanity guard: Valid price range for Indian gold (₹ per gram)
 */
const MIN_PRICE_PER_GRAM = 1000; // ₹1,000 per gram minimum
const MAX_PRICE_PER_GRAM = 25000; // ₹25,000 per gram maximum

/**
 * Maximum day-over-day price change (10%)
 */
const MAX_DAILY_CHANGE_PCT = 10;

/**
 * Normalize IBJA table value (₹ per 10g) to ₹ per gram
 * 
 * @param ibjaTableValue - IBJA published value (₹ per 10 grams)
 * @returns Normalized rate in ₹ per gram
 * 
 * @example
 * normalizeIBJARate(143978) // Returns 14397.8
 */
export function normalizeIBJARate(ibjaTableValue: number): number {
  if (ibjaTableValue <= 0) {
    throw new Error('IBJA table value must be positive');
  }
  
  // IBJA publishes per 10g, normalize to per gram
  return ibjaTableValue / 10;
}

/**
 * Validate gold price range (sanity guard)
 * 
 * @param pricePerGram - Price in ₹ per gram
 * @returns true if valid, false otherwise
 */
export function validatePriceRange(pricePerGram: number): boolean {
  return pricePerGram >= MIN_PRICE_PER_GRAM && pricePerGram <= MAX_PRICE_PER_GRAM;
}

/**
 * Validate and normalize gold rates (IBJA or MCX)
 * 
 * @param rates - Raw rates (may be in ₹/10g format for IBJA, or ₹/gram for MCX)
 * @param previousRates - Previous day's rates for change validation
 * @param source - Source of rates (IBJA or MCX_PROXY)
 * @returns Validation result with normalized rates
 */
export function validateAndNormalizeGoldRates(
  rates: {
    gold_24k?: number;
    gold_22k?: number;
    gold_23_8k?: number;
    gold_18k?: number;
    date: string;
    session?: GoldSession | null;
  },
  previousRates?: IBJAGoldRates,
  source: GoldPriceSource = 'IBJA'
): GoldPriceValidationResult {
  // Check if rates are in ₹/10g format (typically > 10,000)
  // IBJA table values are usually 5-6 digits (e.g., 143978)
  // MCX rates are typically already in ₹/gram format
  const isLikelyPer10g = source === 'IBJA' && ((rates.gold_24k || 0) > 10000 || (rates.gold_22k || 0) > 10000);
  
  let normalized24k = rates.gold_24k || 0;
  let normalized22k = rates.gold_22k || 0;
  let normalized23_8k = rates.gold_23_8k || 0;
  let normalized18k = rates.gold_18k || 0;
  
  // Normalize if in ₹/10g format (IBJA only)
  if (isLikelyPer10g) {
    normalized24k = normalizeIBJARate(normalized24k);
    normalized22k = normalizeIBJARate(normalized22k);
    if (normalized23_8k > 0) {
      normalized23_8k = normalizeIBJARate(normalized23_8k);
    }
    if (normalized18k > 0) {
      normalized18k = normalizeIBJARate(normalized18k);
    }
  }
  
  // Validate price ranges
  if (!validatePriceRange(normalized24k)) {
    return {
      valid: false,
      error: `24K gold price (${normalized24k}) is outside valid range (₹${MIN_PRICE_PER_GRAM}-${MAX_PRICE_PER_GRAM} per gram)`,
    };
  }
  
  if (!validatePriceRange(normalized22k)) {
    return {
      valid: false,
      error: `22K gold price (${normalized22k}) is outside valid range (₹${MIN_PRICE_PER_GRAM}-${MAX_PRICE_PER_GRAM} per gram)`,
    };
  }
  
  // Validate 22k is approximately 91.6% of 24k (within 2% tolerance)
  const expected22k = normalized24k * 0.916;
  const tolerance = expected22k * 0.02;
  if (Math.abs(normalized22k - expected22k) > tolerance) {
    console.warn(`[Gold Pricing] 22K price (${normalized22k}) deviates significantly from expected (${expected22k.toFixed(2)})`);
  }
  
  // Check day-over-day change (if previous rates available)
  if (previousRates) {
    const change24k = Math.abs((normalized24k - previousRates.gold_24k) / previousRates.gold_24k * 100);
    if (change24k > MAX_DAILY_CHANGE_PCT) {
      console.warn(`[Gold Pricing] 24K price changed by ${change24k.toFixed(2)}% (max allowed: ${MAX_DAILY_CHANGE_PCT}%)`);
    }
  }
  
  const normalizedRates: IBJAGoldRates = {
    date: rates.date,
    gold_24k: normalized24k,
    gold_22k: normalized22k,
    source: source,
    session: source === 'IBJA' ? (rates.session || 'AM') : null,
    last_updated: new Date().toISOString(),
    isIndicative: source === 'MCX_PROXY', // MCX is indicative, IBJA is official
  };
  
  if (normalized23_8k > 0) {
    normalizedRates.gold_23_8k = normalized23_8k;
  }
  
  if (normalized18k > 0) {
    normalizedRates.gold_18k = normalized18k;
  }
  
  return {
    valid: true,
    normalizedRates,
  };
}

/**
 * Backward compatibility alias for validateAndNormalizeGoldRates
 * @deprecated Use validateAndNormalizeGoldRates instead
 */
export const validateAndNormalizeIBJARates = validateAndNormalizeGoldRates;

/**
 * Get IBJA rate for specific purity
 * 
 * @param rates - IBJA gold rates
 * @param purity - Gold purity (999, 995, 916, 750 or 24k, 22k, etc.)
 * @returns Rate in ₹ per gram
 */
export function getRateForPurity(rates: IBJAGoldRates, purity: string): number {
  const normalizedPurity = PURITY_MAP[purity] || '999';
  
  switch (normalizedPurity) {
    case '999':
      return rates.gold_24k;
    case '995':
      return rates.gold_23_8k || rates.gold_24k * 0.995;
    case '916':
      return rates.gold_22k;
    case '750':
      return rates.gold_18k || rates.gold_24k * 0.75;
    default:
      return rates.gold_24k;
  }
}

/**
 * Calculate current value for gold holding
 * 
 * @param holding - Gold holding details
 * @param rates - IBJA gold rates
 * @returns Current value in ₹
 */
export function calculateGoldCurrentValue(
  holding: {
    goldType: 'sgb' | 'physical' | 'etf' | 'digital';
    quantity: number;
    unitType: 'gram' | 'unit';
    purity?: string;
    netWeight?: number;
    etfNav?: number; // For ETF only
  },
  rates: IBJAGoldRates
): number {
  const { goldType, quantity, unitType, purity, netWeight, etfNav } = holding;
  
  // Gold ETF: Use NAV, not IBJA rates
  if (goldType === 'etf') {
    if (!etfNav || etfNav <= 0) {
      throw new Error('ETF NAV is required for Gold ETF valuation');
    }
    return quantity * etfNav;
  }
  
  // For all other types, use IBJA rates
  let grams: number;
  let ratePerGram: number;
  
  if (goldType === 'physical' && netWeight) {
    // Physical gold: Use net weight (ignore making charges)
    grams = netWeight;
  } else if (unitType === 'gram') {
    grams = quantity;
  } else if (unitType === 'unit') {
    // SGB/Digital: Assume 1 unit = 1 gram (standard for Indian gold)
    grams = quantity;
  } else {
    grams = quantity;
  }
  
  // Determine rate based on purity
  if (goldType === 'sgb' || goldType === 'digital') {
    // SGB and Digital Gold always use 24K (999) rate
    ratePerGram = rates.gold_24k;
  } else if (goldType === 'physical' && purity) {
    // Physical gold: Use purity-specific rate
    ratePerGram = getRateForPurity(rates, purity);
  } else {
    // Default to 24K
    ratePerGram = rates.gold_24k;
  }
  
  return grams * ratePerGram;
}

/**
 * Format gold price for display
 * 
 * @param pricePerGram - Price in ₹ per gram
 * @param showPer10g - Whether to show per 10g format
 * @returns Formatted price string
 */
export function formatGoldPrice(pricePerGram: number, showPer10g: boolean = false): string {
  if (showPer10g) {
    const pricePer10g = pricePerGram * 10;
    return `₹${pricePer10g.toLocaleString('en-IN', { maximumFractionDigits: 0 })} per 10g`;
  }
  return `₹${pricePerGram.toLocaleString('en-IN', { maximumFractionDigits: 2 })} per gram`;
}

/**
 * Detect if price is in wrong format (USD or ₹/10g stored as ₹/gram)
 * 
 * @param pricePerGram - Price to check
 * @returns true if suspicious
 */
export function isSuspiciousPrice(pricePerGram: number): boolean {
  // USD prices are typically $50-100 per gram = ₹4,000-8,000 (at current rates)
  // But Indian gold is ₹6,000-8,000 per gram, so this is tricky
  // Better to check if it's way too low (< ₹3,000) or way too high (> ₹15,000)
  
  if (pricePerGram < 3000) {
    return true; // Suspiciously low (might be USD)
  }
  
  if (pricePerGram > 15000) {
    return true; // Suspiciously high (might be ₹/10g stored as ₹/gram)
  }
  
  return false;
}
