/**
 * Portfolio Upload API
 * 
 * POST /api/portfolio/upload - Parse and preview CSV/Excel file
 * 
 * DESIGN PHILOSOPHY:
 * ==================
 * - Two-step process: Preview → Confirm (user stays in control)
 * - Fault-tolerant parsing: Skip bad rows, don't fail entire upload
 * - No raw file storage: Parse in memory, discard immediately
 * - Auditable: Clear logging of what was imported
 * - No trading language: This is about portfolio understanding
 * 
 * CALCULATION RULES (NON-NEGOTIABLE):
 * ===================================
 * 1. invested_value = quantity × average_buy_price (ALWAYS computed, NEVER trusted from file)
 * 2. IGNORE all calculated columns from CSV/Excel:
 *    - Current Value, Market Value, Present Value
 *    - P&L, Profit, Loss, Gain, Returns
 *    - Day Change, % Change
 *    - LTP, Last Price, Current Price
 * 3. Normalize all numeric inputs to absolute INR (handle Lakhs, Crores, commas)
 * 4. Group duplicate holdings by ISIN > Symbol > Name
 * 5. Merge duplicates with weighted average price calculation
 * 
 * COLUMN MAPPING STRATEGY:
 * ========================
 * - PREFER ISIN > Symbol for asset identification (more reliable)
 * - EXPLICITLY IGNORE calculated columns (blacklisted)
 * - Use fuzzy matching with synonyms for column detection
 * - Validate data types against sample rows
 * 
 * SECURITY:
 * =========
 * - File size limit enforced
 * - File type validation
 * - User ID required for all operations
 * - RLS ensures users can only modify their own portfolios
 */

import { NextRequest, NextResponse } from 'next/server';
import type {
  RawUploadRow,
  ParsedHolding,
  UploadPreviewResponse,
  UploadErrorResponse,
  AssetType,
} from '@/types/portfolio-upload';
import {
  parseIndianNumber,
  parseQuantity,
  parsePrice,
  calculateInvestedValue,
  groupHoldings,
  calculatePortfolioMetrics,
  formatIndianCurrency,
} from '@/lib/portfolio-calculations';

// ============================================================================
// CONFIGURATION
// ============================================================================

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const IS_DEV = process.env.NODE_ENV === 'development';

function debugLog(message?: unknown, ...optionalParams: unknown[]) {
  if (IS_DEV) {
    console.log(message, ...optionalParams);
  }
}

function debugWarn(message?: unknown, ...optionalParams: unknown[]) {
  if (IS_DEV) {
    console.warn(message, ...optionalParams);
  }
}

// ============================================================================
// COLUMN DETECTION SYSTEM
// ============================================================================

type TargetField = 'symbol' | 'isin' | 'name' | 'quantity' | 'average_price';

/**
 * BLACKLIST: Columns that should NEVER be mapped to financial fields
 * 
 * WHY WE IGNORE CALCULATED VALUES:
 * ================================
 * These columns contain values that are either:
 * 1. Calculated from market prices (which change constantly)
 * 2. Performance metrics (P&L, returns) that we'll compute ourselves
 * 3. Daily fluctuations that aren't relevant for holdings
 * 4. Current prices (not buy prices) that would give wrong invested values
 * 
 * TRUSTING THESE VALUES WOULD CAUSE:
 * - Incorrect portfolio totals
 * - Mismatched invested vs current values
 * - User confusion when numbers don't add up
 * - Loss of data integrity
 * 
 * OUR APPROACH: Compute invested_value = quantity × average_buy_price
 * This is auditable, transparent, and always correct.
 */
const BLACKLIST_PATTERNS: { pattern: RegExp; reason: string }[] = [
  // Calculated values we explicitly ignore
  { pattern: /current.*value|market.*value|present.*value|mkt.*val/i, reason: 'Calculated from market prices - we compute from quantity × price' },
  { pattern: /p[&]?l|profit|loss|gain|unrealized|realized/i, reason: 'Calculated P&L - we compute this ourselves' },
  { pattern: /return|xirr|cagr|absolute.*return|total.*return/i, reason: 'Performance metric - not needed for holdings' },
  { pattern: /day.*change|today.*change|change.*%|%.*change|daily/i, reason: 'Daily fluctuation - not relevant for holdings' },
  { pattern: /ltp|last.*price|current.*price|close.*price|cmp/i, reason: 'Current price (not buy price) - would give wrong invested value' },
  { pattern: /nav|net.*asset.*value/i, reason: 'Current NAV - we need purchase NAV instead' },
  
  // Invested value - we compute this ourselves, don't trust file
  { pattern: /invested.*value|investment.*value|total.*invested|buy.*value/i, reason: 'We compute invested_value from quantity × price' },
  
  // IDs and references
  { pattern: /order.*id|trade.*id|txn.*id|transaction.*id|ref.*id/i, reason: 'Transaction ID - not needed' },
  { pattern: /folio|folio.*no|account|demat|dp.*id|client.*id/i, reason: 'Account reference - not needed' },
  { pattern: /^id$|^sr$|^sno$|^sl.*no$|^serial/i, reason: 'Row identifier - not needed' },
  
  // Dates and times (we don't track purchase dates in MVP)
  { pattern: /date|time|timestamp|execution|settlement|expiry|maturity/i, reason: 'Date/time field - not needed for holdings' },
  
  // Status and metadata
  { pattern: /status|state|remark|note|comment|exchange|segment/i, reason: 'Metadata field - not needed' },
  
  // Action fields (not asset types)
  { pattern: /action|side|buy.*sell|transaction.*type|txn.*type/i, reason: 'Action field - not needed' },
];

/**
 * Column variations for fuzzy matching
 * These handle ANY CSV format from ANY investment platform
 */
const NAME_VARIATIONS = [
  'scheme name', 'scheme', 'fund name', 'fund', 'security name',
  'asset name', 'script name', 'scrip name', 'stock name', 
  'company name', 'name', 'symbol', 'tradingsymbol', 'security'
];

const QUANTITY_VARIATIONS = [
  'units', 'quantity', 'shares', 'holdings', 'no of units',
  'shares held', 'balance units', 'close units', 'holding quantity',
  'no of shares', 'qty', 'balance', 'holding'
];

// Total invested variations (total amount invested)
const TOTAL_INVESTED_VARIATIONS = [
  'invested', 'invested amount', 'investment amount', 'invested value',
  'investment value', 'total invested', 'total investment', 'cost value',
  'invested amt', 'investment', 'total cost', 'book value', 
  'purchase value', 'acquisition value', 'cost of acquisition'
];

// Average price variations (per-unit price)
const AVERAGE_PRICE_VARIATIONS = [
  'average price', 'avg price', 'average cost', 'avg cost',
  'price per unit', 'unit price', 'buy price', 'purchase price',
  'cost per unit', 'price', 'rate', 'avg rate', 'average rate',
  'average buy price', 'avg buy price', 'nav', 'average nav'
];

const SECTOR_TYPE_VARIATIONS = [
  'sector', 'type', 'asset type', 'asset class', 'category',
  'instrument type', 'security type', 'instrument', 'product type'
];

const ISIN_VARIATIONS = [
  'isin', 'isin code', 'isin number', 'isinnumber', 'isin no', 'isin no.'
];

const FOLIO_VARIATIONS = [
  'folio', 'folio number', 'folio no', 'folionumber'
];

const AMC_VARIATIONS = [
  'amc', 'amc name', 'fund house', 'asset management company'
];

const SYMBOL_VARIATIONS = [
  'symbol', 'stock symbol', 'scrip code', 'script code', 
  'trading symbol', 'ticker', 'nse symbol', 'bse code'
];

const EXCHANGE_VARIATIONS = [
  'exchange', 'market', 'stock exchange'
];

/**
 * Asset type inference patterns
 * NOTE: Index funds are classified as 'mutual_fund', not a separate type
 */
