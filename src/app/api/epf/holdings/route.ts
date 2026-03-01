/**
 * EPF Holdings API
 * 
 * Handles CRUD operations for Employee Provident Fund accounts.
 * Stores comprehensive EPF details including UAN, employer info, and financial data.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

// ============================================================================
// TYPES
// ============================================================================

interface EPFHoldingRequest {
  user_id: string;
  holdingId?: string; // For updates
  uan: string; // Universal Account Number (12 digits)
  memberId?: string; // Member ID (per employer)
  employerName: string;
  employerCode?: string; // Establishment code
  dateOfJoining?: string;
  dateOfLeaving?: string; // If applicable
  currentBalance: number;
  employeeContributions: number;
  employerContributions: number;
  interestEarned: number;
  interestRate: number;
  lastUpdated: string;
  notes?: string;
}

interface EPFHoldingResponse {
  success: boolean;
  error?: string;
  holdingId?: string;
}

// ============================================================================
// VALIDATION HELPER
// ============================================================================

function validateEPFData(body: EPFHoldingRequest): string | null {
  const { uan, employerName, currentBalance, employeeContributions, employerContributions,
          interestRate, lastUpdated, dateOfJoining, dateOfLeaving } = body;

  if (!uan || !/^\d{12}$/.test(uan)) {
    return 'UAN must be exactly 12 digits';
  }
  if (!employerName || employerName.trim().length < 2) {
    return 'Employer name is required';
  }
  if (currentBalance === undefined || currentBalance <= 0) {
    return 'Current balance must be greater than zero';
  }
  if (employeeContributions < 0) {
    return 'Employee contributions cannot be negative';
  }
  if (employerContributions < 0) {
    return 'Employer contributions cannot be negative';
  }
  const totalContributions = employeeContributions + employerContributions;
  if (currentBalance < totalContributions) {
    return 'Current balance cannot be less than total contributions';
  }
  if (interestRate !== undefined && (interestRate < 0 || interestRate > 15)) {
    return 'Interest rate must be between 0 and 15%';
  }

  const today = new Date().toISOString().split('T')[0];

  if (dateOfJoining) {
    const joiningStr = dateOfJoining.split('T')[0];
    if (joiningStr > today) {
      return 'Date of joining cannot be in the future';
    }
  }
  if (dateOfLeaving) {
    const leavingStr = dateOfLeaving.split('T')[0];
    if (leavingStr > today) {
      return 'Date of leaving cannot be in the future';
    }
    if (dateOfJoining && new Date(dateOfLeaving) <= new Date(dateOfJoining)) {
      return 'Date of leaving must be after date of joining';
    }
  }
  if (lastUpdated) {
    const updatedStr = lastUpdated.split('T')[0];
    if (updatedStr > today) {
      return 'Last updated date cannot be in the future';
    }
    if (dateOfJoining && updatedStr < dateOfJoining.split('T')[0]) {
      return 'Last updated date cannot be before date of joining';
    }
  }

  return null; // All valid
}

// ============================================================================
// POST - Create EPF Account
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body: EPFHoldingRequest = await request.json();
    const { user_id, uan, memberId, employerName, employerCode, dateOfJoining, 
            dateOfLeaving, currentBalance, employeeContributions, employerContributions, 
            interestEarned, interestRate, lastUpdated, notes } = body;

    console.log('[EPF API] Creating EPF account:', { 
      user_id, 
      uan, 
      employerName,
      currentBalance 
    });

    // Create admin client with service role key
    const supabase = createAdminClient();

    // Validate required fields
    if (!user_id) {
      return NextResponse.json(
        { success: false, error: 'Missing user_id' },
        { status: 400 }
      );
    }

    const validationError = validateEPFData(body);
    if (validationError) {
      return NextResponse.json(
        { success: false, error: validationError },
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

    // Check for duplicate UAN + Member ID combination
    const { data: allHoldings } = await supabase
      .from('holdings')
      .select('id, notes, asset:assets!inner(asset_type)')
      .eq('portfolio_id', portfolio.id);

    if (allHoldings) {
      const duplicateAccount = allHoldings.find((h: any) => {
        if ((h as any).asset?.asset_type !== 'epf') return false;
        const holdingNotes = h.notes ? JSON.parse(h.notes) : {};
        // If memberId is provided, check for exact match (UAN + Member ID)
        // Otherwise, just check UAN
        if (memberId) {
          return holdingNotes.uan === uan && holdingNotes.memberId === memberId;
        } else {
          return holdingNotes.uan === uan && !holdingNotes.memberId;
        }
      });

      if (duplicateAccount) {
        return NextResponse.json(
          { success: false, error: 'An EPF account with this UAN and Member ID already exists' },
          { status: 400 }
        );
      }
    }

    // Calculate total contributions
    const totalContributions = employeeContributions + employerContributions;

    // Prepare notes JSON with all EPF details
    const notesData = {
      uan,
      memberId: memberId || null,
      employerName,
      employerCode: employerCode || null,
      dateOfJoining: dateOfJoining || null,
      dateOfLeaving: dateOfLeaving || null,
      currentBalance,
      employeeContributions,
      employerContributions,
      totalContributions,
      interestEarned,
      interestRate: interestRate || 8.25, // Default EPF rate
      lastUpdated: lastUpdated || new Date().toISOString(),
      notes: notes || null,
      assetType: 'epf',
    };

    // Create a unique asset for this EPF account
    // Note: asset_class must be 'FixedIncome' (migration 006 changed from 'debt')
    const assetName = `EPF - ${employerName}${memberId ? ` (${memberId})` : ''}`;
    const { data: asset, error: assetError } = await supabase
      .from('assets')
      .insert({
        name: assetName,
        symbol: `EPF_${uan}${memberId ? `_${memberId}` : ''}`,
        asset_type: 'epf',
        asset_class: 'FixedIncome',
        risk_bucket: 'low',
        sector: 'Government',
        is_active: true,
      })
      .select('id')
      .single();

    if (assetError || !asset) {
      const errorDetail = assetError?.message || (assetError as any)?.details || 'Unknown database error';
      console.error('[EPF API] Asset creation error:', assetError);
      return NextResponse.json(
        { success: false, error: `Failed to create EPF asset: ${errorDetail}` },
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
        notes: JSON.stringify(notesData),
        source: 'manual',
      })
      .select()
      .single();

    if (insertError) {
      const errorDetail = insertError.message || (insertError as any)?.details || 'Unknown database error';
      console.error('[EPF API] Insert error:', insertError);
      return NextResponse.json(
        { success: false, error: `Failed to save EPF holding: ${errorDetail}` },
        { status: 500 }
      );
    }

    console.log('[EPF API] EPF account created successfully:', holding.id);

    return NextResponse.json({ 
      success: true, 
      holdingId: holding.id,
      message: 'EPF account created successfully'
    });

  } catch (error: any) {
    const errorDetail = error?.message || String(error);
    console.error('[EPF API] Error creating EPF account:', error);
    return NextResponse.json(
      { success: false, error: `Failed to create EPF account: ${errorDetail}` },
      { status: 500 }
    );
  }
}

// ============================================================================
// PUT - Update EPF Account
// ============================================================================

export async function PUT(request: NextRequest) {
  try {
    const body: EPFHoldingRequest = await request.json();
    const { user_id, holdingId, uan, memberId, employerName, employerCode, 
            dateOfJoining, dateOfLeaving, currentBalance, employeeContributions, 
            employerContributions, interestEarned, interestRate, lastUpdated, notes } = body;

    console.log('[EPF API] Updating EPF account:', { holdingId, uan });

    // Validate required fields
    if (!user_id || !holdingId) {
      return NextResponse.json(
        { success: false, error: 'Missing user_id or holdingId' },
        { status: 400 }
      );
    }

    const validationError = validateEPFData(body);
    if (validationError) {
      return NextResponse.json(
        { success: false, error: validationError },
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
        { success: false, error: 'EPF account not found' },
        { status: 404 }
      );
    }

    // Check if UAN or Member ID is being changed and if new combination already exists
    const existingNotes = existingHolding.notes ? JSON.parse(existingHolding.notes) : {};
    if (existingNotes.uan !== uan || existingNotes.memberId !== (memberId || null)) {
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
            if ((h as any).asset?.asset_type !== 'epf') return false;
            const holdingNotes = h.notes ? JSON.parse(h.notes) : {};
            // If memberId is provided, check for exact match (UAN + Member ID)
            // Otherwise, just check UAN
            if (memberId) {
              return holdingNotes.uan === uan && holdingNotes.memberId === memberId;
            } else {
              return holdingNotes.uan === uan && !holdingNotes.memberId;
            }
          });

          if (duplicateAccount) {
            return NextResponse.json(
              { success: false, error: 'An EPF account with this UAN and Member ID already exists' },
              { status: 400 }
            );
          }
        }
      }
    }

    // Calculate total contributions
    const totalContributions = employeeContributions + employerContributions;

    // Prepare updated notes JSON
    const notesData = {
      uan,
      memberId: memberId || null,
      employerName,
      employerCode: employerCode || null,
      dateOfJoining: dateOfJoining || null,
      dateOfLeaving: dateOfLeaving || null,
      currentBalance,
      employeeContributions,
      employerContributions,
      totalContributions,
      interestEarned,
      interestRate: interestRate || 8.25,
      lastUpdated: lastUpdated || new Date().toISOString(),
      notes: notes || null,
      assetType: 'epf',
    };

    // Update the asset name
    if ((existingHolding as any).asset?.id) {
      await supabase
        .from('assets')
        .update({
          name: `EPF - ${employerName}${memberId ? ` (${memberId})` : ''}`,
          symbol: `EPF_${uan}${memberId ? `_${memberId}` : ''}`,
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
        notes: JSON.stringify(notesData),
      })
      .eq('id', holdingId);

    if (updateError) {
      console.error('[EPF API] Update error:', updateError);
      return NextResponse.json(
        { success: false, error: updateError.message },
        { status: 500 }
      );
    }

    console.log('[EPF API] EPF account updated successfully:', holdingId);

    return NextResponse.json({ 
      success: true, 
      holdingId,
      message: 'EPF account updated successfully'
    });

  } catch (error: any) {
    console.error('[EPF API] Error updating EPF account:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update EPF account' },
      { status: 500 }
    );
  }
}

// ============================================================================
// DELETE - Delete EPF Account
// ============================================================================

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const user_id = searchParams.get('user_id');
    const holdingId = searchParams.get('holding_id');

    console.log('[EPF API] Deleting EPF account:', { user_id, holdingId });

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
        { success: false, error: 'EPF account not found' },
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

    // Verify it's an EPF asset
    if ((existingHolding as any).asset?.asset_type !== 'epf') {
      return NextResponse.json(
        { success: false, error: 'Not an EPF account' },
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
        console.error('[EPF API] Asset delete error:', assetDeleteError);
        // Continue to try deleting holding directly
      }
    }

    // Delete holding
    const { error: deleteError } = await supabase
      .from('holdings')
      .delete()
      .eq('id', holdingId);

    if (deleteError) {
      console.error('[EPF API] Delete error:', deleteError);
      return NextResponse.json(
        { success: false, error: deleteError.message },
        { status: 500 }
      );
    }

    console.log('[EPF API] EPF account deleted successfully:', holdingId);

    return NextResponse.json({ 
      success: true,
      message: 'EPF account deleted successfully'
    });

  } catch (error: any) {
    console.error('[EPF API] Error deleting EPF account:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete EPF account' },
      { status: 500 }
    );
  }
}
