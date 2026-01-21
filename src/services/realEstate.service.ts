/**
 * Real Estate Service
 * 
 * Production-ready service layer for Real Estate operations.
 * Provides clean, type-safe functions for all real estate-related functionality.
 * 
 * @module services/realEstate.service
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

// Import core functions
import { getUserRealEstateAssets, getRealEstateAssetById } from '@/lib/real-estate/get-assets';
import { createRealEstateAsset } from '@/lib/real-estate/create-asset';
import { updateRealEstateAsset } from '@/lib/real-estate/update-asset';
import { upsertRealEstateLoan } from '@/lib/real-estate/upsert-loan';
import { upsertRealEstateCashflow } from '@/lib/real-estate/upsert-cashflow';

// Re-export types for convenience
export type { OwnershipAdjustedAsset } from '@/lib/real-estate/get-assets';
export type { CreateRealEstateAssetInput, CreateRealEstateAssetResult } from '@/lib/real-estate/create-asset';
export type { UpdateRealEstateAssetInput } from '@/lib/real-estate/update-asset';
export type { UpsertRealEstateLoanInput } from '@/lib/real-estate/upsert-loan';
export type { UpsertRealEstateCashflowInput } from '@/lib/real-estate/upsert-cashflow';

// Type aliases for cleaner signatures
type SupabaseClientType = SupabaseClient<Database>;
type UserId = string;
type AssetId = string;
type LoanId = string;
type CashflowId = string;

// ============================================================================
// Asset Operations
// ============================================================================

/**
 * Get all real estate assets for the authenticated user.
 * 
 * Returns assets with:
 * - LEFT JOIN loans and cashflows
 * - Ownership-adjusted values (purchase price, current value, rent, loan balance)
 * - Sorted by created_at descending (newest first)
 * 
 * @param supabase - Authenticated Supabase client
 * @param userId - User ID (must match authenticated user)
 * @returns Array of assets with ownership-adjusted values
 * @throws Error if fetch fails
 * 
 * @example
 * ```typescript
 * const supabase = await createServerClient();
 * const { data: { user } } = await supabase.auth.getUser();
 * const assets = await getAllRealEstateAssets(supabase, user.id);
 * ```
 */
export async function getAllRealEstateAssets(
  supabase: SupabaseClientType,
  userId: UserId
): Promise<import('@/lib/real-estate/get-assets').OwnershipAdjustedAsset[]> {
  return getUserRealEstateAssets(supabase, userId);
}

/**
 * Get a single real estate asset by ID.
 * 
 * Validates ownership before returning:
 * - Asset must belong to the authenticated user
 * - Returns null if not found or unauthorized
 * 
 * Includes:
 * - Related loan (if exists)
 * - Related cashflow (if exists)
 * - Ownership-adjusted values
 * 
 * @param supabase - Authenticated Supabase client
 * @param assetId - Asset ID to fetch
 * @param userId - User ID (must match authenticated user)
 * @returns Asset with loan and cashflow, or null if not found
 * @throws Error if fetch fails or asset is unauthorized
 * 
 * @example
 * ```typescript
 * const asset = await getRealEstateAssetById(supabase, assetId, user.id);
 * if (!asset) {
 *   // Handle not found
 * }
 * ```
 */
export async function getRealEstateAssetById(
  supabase: SupabaseClientType,
  assetId: AssetId,
  userId: UserId
): Promise<import('@/lib/real-estate/get-assets').OwnershipAdjustedAsset> {
  return getRealEstateAssetById(supabase, assetId, userId);
}

/**
 * Create a new real estate asset with optional loan and cashflow.
 * 
 * Uses transaction-like pattern:
 * 1. Insert asset
 * 2. If successful, insert loan (if provided)
 * 3. If successful, insert cashflow (if provided)
 * 4. If any insert fails, rollback by deleting created records
 * 
 * Required fields:
 * - property_nickname
 * - property_type (residential | commercial | land)
 * - property_status (ready | under_construction)
 * 
 * @param supabase - Authenticated Supabase client
 * @param userId - User ID (must match authenticated user)
 * @param input - Asset creation data (user_id will be set automatically)
 * @returns Result object with success flag and created asset data
 * 
 * @example
 * ```typescript
 * const result = await createRealEstateAsset(supabase, user.id, {
 *   property_nickname: '2BHK Apartment',
 *   property_type: 'residential',
 *   property_status: 'ready',
 *   purchase_price: 7000000,
 *   loan: { lender_name: 'HDFC', loan_amount: 5000000 },
 *   cashflow: { rental_status: 'rented', monthly_rent: 50000 }
 * });
 * 
 * if (!result.success) {
 *   // Handle error
 * }
 * ```
 */
