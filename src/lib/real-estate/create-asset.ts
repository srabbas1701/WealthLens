/**
 * Real Estate Asset Creation Function
 * 
 * Creates a real estate asset with optional loan and cashflow in a transaction-like manner.
 * Uses manual rollback if any insert fails.
 * 
 * @module lib/real-estate/create-asset
 */

import type { Database } from '@/types/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

type RealEstateAssetInsert = Database['public']['Tables']['real_estate_assets']['Insert'];
type RealEstateLoanInsert = Database['public']['Tables']['real_estate_loans']['Insert'];
type RealEstateCashflowInsert = Database['public']['Tables']['real_estate_cashflows']['Insert'];

export interface CreateRealEstateAssetInput {
  // Asset fields
  user_id: string;
  property_nickname: string;
  property_type: Database['public']['Enums']['property_type_enum'];
  property_status: Database['public']['Enums']['property_status_enum'];
  purchase_price?: number | null;
  purchase_date?: string | null;
  registration_value?: number | null;
  ownership_percentage?: number | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  address?: string | null;
  project_name?: string | null;
  builder_name?: string | null;
  rera_number?: string | null;
  carpet_area_sqft?: number | null;
  builtup_area_sqft?: number | null;
  user_override_value?: number | null;
  system_estimated_min?: number | null;
  system_estimated_max?: number | null;
  valuation_last_updated?: string | null;
  
  // Optional loan
  loan?: {
    lender_name: string;
    loan_amount: number;
    interest_rate?: number | null;
    emi?: number | null;
    tenure_months?: number | null;
    outstanding_balance?: number | null;
  } | null;
  
  // Optional cashflow
  cashflow?: {
    rental_status: Database['public']['Enums']['rental_status_enum'];
    monthly_rent?: number | null;
    rent_start_date?: string | null;
    escalation_percent?: number | null;
    maintenance_monthly?: number | null;
    property_tax_annual?: number | null;
    other_expenses_monthly?: number | null;
  } | null;
}

export interface CreateRealEstateAssetResult {
  success: boolean;
  data?: Database['public']['Tables']['real_estate_assets']['Row'] & {
    real_estate_loans: Database['public']['Tables']['real_estate_loans']['Row'][];
    real_estate_cashflows: Database['public']['Tables']['real_estate_cashflows']['Row'][];
  };
  error?: string;
  rollbackPerformed?: boolean;
}

/**
 * Create Real Estate Asset with optional loan and cashflow
 * 
 * Uses a transaction-like pattern:
 * 1. Insert asset
 * 2. If successful, insert loan (if provided)
 * 3. If successful, insert cashflow (if provided)
 * 4. If any insert fails, rollback by deleting asset
 * 5. Return complete asset with joins
 * 
 * @param supabase - Supabase client (must be authenticated)
 * @param input - Asset creation data
 * @returns Complete asset object with related loans and cashflows
 */
