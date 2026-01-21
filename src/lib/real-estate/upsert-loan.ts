/**
 * Real Estate Loan Upsert Functions
 * 
 * Functions to upsert (insert or update) real estate loans.
 * 
 * @module lib/real-estate/upsert-loan
 */

import type { Database } from '@/types/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

type RealEstateLoan = Database['public']['Tables']['real_estate_loans']['Row'];
type RealEstateLoanInsert = Database['public']['Tables']['real_estate_loans']['Insert'];
type RealEstateLoanUpdate = Database['public']['Tables']['real_estate_loans']['Update'];

export interface UpsertRealEstateLoanInput {
  lender_name: string;
  loan_amount: number;
  interest_rate?: number | null;
  emi?: number | null;
  tenure_months?: number | null;
  outstanding_balance?: number | null;
}

/**
 * Upsert Real Estate Loan
 * 
 * Creates or updates a loan for a real estate asset:
 * - If loan exists for asset → UPDATE
 * - If no loan exists → INSERT
 * - updated_at is automatically tracked by database trigger
 * 
 * @param supabase - Supabase client (must be authenticated)
 * @param assetId - Asset ID (must belong to user)
 * @param userId - User ID (must match authenticated user)
 * @param loanData - Loan data to upsert
 * @returns Created or updated loan
 * @throws Error if asset not found, unauthorized, or upsert fails
 */
export async function upsertRealEstateLoan(
  supabase: SupabaseClient<Database>,
  assetId: string,
  userId: string,
  loanData: UpsertRealEstateLoanInput
): Promise<RealEstateLoan> {
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
    
    // Validate loan data
    if (!loanData.lender_name || loanData.lender_name.trim().length < 2) {
      throw new Error('Lender name is required (minimum 2 characters)');
    }
    
    if (!loanData.loan_amount || loanData.loan_amount <= 0) {
      throw new Error('Loan amount must be greater than 0');
    }
    
    if (loanData.interest_rate !== null && loanData.interest_rate !== undefined) {
      if (loanData.interest_rate < 0 || loanData.interest_rate > 100) {
        throw new Error('Interest rate must be between 0 and 100');
      }
    }
    
    if (loanData.emi !== null && loanData.emi !== undefined) {
      if (loanData.emi <= 0) {
        throw new Error('EMI must be greater than 0');
      }
    }
    
    if (loanData.tenure_months !== null && loanData.tenure_months !== undefined) {
      if (loanData.tenure_months <= 0) {
        throw new Error('Tenure must be greater than 0');
      }
    }
    
    // Set default outstanding_balance if not provided
    const outstandingBalance = loanData.outstanding_balance ?? loanData.loan_amount;
    
    if (outstandingBalance < 0) {
      throw new Error('Outstanding balance cannot be negative');
    }
    
    if (outstandingBalance > loanData.loan_amount) {
      throw new Error('Outstanding balance cannot exceed loan amount');
    }
    
    // Check if loan already exists for this asset
    const { data: existingLoan, error: fetchError } = await supabase
      .from('real_estate_loans')
      .select('id')
      .eq('asset_id', assetId)
      .maybeSingle();
    
    if (fetchError && fetchError.code !== 'PGRST116') {
      // PGRST116 means no rows found, which is fine
      console.error('[upsertRealEstateLoan] Error checking existing loan:', fetchError);
      throw new Error(`Failed to check existing loan: ${fetchError.message}`);
    }
    
    if (existingLoan) {
      // UPDATE existing loan
      const updateData: RealEstateLoanUpdate = {
        lender_name: loanData.lender_name,
        loan_amount: loanData.loan_amount,
        interest_rate: loanData.interest_rate ?? null,
        emi: loanData.emi ?? null,
        tenure_months: loanData.tenure_months ?? null,
        outstanding_balance: outstandingBalance,
        // updated_at is automatically updated by database trigger
      };
      
      const { data: updatedLoan, error: updateError } = await supabase
        .from('real_estate_loans')
        .update(updateData)
        .eq('id', existingLoan.id)
        .select()
        .single();
      
      if (updateError || !updatedLoan) {
        console.error('[upsertRealEstateLoan] Error updating loan:', updateError);
        throw new Error(updateError?.message || 'Failed to update loan');
      }
      
      return updatedLoan;
    } else {
      // INSERT new loan
      const insertData: RealEstateLoanInsert = {
        asset_id: assetId,
        lender_name: loanData.lender_name,
        loan_amount: loanData.loan_amount,
        interest_rate: loanData.interest_rate ?? null,
        emi: loanData.emi ?? null,
        tenure_months: loanData.tenure_months ?? null,
        outstanding_balance: outstandingBalance,
      };
      
      const { data: newLoan, error: insertError } = await supabase
        .from('real_estate_loans')
        .insert(insertData)
        .select()
        .single();
      
      if (insertError || !newLoan) {
        console.error('[upsertRealEstateLoan] Error creating loan:', insertError);
        throw new Error(insertError?.message || 'Failed to create loan');
      }
      
      return newLoan;
    }
    
  } catch (error) {
    // Re-throw with context
    if (error instanceof Error) {
      throw error;
    }
    
    console.error('[upsertRealEstateLoan] Unexpected error:', error);
    throw new Error('Failed to upsert loan');
  }
}
