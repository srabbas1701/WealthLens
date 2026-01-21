/**
 * Real Estate Cashflows API
 * 
 * Handles update operations for real estate cashflows (rental/expenses).
 * Ownership is verified through asset ownership.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/types/supabase';

type RealEstateCashflowUpdate = Database['public']['Tables']['real_estate_cashflows']['Update'];

// ============================================================================
// PUT: Update cashflow
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
    
    const cashflowId = params.id;
    const body = await request.json();
    
    // First, verify cashflow belongs to user's asset
    const { data: cashflow, error: fetchError } = await supabase
      .from('real_estate_cashflows')
      .select(`
        *,
        real_estate_assets!inner (
          id,
          user_id
        )
      `)
      .eq('id', cashflowId)
      .eq('real_estate_assets.user_id', user.id) // Verify ownership
      .single();
    
    if (fetchError || !cashflow) {
      return NextResponse.json(
        { success: false, error: 'Cashflow not found or unauthorized' },
        { status: 404 }
      );
    }
    
    // Prepare update data
    const updateData: RealEstateCashflowUpdate = {};
    
    if (body.rental_status !== undefined) updateData.rental_status = body.rental_status;
    if (body.monthly_rent !== undefined) updateData.monthly_rent = body.monthly_rent;
    if (body.rent_start_date !== undefined) updateData.rent_start_date = body.rent_start_date;
    if (body.escalation_percent !== undefined) updateData.escalation_percent = body.escalation_percent;
    if (body.maintenance_monthly !== undefined) updateData.maintenance_monthly = body.maintenance_monthly;
    if (body.property_tax_annual !== undefined) updateData.property_tax_annual = body.property_tax_annual;
    if (body.other_expenses_monthly !== undefined) updateData.other_expenses_monthly = body.other_expenses_monthly;
    
    // Validate: If rental_status is 'rented', monthly_rent should be provided
    if (updateData.rental_status === 'rented' || 
        (body.rental_status === undefined && cashflow.rental_status === 'rented')) {
      const rentValue = updateData.monthly_rent !== undefined 
        ? updateData.monthly_rent 
        : cashflow.monthly_rent;
      
      if (!rentValue || rentValue <= 0) {
        return NextResponse.json(
          { success: false, error: 'Monthly rent is required for rented properties' },
          { status: 400 }
        );
      }
    }
    
    // Update cashflow (RLS ensures user can only update cashflows for their assets)
    const { data: updatedCashflow, error: updateError } = await supabase
      .from('real_estate_cashflows')
      .update(updateData)
      .eq('id', cashflowId)
      .select()
      .single();
    
    if (updateError || !updatedCashflow) {
      console.error('[Real Estate API] Error updating cashflow:', updateError);
      return NextResponse.json(
        { success: false, error: updateError?.message || 'Failed to update cashflow' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: updatedCashflow,
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
// DELETE: Delete cashflow
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
    
    const cashflowId = params.id;
    
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
      .eq('real_estate_assets.user_id', user.id)
      .single();
    
    if (fetchError || !cashflow) {
      return NextResponse.json(
        { success: false, error: 'Cashflow not found or unauthorized' },
        { status: 404 }
      );
    }
    
    // Delete cashflow
    const { error: deleteError } = await supabase
      .from('real_estate_cashflows')
      .delete()
      .eq('id', cashflowId);
    
    if (deleteError) {
      console.error('[Real Estate API] Error deleting cashflow:', deleteError);
      return NextResponse.json(
        { success: false, error: 'Failed to delete cashflow' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Cashflow deleted successfully',
    });
    
  } catch (error) {
    console.error('[Real Estate API] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