const ASSET_TYPE_PATTERNS: { pattern: RegExp; type: AssetType }[] = [
  // Mutual Funds (includes index funds!)
  { pattern: /\b(fund|mf|mutual)\b/i, type: 'mutual_fund' },
  { pattern: /\b(direct|growth|dividend|idcw)\b/i, type: 'mutual_fund' },
  { pattern: /\b(index|nifty|sensex|midcap|smallcap)\s*(fund|index)\b/i, type: 'mutual_fund' },
  
  // ETFs
  { pattern: /\b(etf|exchange\s*traded)\b/i, type: 'etf' },
  { pattern: /\bbees\b/i, type: 'etf' },
  
  // Government schemes (classify as 'other' for now)
  { pattern: /\bppf\b/i, type: 'other' },
  { pattern: /\bepf\b/i, type: 'other' },
  { pattern: /\bnps\b/i, type: 'other' },
  
  // Fixed Income (classify as 'other' for now)
  { pattern: /\b(fd|fixed\s*deposit)\b/i, type: 'other' },
  { pattern: /\b(bond|debenture|ncd)\b/i, type: 'other' },
  
  // Gold (classify as 'other' for now)
  { pattern: /\b(gold|sgb|sovereign)\b/i, type: 'other' },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Normalize column name for fuzzy matching
 * Removes all punctuation/spaces for better matching
 */
function normalizeColumnName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, ''); // Remove all punctuation/spaces
}

/**
 * Fuzzy match column name against variations
 * Returns true if either contains the other (handles abbreviations)
 */
function fuzzyMatchColumn(columnName: string, variations: string[]): boolean {
  const normalized = normalizeColumnName(columnName);
  
  return variations.some(variation => {
    const normalizedVariation = normalizeColumnName(variation);
    
    // Match if either contains the other (handles abbreviations)
    return normalized.includes(normalizedVariation) || 
           normalizedVariation.includes(normalized);
  });
}

// ============================================================================
// SMART HEADER DETECTION
// ============================================================================

/**
 * Combined keyword list used to score rows for "likelihood of being a header".
 * Drawn from all known column-variation arrays so the scorer stays in sync
 * with the column detector automatically.
 */
const ALL_HEADER_KEYWORDS = [
  ...NAME_VARIATIONS,
  ...QUANTITY_VARIATIONS,
  ...TOTAL_INVESTED_VARIATIONS,
  ...AVERAGE_PRICE_VARIATIONS,
  ...ISIN_VARIATIONS,
  ...FOLIO_VARIATIONS,
  ...AMC_VARIATIONS,
  ...SYMBOL_VARIATIONS,
  ...EXCHANGE_VARIATIONS,
  ...SECTOR_TYPE_VARIATIONS,
];

/** Minimum keyword matches for a row to be considered a header. */
const HEADER_SCORE_THRESHOLD = 2;

/**
 * "Transactional" keywords — markers of a section listing already-completed
 * orders, sold positions, or realised P&L (NOT current holdings).
 *
 * Two clusters:
 *  • Sold / realised — sell prices, capital gains, etc.
 *  • Order / trade history — order id, execution date, order status.
 *
 * We deliberately exclude generic terms like "buy date" / "buy price" which
 * legitimately appear in both holdings and P&L statements.
 */
const TRANSACTIONAL_HEADER_KEYWORDS = [
  // sold / realised
  'sell date', 'sale date', 'redemption date',
  'sell price', 'sale price', 'redemption price',
  'sell value', 'sale value',
  'sold quantity', 'qty sold', 'sold qty',
  'realised p', 'realized p',         // catches "Realised P&L", "Realised PnL", "Realized P&L"
  'realised gain', 'realized gain',
  'realised loss', 'realized loss',
  'realised profit', 'realized profit',
  'capital gain', 'capital gains',
  'stcg', 'ltcg', 'short term capital', 'long term capital',
  'indexed cost', 'indexation',
  // order / trade history
  'order id', 'order number', 'order no', 'order status',
  'exchange order', 'broker order',
  'trade id', 'trade number', 'trade date', 'trade time',
  'execution date', 'execution time',
  'transaction id', 'transaction date', 'transaction type',
];

/**
 * Markers for a CURRENT-HOLDINGS section. Rows like "Closing date / Closing
 * price / Closing value / Unrealised P&L / Market value" identify a holdings
 * section even when the file ALSO contains a separate transactional section.
 */
const HOLDINGS_HEADER_KEYWORDS = [
  'closing date', 'closing price', 'closing value', 'closing balance',
  'market value', 'market price',
  'current value', 'current price',
  'present value', 'present price',
  'unrealised', 'unrealized',
  'available quantity', 'free quantity', 'free balance',
  'as on', 'as of',
];

type SectionKind = 'holdings' | 'transactional' | 'unknown';

/**
 * Classify a candidate header row as "holdings", "transactional", or "unknown".
 *
 *  - transactional → contains sell/realised/capital-gain markers (skip section)
 *  - holdings      → contains closing/market/unrealised markers (use section)
 *  - unknown       → plain "Name / Quantity / Buy Price" — treat as holdings (default)
 *
 * If a row contains BOTH kinds (rare), holdings markers win — typically the file
 * has separate sections and this row is the holdings header that happens to also
 * mention "buy price" etc.
 */
