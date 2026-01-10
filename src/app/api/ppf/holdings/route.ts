/**
 * PPF Holdings API
 * 
 * Handles CRUD operations for Public Provident Fund accounts.
 * Stores comprehensive PPF details including account info, financial data, and extensions.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

// ============================================================================
// TYPES
// ============================================================================

interface PPFHoldingRequest {
  user_id: string;
  holdingId?: string; // For updates
  accountNumber: string;
  accountHolderName: string;
  openingDate: string;
  maturityDate: string;
  currentBalance: number;
  totalContributions: number;
  interestEarned: number;
  interestRate: number;
  bankOrPostOffice: string;
  branch?: string;
  status: 'active' | 'matured' | 'extended';
  extensionDetails?: {
    extensionStartDate: string;
    extensionEndDate: string;
    extensionNumber: number;
  } | null;
}

interface PPFHoldingResponse {
  success: boolean;
  error?: string;
  holdingId?: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
// (removed - using createAdminClient directly)

// ============================================================================
// POST - Create PPF Account
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body: PPFHoldingRequest = await request.json();
    const { user_id, accountNumber, accountHolderName, openingDate, maturityDate, 
            currentBalance, totalContributions, interestEarned, interestRate,
            bankOrPostOffice, branch, status, extensionDetails } = body;

    console.log('[PPF API] Creating PPF account:', { 
      user_id, 
      accountNumber, 
      accountHolderName,
      currentBalance 
    });

    // Create admin client with service role key
    const supabase = createAdminClient();

    // Validate required fields
    if (!user_id || !accountNumber || !accountHolderName || !openingDate || 
        !maturityDate || currentBalance === undefined || totalContributions === undefined || 
        !bankOrPostOffice || !status) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // First, get user's portfolio to check for duplicates
    const { data: portfolio, error: portfolioError } = await supabase
      .from('portfolios')
      .select('id')
      .eq('user_id', user_id)
      .eq('is_primary', true)
      .single();

    if (portfolioError || !portfolio) {
      return NextResponse.json(
        { success: false, error: 'Portfolio not found' },
        { status: 404 }
      );
    }

    // Check for duplicate account number
    const { data: allHoldings } = await supabase
      .from('holdings')
      .select('id, notes, asset:assets!inner(asset_type)')
      .eq('portfolio_id', portfolio.id);

    if (allHoldings) {
      const duplicateAccount = allHoldings.find((h: any) => {
        if ((h as any).asset?.asset_type !== 'ppf') return false;
        const notes = h.notes ? JSON.parse(h.notes) : {};
        return notes.accountNumber === accountNumber;
      });

      if (duplicateAccount) {
        return NextResponse.json(
          { success: false, error: 'An account with this PPF account number already exists' },
          { status: 400 }
        );
      }
    }

    // Prepare notes JSON with all PPF details
    const notes = {
      accountNumber,
      accountHolderName,
      openingDate,
      maturityDate,
      currentBalance,
      totalContributions,
      interestEarned,
      interestRate,
      bankOrPostOffice,
      branch: branch || null,
      status,
      extensionDetails: extensionDetails || null,
      assetType: 'ppf',
      lastUpdated: new Date().toISOString(),
    };

    // Create a unique asset for this PPF account
    const assetName = `PPF Account - ${accountHolderName}`;
    const { data: asset, error: assetError } = await supabase
      .from('assets')
      .insert({
        name: assetName,
        symbol: `PPF_${accountNumber}`,
        asset_type: 'ppf',
        asset_class: 'debt',
        risk_bucket: 'low',
        sector: 'Government',
        is_active: true,
      })
      .select('id')
      .single();

    if (assetError || !asset) {
      console.error('[PPF API] Asset creation error:', assetError);
      return NextResponse.json(
        { success: false, error: 'Failed to create PPF asset' },
        { status: 500 }
      );
    }

    // Insert into holdings table
    const { data: holding, error: insertError } = await supabase
      .from('holdings')
      .insert({
        portfolio_id: portfolio.id,
        asset_id: asset.id,
        quantity: 1,
        average_price: currentBalance,
        invested_value: totalContributions,
        current_value: currentBalance,
        notes: JSON.stringify(notes),
        source: 'manual',
      })
      .select()
      .single();

    if (insertError) {
      console.error('[PPF API] Insert error:', insertError);
      return NextResponse.json(
        { success: false, error: insertError.message },
        { status: 500 }
      );
    }

    console.log('[PPF API] PPF account created successfully:', holding.id);

    return NextResponse.json({ 
      success: true, 
      holdingId: holding.id,
      message: 'PPF account created successfully'
    });

  } catch (error: any) {
    console.error('[PPF API] Error creating PPF account:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create PPF account' },
      { status: 500 }
    );
  }
}

// ============================================================================
// PUT - Update PPF Account
// ============================================================================

export async function PUT(request: NextRequest) {
  try {
    const body: PPFHoldingRequest = await request.json();
    const { user_id, holdingId, accountNumber, accountHolderName, openingDate, maturityDate, 
            currentBalance, totalContributions, interestEarned, interestRate,
            bankOrPostOffice, branch, status, extensionDetails } = body;

    console.log('[PPF API] Updating PPF account:', { holdingId, accountNumber });

    // Validate required fields
    if (!user_id || !holdingId || !accountNumber || !accountHolderName || !openingDate || 
        !maturityDate || currentBalance === undefined || totalContributions === undefined || 
        !bankOrPostOffice || !status) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create admin client with service role key
    const supabase = createAdminClient();

    // Verify holding exists and belongs to user
    const { data: existingHolding, error: fetchError } = await supabase
      .from('holdings')
      .select('*, asset:assets(*), portfolio:portfolios!inner(user_id)')
      .eq('id', holdingId)
      .single();

    if (fetchError || !existingHolding) {
      return NextResponse.json(
        { success: false, error: 'PPF account not found' },
        { status: 404 }
      );
    }

    // Check if account number is being changed and if new number already exists
    const existingNotes = existingHolding.notes ? JSON.parse(existingHolding.notes) : {};
    if (existingNotes.accountNumber !== accountNumber) {
      // Get user's portfolio
      const { data: portfolio } = await supabase
        .from('portfolios')
        .select('id')
        .eq('user_id', user_id)
        .eq('is_primary', true)
        .single();

      if (portfolio) {
        const { data: allHoldings } = await supabase
          .from('holdings')
          .select('id, notes, asset:assets!inner(asset_type)')
          .eq('portfolio_id', portfolio.id)
          .neq('id', holdingId);

        if (allHoldings) {
          const duplicateAccount = allHoldings.find((h: any) => {
            if ((h as any).asset?.asset_type !== 'ppf') return false;
            const notes = h.notes ? JSON.parse(h.notes) : {};
            return notes.accountNumber === accountNumber;
          });

          if (duplicateAccount) {
            return NextResponse.json(
              { success: false, error: 'An account with this PPF account number already exists' },
              { status: 400 }
            );
          }
        }
      }
    }

    // Prepare updated notes JSON
    const notes = {
      accountNumber,
      accountHolderName,
      openingDate,
      maturityDate,
      currentBalance,
      totalContributions,
      interestEarned,
      interestRate,
      bankOrPostOffice,
      branch: branch || null,
      status,
      extensionDetails: extensionDetails || null,
      assetType: 'ppf',
      lastUpdated: new Date().toISOString(),
    };

    // Update the asset name
    if ((existingHolding as any).asset?.id) {
      await supabase
        .from('assets')
        .update({
          name: `PPF Account - ${accountHolderName}`,
          symbol: `PPF_${accountNumber}`,
        })
        .eq('id', (existingHolding as any).asset.id);
    }

    // Update holding
    const { error: updateError } = await supabase
      .from('holdings')
      .update({
        average_price: currentBalance,
        invested_value: totalContributions,
        current_value: currentBalance,
        notes: JSON.stringify(notes),
      })
      .eq('id', holdingId);

    if (updateError) {
      console.error('[PPF API] Update error:', updateError);
      return NextResponse.json(
        { success: false, error: updateError.message },
        { status: 500 }
      );
    }

    console.log('[PPF API] PPF account updated successfully:', holdingId);

    return NextResponse.json({ 
      success: true, 
      holdingId,
      message: 'PPF account updated successfully'
    });

  } catch (error: any) {
    console.error('[PPF API] Error updating PPF account:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update PPF account' },
      { status: 500 }
    );
  }
}

// ============================================================================
// DELETE - Delete PPF Account
// ============================================================================

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const user_id = searchParams.get('user_id');
    const holdingId = searchParams.get('holding_id');

    console.log('[PPF API] Deleting PPF account:', { user_id, holdingId });

    if (!user_id || !holdingId) {
      return NextResponse.json(
        { success: false, error: 'Missing user_id or holding_id' },
        { status: 400 }
      );
    }

    // Create admin client with service role key
    const supabase = createAdminClient();

    // Verify holding exists and belongs to user
    const { data: existingHolding, error: fetchError } = await supabase
      .from('holdings')
      .select('id, asset:assets!inner(id, asset_type), portfolio:portfolios!inner(user_id)')
      .eq('id', holdingId)
      .single();

    if (fetchError || !existingHolding) {
      return NextResponse.json(
        { success: false, error: 'PPF account not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if ((existingHolding as any).portfolio?.user_id !== user_id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Verify it's a PPF asset
    if ((existingHolding as any).asset?.asset_type !== 'ppf') {
      return NextResponse.json(
        { success: false, error: 'Not a PPF account' },
        { status: 400 }
      );
    }

    // Delete the asset first (cascade will delete holding)
    const assetId = (existingHolding as any).asset?.id;
    if (assetId) {
      const { error: assetDeleteError } = await supabase
        .from('assets')
        .delete()
        .eq('id', assetId);

      if (assetDeleteError) {
        console.error('[PPF API] Asset delete error:', assetDeleteError);
        // Continue to try deleting holding directly
      }
    }

    // Delete holding
    const { error: deleteError } = await supabase
      .from('holdings')
      .delete()
      .eq('id', holdingId);

    if (deleteError) {
      console.error('[PPF API] Delete error:', deleteError);
      return NextResponse.json(
        { success: false, error: deleteError.message },
        { status: 500 }
      );
    }

    console.log('[PPF API] PPF account deleted successfully:', holdingId);

    return NextResponse.json({ 
      success: true,
      message: 'PPF account deleted successfully'
    });

  } catch (error: any) {
    console.error('[PPF API] Error deleting PPF account:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete PPF account' },
      { status: 500 }
    );
  }
}
