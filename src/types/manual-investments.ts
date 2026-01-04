/**
 * Type definitions for manual investment entry
 * Supports: FD, Bonds, Gold, Cash
 */

export type ManualAssetType = 'fd' | 'bond' | 'gold' | 'cash';
export type GoldType = 'sgb' | 'physical' | 'etf';
export type CouponFrequency = 'annual' | 'semi-annual' | 'quarterly' | 'monthly';

/**
 * Fixed Deposit Entry
 */
export interface FixedDepositData {
  assetType: 'fd';
  fdInstitution: string;
  fdPrincipal: number;
  fdRate: number;
  fdStartDate: string;
  fdMaturityDate: string;
}

/**
 * Bond Entry
 */
export interface BondData {
  assetType: 'bond';
  bondIssuer: string;
  bondAmount: number;
  bondCouponRate: number;
  bondCouponFrequency: CouponFrequency;
  bondMaturityDate: string;
}

/**
 * Gold Entry
 */
export interface GoldData {
  assetType: 'gold';
  goldType: GoldType;
  goldAmount: number;
  goldPurchaseDate: string;
}

/**
 * Cash Entry
 */
export interface CashData {
  assetType: 'cash';
  cashAmount: number;
  cashAccountType: string;
}

/**
 * Union type for all manual investment types
 */
export type ManualInvestmentFormData = FixedDepositData | BondData | GoldData | CashData;

/**
 * Asset metadata stored in database
 */
export interface AssetMetadata {
  risk_bucket: 'low' | 'medium' | 'high';
  [key: string]: any;
}

/**
 * API Request/Response types
 */
export interface ManualInvestmentRequest {
  user_id: string;
  portfolio_id?: string;
  form_data: ManualInvestmentFormData;
  editing_holding_id?: string;
}

export interface ManualInvestmentResponse {
  success: boolean;
  error?: string;
  holding_id?: string;
  asset_id?: string;
}

