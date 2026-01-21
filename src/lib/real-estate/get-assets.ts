/**
 * Real Estate Assets Fetching Functions
 * 
 * Functions to fetch real estate assets with ownership-adjusted values.
 * 
 * @module lib/real-estate/get-assets
 */

import type { Database } from '@/types/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

type RealEstateAsset = Database['public']['Tables']['real_estate_assets']['Row'];
type RealEstateLoan = Database['public']['Tables']['real_estate_loans']['Row'];
type RealEstateCashflow = Database['public']['Tables']['real_estate_cashflows']['Row'];

export interface OwnershipAdjustedAsset {
  asset: RealEstateAsset;
  loan: RealEstateLoan | null;
  cashflow: RealEstateCashflow | null;
  // Ownership-adjusted computed values
  ownershipAdjusted: {
    purchasePrice: number | null;
    currentValue: number | null;
    monthlyRent: number | null;
    outstandingBalance: number | null;
  };
}

/**
 * Get Current Estimated Value (ownership-adjusted)
 * 
 * Priority:
 * 1. user_override_value
 * 2. Midpoint of system_estimated_min and system_estimated_max
 * 3. purchase_price (fallback)
 */
function getCurrentValue(asset: RealEstateAsset): number | null {
  if (asset.user_override_value !== null && asset.user_override_value !== undefined) {
    return asset.user_override_value;
  }
  
  if (asset.system_estimated_min !== null && asset.system_estimated_max !== null) {
    return (asset.system_estimated_min + asset.system_estimated_max) / 2;
  }
  
  if (asset.purchase_price !== null && asset.purchase_price !== undefined) {
    return asset.purchase_price;
  }
  
  return null;
}

/**
 * Apply ownership percentage to a value
 */
function applyOwnership(value: number | null, ownershipPercentage: number | null): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  
  const ownership = ownershipPercentage ?? 100;
  return value * (ownership / 100);
}

/**
 * Get User Real Estate Assets
 * 
 * Fetches all real estate assets for the logged-in user with:
 * - LEFT JOIN loans and cashflows
 * - Ownership-adjusted values
 * - Sorted by created_at desc
 * 
 * @param supabase - Supabase client (must be authenticated)
 * @param userId - User ID (must match authenticated user)
 * @returns Array of assets with ownership-adjusted values
 */
export async function getUserRealEstateAssets(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<OwnershipAdjustedAsset[]> {
  try {
    // Fetch assets with related loans and cashflows
    // RLS ensures user can only see their own assets
    const { data: assets, error } = await supabase
      .from('real_estate_assets')
      .select(`
        *,
        real_estate_loans (*),
        real_estate_cashflows (*)
      `)
      .eq('user_id', userId) // Explicit check for defense in depth
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('[getUserRealEstateAssets] Error fetching assets:', error);
      throw new Error(`Failed to fetch assets: ${error.message}`);
    }
    
    if (!assets || assets.length === 0) {
      return [];
    }
    
    // Transform to include ownership-adjusted values
    const result: OwnershipAdjustedAsset[] = assets.map((asset) => {
      const ownershipPercentage = asset.ownership_percentage ?? 100;
      
      // Get loan (there should be at most one per asset, but Supabase returns array)
      const loan = Array.isArray(asset.real_estate_loans) && asset.real_estate_loans.length > 0
        ? asset.real_estate_loans[0]
        : null;
      
      // Get cashflow (there should be at most one per asset, but Supabase returns array)
      const cashflow = Array.isArray(asset.real_estate_cashflows) && asset.real_estate_cashflows.length > 0
        ? asset.real_estate_cashflows[0]
        : null;
      
      // Calculate ownership-adjusted values
      const currentValue = getCurrentValue(asset);
      
      const ownershipAdjusted = {
        purchasePrice: applyOwnership(asset.purchase_price, ownershipPercentage),
        currentValue: applyOwnership(currentValue, ownershipPercentage),
        monthlyRent: applyOwnership(cashflow?.monthly_rent ?? null, ownershipPercentage),
        outstandingBalance: applyOwnership(loan?.outstanding_balance ?? null, ownershipPercentage),
      };
      
      // Clean asset object (remove joined arrays)
      // Type assertion needed because Supabase returns extended type with joins
      const { real_estate_loans: _loans, real_estate_cashflows: _cashflows, ...assetWithoutJoins } = asset;
      const cleanAsset = assetWithoutJoins as RealEstateAsset;
      
      // Return in the specified shape: { asset, loan, cashflow }
      return {
        asset: cleanAsset,
        loan,
        cashflow,
        ownershipAdjusted,
      };
    });
    
    return result;
    
  } catch (error) {
    console.error('[getUserRealEstateAssets] Unexpected error:', error);
    throw error;
  }
}

