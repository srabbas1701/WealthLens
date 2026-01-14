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
      console.log(`[Column Detection] Matched "${header}" to totalInvested`);
    }
    // Only match averagePrice if we haven't matched totalInvested
    else if (map.averagePrice === null && fuzzyMatchColumn(header, AVERAGE_PRICE_VARIATIONS)) {
      map.averagePrice = index;
      console.log(`[Column Detection] Matched "${header}" to averagePrice`);
    }
    
    if (map.sectorType === null && fuzzyMatchColumn(header, SECTOR_TYPE_VARIATIONS)) {
      map.sectorType = index;
      console.log(`[Column Detection] Matched "${header}" to sectorType`);
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
      console.log(`[Detection] Row "${name}" has MF indicators - ignoring Sector="${sectorValue}"`);
      // Don't set sectorSignal - let other signals handle it
    }
    // If NO MF indicators, sector column might describe asset type
    else {
      // Only match VERY EXPLICIT asset type values (exact match)
      if (sectorValue === 'etf') {
        signals.sectorSignal = 'etf';
        confidence = Math.max(confidence, 95);
        console.log(`[Detection] Sector="ETF" for ${name}`);
      }
      else if (sectorValue === 'mutual fund' || sectorValue === 'mf' || 
               sectorValue === 'mutualfund' || sectorValue === 'mutual') {
        signals.sectorSignal = 'mutual_fund';
        confidence = Math.max(confidence, 95);
        console.log(`[Detection] Sector="Mutual Fund" for ${name}`);
      }
      else if (sectorValue === 'stock' || sectorValue === 'stocks') {
        signals.sectorSignal = 'equity';
        confidence = Math.max(confidence, 90);
        console.log(`[Detection] Sector="Stock" for ${name}`);
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
async function parseFile(buffer: Buffer, fileName: string): Promise<{ rows: RawUploadRow[]; headers: string[] }> {
  const XLSX = await import('xlsx');
  
  const workbook = XLSX.read(buffer, {
    type: 'buffer',
    raw: false,
    cellDates: true,
  });
  
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error('No data found in file');
  }
  
  const sheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json<RawUploadRow>(sheet, {
    defval: '',
    raw: false,
  });
  
  if (jsonData.length === 0) {
    throw new Error('No data rows found in file');
  }
  
  const headers = Object.keys(jsonData[0]);
  return { rows: jsonData, headers };
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
  
  console.log(`[Upload] Parsed ${rows.length} rows with headers:`, headers);
  
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
  
  console.log(`[Upload] Detected columns:`, {
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
    
    console.log(`[Upload] Row ${i + 1}: "${detection.name}" → ${detection.assetType} (${detection.confidence}% confidence)`);
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
    console.warn(`[Upload] Warning: ${validation.warning}`);
  }
  
  console.log(`[Upload] Asset type distribution:`, validation.assetTypeCounts);
  console.log(`[Upload] Confidence: High=${detections.filter(d => d.confidence >= 70).length}, Medium=${detections.filter(d => d.confidence >= 50 && d.confidence < 70).length}, Low=${detections.filter(d => d.confidence < 50).length}`);
  
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
          details: 'Please upload a CSV or Excel file (.csv, .xls, .xlsx)'
        },
        { status: 400 }
      );
    }
    
    // Read and parse file
    const buffer = Buffer.from(await file.arrayBuffer());
    
    let rows: RawUploadRow[];
    let headers: string[];
    
    try {
      const parsed = await parseFile(buffer, file.name);
      rows = parsed.rows;
      headers = parsed.headers;
    } catch (parseError) {
      console.error('File parsing error:', parseError);
      return NextResponse.json<UploadErrorResponse>(
        { 
          success: false, 
          error: 'Could not read file',
          details: 'Please ensure your file is a valid CSV or Excel file'
        },
        { status: 400 }
      );
    }
    
    // Transform to normalized holdings
    const { holdings, warnings, columnMappings, ignoredColumns, validation } = transformRows(rows, headers);
    
    // Check validation result - reject if 80%+ ambiguous
    if (validation && !validation.valid) {
      return NextResponse.json<UploadErrorResponse>(
        {
          success: false,
          error: validation.error || 'Cannot confidently detect asset types',
          details: validation.warning
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
    
    console.log('\n=== Upload Summary ===');
    console.log(`Total rows: ${holdings.length}`);
    console.log(`Valid rows: ${validHoldings.length}`);
    console.log(`After grouping: ${groupedHoldings.length} unique holdings`);
    console.log(`Total invested value: ${formatIndianCurrency(metrics.totalInvestedValue)}`);
    console.log(`Asset allocation: Equity ${metrics.equityPct.toFixed(1)}%, Debt ${metrics.debtPct.toFixed(1)}%, Gold ${metrics.goldPct.toFixed(1)}%`);
    
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