function classifySection(headerRow: unknown[]): SectionKind {
  const joined = headerRow.map(c => String(c ?? '').trim().toLowerCase()).join(' | ');
  const hasHoldings = HOLDINGS_HEADER_KEYWORDS.some(kw => joined.includes(kw));
  if (hasHoldings) return 'holdings';
  const hasTxn = TRANSACTIONAL_HEADER_KEYWORDS.some(kw => joined.includes(kw));
  if (hasTxn) return 'transactional';
  return 'unknown';
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION-AWARE HEADER DETECTION (principled, token-based, shape-aware)
//
// The header detector must answer ONE question for every row:
//   "Could this row plausibly be a column-header row?"
//
// A row is a header iff:
//   1. It contains NO data-shaped cells (numbers, dates, ISINs, currency, etc.)
//   2. Multiple of its cells match known portfolio column keywords as WHOLE
//      tokens — not substring matches.
//
// Both rules are categorical, not heuristic. Data rows score 0; real headers
// score N where N = number of matching label cells. There is no overlap.
// ─────────────────────────────────────────────────────────────────────────────

const ISIN_PATTERN = /^[A-Z]{2}[A-Z0-9]{10}$/;
/** Anywhere in the cell: dd-mm-yyyy, yyyy/mm/dd, dd.mm.yyyy, dd-mm-yy, etc. */
const DATE_PATTERN = /\d{1,4}[\/\-.]\d{1,2}[\/\-.]\d{1,4}/;
/** HH:MM with optional AM/PM — matches anywhere in cell. */
const TIME_PATTERN = /\b\d{1,2}:\d{2}(\s?[ap]m)?/i;
/** Currency / monetary symbols. */
const CURRENCY_PATTERN = /[₹$€£¥]/;
/** Pure number (with optional sign, thousand separators, decimal). */
const PURE_NUMERIC_PATTERN = /^-?[\d,]+(\.\d+)?$/;

/**
 * Tokenize text into lowercase whole words.
 *  - "Average Buy Price (₹)"  →  ["average", "buy", "price"]
 *  - "no. of units"           →  ["no", "of", "units"]
 *  - "P&L"                    →  ["p", "and", "l"]
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(t => t.length > 0);
}

/**
 * Whole-word keyword match between a cell value and a single keyword.
 *
 *  - Exact token-sequence match wins.
 *  - Multi-token keywords match if all their tokens appear in the cell, with
 *    at most a few extra tokens (handles "Average Buy Price (₹)" matching
 *    "buy price").
 *  - Single-token keywords match only if the cell contains that exact token
 *    AND has at most 4 total tokens (so a sentence like
 *    "Note: This is your name" can't match "name").
 *
 * Crucially, this REJECTS substring matches like "BUY" → "buy price". As
 * tokens, cell `[buy]` and keyword `[buy, price]` differ in token-set, so no
 * match. This is the #1 bug the previous fuzzy substring matcher caused.
 */
function cellMatchesKeyword(cellTokens: string[], keyword: string): boolean {
  const kwTokens = tokenize(keyword);
  if (cellTokens.length === 0 || kwTokens.length === 0) return false;

  if (cellTokens.length === kwTokens.length &&
      cellTokens.every((t, i) => t === kwTokens[i])) {
    return true;
  }

  if (kwTokens.length >= 2) {
    const cellSet = new Set(cellTokens);
    const allKwInCell = kwTokens.every(t => cellSet.has(t));
    if (allKwInCell && cellTokens.length <= kwTokens.length + 2) return true;
    return false;
  }

  // Single-token keyword (e.g. "name", "quantity", "isin", "qty").
  if (cellTokens.length <= 4 && cellTokens.includes(kwTokens[0])) {
    return true;
  }

  return false;
}

/**
 * Cell shape classifier — answers "is this cell a label or a data value?"
 *
 * Returns true if the cell contains any data-shaped content that disqualifies
 * the entire row from being a header:
 *   • ISIN code (12-char alphanumeric starting with 2 letters)
 *   • Date or date-time anywhere in the cell
 *   • Currency symbol
 *   • A pure numeric value with absolute magnitude ≥ 10 (small ints like
 *     "1", "2" are allowed as they may be index columns)
 *   • Excessively long text (> 80 chars — a label would never be this long)
 */
function isDataShapedCell(cellText: string): boolean {
  if (cellText.length === 0) return false;
  if (cellText.length > 80) return true;
  if (ISIN_PATTERN.test(cellText)) return true;
  if (CURRENCY_PATTERN.test(cellText)) return true;
  if (DATE_PATTERN.test(cellText)) return true;
  if (TIME_PATTERN.test(cellText)) return true;
  if (PURE_NUMERIC_PATTERN.test(cellText)) {
    const n = parseFloat(cellText.replace(/,/g, ''));
    if (Number.isFinite(n) && Math.abs(n) >= 10) return true;
  }
  return false;
}

/**
 * Score a row as a header candidate.
 *
 *  - Returns 0 immediately if any cell is data-shaped (categorical rejection).
 *  - Otherwise returns the count of label cells that match a known column
 *    keyword via whole-word token matching.
 *
 * Real headers (e.g. "Stock Name | Quantity | Price") return 3+. Data rows
 * (e.g. "TATA MOTORS | 8 | 7968.4 | 27-09-2024") return 0 because of the date.
 */
function scoreRowAsHeader(row: unknown[]): number {
  // Pass 1: shape pre-filter — any data-like cell disqualifies the row.
  for (const cell of row) {
    if (typeof cell !== 'string' && typeof cell !== 'number') continue;
    const s = String(cell ?? '').trim();
    if (s === '' || s.startsWith('__EMPTY')) continue;
    if (isDataShapedCell(s)) return 0;
  }

  // Pass 2: count cells matching known column keywords as whole tokens.
  let score = 0;
  for (const cell of row) {
    if (typeof cell !== 'string') continue;
    const s = cell.trim();
    if (s === '' || s.startsWith('__EMPTY')) continue;
    const cellTokens = tokenize(s);
    if (cellTokens.length === 0) continue;
    for (const kw of ALL_HEADER_KEYWORDS) {
      if (cellMatchesKeyword(cellTokens, kw)) {
        score++;
        break;
      }
    }
  }
  return score;
}

/**
 * Trailer / footer / disclaimer keywords that strongly indicate the row is NOT a holding.
 * Matched anywhere in the row's joined text (lower-cased).
 */
const TRAILER_KEYWORDS = [
  'grand total', 'total :', 'total:', 'total amount', 'sub total', 'subtotal',
  'disclaimer', 'note:', 'notes:', 'declaration',
  'closing balance', 'opening balance',
  'end of report', 'end of statement', 'page ', 'continued on',
  'this is computer generated', 'this statement',
  'mutual fund folios', 'demat account', 'consolidated account statement',
];

/**
 * Detect whether a "data row" is actually junk:
 *  - Trailer/footer/disclaimer text
 *  - Mostly empty (e.g. blank separator row, total row with only one cell populated)
 *  - Header row repeating itself somewhere lower in the file
 * Returns reason for skipping (string) or null if it looks like a real holding row.
 */
function detectJunkRow(
  rowArr: unknown[],
  totalColumns: number,
  headerKeywordsLower: string[]
): string | null {
  // Convert all cells to strings, trim, drop empties
  const cells = rowArr.map(c => String(c ?? '').trim());
  const nonEmptyCount = cells.filter(c => c !== '').length;
  const joined = cells.join(' ').toLowerCase();

  // RULE 1: Almost-empty row (e.g. blank separator, total row with just "Total" in one column)
  // Real holding rows have at least name, qty, and price — that's 3 cells minimum.
  if (nonEmptyCount < 3) {
    return 'too few populated columns';
  }

  // RULE 2: Less than 40% of columns populated (likely a totals/summary row)
  if (totalColumns >= 5 && nonEmptyCount < Math.ceil(totalColumns * 0.4)) {
    return 'sparse row (likely a totals/summary line)';
  }

  // RULE 3: Trailer keywords (disclaimers, totals, page-end notes)
  for (const keyword of TRAILER_KEYWORDS) {
    if (joined.includes(keyword)) {
      return `trailer text matched ("${keyword}")`;
    }
  }

  // RULE 4: Row is the header repeating (e.g. CAS statements often reprint headers per section)
  // If 2+ cells in this row exactly match known header keywords, it's a repeat header.
  let headerMatchCount = 0;
  for (const cell of cells) {
    if (cell === '' || cell.length > 40) continue; // headers are short
    const norm = normalizeColumnName(cell);
    if (norm.length < 2) continue;
    if (headerKeywordsLower.some(kw => kw === norm || kw.includes(norm) || norm.includes(kw))) {
      headerMatchCount++;
    }
  }
  if (headerMatchCount >= 2) {
    return 'looks like a repeated header row';
  }

  // RULE 5: Row has no numeric value at all (real holdings have qty / price / amount)
  // We use a fairly tolerant check: at least one cell parseable as a positive number.
  const hasNumeric = cells.some(c => {
    if (c === '') return false;
    const cleaned = c.replace(/[,₹$\s]/g, '');
    const n = Number(cleaned);
    return Number.isFinite(n) && n !== 0;
  });
  if (!hasNumeric) {
    return 'no numeric data in row';
  }

  return null; // Looks like a real holding row
}

/**
 * Column map interface for detected columns
 */
interface ColumnMap {
  name: number | null;           // Index of name column
  quantity: number | null;       // Index of quantity column
  totalInvested: number | null;  // Index of total invested amount column
  averagePrice: number | null;   // Index of average price per unit column
  isin: number | null;           // Index of ISIN column (optional)
  sectorType: number | null;     // Index of Sector/Type/Category column (optional, context-aware)
  
  // Metadata columns (optional, for better detection)
  folio: number | null;          // Folio number (MF indicator)
  amc: number | null;            // AMC name (MF indicator)
  symbol: number | null;         // Trading symbol (Stock/ETF indicator)
  exchange: number | null;       // Exchange (NSE/BSE - Stock indicator)
}

/**
 * Detect columns using fuzzy matching
 * Maps CSV column headers to canonical fields
 */
function detectColumns(headers: string[]): ColumnMap {
  const map: ColumnMap = {
    name: null,
    quantity: null,
    totalInvested: null,
    averagePrice: null,
    isin: null,
    sectorType: null,
    folio: null,
    amc: null,
    symbol: null,
    exchange: null
  };
  
  headers.forEach((header, index) => {
    if (map.name === null && fuzzyMatchColumn(header, NAME_VARIATIONS)) {
      map.name = index;
    }
    
    if (map.quantity === null && fuzzyMatchColumn(header, QUANTITY_VARIATIONS)) {
      map.quantity = index;
    }
    
    // CRITICAL: Match totalInvested BEFORE averagePrice
    // Check totalInvested first to avoid matching "invested" when we have "avg price"
    if (map.totalInvested === null && fuzzyMatchColumn(header, TOTAL_INVESTED_VARIATIONS)) {
      map.totalInvested = index;
      debugLog(`[Column Detection] Matched "${header}" to totalInvested`);
    }
    // Only match averagePrice if we haven't matched totalInvested
    else if (map.averagePrice === null && fuzzyMatchColumn(header, AVERAGE_PRICE_VARIATIONS)) {
      map.averagePrice = index;
      debugLog(`[Column Detection] Matched "${header}" to averagePrice`);
    }
    
    if (map.sectorType === null && fuzzyMatchColumn(header, SECTOR_TYPE_VARIATIONS)) {
      map.sectorType = index;
      debugLog(`[Column Detection] Matched "${header}" to sectorType`);
    }
    
    if (map.isin === null && fuzzyMatchColumn(header, ISIN_VARIATIONS)) {
      map.isin = index;
    }
    if (map.folio === null && fuzzyMatchColumn(header, FOLIO_VARIATIONS)) {
      map.folio = index;
    }
    if (map.amc === null && fuzzyMatchColumn(header, AMC_VARIATIONS)) {
      map.amc = index;
    }
    if (map.symbol === null && fuzzyMatchColumn(header, SYMBOL_VARIATIONS)) {
      map.symbol = index;
    }
    if (map.exchange === null && fuzzyMatchColumn(header, EXCHANGE_VARIATIONS)) {
      map.exchange = index;
    }
  });
  
  return map;
}

/**
 * ISIN Classification Result
 */
interface ISINClassification {
  type: AssetType | 'ambiguous';
  confidence: number;
}

/**
 * Classify asset type by ISIN
 * ISIN is the PRIMARY classifier when available
 */
function classifyByISIN(isin: string | null | undefined): ISINClassification {
  if (!isin || isin.length !== 12) {
    return { type: 'ambiguous', confidence: 0 };
  }
  
  const prefix = isin.substring(0, 3).toUpperCase();
  const positionCode = isin.substring(7, 9);
  
  // Stocks (INE prefix)
  if (prefix === 'INE') {
    // Check for REITs/InvITs (not supported, mark as other)
    if (positionCode === '25' || positionCode === '23') {
      return { type: 'other', confidence: 95 };
    }
    return { type: 'equity', confidence: 95 };
  }
  
  // Mutual Funds or ETFs (INF prefix)
  if (prefix === 'INF') {
    // Cannot distinguish MF from ETF by ISIN alone
    // Need additional checks (name, symbol)
    return { type: 'ambiguous', confidence: 70 };
  }
  
  // Government Securities (IN0-IN4)
  if (prefix >= 'IN0' && prefix <= 'IN4') {
    return { type: 'other', confidence: 95 };
  }
  
  return { type: 'ambiguous', confidence: 0 };
}

/**
 * Detection signals from different sources
 */
interface DetectionSignals {
  sectorSignal: AssetType | 'ambiguous';
  isinSignal: AssetType | 'ambiguous';
  columnSignal: AssetType | 'ambiguous';
  nameSignal: AssetType | 'ambiguous';
}

/**
 * Asset detection result with confidence
 */
interface AssetDetection {
  assetType: AssetType;
  confidence: number;
  signals: DetectionSignals;
  rowIndex: number;
  name: string;
}

/**
 * Detect asset type from row using multi-signal approach
 * Priority: Sector (if no MF indicators) > ISIN > Column patterns > Name patterns
 */
function detectAssetTypeFromRow(
  row: any[],
  columnMap: ColumnMap,
  rowIndex: number
): AssetDetection {
  
  const name = columnMap.name !== null ? String(row[columnMap.name] || '') : '';
  const isin = columnMap.isin !== null ? String(row[columnMap.isin] || '').trim() : '';
  
  let confidence = 0;
  const signals: DetectionSignals = {
    sectorSignal: 'ambiguous',
    isinSignal: 'ambiguous',
    columnSignal: 'ambiguous',
    nameSignal: 'ambiguous'
  };
  
  // SIGNAL 1: Explicit Sector/Type column (CONTEXT-AWARE)
  if (columnMap.sectorType !== null) {
    const sectorValue = String(row[columnMap.sectorType] || '').toLowerCase().trim();
    
    // CRITICAL: Check if row has MF indicators first
    const hasAMC = columnMap.amc !== null && row[columnMap.amc];
    const hasFolio = columnMap.folio !== null && row[columnMap.folio];
    const hasMFIndicators = (
      hasFolio ||
      hasAMC ||
      (isin && isin.startsWith('INF')) ||
      /\b(fund|scheme|plan)\b/i.test(name)
    );
    
    // If MF indicators present, sector column describes MF category, not asset type
    if (hasMFIndicators) {
      debugLog(`[Detection] Row "${name}" has MF indicators - ignoring Sector="${sectorValue}"`);
      // Don't set sectorSignal - let other signals handle it
    }
    // If NO MF indicators, sector column might describe asset type
    else {
      // Only match VERY EXPLICIT asset type values (exact match)
      if (sectorValue === 'etf') {
        signals.sectorSignal = 'etf';
        confidence = Math.max(confidence, 95);
        debugLog(`[Detection] Sector="ETF" for ${name}`);
      }
      else if (sectorValue === 'mutual fund' || sectorValue === 'mf' || 
               sectorValue === 'mutualfund' || sectorValue === 'mutual') {
        signals.sectorSignal = 'mutual_fund';
        confidence = Math.max(confidence, 95);
        debugLog(`[Detection] Sector="Mutual Fund" for ${name}`);
      }
      else if (sectorValue === 'stock' || sectorValue === 'stocks') {
        signals.sectorSignal = 'equity';
        confidence = Math.max(confidence, 90);
        debugLog(`[Detection] Sector="Stock" for ${name}`);
      }
      // Only match "equity" if it's combined with "stock"
      else if (sectorValue.includes('equity') && sectorValue.includes('stock')) {
        signals.sectorSignal = 'equity';
        confidence = Math.max(confidence, 85);
      }
    }
  }
  
  // SIGNAL 2: ISIN Classification
  if (isin) {
    const isinResult = classifyByISIN(isin);
    signals.isinSignal = isinResult.type;
    
    if (isinResult.type !== 'ambiguous') {
      confidence = Math.max(confidence, isinResult.confidence);
      
      // If ISIN is definitive (equity or other), return immediately (unless sector signal says otherwise)
      if (isinResult.type === 'equity' || isinResult.type === 'other') {
        if (signals.sectorSignal === 'ambiguous') {
          return {
            assetType: isinResult.type,
            confidence: isinResult.confidence,
            signals,
            rowIndex,
            name
          };
        }
      }
      
      // If ISIN says MF/ETF (ambiguous), continue to other signals
    }
  }
  
  // SIGNAL 3: Column Pattern Detection
  const hasAMC = columnMap.amc !== null && row[columnMap.amc];
  const hasFolio = columnMap.folio !== null && row[columnMap.folio];
  const hasSymbol = columnMap.symbol !== null && row[columnMap.symbol];
  const hasExchange = columnMap.exchange !== null && row[columnMap.exchange];
  
  if (hasFolio || hasAMC) {
    signals.columnSignal = 'mutual_fund';
    confidence = Math.max(confidence, 85);
  } else if (hasSymbol || hasExchange) {
    signals.columnSignal = 'equity';
    confidence = Math.max(confidence, 75);
  }
  
  // SIGNAL 4: Name Pattern Detection
  if (name) {
    const nameLower = name.toLowerCase();
    
    // ETF patterns (high confidence)
    if (/\b(etf|bees|ees)\b/i.test(name) || 
        /(nifty|sensex|gold|bank|silver|liquid)(bees|etf)/i.test(nameLower)) {
      signals.nameSignal = 'etf';
      confidence = Math.max(confidence, 80);
    }
    // Mutual Fund patterns (medium-high confidence) - includes index funds!
    else if (/\b(fund|scheme|plan|index)\b/i.test(nameLower) ||
             /\b(growth|dividend|idcw|direct|regular)\b/i.test(nameLower)) {
      signals.nameSignal = 'mutual_fund';
      confidence = Math.max(confidence, 70);
    }
    // Stock patterns (lower confidence - less reliable)
    else if (nameLower.split(/\s+/).length <= 3 && 
             !/fund|scheme|plan|etf/i.test(nameLower)) {
      signals.nameSignal = 'equity';
      confidence = Math.max(confidence, 50);
    }
  }
  
  // RESOLVE: Priority - Sector (if no MF indicators) > ISIN > Column > Name
  let finalType: AssetType = 'other';
  
  if (signals.sectorSignal !== 'ambiguous') {
    finalType = signals.sectorSignal;
  } else if (signals.isinSignal !== 'ambiguous') {
    finalType = signals.isinSignal;
  } else if (signals.columnSignal !== 'ambiguous') {
    finalType = signals.columnSignal;
  } else if (signals.nameSignal !== 'ambiguous') {
    finalType = signals.nameSignal;
  }
  
  // ETF disambiguation
  if (signals.sectorSignal === 'ambiguous' && 
      signals.isinSignal === 'ambiguous' && 
      isin?.startsWith('INF') && 
      signals.nameSignal === 'etf') {
    finalType = 'etf';
    confidence = 90;
  }
  
  // MF disambiguation
  if (signals.sectorSignal === 'ambiguous' && 
      signals.isinSignal === 'ambiguous' && 
      isin?.startsWith('INF') && 
      (signals.columnSignal === 'mutual_fund' || signals.nameSignal === 'mutual_fund')) {
    finalType = 'mutual_fund';
    confidence = 85;
  }
  
  // Index funds are classified as 'mutual_fund' - no separate type needed
  
  return {
    assetType: finalType,
    confidence,
    signals,
    rowIndex,
    name
  };
}

/**
 * Validation result for upload
 */
interface ValidationResult {
  valid: boolean;
  detections: AssetDetection[];
  assetTypeCounts: Record<'mutual_fund' | 'etf' | 'equity' | 'other', number>;
  ambiguousCount: number;
  ambiguousPercent: number;
  error?: string;
  warning?: string;
}

/**
 * Validate upload based on confidence scores
 * Reject if 80%+ rows are ambiguous
 */
function validateUpload(detections: AssetDetection[], headers: string[]): ValidationResult {
  const total = detections.length;
  const confident = detections.filter(d => d.confidence >= 70).length;
  const ambiguous = total - confident;
  const ambiguousPercent = (ambiguous / total) * 100;
  
  // Count asset types (only the 4 supported types)
  const counts: Record<'mutual_fund' | 'etf' | 'equity' | 'other', number> = {
    mutual_fund: 0,
    etf: 0,
    equity: 0,
    other: 0
  };
  
  detections.forEach(d => {
    if (d.confidence >= 70) {
      // Map index_fund to mutual_fund (index funds are mutual funds)
      const mappedType = d.assetType === 'index_fund' ? 'mutual_fund' : d.assetType;
      if (mappedType === 'mutual_fund' || mappedType === 'etf' || mappedType === 'equity' || mappedType === 'other') {
        counts[mappedType]++;
      }
    }
  });
  
  // REJECT: If 80%+ rows are ambiguous
  if (ambiguousPercent >= 80) {
    return {
      valid: false,
      detections,
      assetTypeCounts: counts,
      ambiguousCount: ambiguous,
      ambiguousPercent,
      error: `Cannot confidently detect asset types. ${ambiguous} out of ${total} rows are ambiguous.`,
      warning: `Please ensure your CSV file contains clear column headers:
        • For Mutual Funds: Include 'Scheme Name', 'Units', 'Invested Amount', and optionally 'ISIN'
        • For Stocks: Include 'Stock Name' or 'Symbol', 'Quantity', 'Average Price'
        • For ETFs: Include 'ETF Name' (with 'ETF' in the name), 'Quantity', 'Average Price'
        
        Your file headers: ${headers.join(', ')}`
    };
  }
  
  // ACCEPT with warning: If 20-80% rows are ambiguous
  if (ambiguousPercent > 20) {
    return {
      valid: true,
      detections,
      assetTypeCounts: counts,
      ambiguousCount: ambiguous,
      ambiguousPercent,
      warning: `${ambiguous} out of ${total} rows have low confidence and were assigned best-guess asset types. Please review after upload.`
    };
  }
  
  // ACCEPT: If <20% rows are ambiguous
  return {
    valid: true,
    detections,
    assetTypeCounts: counts,
    ambiguousCount: ambiguous,
    ambiguousPercent
  };
}

/**
 * Normalize a column header for comparison (legacy function - kept for compatibility)
 */
function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

/**
 * Check if a column should be blacklisted (ignored)
 */
function isBlacklisted(header: string): { blacklisted: boolean; reason?: string } {
  const normalized = normalizeHeader(header);
  
  for (const { pattern, reason } of BLACKLIST_PATTERNS) {
    if (pattern.test(header) || pattern.test(normalized)) {
      return { blacklisted: true, reason };
    }
  }
  
  return { blacklisted: false };
}

/**
 * Parse uploaded file
 */
/**
 * Parse uploaded file with SMART HEADER ROW DETECTION.
 *
 * Problem: Many real-world files (CAS statements, broker exports, fund-house
 * reports) begin with several rows of metadata — account name, PAN, address,
 * report date, etc. — before the actual column headers.  The default XLSX
 * `sheet_to_json` call assumes row 1 is always the header, producing
 * `__EMPTY`, `__EMPTY_1`… placeholder keys for those empty metadata cells,
 * which then fails column detection.
 *
 * Solution:
 *  1. Read ALL rows as plain arrays (header: 1 — no header assumption).
 *  2. Score each of the first MAX_HEADER_SCAN_ROWS rows against all known
 *     column-name keywords. The row with the highest score is the header.
 *  3. Use everything after it as data rows.
 *  4. If no row scores ≥ HEADER_SCORE_THRESHOLD, fall back to row 0 so
 *     downstream validation produces the "unrecognised format" error path.
 *
 * Returns `metadataRowsSkipped` so the caller can surface a friendly info
 * notice: "Skipped N rows of account details automatically."
 */
/** Custom error thrown when the only sections we can find are transactional (no current holdings). */
class CapitalGainsReportError extends Error {
  constructor(public detectedHeaders: string[]) {
    super('Transactional report detected — no current-holdings section found');
  }
}

interface SheetSection {
  headerRowIndex: number;
  score: number;
  kind: SectionKind;
  /** Inclusive start, exclusive end — data rows belong to [start, end). */
  dataStart: number;
  dataEnd: number;
  rawHeaderRow: unknown[];
}

/**
 * Walk every row in the sheet and return all section headers.
 *
 * Because `scoreRowAsHeader` is categorical (data rows are shape-rejected and
 * return 0), we trust it directly. Any row scoring ≥ HEADER_SCORE_THRESHOLD is
 * a section start; its data range runs until the next section header or EOF.
 *
 * This works for every shape of file:
 *   • Clean CSV with row 0 as the header → 1 section, all rows are data.
 *   • CAS / broker statement with metadata block → 1 section starting wherever
 *     the column header lives (could be row 5, row 24, anywhere).
 *   • Multi-section P&L file (Realised + Unrealised) → 2 sections, each
 *     scoped to its own data range.
 *   • Order-history / capital-gains files → 1 section, classified as
 *     transactional and rejected upstream.
 */
function findSectionsInSheet(allRows: unknown[][]): SheetSection[] {
  const sections: SheetSection[] = [];

  for (let i = 0; i < allRows.length; i++) {
    const score = scoreRowAsHeader(allRows[i]);
    if (score < HEADER_SCORE_THRESHOLD) continue;

    let dataEnd = i + 1;
    while (dataEnd < allRows.length) {
      if (scoreRowAsHeader(allRows[dataEnd]) >= HEADER_SCORE_THRESHOLD) break;
      dataEnd++;
    }

    sections.push({
      headerRowIndex: i,
      score,
      kind: classifySection(allRows[i]),
      dataStart: i + 1,
      dataEnd,
      rawHeaderRow: allRows[i],
    });

    i = dataEnd - 1;
  }

  return sections;
}

/**
 * Try to extract holdings from a single sheet.
 *
 *  - Finds every section header in the sheet.
 *  - Skips transactional sections (already-sold records).
 *  - Picks the best holdings/unknown section (most data rows, then highest header score).
 *  - Throws CapitalGainsReportError if the sheet has ONLY transactional sections.
 *  - Returns null if the sheet has no recognisable header at all.
 */
function tryParseSheet(
  sheetName: string,
  allRows: unknown[][],
  headerKeywordsLower: string[]
): {
  rows: RawUploadRow[];
  headers: string[];
  metadataRowsSkipped: number;
  trailerRowsSkipped: number;
  sectionInfo: { totalSections: number; transactionalSkipped: number };
} | null {
  if (allRows.length === 0) return null;

  const sections = findSectionsInSheet(allRows);
  if (sections.length === 0) {
    debugLog(`[Upload] Sheet "${sheetName}": no recognisable header in any of ${allRows.length} rows`);
    return null;
  }

  // Separate transactional sections from candidate (holdings + unknown) sections
  const transactionalSections = sections.filter(s => s.kind === 'transactional');
  const candidateSections = sections.filter(s => s.kind !== 'transactional');

  debugLog(
    `[Upload] Sheet "${sheetName}": found ${sections.length} section${sections.length > 1 ? 's' : ''} ` +
    `(${candidateSections.length} holdings/unknown, ${transactionalSections.length} transactional)`
  );

  if (candidateSections.length === 0) {
    // Every section is transactional — this is a pure capital-gains/sold report.
    const firstHeaders = transactionalSections[0].rawHeaderRow
      .map(c => String(c ?? '').trim())
      .filter(h => h !== '');
    throw new CapitalGainsReportError(firstHeaders);
  }

  // Pre-compute trailing row count for each candidate (used to pick the best one)
  const candidatesWithDataCount = candidateSections.map(section => {
    let dataRowCount = 0;
    for (let i = section.dataStart; i < section.dataEnd; i++) {
      const row = allRows[i];
      if (row.some(cell => String(cell ?? '').trim() !== '')) dataRowCount++;
    }
    return { section, dataRowCount };
  });

  // Sort: prefer holdings over unknown; then more data rows; then higher score.
  candidatesWithDataCount.sort((a, b) => {
    const kindRank = (k: SectionKind) => (k === 'holdings' ? 0 : 1);
    const kindDiff = kindRank(a.section.kind) - kindRank(b.section.kind);
    if (kindDiff !== 0) return kindDiff;
    if (b.dataRowCount !== a.dataRowCount) return b.dataRowCount - a.dataRowCount;
    return b.section.score - a.section.score;
  });

  const chosen = candidatesWithDataCount[0].section;
  debugLog(
    `[Upload] Sheet "${sheetName}": chose ${chosen.kind} section at row ${chosen.headerRowIndex + 1} ` +
    `(score: ${chosen.score}, data rows: ${candidatesWithDataCount[0].dataRowCount})`
  );

  // ── Build headers from chosen section's header row ────────────────────────
  const headers = chosen.rawHeaderRow.map((cell, idx) => {
    const str = String(cell ?? '').trim();
    return str !== '' ? str : (idx === 0 ? '__EMPTY' : `__EMPTY_${idx}`);
  });

  // ── Take only the data rows belonging to this section ─────────────────────
  const dataRows = allRows.slice(chosen.dataStart, chosen.dataEnd);
  const nonEmptyDataRows = dataRows.filter(row =>
    row.some(cell => String(cell ?? '').trim() !== '')
  );
  if (nonEmptyDataRows.length === 0) return null;

  // ── Filter junk: totals, disclaimers, repeated headers, sparse rows ───────
  let trailerRowsSkipped = 0;
  const cleanedDataRows: unknown[][] = [];
  for (const row of nonEmptyDataRows) {
    const reason = detectJunkRow(row, headers.length, headerKeywordsLower);
    if (reason) {
      trailerRowsSkipped++;
      if (trailerRowsSkipped <= 5) {
        const preview = row.slice(0, 4).map(c => String(c ?? '').trim()).join(' | ');
        debugLog(`[Upload] Sheet "${sheetName}" skipping junk row (${reason}): "${preview}…"`);
      }
      continue;
    }
    cleanedDataRows.push(row);
  }

  if (cleanedDataRows.length === 0) return null;

  const rows: RawUploadRow[] = cleanedDataRows.map(rowArr => {
    const obj: RawUploadRow = {};
    headers.forEach((header, idx) => {
      obj[header] = String(rowArr[idx] ?? '');
    });
    return obj;
  });

  return {
    rows,
    headers,
    metadataRowsSkipped: chosen.headerRowIndex,
    trailerRowsSkipped,
    sectionInfo: {
      totalSections: sections.length,
      transactionalSkipped: transactionalSections.length,
    },
  };
}

async function parseFile(
  buffer: Buffer,
  fileName: string
): Promise<{
  rows: RawUploadRow[];
  headers: string[];
  metadataRowsSkipped: number;
  trailerRowsSkipped: number;
  sheetUsed: string;
  sectionInfo: { totalSections: number; transactionalSkipped: number };
}> {
  const XLSX = await import('xlsx');

  const workbook = XLSX.read(buffer, {
    type: 'buffer',
    raw: false,
    cellDates: true,
  });

  const sheetNames = workbook.SheetNames;
  if (sheetNames.length === 0) throw new Error('No data found in file');

  const headerKeywordsLower = ALL_HEADER_KEYWORDS.map(k => normalizeColumnName(k));

  // Try each sheet in order. The first sheet that yields a parseable header + data wins.
  // Capital-gains errors propagate immediately — they're definitive (not "try next sheet").
  let firstFailureSheet: string | null = null;
  for (const sheetName of sheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const allRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      defval: '',
      raw: false,
    });

    const result = tryParseSheet(sheetName, allRows, headerKeywordsLower);
    if (result) {
      if (sheetNames.length > 1 && sheetName !== sheetNames[0]) {
        debugLog(`[Upload] Used sheet "${sheetName}" (sheet ${sheetNames.indexOf(sheetName) + 1} of ${sheetNames.length})`);
      }
      return { ...result, sheetUsed: sheetName };
    }
    if (!firstFailureSheet) firstFailureSheet = sheetName;
  }

  // No sheet yielded a usable header — fall back to first sheet so downstream
  // `validateAssetTypes` can return the proper "empty_headers"/"ambiguous_types" error.
  debugWarn(`[Upload] No usable header in any sheet of ${sheetNames.length} sheets — falling back to sheet 0`);
  const fallbackSheet = workbook.Sheets[sheetNames[0]];
  const allRows = XLSX.utils.sheet_to_json<unknown[]>(fallbackSheet, {
    header: 1,
    defval: '',
    raw: false,
  });

  if (allRows.length === 0) throw new Error('No data rows found in file');

  const rawHeaderRow = allRows[0] as unknown[];
  const headers = rawHeaderRow.map((cell, idx) => {
    const str = String(cell ?? '').trim();
    return str !== '' ? str : (idx === 0 ? '__EMPTY' : `__EMPTY_${idx}`);
  });

  const dataRows = (allRows.slice(1) as unknown[][]).filter(r =>
    r.some(c => String(c ?? '').trim() !== '')
  );
  const rows: RawUploadRow[] = dataRows.map(rowArr => {
    const obj: RawUploadRow = {};
    headers.forEach((header, idx) => {
      obj[header] = String(rowArr[idx] ?? '');
    });
    return obj;
  });

  return {
    rows,
    headers,
    metadataRowsSkipped: 0,
    trailerRowsSkipped: 0,
    sheetUsed: sheetNames[0],
    sectionInfo: { totalSections: 0, transactionalSkipped: 0 },
  };
}

