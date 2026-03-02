/**
 * Index Constituents & Market Data Constants
 *
 * Shared classification data used across analytics:
 * - Market cap classification (Nifty 100 / Midcap 150)
 * - International MF detection patterns
 */

// ─── Nifty 100: Nifty 50 + Nifty Next 50 (approximate, 2024-25) ──────────────
export const LARGE_CAP_SYMBOLS = new Set([
  // Nifty 50
  'ADANIENT', 'ADANIPORTS', 'APOLLOHOSP', 'ASIANPAINT', 'AXISBANK',
  'BAJAJ-AUTO', 'BAJAJFINSV', 'BAJFINANCE', 'BHARTIARTL', 'BPCL',
  'BRITANNIA', 'CIPLA', 'COALINDIA', 'DIVISLAB', 'DRREDDY',
  'EICHERMOT', 'GRASIM', 'HCLTECH', 'HDFCBANK', 'HDFCLIFE',
  'HEROMOTOCO', 'HINDALCO', 'HINDUNILVR', 'ICICIBANK', 'INDUSINDBK',
  'INFY', 'ITC', 'JSWSTEEL', 'KOTAKBANK', 'LT',
  'LTIM', 'M&M', 'MARUTI', 'NESTLEIND', 'NTPC',
  'ONGC', 'POWERGRID', 'RELIANCE', 'SBILIFE', 'SBIN',
  'SHRIRAMFIN', 'SUNPHARMA', 'TATACONSUM', 'TATAMOTORS', 'TATASTEEL',
  'TCS', 'TECHM', 'TITAN', 'ULTRACEMCO', 'WIPRO',
  // Nifty Next 50 (approximate)
  'ABB', 'ADANIGREEN', 'ADANIPOWER', 'AMBUJACEM', 'ATGL',
  'AUROPHARMA', 'BAJAJHLDNG', 'BANKBARODA', 'BEL', 'BOSCHLTD',
  'CANBK', 'CGPOWER', 'CHOLAFIN', 'COLPAL', 'DABUR',
  'DMART', 'DLF', 'GODREJCP', 'GODREJPROP', 'HAL',
  'HAVELLS', 'HINDZINC', 'ICICIPRULI', 'INDUSTOWER', 'IRCTC',
  'IRFC', 'JINDALSTEL', 'JSWENERGY', 'LUPIN', 'MARICO',
  'MCDOWELL-N', 'MOTHERSON', 'MRF', 'MUTHOOTFIN', 'NAUKRI',
  'NMDC', 'OFSS', 'PAGEIND', 'PFC', 'PIDILITIND',
  'RECLTD', 'SAIL', 'SIEMENS', 'SRF', 'TATAPOWER',
  'TORNTPHARM', 'TVSMOTOR', 'VBL', 'VEDL', 'ZOMATO',
  'ZYDUSLIFE', 'ALKEM', 'MPHASIS', 'NYKAA', 'PAYTM',
]);

