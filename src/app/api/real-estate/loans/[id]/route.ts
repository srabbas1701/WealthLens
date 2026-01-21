/**
 * Real Estate Loans API
 * 
 * Handles update operations for real estate loans.
 * Ownership is verified through asset ownership.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/types/supabase';

type RealEstateLoanUpdate = Database['public']['Tables']['real_estate_loans']['Update'];

// ============================================================================
// PUT: Update loan
// ============================================================================

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const loanId = params.id;
    const body = await request.json();
    
    // First, verify loan belongs to user's asset
    const { data: loan, error: fetchError } = await supabase
      .from('real_estate_loans')
      .select(`
        *,
        real_estate_assets!inner (
          id,
          user_id
        )
      `)
      .eq('id', loanId)
      .eq('real_estate_assets.user_id', user.id) // Verify ownership
      .single();
    
    if (fetchError || !loan) {
      return NextResponse.json(
        { success: false, error: 'Loan not found or unauthorized' },
        { status: 404 }
      );
    }
    
    // Prepare update data
    const updateData: RealEstateLoanUpdate = {};
    
    if (body.lender_name !== undefined) updateData.lender_name = body.lender_name;
    if (body.loan_amount !== undefined) updateData.loan_amount = body.loan_amount;
    if (body.interest_rate !== undefined) updateData.interest_rate = body.interest_rate;
    if (body.emi !== undefined) updateData.emi = body.emi;
    if (body.tenure_months !== undefined) updateData.tenure_months = body.tenure_months;
    if (body.outstanding_balance !== undefined) updateData.outstanding_balance = body.outstanding_balance;
    
    // Validate outstanding balance
    if (updateData.outstanding_balance !== undefined && updateData.loan_amount !== undefined) {
      if (updateData.outstanding_balance > updateData.loan_amount) {
        return NextResponse.json(
          { success: false, error: 'Outstanding balance cannot exceed loan amount' },
          { status: 400 }
        );
      }
    } else if (updateData.outstanding_balance !== undefined && loan.loan_amount) {
      if (updateData.outstanding_balance > loan.loan_amount) {
        return NextResponse.json(
          { success: false, error: 'Outstanding balance cannot exceed loan amount' },
          { status: 400 }
        );
      }
    }
    
    // Update loan (RLS ensures user can only update loans for their assets)
    const { data: updatedLoan, error: updateError } = await supabase
      .from('real_estate_loans')
      .update(updateData)
      .eq('id', loanId)
      .select()
      .single();
    
    if (updateError || !updatedLoan) {
      console.error('[Real Estate API] Error updating loan:', updateError);
      return NextResponse.json(
        { success: false, error: updateError?.message || 'Failed to update loan' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: updatedLoan,
    });
    
  } catch (error) {
    console.error('[Real Estate API] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================================================
// DELETE: Delete loan
// ============================================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const loanId = params.id;
    
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
      .eq('real_estate_assets.user_id', user.id)
      .single();
    
    if (fetchError || !loan) {
      return NextResponse.json(
        { success: false, error: 'Loan not found or unauthorized' },
        { status: 404 }
      );
    }
    
    // Delete loan
    const { error: deleteError } = await supabase
      .from('real_estate_loans')
      .delete()
      .eq('id', loanId);
    
    if (deleteError) {
      console.error('[Real Estate API] Error deleting loan:', deleteError);
      return NextResponse.json(
        { success: false, error: 'Failed to delete loan' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Loan deleted successfully',
    });
    
  } catch (error) {
    console.error('[Real Estate API] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
