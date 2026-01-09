/**
 * Portfolio Upload Types
 * 
 * Types for CSV/Excel portfolio upload feature.
 * 
 * DESIGN PHILOSOPHY:
 * - User-friendly: Accept various column naming conventions
 * - Fault-tolerant: Skip invalid rows, don't fail entire upload
 * - Transparent: Show user exactly what will be imported
 * - No trading language: This is about understanding, not execution
 */

import type { Database } from './database';

// Asset types supported by the system
export type AssetType = Database['public']['Tables']['assets']['Row']['asset_type'];

/**
 * Raw row from CSV/Excel file
 * Column names vary by broker/export source
 */
export interface RawUploadRow {
  [key: string]: string | number | undefined;
}

/**
 * Normalized row after parsing
 * This is what we show in the preview table
 */
export interface ParsedHolding {
  // Identification (at least one required)
  symbol?: string;
  isin?: string;
  name: string;
  
  // Quantities
  quantity: number;
  average_price: number;
  
  // Computed
  invested_value: number;
  
  // Classification
  asset_type: AssetType;
  
  // Validation
  isValid: boolean;
  validationNote?: string;
  
  // Original row index for error reporting
  rowIndex: number;
}

/**
 * Upload preview response
 * Sent to frontend for user confirmation before import
 */
export interface UploadPreviewResponse {
  success: true;
  
  // Parsed data
  holdings: ParsedHolding[];
  
  // Summary stats
  summary: {
    totalRows: number;
    validRows: number;
    skippedRows: number;
    totalInvestedValue: number;
  };
  
  // Warnings (non-blocking)
  warnings: string[];
  
  // Detected column mappings (for transparency)
  // Shows user which columns were auto-detected
  detectedColumns?: {
    symbol: string | null;
    isin: string | null;
    name: string | null;
    quantity: string | null;
    average_price: string | null;
    invested_value: string | null;
    asset_type: string | null;
  };
}

/**
 * Upload error response
 */
export interface UploadErrorResponse {
  success: false;
  error: string;
  details?: string;
}

/**
 * Combined upload response type
 */
export type UploadResponse = UploadPreviewResponse | UploadErrorResponse;

/**
 * Confirm upload request
 * Sent when user confirms the preview
 */
export interface ConfirmUploadRequest {
  // User ID (required)
  user_id: string;
  
  // Holdings to import (from preview)
  holdings: ParsedHolding[];
  
  // Source tracking
  source: 'onboarding' | 'dashboard';
}

/**
 * Unresolved scheme (MF asset that couldn't be identified)
 */
export interface UnresolvedScheme {
  name: string;
  reason: string;
}

/**
 * Confirm upload response
 */
export interface ConfirmUploadResponse {
  success: boolean;
  message: string;
  
  // Stats
  holdingsCreated: number;
  holdingsUpdated: number;
  assetsCreated: number;
  
  // Portfolio ID for reference
  portfolioId?: string;
  
  // Error details if failed
  error?: string;
  
  // Warnings (non-blocking issues like unresolved ISINs)
  warnings?: string[];
  
  // Unresolved MF schemes (deprecated - use warnings instead)
  unresolvedSchemes?: UnresolvedScheme[];
}

/**
 * Column mapping configuration
 * Maps various broker export column names to our normalized fields
 * 
 * SUPPORTED BROKERS:
 * - Groww (Stock name, Symbol, ISIN, Quantity, Price)
 * - Zerodha (tradingsymbol, isin, quantity, average_price)
 * - Angel One, Upstox, and generic CSV exports
 */
export const COLUMN_MAPPINGS: Record<string, string[]> = {
  // Symbol/Ticker
  symbol: ['symbol', 'ticker', 'scrip', 'stock', 'stock_symbol', 'trading_symbol', 'tradingsymbol', 'nse_symbol', 'bse_symbol'],
  
  // ISIN
  isin: ['isin', 'isin_code', 'isin_number', 'security_id'],
  
  // Name - Added 'stock name' for Groww
  name: ['name', 'stock_name', 'stock name', 'company', 'company_name', 'security', 'security_name', 'instrument', 'instrument_name', 'scrip_name', 'fund_name', 'scheme_name'],
  
  // Quantity
  quantity: ['quantity', 'qty', 'units', 'shares', 'no_of_shares', 'holdings', 'balance_units', 'balance', 'nav_units'],
  
  // Average Price - Added 'price' for Groww
  average_price: ['price', 'average_price', 'avg_price', 'avg_cost', 'average_cost', 'buy_price', 'purchase_price', 'cost_price', 'invested_nav', 'average_nav', 'buy_avg', 'ltp', 'last_price', 'current_price'],
  
  // Invested Value (optional, can be computed)
  invested_value: ['invested_value', 'invested_amount', 'investment', 'cost', 'total_cost', 'buy_value', 'purchase_value', 'value', 'market_value', 'current_value'],
  
  // Asset Type (optional)
  asset_type: ['asset_type', 'type', 'instrument_type', 'category', 'asset_class', 'security_type', 'segment'],
};

/**
 * Asset type inference from name/symbol
 * Used when asset_type column is not present
 */
export const ASSET_TYPE_PATTERNS: { pattern: RegExp; type: AssetType }[] = [
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
  
  // Default to equity for stocks
];

/**
 * Supported file types
 */
export const SUPPORTED_FILE_TYPES = [
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

export const SUPPORTED_EXTENSIONS = ['.csv', '.xls', '.xlsx'];

