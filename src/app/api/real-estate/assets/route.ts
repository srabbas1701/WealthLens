/**
 * Real Estate Assets API
 * 
 * Handles CRUD operations for real estate assets.
 * Includes proper joins with loans and cashflows.
 * All queries are RLS-safe and ownership-aware.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/types/supabase';

type RealEstateAsset = Database['public']['Tables']['real_estate_assets']['Row'];
type RealEstateAssetUpdate = Database['public']['Tables']['real_estate_assets']['Update'];

// ============================================================================
// GET: Fetch all real estate assets for user
// ============================================================================

export async function GET(request: NextRequest) {
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
    
    // Use the helper function to get assets with ownership-adjusted values
    const { getUserRealEstateAssets } = await import('@/lib/real-estate/get-assets');
    
    const assets = await getUserRealEstateAssets(supabase, user.id);
    
    return NextResponse.json({
      success: true,
      data: assets,
    });
    
  } catch (error) {
    console.error('[Real Estate API] Unexpected error:', error);
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
// POST: Create new real estate asset
// ============================================================================

export async function POST(request: NextRequest) {
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
    
    const body = await request.json();
    
    // Use the transactional create function
    const { createRealEstateAsset } = await import('@/lib/real-estate/create-asset');
    
    const result = await createRealEstateAsset(supabase, {
      user_id: user.id,
      property_nickname: body.property_nickname,
      property_type: body.property_type,
      property_status: body.property_status,
      purchase_price: body.purchase_price,
      purchase_date: body.purchase_date,
      registration_value: body.registration_value,
      ownership_percentage: body.ownership_percentage,
      city: body.city,
      state: body.state,
      pincode: body.pincode,
      address: body.address,
      project_name: body.project_name,
      builder_name: body.builder_name,
      rera_number: body.rera_number,
      carpet_area_sqft: body.carpet_area_sqft,
      builtup_area_sqft: body.builtup_area_sqft,
      user_override_value: body.user_override_value,
      system_estimated_min: body.system_estimated_min,
      system_estimated_max: body.system_estimated_max,
      valuation_last_updated: body.valuation_last_updated,
      loan: body.loan || null,
      cashflow: body.cashflow || null,
    });
    
    if (!result.success) {
      const statusCode = result.rollbackPerformed ? 500 : 400;
      return NextResponse.json(
        { success: false, error: result.error },
        { status: statusCode }
      );
    }
    
    // Trigger valuation asynchronously (non-blocking)
    // Valuation runs in background, does not block asset creation
    if (result.data?.id) {
      const { triggerValuationAsync } = await import('@/lib/real-estate/trigger-valuation');
      triggerValuationAsync(supabase, result.data.id).catch((error) => {
        // Log error but don't fail the request
        console.error('[Real Estate API] Error triggering valuation:', error);
      });
    }
    
    return NextResponse.json({
      success: true,
      data: result.data,
    });
    
  } catch (error) {
    console.error('[Real Estate API] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
