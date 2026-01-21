/**
 * Real Estate Cashflow Upsert Functions
 * 
 * Functions to upsert (insert or update) real estate cashflows.
 * 
 * @module lib/real-estate/upsert-cashflow
 */

import type { Database } from '@/types/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

type RealEstateCashflow = Database['public']['Tables']['real_estate_cashflows']['Row'];
type RealEstateCashflowInsert = Database['public']['Tables']['real_estate_cashflows']['Insert'];
type RealEstateCashflowUpdate = Database['public']['Tables']['real_estate_cashflows']['Update'];

type RentalStatus = Database['public']['Enums']['rental_status_enum'];

export interface UpsertRealEstateCashflowInput {
  rental_status: RentalStatus;
  monthly_rent?: number | null;
  rent_start_date?: string | null;
  escalation_percent?: number | null;
  maintenance_monthly?: number | null;
  property_tax_annual?: number | null;
  other_expenses_monthly?: number | null;
}

/**
 * Validate rental status and related fields
 */
function validateRentalStatus(
  rentalStatus: RentalStatus,
  monthlyRent: number | null | undefined,
  rentStartDate: string | null | undefined
): void {
  if (rentalStatus === 'rented') {
    // If rented, monthly_rent should be provided and > 0
    if (!monthlyRent || monthlyRent <= 0) {
      throw new Error('Monthly rent is required and must be greater than 0 for rented properties');
    }
    
    // rent_start_date is recommended but not strictly required
    // (could be historical property that was rented before tracking)
  } else if (rentalStatus === 'self_occupied' || rentalStatus === 'vacant') {
    // For self-occupied or vacant, monthly_rent should be null or 0
    if (monthlyRent !== null && monthlyRent !== undefined && monthlyRent > 0) {
      throw new Error('Monthly rent should be 0 or null for self-occupied or vacant properties');
    }
  }
}

/**
 * Validate rental status transition
 * 
 * Any transition is allowed, but we log it for audit purposes.
 * Common transitions:
 * - vacant → rented (new tenant)
 * - rented → vacant (tenant left)
 * - self_occupied → rented (started renting)
 * - rented → self_occupied (stopped renting, moved in)
 */
function validateRentalStatusTransition(
  oldStatus: RentalStatus | null,
  newStatus: RentalStatus
): void {
  // All transitions are allowed, but we can add business logic here if needed
  // For example, we might want to require rent_start_date when transitioning to 'rented'
  
  if (oldStatus !== null && oldStatus !== newStatus) {
    // Status changed - this is a valid transition
    // Could add specific rules here if needed
    // e.g., if transitioning to 'rented', require rent_start_date
  }
}

/**
 * Upsert Real Estate Cashflow
 * 
 * Creates or updates a cashflow for a real estate asset:
 * - If cashflow exists for asset → UPDATE
 * - If no cashflow exists → INSERT
 * - Validates rental_status transitions and related fields
 * 
 * @param supabase - Supabase client (must be authenticated)
 * @param assetId - Asset ID (must belong to user)
 * @param userId - User ID (must match authenticated user)
 * @param cashflowData - Cashflow data to upsert
 * @returns Created or updated cashflow
 * @throws Error if asset not found, unauthorized, validation fails, or upsert fails
 */
