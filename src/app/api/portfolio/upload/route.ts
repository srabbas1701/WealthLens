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

type TargetField = 'symbol' | 'isin' | 'name' | 'quantity' | 'average_price' | 'asset_type';

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
 * Column name patterns for detection
 * Priority: exact > strong > weak
 */
const COLUMN_PATTERNS: Record<TargetField, { exact: string[]; strong: string[]; weak: string[] }> = {
  // ISIN - highest priority for identification (most reliable)
  isin: {
    exact: ['isin', 'isin_code', 'isin_number', 'isin_no'],
    strong: [],
    weak: [],
  },
  
  // Symbol - second priority for identification
  symbol: {
    exact: ['symbol', 'ticker', 'scrip', 'scrip_code', 'trading_symbol', 'tradingsymbol'],
    strong: ['stock_symbol', 'nse_symbol', 'bse_symbol', 'script', 'scrip_name'],
    weak: [],
  },
  
  // Name - fallback for identification
  name: {
    exact: ['name', 'stock_name', 'company_name', 'security_name', 'instrument_name', 'scheme_name', 'fund_name', 'scrip_name'],
    strong: ['company', 'security', 'instrument', 'scheme', 'fund', 'stock', 'particulars'],
    weak: ['description'],
  },
  
  // Quantity - required field
  quantity: {
    exact: ['quantity', 'qty', 'units', 'shares', 'no_of_shares', 'num_shares', 'holding_quantity'],
    strong: ['holdings', 'balance_units', 'balance_qty', 'nav_units', 'total_units'],
    weak: ['balance', 'holding'],
  },
  
  // Average/Buy Price - required field (NOT current price!)
  // Be very specific - we want BUY price, not current/market price
  average_price: {
    exact: ['avg_price', 'average_price', 'avg_cost', 'average_cost', 'buy_price', 'purchase_price', 'cost_price', 'buy_avg', 'avg_buy_price'],
    strong: ['buy_average', 'invested_nav', 'average_nav', 'purchase_nav', 'cost', 'rate'],
    weak: ['price'], // Only use 'price' if nothing else matches - could be current price
  },
  
  // Asset Type - optional
  asset_type: {
    exact: ['asset_type', 'instrument_type', 'security_type', 'asset_class'],
    strong: ['type', 'category'],
    weak: [],
  },
};

/**
 * Asset type inference patterns
 * Used when asset_type column is not present
 */
