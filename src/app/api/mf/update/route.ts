/**
 * API Route: Update Mutual Fund Holding
 * 
 * PUT /api/mf/update
 * 
 * Updates an existing mutual fund holding for the authenticated user
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, units, avgBuyNav, folio, purchaseDate, user_id } = body;

    // Validation
    if (!id || !units || !avgBuyNav) {
      return NextResponse.json(
        { error: 'Missing required fields: id, units, avgBuyNav' },
        { status: 400 }
      );
    }

    if (!user_id) {
      return NextResponse.json(
        { error: 'Missing user_id' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // First, verify the holding exists and belongs to the user
    const { data: existingHolding, error: fetchError } = await supabase
      .from('holdings')
      .select(`
        *,
        portfolios!inner (
          user_id
        ),
        assets (
          id,
          symbol,
          name,
          asset_type
        )
      `)
      .eq('id', id)
      .eq('portfolios.user_id', user_id)
      .single();

    if (fetchError || !existingHolding) {
      return NextResponse.json(
        { error: 'Holding not found or unauthorized' },
        { status: 404 }
      );
    }

    // Calculate new invested value
    const investedValue = parseFloat(units) * parseFloat(avgBuyNav);
    
    // Get current NAV from existing holding's current_value
    const currentNAV = existingHolding.quantity > 0 
      ? existingHolding.current_value / existingHolding.quantity 
      : parseFloat(avgBuyNav);
    
    // Calculate new current value based on updated units
    const currentValue = parseFloat(units) * currentNAV;

    // Parse existing metadata and update folio if provided
    let metadata: any = {};
    try {
      if (existingHolding.notes) {
        metadata = typeof existingHolding.notes === 'string' 
          ? JSON.parse(existingHolding.notes) 
          : existingHolding.notes;
      }
    } catch (e) {
      console.warn('[MF Update API] Failed to parse existing notes:', e);
    }

    // Update folio in metadata if provided
    if (folio !== undefined) {
      metadata.folio = folio || null; // Allow empty string to clear folio
    }

    // Update purchase date in metadata if provided
    if (purchaseDate !== undefined) {
      metadata.purchase_date = purchaseDate || null; // Allow empty string to clear purchase date
    }

    // Update holding
    const updateData: any = {
      quantity: parseFloat(units),
      average_price: parseFloat(avgBuyNav),
      invested_value: investedValue,
      current_value: currentValue,
      notes: JSON.stringify(metadata),
      updated_at: new Date().toISOString(),
    };
    
    // Update purchase_date column if provided (store in both column and metadata for backward compatibility)
    if (purchaseDate !== undefined) {
      updateData.purchase_date = purchaseDate || null;
    }

    const { data: holding, error: updateError } = await supabase
      .from('holdings')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        assets (
          id,
          symbol,
          name,
          asset_type
        )
      `)
      .single();

    if (updateError || !holding) {
      console.error('[MF Update API] Error updating holding:', updateError);
      return NextResponse.json(
        { error: 'Failed to update holding' },
        { status: 500 }
      );
    }

    // Format response
    const mf = {
      id: holding.id,
      name: holding.assets.name,
      units: holding.quantity,
      avgBuyNav: holding.average_price,
      investedValue: holding.invested_value,
      currentValue: holding.current_value,
      allocation: 0, // Will be recalculated by portfolio aggregation
    };

    return NextResponse.json(mf, { status: 200 });

  } catch (error: any) {
    console.error('[MF Update API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