export async function createRealEstateAsset(
  supabase: SupabaseClientType,
  userId: UserId,
  input: Omit<import('@/lib/real-estate/create-asset').CreateRealEstateAssetInput, 'user_id'>
): Promise<import('@/lib/real-estate/create-asset').CreateRealEstateAssetResult> {
  return createRealEstateAsset(supabase, {
    ...input,
    user_id: userId, // Automatically set from authenticated user
  });
}

/**
 * Update an existing real estate asset.
 * 
 * Allowed updates:
 * - property_nickname
 * - user_override_value
 * - ownership_percentage
 * - address
 * - carpet_area_sqft
 * - builtup_area_sqft
 * 
 * Protection rules:
 * - Does NOT overwrite system_estimated_min/max (valuation service only)
 * - Validates ownership before update
 * - updated_at is automatically updated by database trigger
 * 
 * @param supabase - Authenticated Supabase client
 * @param assetId - Asset ID to update
 * @param userId - User ID (must match authenticated user)
 * @param updates - Fields to update (partial update supported)
 * @returns Updated asset
 * @throws Error if asset not found, unauthorized, validation fails, or update fails
 * 
 * @example
 * ```typescript
 * const updated = await updateRealEstateAsset(supabase, assetId, user.id, {
 *   property_nickname: 'Updated Name',
 *   user_override_value: 9200000,
 *   ownership_percentage: 80
 * });
 * ```
 */
export async function updateRealEstateAsset(
  supabase: SupabaseClientType,
  assetId: AssetId,
  userId: UserId,
  updates: import('@/lib/real-estate/update-asset').UpdateRealEstateAssetInput
): Promise<Database['public']['Tables']['real_estate_assets']['Row']> {
  return updateRealEstateAsset(supabase, assetId, userId, updates);
}

/**
 * Delete a real estate asset.
 * 
 * Cascades to related records:
 * - Deletes all loans for the asset (via FK CASCADE)
 * - Deletes all cashflows for the asset (via FK CASCADE)
 * 
 * @param supabase - Authenticated Supabase client
 * @param assetId - Asset ID to delete
 * @param userId - User ID (must match authenticated user)
 * @throws Error if asset not found, unauthorized, or delete fails
 * 
 * @example
 * ```typescript
 * await deleteRealEstateAsset(supabase, assetId, user.id);
 * ```
 */
export async function deleteRealEstateAsset(
  supabase: SupabaseClientType,
  assetId: AssetId,
  userId: UserId
): Promise<void> {
  // Verify ownership first
  const { data: asset, error: fetchError } = await supabase
    .from('real_estate_assets')
    .select('id, user_id')
    .eq('id', assetId)
    .eq('user_id', userId) // Ownership validation
    .single();

  if (fetchError || !asset) {
    if (fetchError?.code === 'PGRST116') {
      throw new Error('Asset not found or unauthorized');
    }
    throw new Error(`Failed to verify ownership: ${fetchError?.message || 'Unknown error'}`);
  }

  // Delete asset (cascades to loans and cashflows)
  const { error: deleteError } = await supabase
    .from('real_estate_assets')
    .delete()
    .eq('id', assetId)
    .eq('user_id', userId); // Defense in depth

  if (deleteError) {
    throw new Error(`Failed to delete asset: ${deleteError.message}`);
  }
}

// ============================================================================
// Loan Operations
// ============================================================================