const ASSET_TYPE_PATTERNS: { pattern: RegExp; type: AssetType }[] = [
  // Mutual Funds
  { pattern: /\b(fund|mf|mutual)\b/i, type: 'mutual_fund' },
  { pattern: /\b(direct|growth|dividend|idcw)\b/i, type: 'mutual_fund' },
  
  // Index Funds
  { pattern: /\b(index|nifty|sensex|midcap|smallcap)\s*(fund|index)\b/i, type: 'index_fund' },
  
  // ETFs
  { pattern: /\b(etf|exchange\s*traded)\b/i, type: 'etf' },
  { pattern: /\bbees\b/i, type: 'etf' },
  
  // Government schemes
  { pattern: /\bppf\b/i, type: 'ppf' },
  { pattern: /\bepf\b/i, type: 'epf' },
  { pattern: /\bnps\b/i, type: 'nps' },
  
  // Fixed Income
  { pattern: /\b(fd|fixed\s*deposit)\b/i, type: 'fd' },
  { pattern: /\b(bond|debenture|ncd)\b/i, type: 'bond' },
  
  // Gold
  { pattern: /\b(gold|sgb|sovereign)\b/i, type: 'gold' },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Normalize a column header for comparison
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
 * Score a column header against a target field
 */
function scoreColumnHeader(header: string, field: TargetField): { score: number; matchType: string } {
  const normalized = normalizeHeader(header);
  const patterns = COLUMN_PATTERNS[field];
  
  // Check exact matches (highest confidence)
  for (const exact of patterns.exact) {
    if (normalized === exact || normalized === exact.replace(/_/g, '')) {
      return { score: 1.0, matchType: 'exact' };
    }
  }
  
  // Check if header contains exact pattern
  for (const exact of patterns.exact) {
    if (normalized.includes(exact) || exact.includes(normalized)) {
      return { score: 0.9, matchType: 'exact_partial' };
    }
  }
  
  // Check strong matches
  for (const strong of patterns.strong) {
    if (normalized === strong || normalized.includes(strong)) {
      return { score: 0.7, matchType: 'strong' };
    }
  }
  
  // Check weak matches
  for (const weak of patterns.weak) {
    if (normalized === weak || normalized.includes(weak)) {
      return { score: 0.4, matchType: 'weak' };
    }
  }
  
  return { score: 0, matchType: 'none' };
}

/**
 * Data validators - validate sample data matches expected field type
 */
const DATA_VALIDATORS: Record<TargetField, (samples: string[]) => boolean> = {
  isin: (samples) => {
    // ISIN: 12 chars, starts with 2 letters (IN for India)
    const validCount = samples.filter(s => {
      const clean = s.trim().toUpperCase();
      return clean.length === 12 && /^[A-Z]{2}[A-Z0-9]{10}$/.test(clean);
    }).length;
    return validCount >= samples.length * 0.8;
  },
  
  symbol: (samples) => {
    // Symbol: Short alphanumeric
    const validCount = samples.filter(s => {
      const clean = s.trim();
      return clean.length >= 1 && clean.length <= 30 && /^[A-Za-z0-9\-&.]+$/.test(clean);
    }).length;
    return validCount >= samples.length * 0.7;
  },
  
  name: (samples) => {
    // Name: Contains letters
    const validCount = samples.filter(s => {
      const clean = s.trim();
      return clean.length >= 2 && /[a-zA-Z]/.test(clean);
    }).length;
    return validCount >= samples.length * 0.7;
  },
  
  quantity: (samples) => {
    // Quantity: Positive numbers in reasonable range
    const validCount = samples.filter(s => {
      const num = parseQuantity(s);
      return num !== null && num > 0 && num <= 10000000;
    }).length;
    return validCount >= samples.length * 0.7;
  },
  
  average_price: (samples) => {
    // Price: Positive numbers in reasonable price range
    const validCount = samples.filter(s => {
      const num = parsePrice(s);
      return num !== null && num > 0 && num <= 500000; // Max ₹5L per unit (reasonable for any asset)
    }).length;
    return validCount >= samples.length * 0.7;
  },
  
  asset_type: (samples) => {
    // Asset type: Categorical with limited unique values
    const uniqueValues = new Set(samples.map(s => s.toLowerCase().trim()));
    return uniqueValues.size <= 20 && uniqueValues.size < samples.length * 0.5;
  },
};

/**
 * Intelligent column mapping
 * Returns map of target fields to detected columns
 */
interface ColumnMapping {
  header: string;
  field: TargetField;
  confidence: number;
  matchType: string;
}

function detectColumnMappings(
  headers: string[],
  sampleRows: RawUploadRow[]
): {
  mappings: Map<TargetField, ColumnMapping | null>;
  ignoredColumns: { header: string; reason: string }[];
} {
  const mappings = new Map<TargetField, ColumnMapping | null>();
  const usedHeaders = new Set<string>();
  const ignoredColumns: { header: string; reason: string }[] = [];
  
  // Priority order: ISIN first (most reliable), then symbol, name, quantity, price
  const targetFields: TargetField[] = ['isin', 'symbol', 'name', 'quantity', 'average_price', 'asset_type'];
  
  // First pass: Identify blacklisted columns
  for (const header of headers) {
    const { blacklisted, reason } = isBlacklisted(header);
    if (blacklisted) {
      ignoredColumns.push({ header, reason: reason || 'Calculated value - we compute this ourselves' });
      usedHeaders.add(header);
    }
  }
  
  // Second pass: Find matches for each target field
  const allMatches: { header: string; field: TargetField; score: number; matchType: string; dataValid: boolean }[] = [];
  
  for (const header of headers) {
    if (usedHeaders.has(header)) continue;
    
    // Get sample data for validation
    const samples = sampleRows
      .slice(0, 20)
      .map(row => String(row[header] || ''))
      .filter(s => s.trim() !== '');
    
    for (const field of targetFields) {
      const { score, matchType } = scoreColumnHeader(header, field);
      
      if (score > 0) {
        const dataValid = samples.length > 0 ? DATA_VALIDATORS[field](samples) : true;
        
        allMatches.push({
          header,
          field,
          score: dataValid ? score : score * 0.3,
          matchType,
          dataValid,
        });
      }
    }
  }
  
  // Sort by score descending
  allMatches.sort((a, b) => b.score - a.score);
  
  // Assign mappings greedily
  for (const match of allMatches) {
    if (mappings.has(match.field) || usedHeaders.has(match.header)) continue;
    
    const minScore = match.matchType === 'weak' ? 0.3 : 0.4;
    if (match.score >= minScore) {
      mappings.set(match.field, {
        header: match.header,
        field: match.field,
        confidence: match.score,
        matchType: match.matchType,
      });
      usedHeaders.add(match.header);
    }
  }
  
  // Fill missing fields with null
  for (const field of targetFields) {
    if (!mappings.has(field)) {
      mappings.set(field, null);
    }
  }
  
  // Log results for debugging
  console.log('\n=== Column Detection Results ===');
  console.log('Ignored columns (calculated values we don\'t trust):');
  ignoredColumns.forEach(c => console.log(`  - "${c.header}": ${c.reason}`));
  console.log('\nDetected mappings:');
  for (const [field, mapping] of mappings) {
    if (mapping) {
      console.log(`  ${field}: "${mapping.header}" (confidence: ${(mapping.confidence * 100).toFixed(0)}%)`);
    } else {
      console.log(`  ${field}: NOT FOUND`);
    }
  }
  
  return { mappings, ignoredColumns };
}

/**
 * Infer asset type from name/symbol
 */
function inferAssetType(name: string, symbol?: string): AssetType {
  const searchText = `${name} ${symbol || ''}`.toLowerCase();
  
  for (const { pattern, type } of ASSET_TYPE_PATTERNS) {
    if (pattern.test(searchText)) {
      return type;
    }
  }
  
  return 'equity';
}

/**
 * Map raw asset type string to valid AssetType
 */
function mapAssetType(rawType: string | undefined): AssetType {
  if (!rawType) return 'equity';
  
  const normalized = rawType.toLowerCase().trim();
  
  const mapping: Record<string, AssetType> = {
    'equity': 'equity',
    'stock': 'equity',
    'share': 'equity',
    'mutual fund': 'mutual_fund',
    'mutual_fund': 'mutual_fund',
    'mf': 'mutual_fund',
    'index fund': 'index_fund',
    'index_fund': 'index_fund',
    'etf': 'etf',
    'fd': 'fd',
    'fixed deposit': 'fd',
    'bond': 'bond',
    'gold': 'gold',
    'sgb': 'gold',
    'ppf': 'ppf',
    'epf': 'epf',
    'nps': 'nps',
    'cash': 'cash',
  };
  
  return mapping[normalized] || 'other';
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
 */
function transformRows(rows: RawUploadRow[], headers: string[]): {
  holdings: ParsedHolding[];
  warnings: string[];
  columnMappings: Record<string, string | null>;
  ignoredColumns: { header: string; reason: string }[];
} {
  const holdings: ParsedHolding[] = [];
  const warnings: string[] = [];
  
  // Detect column mappings
  const { mappings, ignoredColumns } = detectColumnMappings(headers, rows);
  
  // Extract column names
  const symbolCol = mappings.get('symbol')?.header || null;
  const isinCol = mappings.get('isin')?.header || null;
  const nameCol = mappings.get('name')?.header || null;
  const quantityCol = mappings.get('quantity')?.header || null;
  const avgPriceCol = mappings.get('average_price')?.header || null;
  const assetTypeCol = mappings.get('asset_type')?.header || null;
  
  // Build column mappings for response
  const columnMappings: Record<string, string | null> = {
    symbol: symbolCol,
    isin: isinCol,
    name: nameCol,
    quantity: quantityCol,
    average_price: avgPriceCol,
    asset_type: assetTypeCol,
  };
  
  // Generate warnings
  if (!nameCol && !symbolCol && !isinCol) {
    warnings.push('Could not identify a name, symbol, or ISIN column. Please check your file format.');
  }
  
  if (!quantityCol) {
    warnings.push('Could not identify a quantity column. Using default value of 1.');
  }
  
  if (!avgPriceCol) {
    warnings.push('Could not identify a buy price column. Investment values will be set to ₹0.');
  }
  
  // Add note about ignored columns
  if (ignoredColumns.length > 0) {
    const ignoredNames = ignoredColumns.slice(0, 3).map(c => `"${c.header}"`).join(', ');
    const more = ignoredColumns.length > 3 ? ` and ${ignoredColumns.length - 3} more` : '';
    warnings.push(`Ignored calculated columns: ${ignoredNames}${more}. We compute values from quantity × buy price for accuracy.`);
  }
  
  // Process each row
  rows.forEach((row, index) => {
    const rowIndex = index + 2; // +2 for 1-based indexing and header row
    
    // Extract values
    const symbol = symbolCol ? String(row[symbolCol] || '').trim() : undefined;
    const isin = isinCol ? String(row[isinCol] || '').trim() : undefined;
    const rawName = nameCol ? String(row[nameCol] || '').trim() : (symbol || isin || '');
    const rawAssetType = assetTypeCol ? String(row[assetTypeCol] || '').trim() : undefined;
    
    // Parse quantity using our robust parser (handles Indian formats)
    const quantity = quantityCol ? parseQuantity(row[quantityCol]) : 1;
    
    // Parse average price using our robust parser (handles ₹, L, Cr, commas)
    const avgPrice = avgPriceCol ? parsePrice(row[avgPriceCol]) : null;
    
    // Validate row
    let isValid = true;
    let validationNote: string | undefined;
    
    if (!rawName && !symbol && !isin) {
      isValid = false;
      validationNote = 'Missing name, symbol, or ISIN';
    }
    
    if (quantity === null || quantity <= 0) {
      isValid = false;
      validationNote = validationNote || 'Invalid or missing quantity';
    }
    
    // CORE CALCULATION: invested_value = quantity × average_price
    // This is ALWAYS computed, NEVER trusted from the file
    let computedInvestedValue = 0;
    const computedAvgPrice = avgPrice ?? 0;
    
    if (computedAvgPrice > 0 && quantity !== null && quantity > 0) {
      computedInvestedValue = calculateInvestedValue(quantity, computedAvgPrice);
    }
    
    if (computedAvgPrice === 0 && isValid) {
      validationNote = 'Price not found - investment value set to ₹0';
    }
    
    // Determine asset type
    const assetType = rawAssetType 
      ? mapAssetType(rawAssetType)
      : inferAssetType(rawName, symbol);
    
    holdings.push({
      symbol: symbol || undefined,
      isin: isin || undefined,
      name: rawName || symbol || isin || `Unknown (Row ${rowIndex})`,
      quantity: quantity ?? 0,
      average_price: computedAvgPrice,
      invested_value: computedInvestedValue,
      asset_type: assetType,
      isValid,
      validationNote,
      rowIndex,
    });
  });
  
  return { holdings, warnings, columnMappings, ignoredColumns };
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
    const { holdings, warnings, columnMappings, ignoredColumns } = transformRows(rows, headers);
    
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
