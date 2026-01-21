/**
 * Real Estate Asset by ID API
 * 
 * Handles operations on a single real estate asset.
 * GET, PUT, DELETE operations with ownership verification.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/types/supabase';

type RealEstateAssetUpdate = Database['public']['Tables']['real_estate_assets']['Update'];

// ============================================================================
// GET: Fetch single asset by ID
// ============================================================================

export async function GET(
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
      console.error('[Real Estate API] User ID is missing. User object:', JSON.stringify(user, null, 2));
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
    
    // Use the helper function
    const { getRealEstateAssetById } = await import('@/lib/real-estate/get-assets');
    
    const asset = await getRealEstateAssetById(supabase, assetId, user.id);
    
    return NextResponse.json({
      success: true,
      data: asset,
    });
    
  } catch (error) {
    console.error('[Real Estate API] Error:', error);
    
    // Handle specific error cases
    if (error instanceof Error) {
      if (error.message.includes('not found') || error.message.includes('unauthorized')) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 404 }
        );
      }
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// PUT: Update asset
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
      console.error('[Real Estate API] User ID is missing. User object:', JSON.stringify(user, null, 2));
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
    
    // Use the helper function (only allows specific fields)
    const { updateRealEstateAsset } = await import('@/lib/real-estate/update-asset');
    
    const updates = {
      property_nickname: body.property_nickname,
      user_override_value: body.user_override_value,
      ownership_percentage: body.ownership_percentage,
      address: body.address,
      carpet_area_sqft: body.carpet_area_sqft,
      builtup_area_sqft: body.builtup_area_sqft,
    };
    
    const updatedAsset = await updateRealEstateAsset(
      supabase,
      assetId,
      user.id,
      updates
    );
    
    // Trigger valuation if location or area fields were updated (async, non-blocking)
    const { shouldTriggerValuation, triggerValuationAsync } = await import('@/lib/real-estate/trigger-valuation');
    if (shouldTriggerValuation(updates)) {
      triggerValuationAsync(supabase, assetId).catch((error) => {
        // Log error but don't fail the request
        console.error('[Real Estate API] Error triggering valuation:', error);
      });
    }
    
    // Fetch complete asset with relations
    const { data: completeAsset } = await supabase
      .from('real_estate_assets')
      .select(`
        *,
        real_estate_loans (*),
        real_estate_cashflows (*)
      `)
      .eq('id', assetId)
      .single();
    
    return NextResponse.json({
      success: true,
      data: completeAsset || updatedAsset,
    });
    
  } catch (error) {
    console.error('[Real Estate API] Error:', error);
    
    // Handle specific error cases
    if (error instanceof Error) {
      if (error.message.includes('not found') || error.message.includes('unauthorized')) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 404 }
        );
      }
      
      if (error.message.includes('must be') || error.message.includes('should be')) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 400 }
        );
      }
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// DELETE: Delete asset (cascades to loans and cashflows)
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
    
    // Validate user.id exists
    if (!user.id) {
      console.error('[Real Estate API] User ID is missing. User object:', JSON.stringify(user, null, 2));
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
    
    // Verify ownership before deletion
    const { data: existingAsset, error: fetchError } = await supabase
      .from('real_estate_assets')
      .select('id, user_id')
      .eq('id', assetId)
      .eq('user_id', user.id)
      .single();
    
    if (fetchError || !existingAsset) {
      return NextResponse.json(
        { success: false, error: 'Asset not found or unauthorized' },
        { status: 404 }
      );
    }
    
    // Delete asset (cascades to loans and cashflows via FK)
    const { error: deleteError } = await supabase
      .from('real_estate_assets')
      .delete()
      .eq('id', assetId)
      .eq('user_id', user.id); // Defense in depth
    
    if (deleteError) {
      console.error('[Real Estate API] Error deleting asset:', deleteError);
      return NextResponse.json(
        { success: false, error: 'Failed to delete asset' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Asset deleted successfully',
    });
    
  } catch (error) {
    console.error('[Real Estate API] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
