/**
 * API Route: NPS Holdings CRUD Operations
 * 
 * Handles Create, Read, Update, Delete operations for NPS accounts.
 * Stores comprehensive NPS data including PRAN, Tier I/II, asset classes, and fund managers.
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

// Helper: Create or get NPS asset
async function createOrGetNPSAsset(pranNumber: string, supabase: any) {
  // Try to find existing asset
  const { data: existing } = await supabase
    .from('assets')
    .select('id')
    .eq('name', `NPS - ${pranNumber}`)
    .eq('asset_type', 'nps')
    .maybeSingle();

  if (existing) {
    return existing.id;
  }

  // Create new asset
  const { data: newAsset, error } = await supabase
    .from('assets')
    .insert({
      name: `NPS - ${pranNumber}`,
      asset_type: 'nps',
      risk_bucket: 'medium',
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

// Helper: Parse NPS metadata from notes field
function parseNPSMetadata(notes: string | null): any {
  if (!notes) return null;
  try {
    return JSON.parse(notes);
  } catch (e) {
    return null;
  }
}

// Helper: Calculate tier totals from schemes
function calculateTierTotals(schemes: any[]) {
  const totalInvested = schemes.reduce((sum, s) => sum + (s.investedAmount || 0), 0);
  const currentValue = schemes.reduce((sum, s) => sum + (s.currentValue || 0), 0);
  const returns = currentValue - totalInvested;
  const returnsPercentage = totalInvested > 0 ? (returns / totalInvested) * 100 : 0;

  return { totalInvested, currentValue, returns, returnsPercentage };
}

// GET: Fetch all NPS holdings for a user
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
        created_at,
        assets (
          id,
          name,
          asset_type
        )
      `)
      .eq('portfolio_id', portfolioId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[NPS API] Error fetching holdings:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    // Filter only NPS assets and parse metadata
    const npsHoldings = data
      .filter((h: any) => h.assets?.asset_type === 'nps')
      .map((h: any) => {
        const metadata = parseNPSMetadata(h.notes);
        if (!metadata) return null;

        // Calculate tier totals
        const tier1Totals = calculateTierTotals(metadata.tier1?.schemes || []);
        const tier2Totals = metadata.tier2 ? calculateTierTotals(metadata.tier2.schemes || []) : null;

        const totalInvested = tier1Totals.totalInvested + (tier2Totals?.totalInvested || 0);
        const totalCurrentValue = tier1Totals.currentValue + (tier2Totals?.currentValue || 0);
        const totalReturns = totalCurrentValue - totalInvested;
        const overallReturnsPercentage = totalInvested > 0 ? (totalReturns / totalInvested) * 100 : 0;

        return {
          id: h.id,
          pranNumber: metadata.pranNumber,
          subscriberName: metadata.subscriberName,
          dateOfOpening: metadata.dateOfOpening,
          tier1: {
            ...metadata.tier1,
            ...tier1Totals,
          },
          tier2: metadata.tier2 ? {
            ...metadata.tier2,
            ...tier2Totals,
          } : null,
          totalInvested,
          totalCurrentValue,
          totalReturns,
          overallReturnsPercentage,
          navUpdatedDate: metadata.navUpdatedDate || new Date().toISOString(),
        };
      })
      .filter(Boolean);

    return NextResponse.json({ success: true, data: npsHoldings });
  } catch (error) {
    console.error('[NPS API] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST: Create new NPS holding
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      user_id,
      pranNumber,
      subscriberName,
      dateOfOpening,
      tier1,
      tier2,
    } = body;
    
    console.log('[NPS API] Received POST request:', {
      user_id,
      pranNumber,
      subscriberName,
      dateOfOpening,
      tier1Keys: tier1 ? Object.keys(tier1) : null,
      tier1SchemesCount: tier1?.schemes?.length,
      tier2Keys: tier2 ? Object.keys(tier2) : null,
      tier2SchemesCount: tier2?.schemes?.length,
    });

    if (!user_id) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: user_id' },
        { status: 400 }
      );
    }
    
    if (!pranNumber) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: PRAN number' },
        { status: 400 }
      );
    }
    
    if (!tier1 || !tier1.schemes || tier1.schemes.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: Tier I data with at least one scheme' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Get or create portfolio
    const portfolioId = await getPrimaryPortfolio(user_id, supabase);

    // Check if PRAN already exists for this user
    const { data: existingHoldings } = await supabase
      .from('holdings')
      .select(`
        id,
        notes,
        assets (
          asset_type
        )
      `)
      .eq('portfolio_id', portfolioId);

    // Check for duplicate PRAN - if exists, UPDATE instead of creating new
    let existingHoldingId = null;
    if (existingHoldings) {
      for (const holding of existingHoldings) {
        if (holding.assets?.asset_type === 'nps') {
          const metadata = parseNPSMetadata(holding.notes);
          if (metadata?.pranNumber === pranNumber) {
            existingHoldingId = holding.id;
            console.log(`[NPS API] PRAN ${pranNumber} exists, will update existing holding`);
            break;
          }
        }
      }
    }

    // Create or get asset
    const assetId = await createOrGetNPSAsset(pranNumber, supabase);

    // Calculate totals
    const tier1Totals = calculateTierTotals(tier1.schemes || []);
    const tier2Totals = tier2 ? calculateTierTotals(tier2.schemes || []) : { totalInvested: 0, currentValue: 0 };
    
    const totalInvested = tier1Totals.totalInvested + tier2Totals.totalInvested;
    const totalCurrentValue = tier1Totals.currentValue + tier2Totals.currentValue;

    // Create metadata object
    const metadata = {
      pranNumber,
      subscriberName,
      dateOfOpening,
      tier1,
      tier2,
      navUpdatedDate: new Date().toISOString(),
    };

    // If PRAN exists, UPDATE instead of INSERT
    if (existingHoldingId) {
      const { data, error } = await supabase
        .from('holdings')
        .update({
          asset_id: assetId,
          average_price: totalInvested,
          invested_value: totalInvested,
          current_value: totalCurrentValue,
          notes: JSON.stringify(metadata),
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingHoldingId)
        .select()
        .single();

      if (error) {
        console.error('[NPS API] Error updating existing holding:', error);
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 500 }
        );
      }

      console.log(`[NPS API] Updated existing NPS account with PRAN ${pranNumber}`);
      return NextResponse.json({ 
        success: true, 
        data,
        message: 'NPS account updated successfully'
      });
    }

    // Insert new holding (PRAN doesn't exist)
    const { data, error } = await supabase
      .from('holdings')
      .insert({
        portfolio_id: portfolioId,
        asset_id: assetId,
        quantity: 1,
        average_price: totalInvested,
        invested_value: totalInvested,
        current_value: totalCurrentValue,
        notes: JSON.stringify(metadata),
        source: 'manual',
      })
      .select()
      .single();

    if (error) {
      console.error('[NPS API] Error creating holding:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('[NPS API] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT: Update existing NPS holding
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
      pranNumber,
      subscriberName,
      dateOfOpening,
      tier1,
      tier2,
    } = body;

    if (!id || !pranNumber || !tier1) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Get or create the asset (in case PRAN changed)
    const assetId = await createOrGetNPSAsset(pranNumber, supabase);

    // Calculate totals
    const tier1Totals = calculateTierTotals(tier1.schemes || []);
    const tier2Totals = tier2 ? calculateTierTotals(tier2.schemes || []) : { totalInvested: 0, currentValue: 0 };
    
    const totalInvested = tier1Totals.totalInvested + tier2Totals.totalInvested;
    const totalCurrentValue = tier1Totals.currentValue + tier2Totals.currentValue;

    // Create metadata object
    const metadata = {
      pranNumber,
      subscriberName,
      dateOfOpening,
      tier1,
      tier2,
      navUpdatedDate: new Date().toISOString(),
    };

    // Update holdings table
    const { data, error } = await supabase
      .from('holdings')
      .update({
        asset_id: assetId,
        average_price: totalInvested,
        invested_value: totalInvested,
        current_value: totalCurrentValue,
        notes: JSON.stringify(metadata),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[NPS API] Error updating holding:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('[NPS API] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE: Delete NPS holding
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Holding ID is required' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { error } = await supabase
      .from('holdings')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[NPS API] Error deleting holding:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[NPS API] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
