/**
 * API Route: Fixed Deposit CRUD Operations
 * 
 * Handles Create, Read, Update, Delete operations for Fixed Deposits
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

// Helper: Get or create user's primary portfolio
async function getPrimaryPortfolio(userId: string, supabase: any) {
  const { data, error } = await supabase
    .from('portfolios')
    .select('id')
    .eq('user_id', userId)
    .eq('is_primary', true)
    .single();

  if (error || !data) {
    // Create primary portfolio if it doesn't exist
    const { data: newPortfolio, error: createError } = await supabase
      .from('portfolios')
      .insert({
        user_id: userId,
        name: 'My Portfolio',
        is_primary: true,
      })
      .select('id')
      .single();

    if (createError) {
      throw new Error('Failed to create portfolio');
    }
    return newPortfolio.id;
  }

  return data.id;
}

// Helper: Create or get FD asset
async function createOrGetFDAsset(bank: string, supabase: any) {
  // Try to find existing asset
  const { data: existing } = await supabase
    .from('assets')
    .select('id')
    .eq('name', bank)
    .eq('asset_type', 'fd')
    .maybeSingle();

  if (existing) {
    return existing.id;
  }

  // Create new asset
  const { data: newAsset, error } = await supabase
    .from('assets')
    .insert({
      name: bank,
      asset_type: 'fd',
      risk_bucket: 'low',
      asset_class: 'debt',
      is_active: true,
    })
    .select('id')
    .single();

  if (error) {
    throw new Error('Failed to create asset');
  }

  return newAsset.id;
}

// GET: Fetch all FDs for a user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Get user's portfolio
    const portfolioId = await getPrimaryPortfolio(userId, supabase);

    // Get holdings with asset information
    const { data, error } = await supabase
      .from('holdings')
      .select(`
        id,
        quantity,
        invested_value,
        current_value,
        average_price,
        notes,
        assets (
          id,
          name,
          asset_type
        )
      `)
      .eq('portfolio_id', portfolioId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[FD API] Error fetching FDs:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    // Filter only FD assets
    const fdHoldings = data.filter((h: any) => h.assets?.asset_type === 'fd');

    return NextResponse.json({ success: true, data: fdHoldings });
  } catch (error) {
    console.error('[FD API] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST: Create new FD
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      user_id,
      bank,
      fdNumber,
      principal,
      rate,
      startDate,
      maturityDate,
      interestType,
      tdsApplicable,
    } = body;

    if (!user_id || !bank || !principal || !rate || !startDate || !maturityDate) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Get or create portfolio
    const portfolioId = await getPrimaryPortfolio(user_id, supabase);

    // Create or get asset
    const assetId = await createOrGetFDAsset(bank, supabase);

    // Create metadata object
    const metadata = {
      fdNumber: fdNumber || `FD${Date.now()}`,
      interest_rate: parseFloat(rate),
      start_date: startDate,
      maturity_date: maturityDate,
      interestType: interestType || 'Cumulative',
      tdsApplicable: tdsApplicable !== undefined ? tdsApplicable : true,
    };

    // Insert into holdings table
    const { data, error } = await supabase
      .from('holdings')
      .insert({
        portfolio_id: portfolioId,
        asset_id: assetId,
        quantity: 1,
        average_price: parseFloat(principal),
        invested_value: parseFloat(principal),
        current_value: parseFloat(principal),
        notes: JSON.stringify(metadata),
        source: 'manual',
      })
      .select()
      .single();

    if (error) {
      console.error('[FD API] Error creating FD:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('[FD API] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT: Update existing FD
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
      bank,
      fdNumber,
      principal,
      rate,
      startDate,
      maturityDate,
      interestType,
      tdsApplicable,
    } = body;

    if (!id || !bank || !principal || !rate || !startDate || !maturityDate) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Get or create the asset (in case bank name changed)
    const assetId = await createOrGetFDAsset(bank, supabase);

    // Create metadata object
    const metadata = {
      fdNumber: fdNumber || `FD${Date.now()}`,
      interest_rate: parseFloat(rate),
      start_date: startDate,
      maturity_date: maturityDate,
      interestType: interestType || 'Cumulative',
      tdsApplicable: tdsApplicable !== undefined ? tdsApplicable : true,
    };

    // Update holdings table
    const { data, error } = await supabase
      .from('holdings')
      .update({
        asset_id: assetId,
        average_price: parseFloat(principal),
        invested_value: parseFloat(principal),
        current_value: parseFloat(principal),
        notes: JSON.stringify(metadata),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[FD API] Error updating FD:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('[FD API] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE: Delete FD
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'FD ID is required' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { error } = await supabase
      .from('holdings')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[FD API] Error deleting FD:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[FD API] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