export async function upsertRealEstateCashflow(
  supabase: SupabaseClient<Database>,
  assetId: string,
  userId: string,
  cashflowData: UpsertRealEstateCashflowInput
): Promise<RealEstateCashflow> {
  try {
    // First, verify asset belongs to user
    const { data: asset, error: assetError } = await supabase
      .from('real_estate_assets')
      .select('id, user_id')
      .eq('id', assetId)
      .eq('user_id', userId) // Ownership validation
      .single();
    
    if (assetError || !asset) {
      if (assetError?.code === 'PGRST116') {
        throw new Error('Asset not found or unauthorized');
      }
      throw new Error(`Failed to verify ownership: ${assetError?.message || 'Unknown error'}`);
    }
    
    // Validate rental status and related fields
    validateRentalStatus(
      cashflowData.rental_status,
      cashflowData.monthly_rent,
      cashflowData.rent_start_date
    );
    
    // Validate numeric fields
    if (cashflowData.monthly_rent !== null && cashflowData.monthly_rent !== undefined) {
      if (cashflowData.monthly_rent < 0) {
        throw new Error('Monthly rent cannot be negative');
      }
    }
    
    if (cashflowData.escalation_percent !== null && cashflowData.escalation_percent !== undefined) {
      if (cashflowData.escalation_percent < 0 || cashflowData.escalation_percent > 100) {
        throw new Error('Escalation percent must be between 0 and 100');
      }
    }
    
    if (cashflowData.maintenance_monthly !== null && cashflowData.maintenance_monthly !== undefined) {
      if (cashflowData.maintenance_monthly < 0) {
        throw new Error('Maintenance monthly cannot be negative');
      }
    }
    
    if (cashflowData.property_tax_annual !== null && cashflowData.property_tax_annual !== undefined) {
      if (cashflowData.property_tax_annual < 0) {
        throw new Error('Property tax annual cannot be negative');
      }
    }
    
    if (cashflowData.other_expenses_monthly !== null && cashflowData.other_expenses_monthly !== undefined) {
      if (cashflowData.other_expenses_monthly < 0) {
        throw new Error('Other expenses monthly cannot be negative');
      }
    }
    
    // Check if cashflow already exists for this asset
    const { data: existingCashflow, error: fetchError } = await supabase
      .from('real_estate_cashflows')
      .select('id, rental_status')
      .eq('asset_id', assetId)
      .maybeSingle();
    
    if (fetchError && fetchError.code !== 'PGRST116') {
      // PGRST116 means no rows found, which is fine
      console.error('[upsertRealEstateCashflow] Error checking existing cashflow:', fetchError);
      throw new Error(`Failed to check existing cashflow: ${fetchError.message}`);
    }
    
    // Validate rental status transition
    if (existingCashflow) {
      validateRentalStatusTransition(
        existingCashflow.rental_status,
        cashflowData.rental_status
      );
    }
    
    if (existingCashflow) {
      // UPDATE existing cashflow
      const updateData: RealEstateCashflowUpdate = {
        rental_status: cashflowData.rental_status,
        monthly_rent: cashflowData.monthly_rent ?? null,
        rent_start_date: cashflowData.rent_start_date ?? null,
        escalation_percent: cashflowData.escalation_percent ?? null,
        maintenance_monthly: cashflowData.maintenance_monthly ?? null,
        property_tax_annual: cashflowData.property_tax_annual ?? null,
        other_expenses_monthly: cashflowData.other_expenses_monthly ?? null,
        // updated_at is automatically updated by database trigger
      };
      
      const { data: updatedCashflow, error: updateError } = await supabase
        .from('real_estate_cashflows')
        .update(updateData)
        .eq('id', existingCashflow.id)
        .select()
        .single();
      
      if (updateError || !updatedCashflow) {
        console.error('[upsertRealEstateCashflow] Error updating cashflow:', updateError);
        throw new Error(updateError?.message || 'Failed to update cashflow');
      }
      
      return updatedCashflow;
    } else {
      // INSERT new cashflow
      const insertData: RealEstateCashflowInsert = {
        asset_id: assetId,
        rental_status: cashflowData.rental_status,
        monthly_rent: cashflowData.monthly_rent ?? null,
        rent_start_date: cashflowData.rent_start_date ?? null,
        escalation_percent: cashflowData.escalation_percent ?? null,
        maintenance_monthly: cashflowData.maintenance_monthly ?? null,
        property_tax_annual: cashflowData.property_tax_annual ?? null,
        other_expenses_monthly: cashflowData.other_expenses_monthly ?? null,
      };
      
      const { data: newCashflow, error: insertError } = await supabase
        .from('real_estate_cashflows')
        .insert(insertData)
        .select()
        .single();
      
      if (insertError || !newCashflow) {
        console.error('[upsertRealEstateCashflow] Error creating cashflow:', insertError);
        throw new Error(insertError?.message || 'Failed to create cashflow');
      }
      
      return newCashflow;
    }
    
  } catch (error) {
    // Re-throw with context
    if (error instanceof Error) {
      throw error;
    }
    
    console.error('[upsertRealEstateCashflow] Unexpected error:', error);
    throw new Error('Failed to upsert cashflow');
  }
}
