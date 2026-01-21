/**
 * Real Estate Loan Outstanding Balance API
 * 
 * Handles updates to loan outstanding balance.
 * Tracks previous and new values for audit purposes.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// ============================================================================
// PUT: Update outstanding balance
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
    
    // Validate outstanding balance
    if (body.outstanding_balance === undefined || body.outstanding_balance === null) {
      return NextResponse.json(
        { success: false, error: 'Outstanding balance is required' },
        { status: 400 }
      );
    }
    
    if (typeof body.outstanding_balance !== 'number' || body.outstanding_balance < 0) {
      return NextResponse.json(
        { success: false, error: 'Outstanding balance must be a non-negative number' },
        { status: 400 }
      );
    }
    
    // Verify loan belongs to user's asset and get current balance
    const { data: loan, error: fetchError } = await supabase
      .from('real_estate_loans')
      .select(`
        id,
        outstanding_balance,
        loan_amount,
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
    
    // Validate outstanding balance doesn't exceed loan amount
    if (body.outstanding_balance > loan.loan_amount) {
      return NextResponse.json(
        { success: false, error: 'Outstanding balance cannot exceed loan amount' },
        { status: 400 }
      );
    }
    
    const previousBalance = loan.outstanding_balance;
    
    // Update outstanding balance
    const { data: updatedLoan, error: updateError } = await supabase
      .from('real_estate_loans')
      .update({
        outstanding_balance: body.outstanding_balance,
      })
      .eq('id', loanId)
      .select()
      .single();
    
    if (updateError || !updatedLoan) {
      console.error('[Real Estate API] Error updating outstanding balance:', updateError);
      return NextResponse.json(
        { success: false, error: updateError?.message || 'Failed to update outstanding balance' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: {
        loanId: updatedLoan.id,
        previousBalance,
        newBalance: updatedLoan.outstanding_balance,
        updatedAt: updatedLoan.updated_at,
      },
    });
    
  } catch (error) {
    console.error('[Real Estate API] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