/**
 * Upsert (insert or update) a loan for a real estate asset.
 * 
 * Behavior:
 * - If loan exists for asset → UPDATE existing loan
 * - If no loan exists → INSERT new loan
 * - Only one loan per asset (takes first if multiple exist)
 * 
 * Validation:
 * - Asset must belong to user
 * - lender_name: min 2 characters
 * - loan_amount: > 0
 * - outstanding_balance: >= 0, <= loan_amount (defaults to loan_amount if not provided)
 * - interest_rate: 0-100 (if provided)
 * - emi, tenure_months: > 0 (if provided)
 * 
 * @param supabase - Authenticated Supabase client
 * @param assetId - Asset ID (must belong to user)
 * @param userId - User ID (must match authenticated user)
 * @param loanData - Loan data to upsert
 * @returns Created or updated loan
 * @throws Error if asset not found, unauthorized, validation fails, or upsert fails
 * 
 * @example
 * ```typescript
 * // First time: Creates loan
 * const loan = await upsertRealEstateLoan(supabase, assetId, user.id, {
 *   lender_name: 'HDFC Bank',
 *   loan_amount: 5000000,
 *   outstanding_balance: 5000000
 * });
 * 
 * // Later: Updates existing loan
 * const updated = await upsertRealEstateLoan(supabase, assetId, user.id, {
 *   lender_name: 'HDFC Bank',
 *   loan_amount: 5000000,
 *   outstanding_balance: 3800000 // Updated balance
 * });
 * ```
 */
export async function upsertRealEstateLoan(
  supabase: SupabaseClientType,
  assetId: AssetId,
  userId: UserId,
  loanData: import('@/lib/real-estate/upsert-loan').UpsertRealEstateLoanInput
): Promise<Database['public']['Tables']['real_estate_loans']['Row']> {
  return upsertRealEstateLoan(supabase, assetId, userId, loanData);
}

/**
 * Delete a loan.
 * 
 * @param supabase - Authenticated Supabase client
 * @param loanId - Loan ID to delete
 * @param userId - User ID (must match authenticated user)
 * @throws Error if loan not found, unauthorized, or delete fails
 * 
 * @example
 * ```typescript
 * await deleteRealEstateLoan(supabase, loanId, user.id);
 * ```
 */
export async function deleteRealEstateLoan(
  supabase: SupabaseClientType,
  loanId: LoanId,
  userId: UserId
): Promise<void> {
  // Verify loan belongs to user's asset
  const { data: loan, error: fetchError } = await supabase
    .from('real_estate_loans')
    .select(`
      id,
      real_estate_assets!inner (
        id,
        user_id
      )
    `)
    .eq('id', loanId)
    .eq('real_estate_assets.user_id', userId) // Ownership validation
    .single();

  if (fetchError || !loan) {
    if (fetchError?.code === 'PGRST116') {
      throw new Error('Loan not found or unauthorized');
    }
    throw new Error(`Failed to verify ownership: ${fetchError?.message || 'Unknown error'}`);
  }

  // Delete loan
  const { error: deleteError } = await supabase
    .from('real_estate_loans')
    .delete()
    .eq('id', loanId);

  if (deleteError) {
    throw new Error(`Failed to delete loan: ${deleteError.message}`);
  }
}

// ============================================================================
// Cashflow Operations
// ============================================================================

/**
 * Upsert (insert or update) a cashflow for a real estate asset.
 * 
 * Behavior:
 * - If cashflow exists for asset → UPDATE existing cashflow
 * - If no cashflow exists → INSERT new cashflow
 * - Only one cashflow per asset (takes first if multiple exist)
 * 
 * Rental Status Validation:
 * - If rental_status === 'rented': monthly_rent must be > 0
 * - If rental_status === 'self_occupied' or 'vacant': monthly_rent should be null or 0
 * 
 * Status Transitions:
 * - All transitions are allowed (vacant ↔ rented ↔ self_occupied)
 * - Transition is tracked for audit purposes
 * 
 * @param supabase - Authenticated Supabase client
 * @param assetId - Asset ID (must belong to user)
 * @param userId - User ID (must match authenticated user)
 * @param cashflowData - Cashflow data to upsert
 * @returns Created or updated cashflow
 * @throws Error if asset not found, unauthorized, validation fails, or upsert fails
 * 
 * @example
 * ```typescript
 * // Create cashflow for rented property
 * const cashflow = await upsertRealEstateCashflow(supabase, assetId, user.id, {
 *   rental_status: 'rented',
 *   monthly_rent: 50000,
 *   rent_start_date: '2024-01-15',
 *   maintenance_monthly: 5000
 * });
 * 
 * // Update to vacant (tenant left)
 * const updated = await upsertRealEstateCashflow(supabase, assetId, user.id, {
 *   rental_status: 'vacant',
 *   monthly_rent: null
 * });
 * ```
 */
