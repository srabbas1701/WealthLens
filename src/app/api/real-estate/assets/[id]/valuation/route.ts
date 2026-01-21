/**
 * Real Estate Valuation API
 * 
 * Handles manual valuation updates for real estate assets.
 * User can set/update/clear override value.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/types/supabase';

// ============================================================================
// PUT: Update valuation (user override)
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
    
    // Validate user.id exists
    if (!user.id) {
      console.error('[Real Estate Valuation API] User ID is missing. User object:', JSON.stringify(user, null, 2));
      return NextResponse.json(
        { success: false, error: 'User ID not found. Please log in again.' },
        { status: 401 }
      );
    }
    
    // Get assetId from params (handle both sync and async params in Next.js 15+)
    let assetId: string;
    if (params && typeof params === 'object' && 'then' in params) {
      // params is a Promise
      const resolvedParams = await params;
      assetId = resolvedParams.id;
    } else if (params && typeof params === 'object' && 'id' in params) {
      // params is a regular object
      assetId = params.id;
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid asset ID parameter' },
        { status: 400 }
      );
    }
    
    // Validate assetId
    if (!assetId || typeof assetId !== 'string' || assetId.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'Invalid asset ID' },
        { status: 400 }
      );
    }
    
    const body = await request.json();
    
    // Verify ownership
    const { data: existingAsset, error: fetchError } = await supabase
      .from('real_estate_assets')
      .select('id, user_id, user_override_value')
      .eq('id', assetId)
      .eq('user_id', user.id)
      .single();
    
    if (fetchError || !existingAsset) {
      return NextResponse.json(
        { success: false, error: 'Asset not found or unauthorized' },
        { status: 404 }
      );
    }
    
    // Validate user_override_value
    if (body.user_override_value !== null && body.user_override_value !== undefined) {
      if (typeof body.user_override_value !== 'number' || body.user_override_value <= 0) {
        return NextResponse.json(
          { success: false, error: 'User override value must be a positive number' },
          { status: 400 }
        );
      }
    }
    
    // Update valuation
    const updateData: Database['public']['Tables']['real_estate_assets']['Update'] = {
      user_override_value: body.user_override_value !== undefined ? body.user_override_value : null,
      valuation_last_updated: new Date().toISOString(),
    };
    
    const { data: updatedAsset, error: updateError } = await supabase
      .from('real_estate_assets')
      .update(updateData)
      .eq('id', assetId)
      .eq('user_id', user.id)
      .select()
      .single();
    
    if (updateError || !updatedAsset) {
      console.error('[Real Estate API] Error updating valuation:', updateError);
      return NextResponse.json(
        { success: false, error: updateError?.message || 'Failed to update valuation' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: {
        assetId: updatedAsset.id,
        previousValue: existingAsset.user_override_value,
        newValue: updatedAsset.user_override_value,
        valuationSource: updatedAsset.user_override_value ? 'user_override' : 'system_estimate',
        updatedAt: updatedAsset.valuation_last_updated,
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