/**
 * Transform raw rows into normalized ParsedHolding objects
 * 
 * CRITICAL: invested_value is ALWAYS computed from quantity × average_price
 * We NEVER trust invested_value from the file
 * 
 * NEW DETECTION SYSTEM:
 * - Uses fuzzy column matching to handle ANY CSV format
 * - Uses ISIN as PRIMARY classifier when available
 * - Uses multi-signal detection (ISIN + columns + name patterns)
 * - Validates confidence scores and rejects if 80%+ ambiguous
 */
function transformRows(rows: RawUploadRow[], headers: string[]): {
  holdings: ParsedHolding[];
  warnings: string[];
  columnMappings: {
    symbol: string | null;
    isin: string | null;
    name: string | null;
    quantity: string | null;
    average_price: string | null;
    invested_value: string | null;
    asset_type: string | null;
  };
  ignoredColumns: { header: string; reason: string }[];
  validation?: ValidationResult;
} {
  const holdings: ParsedHolding[] = [];
  const warnings: string[] = [];
  
  debugLog(`[Upload] Parsed ${rows.length} rows with headers:`, headers);
  
  // STEP 1: Detect columns using fuzzy matching
  const columnMap = detectColumns(headers);
  
  // Validate required columns
  if (columnMap.name === null || columnMap.quantity === null || 
      (columnMap.totalInvested === null && columnMap.averagePrice === null)) {
    const missing = [];
    if (columnMap.name === null) missing.push('Name/Scheme');
    if (columnMap.quantity === null) missing.push('Quantity/Units');
    if (columnMap.totalInvested === null && columnMap.averagePrice === null) {
      missing.push('Invested Amount OR Average Price');
    }
    
    warnings.push(`Missing required columns: ${missing.join(', ')}. Your headers: ${headers.join(', ')}`);
  }
  
  debugLog(`[Upload] Detected columns:`, {
    name: columnMap.name !== null ? headers[columnMap.name] : 'Not found',
    quantity: columnMap.quantity !== null ? headers[columnMap.quantity] : 'Not found',
    totalInvested: columnMap.totalInvested !== null ? headers[columnMap.totalInvested] : 'Not found',
    averagePrice: columnMap.averagePrice !== null ? headers[columnMap.averagePrice] : 'Not found',
    isin: columnMap.isin !== null ? headers[columnMap.isin] : 'Not found',
    folio: columnMap.folio !== null ? headers[columnMap.folio] : 'Not found',
    symbol: columnMap.symbol !== null ? headers[columnMap.symbol] : 'Not found'
  });
  
  // STEP 2: Detect asset type for each row
  const detections: AssetDetection[] = [];
  
  // Convert rows to arrays for processing
  const rowArrays = rows.map(row => headers.map(header => row[header]));
  
  for (let i = 0; i < rowArrays.length; i++) {
    const row = rowArrays[i];
    const detection = detectAssetTypeFromRow(row, columnMap, i + 2);
    detections.push(detection);
    
    debugLog(`[Upload] Row ${i + 1}: "${detection.name}" → ${detection.assetType} (${detection.confidence}% confidence)`);
  }
  
  // STEP 3: Validate upload
  const validation = validateUpload(detections, headers);
  
  if (!validation.valid) {
    // Validation failed - return validation result for handler to reject
    // Don't process rows if validation fails
    return { 
      holdings: [], 
      warnings: [validation.error || 'Validation failed', validation.warning || ''].filter(Boolean),
      columnMappings: {
        symbol: null,
        isin: null,
        name: null,
        quantity: null,
        average_price: null,
        invested_value: null,
        asset_type: null,
      },
      ignoredColumns: [],
      validation 
    };
  }
  
  if (validation.warning) {
    warnings.push(validation.warning);
    debugWarn(`[Upload] Warning: ${validation.warning}`);
  }
  
  debugLog(`[Upload] Asset type distribution:`, validation.assetTypeCounts);
  debugLog(`[Upload] Confidence: High=${detections.filter(d => d.confidence >= 70).length}, Medium=${detections.filter(d => d.confidence >= 50 && d.confidence < 70).length}, Low=${detections.filter(d => d.confidence < 50).length}`);
  
  // Identify ignored columns (calculated values we don't use)
  const ignoredColumns: { header: string; reason: string }[] = [];
  headers.forEach(header => {
    const { blacklisted, reason } = isBlacklisted(header);
    if (blacklisted) {
      ignoredColumns.push({ header, reason: reason || 'Calculated value - we compute this ourselves' });
    }
  });
  
  // Build column mappings for response (using column indices)
  const columnMappings = {
    symbol: columnMap.symbol !== null ? headers[columnMap.symbol] : null,
    isin: columnMap.isin !== null ? headers[columnMap.isin] : null,
    name: columnMap.name !== null ? headers[columnMap.name] : null,
    quantity: columnMap.quantity !== null ? headers[columnMap.quantity] : null,
    average_price: columnMap.averagePrice !== null ? headers[columnMap.averagePrice] : null,
    invested_value: columnMap.totalInvested !== null ? headers[columnMap.totalInvested] : null,
    asset_type: null, // NO LONGER USING CATEGORY COLUMN
  };
  
  // STEP 4: Process each row and create holdings
  for (let i = 0; i < rowArrays.length; i++) {
    const row = rowArrays[i];
    const detection = detections[i];
    const rowIndex = i + 2; // +2 for 1-based indexing and header row
    
    const name = columnMap.name !== null ? String(row[columnMap.name] || '').trim() : '';
    const quantity = columnMap.quantity !== null ? parseQuantity(row[columnMap.quantity]) : null;
    const isin = columnMap.isin !== null ? String(row[columnMap.isin] || '').trim() : undefined;
    const symbol = columnMap.symbol !== null ? String(row[columnMap.symbol] || '').trim() : undefined;
    
    // Parse totalInvested and averagePrice
    const totalInvested = columnMap.totalInvested !== null ? parsePrice(row[columnMap.totalInvested]) : null;
    const averagePrice = columnMap.averagePrice !== null ? parsePrice(row[columnMap.averagePrice]) : null;
    
    // Validate row
    let isValid = true;
    let validationNote: string | undefined;
    
    if (!name && !symbol && !isin) {
      isValid = false;
      validationNote = 'Missing name, symbol, or ISIN';
    }
    
    if (quantity === null || quantity <= 0) {
      isValid = false;
      validationNote = validationNote || 'Invalid or missing quantity';
    }
    
    // CORE CALCULATION: Handle both cases
    let computedAvgPrice = 0;
    let computedInvestedValue = 0;
    const computedQuantity = quantity ?? 0;
    
    // CASE 1: CSV has total invested amount
    if (totalInvested !== null && totalInvested > 0) {
      computedInvestedValue = totalInvested;
      if (computedQuantity > 0) {
        computedAvgPrice = totalInvested / computedQuantity;
      }
    }
    // CASE 2: CSV has average price per unit
    else if (averagePrice !== null && averagePrice > 0) {
      computedAvgPrice = averagePrice;
      if (computedQuantity > 0) {
        computedInvestedValue = calculateInvestedValue(computedQuantity, computedAvgPrice);
      }
    }
    else {
      if (isValid) {
        validationNote = 'Price/Investment amount not found - investment value set to ₹0';
      }
    }
    
    if (computedInvestedValue <= 0 && isValid) {
      isValid = false;
      validationNote = validationNote || 'Invalid or missing investment amount';
    }
    
    holdings.push({
      symbol: symbol || undefined,
      isin: isin || undefined,
      name: name || symbol || isin || `Unknown (Row ${rowIndex})`,
      quantity: computedQuantity,
      average_price: computedAvgPrice,
      invested_value: computedInvestedValue,
      asset_type: detection.assetType,
      isValid,
      validationNote,
      rowIndex,
    });
  }
  
  // Add note about ignored columns
  if (ignoredColumns.length > 0) {
    const ignoredNames = ignoredColumns.slice(0, 3).map(c => `"${c.header}"`).join(', ');
    const more = ignoredColumns.length > 3 ? ` and ${ignoredColumns.length - 3} more` : '';
    warnings.push(`Ignored calculated columns: ${ignoredNames}${more}. We compute values from quantity × buy price for accuracy.`);
  }
  
  return { holdings, warnings, columnMappings, ignoredColumns, validation };
}