export async function upsertRealEstateCashflow(
  supabase: SupabaseClientType,
  assetId: AssetId,
  userId: UserId,
  cashflowData: import('@/lib/real-estate/upsert-cashflow').UpsertRealEstateCashflowInput
): Promise<Database['public']['Tables']['real_estate_cashflows']['Row']> {
  return upsertRealEstateCashflow(supabase, assetId, userId, cashflowData);
}

/**
 * Delete a cashflow.
 * 
 * @param supabase - Authenticated Supabase client
 * @param cashflowId - Cashflow ID to delete
 * @param userId - User ID (must match authenticated user)
 * @throws Error if cashflow not found, unauthorized, or delete fails
 * 
 * @example
 * ```typescript
 * await deleteRealEstateCashflow(supabase, cashflowId, user.id);
 * ```
 */
export async function deleteRealEstateCashflow(
  supabase: SupabaseClientType,
  cashflowId: CashflowId,
  userId: UserId
): Promise<void> {
  // Verify cashflow belongs to user's asset
  const { data: cashflow, error: fetchError } = await supabase
    .from('real_estate_cashflows')
    .select(`
      id,
      real_estate_assets!inner (
        id,
        user_id
      )
    `)
    .eq('id', cashflowId)
    .eq('real_estate_assets.user_id', userId) // Ownership validation
    .single();

  if (fetchError || !cashflow) {
    if (fetchError?.code === 'PGRST116') {
      throw new Error('Cashflow not found or unauthorized');
    }
    throw new Error(`Failed to verify ownership: ${fetchError?.message || 'Unknown error'}`);
  }

  // Delete cashflow
  const { error: deleteError } = await supabase
    .from('real_estate_cashflows')
    .delete()
    .eq('id', cashflowId);

  if (deleteError) {
    throw new Error(`Failed to delete cashflow: ${deleteError.message}`);
  }
}

// ============================================================================
// Valuation Operations
// ============================================================================

/**
 * Update user override value for an asset's valuation.
 * 
 * Priority order for valuation:
 * 1. user_override_value (if set)
 * 2. Midpoint of system_estimated_min and system_estimated_max
 * 3. purchase_price (fallback)
 * 
 * Protection:
 * - Does NOT overwrite system_estimated_min/max
 * - Automatically updates valuation_last_updated timestamp
 * 
 * @param supabase - Authenticated Supabase client
 * @param assetId - Asset ID
 * @param userId - User ID (must match authenticated user)
 * @param userOverrideValue - New override value (null to clear override)
 * @returns Updated asset
 * @throws Error if asset not found, unauthorized, validation fails, or update fails
 * 
 * @example
 * ```typescript
 * // Set override value
 * const asset = await updateValuation(supabase, assetId, user.id, 9200000);
 * 
 * // Clear override (use system estimate)
 * const asset = await updateValuation(supabase, assetId, user.id, null);
 * ```
 */
export async function updateValuation(
  supabase: SupabaseClientType,
  assetId: AssetId,
  userId: UserId,
  userOverrideValue: number | null
): Promise<Database['public']['Tables']['real_estate_assets']['Row']> {
  // Validate value if provided
  if (userOverrideValue !== null && userOverrideValue <= 0) {
    throw new Error('User override value must be a positive number');
  }

  // Verify ownership
  const { data: existingAsset, error: fetchError } = await supabase
    .from('real_estate_assets')
    .select('id, user_id, user_override_value')
    .eq('id', assetId)
    .eq('user_id', userId) // Ownership validation
    .single();

  if (fetchError || !existingAsset) {
    if (fetchError?.code === 'PGRST116') {
      throw new Error('Asset not found or unauthorized');
    }
    throw new Error(`Failed to verify ownership: ${fetchError?.message || 'Unknown error'}`);
  }

  // Update valuation
  const { data: updatedAsset, error: updateError } = await supabase
    .from('real_estate_assets')
    .update({
      user_override_value: userOverrideValue,
      valuation_last_updated: new Date().toISOString(), // Update timestamp
    })
    .eq('id', assetId)
    .eq('user_id', userId) // Defense in depth
    .select()
    .single();

  if (updateError || !updatedAsset) {
    throw new Error(updateError?.message || 'Failed to update valuation');
  }

  return updatedAsset;
}