/**
 * Get Real Estate Asset by ID
 * 
 * Fetches a single asset by ID with:
 * - Ownership validation (must belong to user)
 * - LEFT JOIN loans and cashflows
 * - Throws error if not found or unauthorized
 * 
 * @param supabase - Supabase client (must be authenticated)
 * @param assetId - Asset ID to fetch
 * @param userId - User ID (must match authenticated user)
 * @returns Asset with loan and cashflow
 * @throws Error if asset not found or unauthorized
 */
export async function getRealEstateAssetById(
  supabase: SupabaseClient<Database>,
  assetId: string,
  userId: string
): Promise<OwnershipAdjustedAsset> {
  try {
    // Fetch asset with related loans and cashflows
    // RLS + explicit user_id check ensures ownership
    const { data: asset, error } = await supabase
      .from('real_estate_assets')
      .select(`
        *,
        real_estate_loans (*),
        real_estate_cashflows (*)
      `)
      .eq('id', assetId)
      .eq('user_id', userId) // Ownership validation
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned - asset doesn't exist or doesn't belong to user
        throw new Error('Asset not found or unauthorized');
      }
      
      console.error('[getRealEstateAssetById] Error fetching asset:', error);
      throw new Error(`Failed to fetch asset: ${error.message}`);
    }
    
    if (!asset) {
      throw new Error('Asset not found or unauthorized');
    }
    
    // Get loan (there should be at most one per asset, but Supabase returns array)
    const loan = Array.isArray(asset.real_estate_loans) && asset.real_estate_loans.length > 0
      ? asset.real_estate_loans[0]
      : null;
    
    // Get cashflow (there should be at most one per asset, but Supabase returns array)
    const cashflow = Array.isArray(asset.real_estate_cashflows) && asset.real_estate_cashflows.length > 0
      ? asset.real_estate_cashflows[0]
      : null;
    
    // Calculate ownership-adjusted values
    const ownershipPercentage = asset.ownership_percentage ?? 100;
    const currentValue = getCurrentValue(asset);
    
    const ownershipAdjusted = {
      purchasePrice: applyOwnership(asset.purchase_price, ownershipPercentage),
      currentValue: applyOwnership(currentValue, ownershipPercentage),
      monthlyRent: applyOwnership(cashflow?.monthly_rent ?? null, ownershipPercentage),
      outstandingBalance: applyOwnership(loan?.outstanding_balance ?? null, ownershipPercentage),
    };
    
    // Clean asset object (remove joined arrays)
    // Type assertion needed because Supabase returns extended type with joins
    const { real_estate_loans: _loans, real_estate_cashflows: _cashflows, ...assetWithoutJoins } = asset;
    const cleanAsset = assetWithoutJoins as RealEstateAsset;
    
    return {
      asset: cleanAsset,
      loan,
      cashflow,
      ownershipAdjusted,
    };
    
  } catch (error) {
    // Re-throw with context
    if (error instanceof Error) {
      throw error;
    }
    
    console.error('[getRealEstateAssetById] Unexpected error:', error);
    throw new Error('Failed to fetch asset');
  }
}
