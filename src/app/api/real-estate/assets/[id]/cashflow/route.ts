/**
 * Real Estate Asset Cashflow Upsert API
 * 
 * Handles upsert (create or update) operations for real estate cashflows.
 * Creates cashflow if it doesn't exist, updates if it does.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { upsertRealEstateCashflow } from '@/lib/real-estate/upsert-cashflow';

// ============================================================================
// POST: Upsert cashflow (create or update)
// ============================================================================

export async function POST(
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
    
    // Get assetId from params (handle both sync and async params in Next.js 15+)
    let assetId: string;
    if (params && typeof params === 'object' && 'then' in params) {
      const resolvedParams = await params;
      assetId = resolvedParams.id;
    } else if (params && typeof params === 'object' && 'id' in params) {
      assetId = params.id;
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid asset ID' },
        { status: 400 }
      );
    }
    
    const body = await request.json();
    
    // Determine rental_status from the data
    // If monthly_rent is provided and > 0, assume 'rented'
    // Otherwise, default to 'self_occupied' (can be changed later)
    let rentalStatus: 'self_occupied' | 'rented' | 'vacant' = 'self_occupied';
    
    if (body.rental_status) {
      rentalStatus = body.rental_status;
    } else if (body.monthly_rent && parseFloat(body.monthly_rent) > 0) {
      rentalStatus = 'rented';
    }
    
    // Prepare cashflow data
    const cashflowData = {
      rental_status: rentalStatus,
      monthly_rent: body.monthly_rent !== undefined ? (body.monthly_rent ? parseFloat(body.monthly_rent) : null) : null,
      rent_start_date: body.rent_start_date || null,
      escalation_percent: body.escalation_percent !== undefined ? (body.escalation_percent ? parseFloat(body.escalation_percent) : null) : null,
      maintenance_monthly: body.maintenance_monthly !== undefined ? (body.maintenance_monthly ? parseFloat(body.maintenance_monthly) : null) : null,
      property_tax_annual: body.property_tax_annual !== undefined ? (body.property_tax_annual ? parseFloat(body.property_tax_annual) : null) : null,
      other_expenses_monthly: body.other_expenses_monthly !== undefined ? (body.other_expenses_monthly ? parseFloat(body.other_expenses_monthly) : null) : null,
    };
    
    // Upsert cashflow
    const cashflow = await upsertRealEstateCashflow(
      supabase,
      assetId,
      user.id,
      cashflowData
    );
    
    return NextResponse.json({
      success: true,
      data: cashflow,
    });
    
  } catch (error) {
    console.error('[Real Estate API] Error upserting cashflow:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to upsert cashflow' 
      },
      { status: 500 }
    );
  }
}