// ============================================================================
// API HANDLER
// ============================================================================

/**
 * POST /api/portfolio/upload
 * 
 * Parse uploaded CSV/Excel file and return preview
 * Does NOT save to database - user must confirm first
 * 
 * CALCULATION TRANSPARENCY:
 * - All invested_value computed from quantity × average_price
 * - Calculated columns from file are ignored (logged in warnings)
 * - Duplicate holdings are grouped and merged with weighted average
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    
    if (!file) {
      return NextResponse.json<UploadErrorResponse>(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }
    
    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json<UploadErrorResponse>(
        { 
          success: false, 
          error: 'File too large',
          errorCode: 'size_error',
          details: 'Please upload a file smaller than 5MB'
        },
        { status: 400 }
      );
    }
    
    // Validate file type
    const fileName = file.name.toLowerCase();
    const isValidExtension = ['.csv', '.xls', '.xlsx'].some(ext => fileName.endsWith(ext));
    
    if (!isValidExtension) {
      return NextResponse.json<UploadErrorResponse>(
        { 
          success: false, 
          error: 'Unsupported file type',
          errorCode: 'type_error',
          details: 'Please upload a CSV or Excel file (.csv, .xls, .xlsx)'
        },
        { status: 400 }
      );
    }
    
    // Read and parse file
    const buffer = Buffer.from(await file.arrayBuffer());
    
    let rows: RawUploadRow[];
    let headers: string[];
    let metadataRowsSkipped = 0;
    let trailerRowsSkipped = 0;
    let sheetUsed = '';
    let sectionInfo = { totalSections: 0, transactionalSkipped: 0 };

    try {
      const parsed = await parseFile(buffer, file.name);
      rows = parsed.rows;
      headers = parsed.headers;
      metadataRowsSkipped = parsed.metadataRowsSkipped;
      trailerRowsSkipped = parsed.trailerRowsSkipped;
      sheetUsed = parsed.sheetUsed;
      sectionInfo = parsed.sectionInfo;
    } catch (parseError) {
      // Specific error: every section in this file is a sold/transaction record
      if (parseError instanceof CapitalGainsReportError) {
        return NextResponse.json<UploadErrorResponse>(
          {
            success: false,
            error: 'This is a transaction report, not a holdings file',
            errorCode: 'capital_gains_report',
            detectedHeaders: parseError.detectedHeaders,
            details:
              'This file lists individual transactions (orders, buys/sells, or capital gains) ' +
              'rather than your current positions. To track your portfolio, please upload a ' +
              'holdings statement instead.',
          },
          { status: 400 }
        );
      }
      console.error('File parsing error:', parseError);
      return NextResponse.json<UploadErrorResponse>(
        {
          success: false,
          error: 'Could not read file',
          errorCode: 'file_error',
          details: 'Please ensure your file is a valid CSV or Excel file (.csv, .xls, .xlsx)',
        },
        { status: 400 }
      );
    }
    
    // Transform to normalized holdings
    const { holdings, warnings, columnMappings, ignoredColumns, validation } = transformRows(rows, headers);

    // ── Sanity check: if every row has 0 quantity AND 0 price, the file is the wrong type ──
    // (e.g. user uploaded a tax statement or summary report instead of holdings)
    if (holdings.length > 0) {
      const allZero = holdings.every(h =>
        (Number(h.quantity) || 0) === 0 && (Number(h.average_price) || 0) === 0
      );
      if (allZero) {
        return NextResponse.json<UploadErrorResponse>(
          {
            success: false,
            error: 'No quantity or price found in any row',
            errorCode: 'all_zero_values',
            detectedHeaders: headers,
            details:
              'We read your file but every row has zero quantity and zero price. ' +
              'This is usually a summary or tax report rather than a holdings statement. ' +
              'Please upload your current holdings file instead.',
          },
          { status: 400 }
        );
      }
    }

    // Surface friendly notices about what we auto-cleaned
    if (sheetUsed && sheetUsed !== 'Sheet1') {
      warnings.unshift(`Imported from sheet "${sheetUsed}".`);
    }
    if (trailerRowsSkipped > 0) {
      warnings.unshift(
        `Skipped ${trailerRowsSkipped} non-holding row${trailerRowsSkipped > 1 ? 's' : ''} ` +
        `(totals, disclaimers, footers).`
      );
    }
    if (metadataRowsSkipped > 0) {
      warnings.unshift(
        `Skipped ${metadataRowsSkipped} header row${metadataRowsSkipped > 1 ? 's' : ''} ` +
        `(account details, report title) and read the column headers at row ${metadataRowsSkipped + 1}.`
      );
    }
    if (sectionInfo.transactionalSkipped > 0) {
      warnings.unshift(
        `Found ${sectionInfo.transactionalSkipped} section${sectionInfo.transactionalSkipped > 1 ? 's' : ''} ` +
        `of already-sold trades — those were skipped. Imported your current holdings only.`
      );
    }

    // Check validation result - reject if 80%+ ambiguous
    if (validation && !validation.valid) {
      // Detect if the problem is empty/placeholder headers (XLSX __EMPTY_ pattern)
      const emptyHeaderCount = headers.filter(h => h.startsWith('__EMPTY') || h.trim() === '').length;
      const hasEmptyHeaders = headers.length > 0 && (emptyHeaderCount / headers.length) > 0.5;

      return NextResponse.json<UploadErrorResponse>(
        {
          success: false,
          error: hasEmptyHeaders
            ? 'File headers not found in first row'
            : 'Could not identify asset types in this file',
          errorCode: hasEmptyHeaders ? 'empty_headers' : 'ambiguous_types',
          detectedHeaders: headers,
          details: hasEmptyHeaders
            ? 'Your file\'s first row contains account details instead of column names. Open the file in Excel or Google Sheets, delete the top rows until row 1 shows column headers like "Scheme Name", "Quantity", "Price", then save as CSV and re-upload.'
            : 'The column headers in your file don\'t match any recognised format. Check the expected format below and ensure your file\'s first row contains column names.',
        },
        { status: 400 }
      );
    }
    
    // Filter valid holdings for grouping
    const validHoldings = holdings.filter(h => h.isValid);
    
    // Group duplicate holdings by identity (ISIN > Symbol > Name)
    // This merges quantities and calculates weighted average price
    const groupedHoldings = groupHoldings(
      validHoldings.map(h => ({
        isin: h.isin,
        symbol: h.symbol,
        name: h.name,
        quantity: h.quantity,
        average_price: h.average_price,
        asset_type: h.asset_type,
        rowIndex: h.rowIndex,
      }))
    );
    
    // Add warning if holdings were merged
    const mergedCount = validHoldings.length - groupedHoldings.length;
    if (mergedCount > 0) {
      warnings.push(`Merged ${mergedCount} duplicate rows. Holdings with same ISIN/Symbol/Name are combined with weighted average price.`);
    }
    
    // Calculate summary using our metrics calculator
    const metrics = calculatePortfolioMetrics(
      groupedHoldings.map(h => ({
        invested_value: h.invested_value,
        asset_type: h.asset_type,
        name: h.name,
      }))
    );
    
    // Convert grouped holdings back to ParsedHolding format for response
    const finalHoldings: ParsedHolding[] = groupedHoldings.map((h, index) => ({
      symbol: h.symbol,
      isin: h.isin,
      name: h.name,
      quantity: h.quantity,
      average_price: h.average_price,
      invested_value: h.invested_value,
      asset_type: h.asset_type as AssetType,
      isValid: true,
      validationNote: h.rowIndices.length > 1 
        ? `Merged from rows ${h.rowIndices.join(', ')}`
        : undefined,
      rowIndex: h.rowIndices[0],
    }));
    
    // Add invalid holdings back (not grouped)
    const invalidHoldings = holdings.filter(h => !h.isValid);
    
    debugLog('\n=== Upload Summary ===');
    debugLog(`Total rows: ${holdings.length}`);
    debugLog(`Valid rows: ${validHoldings.length}`);
    debugLog(`After grouping: ${groupedHoldings.length} unique holdings`);
    debugLog(`Total invested value: ${formatIndianCurrency(metrics.totalInvestedValue)}`);
    debugLog(`Asset allocation: Equity ${metrics.equityPct.toFixed(1)}%, Debt ${metrics.debtPct.toFixed(1)}%, Gold ${metrics.goldPct.toFixed(1)}%`);
    
    const response: UploadPreviewResponse = {
      success: true,
      holdings: [...finalHoldings, ...invalidHoldings],
      summary: {
        totalRows: holdings.length,
        validRows: finalHoldings.length,
        skippedRows: invalidHoldings.length,
        totalInvestedValue: metrics.totalInvestedValue,
      },
      warnings,
      detectedColumns: columnMappings,
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json<UploadErrorResponse>(
      { 
        success: false, 
        error: 'Something went wrong',
        details: 'Please try again or contact support if the issue persists'
      },
      { status: 500 }
    );
  }
}