export async function createRealEstateAsset(
  supabase: SupabaseClient<Database>,
  input: CreateRealEstateAssetInput
): Promise<CreateRealEstateAssetResult> {
  let assetId: string | null = null;
  let rollbackPerformed = false;
  
  try {
    // Validate required fields
    if (!input.property_nickname || !input.property_type || !input.property_status) {
      return {
        success: false,
        error: 'Missing required fields: property_nickname, property_type, property_status',
      };
    }
    
    // Validate user_id matches authenticated user (if using createClient)
    // Note: This function assumes the supabase client is already authenticated
    // and RLS will enforce ownership
    
    // ========================================================================
    // Step 1: Insert Asset
    // ========================================================================
    
    const assetInsert: RealEstateAssetInsert = {
      user_id: input.user_id,
      property_nickname: input.property_nickname,
      property_type: input.property_type,
      property_status: input.property_status,
      purchase_price: input.purchase_price ?? null,
      purchase_date: input.purchase_date ?? null,
      registration_value: input.registration_value ?? null,
      ownership_percentage: input.ownership_percentage ?? 100,
      city: input.city ?? null,
      state: input.state ?? null,
      pincode: input.pincode ?? null,
      address: input.address ?? null,
      project_name: input.project_name ?? null,
      builder_name: input.builder_name ?? null,
      rera_number: input.rera_number ?? null,
      carpet_area_sqft: input.carpet_area_sqft ?? null,
      builtup_area_sqft: input.builtup_area_sqft ?? null,
      user_override_value: input.user_override_value ?? null,
      system_estimated_min: input.system_estimated_min ?? null,
      system_estimated_max: input.system_estimated_max ?? null,
      valuation_last_updated: input.valuation_last_updated ?? null,
    };
    
    const { data: asset, error: assetError } = await supabase
      .from('real_estate_assets')
      .insert(assetInsert)
      .select()
      .single();
    
    if (assetError || !asset) {
      return {
        success: false,
        error: assetError?.message || 'Failed to create asset',
      };
    }
    
    assetId = asset.id;
    
    // ========================================================================
    // Step 2: Insert Loan (if provided)
    // ========================================================================
    
    if (input.loan && input.loan.lender_name && input.loan.loan_amount) {
      const loanInsert: RealEstateLoanInsert = {
        asset_id: asset.id,
        lender_name: input.loan.lender_name,
        loan_amount: input.loan.loan_amount,
        interest_rate: input.loan.interest_rate ?? null,
        emi: input.loan.emi ?? null,
        tenure_months: input.loan.tenure_months ?? null,
        outstanding_balance: input.loan.outstanding_balance ?? input.loan.loan_amount,
      };
      
      const { error: loanError } = await supabase
        .from('real_estate_loans')
        .insert(loanInsert);
      
      if (loanError) {
        // Rollback: Delete asset
        await supabase
          .from('real_estate_assets')
          .delete()
          .eq('id', asset.id);
        
        rollbackPerformed = true;
        
        return {
          success: false,
          error: `Failed to create loan: ${loanError.message}`,
          rollbackPerformed: true,
        };
      }
    }
    
    // ========================================================================
    // Step 3: Insert Cashflow (if provided)
    // ========================================================================
    
    if (input.cashflow && input.cashflow.rental_status) {
      // Validate: If rented, monthly_rent should be provided
      if (input.cashflow.rental_status === 'rented') {
        if (!input.cashflow.monthly_rent || input.cashflow.monthly_rent <= 0) {
          // Rollback: Delete asset and loan
          await supabase
            .from('real_estate_loans')
            .delete()
            .eq('asset_id', asset.id);
          
          await supabase
            .from('real_estate_assets')
            .delete()
            .eq('id', asset.id);
          
          rollbackPerformed = true;
          
          return {
            success: false,
            error: 'Monthly rent is required for rented properties',
            rollbackPerformed: true,
          };
        }
      }
      
      const cashflowInsert: RealEstateCashflowInsert = {
        asset_id: asset.id,
        rental_status: input.cashflow.rental_status,
        monthly_rent: input.cashflow.monthly_rent ?? null,
        rent_start_date: input.cashflow.rent_start_date ?? null,
        escalation_percent: input.cashflow.escalation_percent ?? null,
        maintenance_monthly: input.cashflow.maintenance_monthly ?? null,
        property_tax_annual: input.cashflow.property_tax_annual ?? null,
        other_expenses_monthly: input.cashflow.other_expenses_monthly ?? null,
      };
      
      const { error: cashflowError } = await supabase
        .from('real_estate_cashflows')
        .insert(cashflowInsert);
      
      if (cashflowError) {
        // Rollback: Delete loan and asset
        await supabase
          .from('real_estate_loans')
          .delete()
          .eq('asset_id', asset.id);
        
        await supabase
          .from('real_estate_assets')
          .delete()
          .eq('id', asset.id);
        
        rollbackPerformed = true;
        
        return {
          success: false,
          error: `Failed to create cashflow: ${cashflowError.message}`,
          rollbackPerformed: true,
        };
      }
    }
    
    // ========================================================================
    // Step 4: Fetch Complete Asset with Relations
    // ========================================================================
    
    const { data: completeAsset, error: fetchError } = await supabase
      .from('real_estate_assets')
      .select(`
        *,
        real_estate_loans (*),
        real_estate_cashflows (*)
      `)
      .eq('id', asset.id)
      .single();
    
    if (fetchError || !completeAsset) {
      // This shouldn't happen, but if it does, return the asset without relations
      return {
        success: true,
        data: {
          ...asset,
          real_estate_loans: [],
          real_estate_cashflows: [],
        },
      };
    }
    
    return {
      success: true,
      data: completeAsset,
    };
    
  } catch (error) {
    // Unexpected error - attempt rollback if asset was created
    if (assetId) {
      try {
        await supabase
          .from('real_estate_loans')
          .delete()
          .eq('asset_id', assetId);
        
        await supabase
          .from('real_estate_cashflows')
          .delete()
          .eq('asset_id', assetId);
        
        await supabase
          .from('real_estate_assets')
          .delete()
          .eq('id', assetId);
        
        rollbackPerformed = true;
      } catch (rollbackError) {
        console.error('[createRealEstateAsset] Rollback failed:', rollbackError);
      }
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      rollbackPerformed,
    };
  }
}