// ─── Nifty Midcap 150 (approximate, 2024-25) ─────────────────────────────────
export const MID_CAP_SYMBOLS = new Set([
  'ABCAPITAL', 'ABFRL', 'AIAENG', 'APLAPOLLO', 'ARE&M',
  'ASTRAL', 'ATUL', 'AUBANK', 'BALKRISIND', 'BANDHANBNK',
  'BATAINDIA', 'BERGEPAINT', 'BHARATFORG', 'BSE', 'CAMS',
  'CDSL', 'CESC', 'CONCOR', 'COROMANDEL', 'CROMPTON',
  'DEEPAKNTR', 'DIXON', 'EMAMILTD', 'ESCORTS', 'EXIDEIND',
  'FEDERALBNK', 'GLENMARK', 'GRANULES', 'GUJGASLTD', 'HFCL',
  'ICICIGI', 'IDFCFIRSTB', 'IGL', 'INDHOTEL', 'INDIAMART',
  'JKCEMENT', 'JUBLFOOD', 'KALYANKJIL', 'KANSAINER', 'KAYNES',
  'KPITTECH', 'LAURUSLABS', 'LICHSGFIN', 'LTTS', 'MAXHEALTH',
  'METROPOLIS', 'MFSL', 'MRPL', 'NUVOCO', 'OBEROIRLTY',
  'OLECTRA', 'PERSISTENT', 'PETRONET', 'PHOENIXLTD', 'PIIND',
  'PNB', 'POLYCAB', 'PRESTIGE', 'RAMCOCEM', 'ROUTE',
  'SBICARD', 'SCHAEFFLER', 'SOLARINDS', 'SUNDARMFIN', 'SUPREMEIND',
  'SYNGENE', 'TANLA', 'TATACHEM', 'TATAELXSI', 'TATAINVEST',
  'TATAMETALI', 'THERMAX', 'TIINDIA', 'TRENT', 'TRIDENT',
  'UNIONBANK', 'UNITDSPR', 'VOLTAS', 'WOCKPHARMA', 'WELCORP',
  'WHIRLPOOL', 'JKIL', 'RAINBOW', 'RKFORGE', 'SUNTV',
  'SUZLON', 'TORNTPOWER', 'HONAUT', 'GLAXO', 'TIMKEN',
]);

export type CapCategory = 'Large Cap' | 'Mid Cap' | 'Small Cap';

/**
 * Classify a stock symbol into Large/Mid/Small cap.
 * Strips exchange prefix (NSE:/BSE:) before lookup.
 */
export function classifyStockCap(symbol: string | null | undefined): CapCategory {
  if (!symbol) return 'Small Cap';
  const s = symbol.replace(/^(NSE|BSE):\s*/i, '').trim().toUpperCase();
  if (LARGE_CAP_SYMBOLS.has(s)) return 'Large Cap';
  if (MID_CAP_SYMBOLS.has(s)) return 'Mid Cap';
  return 'Small Cap';
}

// ─── International MF Detection Patterns ─────────────────────────────────────

/** High confidence: fund name strongly indicates international exposure */
export const HIGH_INTL_PATTERNS = [
  /\b(global|international|overseas|foreign)\b/i,
  /\b(nyse|nasdaq|s&p|dow|sp500|s&p 500|s&p500)\b/i,
  /\b(us equity|usa|america|american|united states)\b/i,
  /\b(fang|faang)\b/i,
  /\b(world|worldwide)\b/i,
  /\b(emerging markets|developed markets)\b/i,
  /\b(europe|european|uk|united kingdom|japan|china|asia pacific)\b/i,
  /\b(parag parikh)\b/i,
];

/** Medium confidence: fund likely has meaningful international exposure */
export const MEDIUM_INTL_PATTERNS = [
  /\b(fund of fund|fof)\b/i,
  /\b(artificial intelligence|ai fund)\b/i,
  /\b(technology etf|tech etf)\b/i,
];

/** Fraction of MF equity that is international for each confidence level */
export const INTL_EQUITY_RATIO: Record<'high' | 'medium', number> = {
  high:   1.0,
  medium: 0.80,
};

/**
 * Detect if a mutual fund name indicates international exposure.
 * Returns 'high', 'medium', or null.
 */
export function detectInternationalMF(name: string): 'high' | 'medium' | null {
  if (!name) return null;
  for (const p of HIGH_INTL_PATTERNS)   if (p.test(name)) return 'high';
  for (const p of MEDIUM_INTL_PATTERNS) if (p.test(name)) return 'medium';
  return null;
}

// ─── MF Equity Ratio by Asset Class ──────────────────────────────────────────

/** Estimated equity fraction by MF asset_class value */
export const MF_EQUITY_RATIO_BY_CLASS: Record<string, number> = {
  FixedIncome: 0.10,
  Hybrid:      0.50,
};
export const MF_EQUITY_DEFAULT = 0.85;

/** Typical Indian equity fund market-cap distribution */
export const MF_CAP_SPLIT: Record<CapCategory, number> = {
  'Large Cap': 0.68,
  'Mid Cap':   0.22,
  'Small Cap': 0.10,
};
