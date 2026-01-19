/**
 * API Route: Update NPS NAVs
 * 
 * Fetches latest NAVs for all NPS schemes and updates holdings.
 * Currently uses mock data; can be extended to fetch from external APIs.
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
    throw new Error('Portfolio not found');
  }

  return data.id;
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

// Mock NAV fetcher - In production, replace with actual API calls
// NAVs source: https://www.npstrust.org.in/scheme-performance
// IMPORTANT: Uses deterministic date-based variation instead of random to prevent values changing on every call
// This simulates daily NAV changes but keeps the same value for the same date
function getMockNAVUpdate(currentNAV: number, assetClass: string, navDate?: string): number {
  // Use today's date as seed for deterministic "random" variation
  // This ensures the same NAV is returned for the same date
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const seed = parseInt(today.replace(/-/g, ''), 10); // Convert date to number for seed
  
  // Simple seeded pseudo-random function
  const seededRandom = (seed: number) => {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  };
  
  // Simulate realistic daily market movement
  // Equity: Higher volatility (±0.5% to ±1.5%)
  // Debt: Lower volatility (±0.1% to ±0.5%)
  
  let maxVariation = 0.015; // Default 1.5% for equity
  
  if (assetClass === 'G') {
    maxVariation = 0.005; // 0.5% for government securities (most stable)
  } else if (assetClass === 'C') {
    maxVariation = 0.008; // 0.8% for corporate bonds
  } else if (assetClass === 'A') {
    maxVariation = 0.012; // 1.2% for alternative funds
  }
  // E (Equity) keeps 1.5%
  
  // Deterministic variation based on date: same date = same variation
  const randomValue = seededRandom(seed + assetClass.charCodeAt(0));
  const variation = currentNAV * ((randomValue * maxVariation * 2) - maxVariation);
  const newNAV = currentNAV + variation;
  
  // Ensure NAV doesn't go below 1
  return Math.max(parseFloat(newNAV.toFixed(4)), 1.0);
}

// Update scheme with latest NAV
function updateSchemeNAV(scheme: any): any {
  // IMPORTANT: Check if NAV was already updated today
  // If navDate exists and is today, use existing NAV to prevent unnecessary changes
  const today = new Date().toISOString().split('T')[0];
  const schemeNavDate = scheme.navDate ? new Date(scheme.navDate).toISOString().split('T')[0] : null;
  
  let latestNAV = scheme.currentNAV;
  
  // Only update NAV if it hasn't been updated today
  if (schemeNavDate !== today) {
    latestNAV = getMockNAVUpdate(scheme.currentNAV, scheme.assetClass, today);
  }
  
  const currentValue = scheme.currentUnits * latestNAV;
  const returns = currentValue - scheme.investedAmount;
  const returnsPercentage = scheme.investedAmount > 0 ? (returns / scheme.investedAmount) * 100 : 0;

  return {
    ...scheme,
    currentNAV: latestNAV,
    currentValue,
    returns,
    returnsPercentage,
    navDate: new Date().toISOString().split('T')[0], // Store date only (YYYY-MM-DD)
  };
}

// Calculate tier totals
function calculateTierTotals(schemes: any[]) {
  const totalInvested = schemes.reduce((sum, s) => sum + (s.investedAmount || 0), 0);
  const currentValue = schemes.reduce((sum, s) => sum + (s.currentValue || 0), 0);
  const returns = currentValue - totalInvested;
  const returnsPercentage = totalInvested > 0 ? (returns / totalInvested) * 100 : 0;

  return { totalInvested, currentValue, returns, returnsPercentage };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_id } = body;

    if (!user_id) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Get user's portfolio
    const portfolioId = await getPrimaryPortfolio(user_id, supabase);

    // Get all NPS holdings
    const { data: holdings, error } = await supabase
      .from('holdings')
      .select(`
        id,
        notes,
        assets (
          id,
          asset_type
        )
      `)
      .eq('portfolio_id', portfolioId);

    if (error) {
      console.error('[NPS NAV Update] Error fetching holdings:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    // Filter NPS holdings and update NAVs
    const npsHoldings = holdings.filter((h: any) => h.assets?.asset_type === 'nps');
    let updatedCount = 0;

    for (const holding of npsHoldings) {
      const metadata = parseNPSMetadata(holding.notes);
      if (!metadata) continue;

      // Update Tier I schemes
      if (metadata.tier1?.schemes) {
        metadata.tier1.schemes = metadata.tier1.schemes.map(updateSchemeNAV);
        const tier1Totals = calculateTierTotals(metadata.tier1.schemes);
        metadata.tier1 = {
          ...metadata.tier1,
          totalInvested: tier1Totals.totalInvested,
          currentValue: tier1Totals.currentValue,
          totalReturns: tier1Totals.returns,
          returnsPercentage: tier1Totals.returnsPercentage,
        };
      }

      // Update Tier II schemes
      if (metadata.tier2?.schemes) {
        metadata.tier2.schemes = metadata.tier2.schemes.map(updateSchemeNAV);
        const tier2Totals = calculateTierTotals(metadata.tier2.schemes);
        metadata.tier2 = {
          ...metadata.tier2,
          totalInvested: tier2Totals.totalInvested,
          currentValue: tier2Totals.currentValue,
          totalReturns: tier2Totals.returns,
          returnsPercentage: tier2Totals.returnsPercentage,
        };
      }

      // Calculate overall totals
      const tier1Totals = calculateTierTotals(metadata.tier1?.schemes || []);
      const tier2Totals = metadata.tier2 ? calculateTierTotals(metadata.tier2.schemes || []) : { totalInvested: 0, currentValue: 0 };
      
      const totalInvested = tier1Totals.totalInvested + tier2Totals.totalInvested;
      const totalCurrentValue = tier1Totals.currentValue + tier2Totals.currentValue;

      metadata.navUpdatedDate = new Date().toISOString();

      // Update holding in database
      const { error: updateError } = await supabase
        .from('holdings')
        .update({
          invested_value: totalInvested,
          current_value: totalCurrentValue,
          notes: JSON.stringify(metadata),
          updated_at: new Date().toISOString(),
        })
        .eq('id', holding.id);

      if (updateError) {
        console.error(`[NPS NAV Update] Error updating holding ${holding.id}:`, updateError);
      } else {
        updatedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      updatedCount,
      message: `Successfully updated ${updatedCount} NPS account(s)`,
    });
  } catch (error: any) {
    console.error('[NPS NAV Update] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
