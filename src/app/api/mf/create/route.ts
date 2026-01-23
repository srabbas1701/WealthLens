/**
 * API Route: Create Mutual Fund Holding
 * 
 * POST /api/mf/create
 * 
 * Creates a new mutual fund holding for the authenticated user
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { classifyAsset } from '@/lib/asset-classification';
import { extractAMC } from '@/lib/mf-extraction-utils';

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

// Helper: Create or get MF asset
async function createOrGetMFAsset(name: string, isin: string | undefined, supabase: any) {
  // Try to find existing asset by ISIN if provided
  if (isin) {
    const { data: existing } = await supabase
      .from('assets')
      .select('id, name')
      .eq('symbol', isin.toUpperCase())
      .eq('asset_type', 'mutual_fund')
      .maybeSingle();

    if (existing) {
      return existing.id;
    }
  }

  // Try to find by name
  const { data: existingByName } = await supabase
    .from('assets')
    .select('id, name')
    .eq('name', name)
    .eq('asset_type', 'mutual_fund')
    .maybeSingle();

  if (existingByName) {
    return existingByName.id;
  }

  // Create new asset
  const symbol = isin ? isin.toUpperCase() : `MF_${Date.now()}`;
  
  // Use new classification system
  // Default to equity-oriented MF (most common)
  const classification = classifyAsset('mutual_fund', { isEquityMF: true });
  
  const { data: newAsset, error } = await supabase
    .from('assets')
    .insert({
      symbol,
      name,
      asset_type: 'mutual_fund',
      asset_class: classification.assetClass,
      top_level_bucket: classification.topLevelBucket,
      risk_behavior: classification.riskBehavior,
      valuation_method: classification.valuationMethod,
      risk_bucket: 'medium',
      is_active: true,
    })
    .select('id')
    .single();

  if (error) {
    throw new Error('Failed to create asset');
  }

  return newAsset.id;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, amc, category, plan, folio, units, avgBuyNav, isin, user_id, scheme_code, purchaseDate } = body;

    // Validation
    if (!name || !units || !avgBuyNav || !amc) {
      return NextResponse.json(
        { error: 'Missing required fields: name, amc, units, avgBuyNav' },
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

    // Server-side validation: Verify scheme exists in mf_scheme_master
    let validatedIsin = isin;
    if (scheme_code) {
      const { data: schemeData, error: schemeError } = await supabase
        .from('mf_scheme_master')
        .select('scheme_code, scheme_name, amc_name, isin_growth, isin_div_payout, isin_div_reinvest')
        .eq('scheme_code', scheme_code)
        .eq('scheme_name', name)
        .eq('scheme_status', 'Active')
        .maybeSingle();

      if (schemeError || !schemeData) {
        return NextResponse.json(
          { error: 'Invalid scheme. Please select a valid scheme from the dropdown.' },
          { status: 400 }
        );
      }

      // Validate AMC matches - use amc_name column if available, otherwise extract
      const schemeAMC = schemeData.amc_name || extractAMC(schemeData.scheme_name);
      const amcLower = amc.toLowerCase().trim();
      const schemeAMCLower = schemeAMC.toLowerCase().trim();
      
      // Check if they match or if one contains the other (for variations)
      if (amcLower !== schemeAMCLower && 
          !amcLower.includes(schemeAMCLower) && 
          !schemeAMCLower.includes(amcLower)) {
        return NextResponse.json(
          { error: 'AMC mismatch. Please select a valid scheme from the dropdown.' },
          { status: 400 }
        );
      }

      // Use the correct ISIN from the database
      if (!validatedIsin) {
        if (plan?.includes('Dividend')) {
          validatedIsin = schemeData.isin_div_payout || schemeData.isin_div_reinvest || schemeData.isin_growth || '';
        } else {
          validatedIsin = schemeData.isin_growth || '';
        }
      }
    } else {
      // Fallback: Try to find scheme by name and validate AMC
      const { data: schemeData, error: schemeError } = await supabase
        .from('mf_scheme_master')
        .select('scheme_code, scheme_name, amc_name, isin_growth, isin_div_payout, isin_div_reinvest')
        .eq('scheme_name', name)
        .eq('scheme_status', 'Active')
        .maybeSingle();

      if (schemeError || !schemeData) {
        return NextResponse.json(
          { error: 'Invalid scheme. Please select a valid scheme from the dropdown.' },
          { status: 400 }
        );
      }

      // Validate AMC matches - use amc_name column if available, otherwise extract
      const schemeAMC = schemeData.amc_name || extractAMC(schemeData.scheme_name);
      const amcLower = amc.toLowerCase().trim();
      const schemeAMCLower = schemeAMC.toLowerCase().trim();
      
      // Check if they match or if one contains the other (for variations)
      if (amcLower !== schemeAMCLower && 
          !amcLower.includes(schemeAMCLower) && 
          !schemeAMCLower.includes(amcLower)) {
        return NextResponse.json(
          { error: 'AMC mismatch. Please select a valid scheme from the dropdown.' },
          { status: 400 }
        );
      }

      // Use the correct ISIN from the database
      if (!validatedIsin) {
        if (plan?.includes('Dividend')) {
          validatedIsin = schemeData.isin_div_payout || schemeData.isin_div_reinvest || schemeData.isin_growth || '';
        } else {
          validatedIsin = schemeData.isin_growth || '';
        }
      }
    }

    // Get or create portfolio
    const portfolioId = await getPrimaryPortfolio(user_id, supabase);

    // Create or get asset
    const assetId = await createOrGetMFAsset(name, validatedIsin, supabase);

    // Calculate values
    const investedValue = parseFloat(units) * parseFloat(avgBuyNav);
    // For MF, current value initially equals invested value (NAV will be updated later)
    const currentValue = investedValue;

    // Create metadata
    const metadata = {
      amc: amc || 'Other',
      category: category || 'Large Cap',
      plan: plan || 'Direct - Growth',
      folio: folio || null,
      isin: validatedIsin || null,
      purchase_date: purchaseDate || null, // Store purchase date for XIRR calculation
    };

    // Create holding
    const holdingData: any = {
      portfolio_id: portfolioId,
      asset_id: assetId,
      quantity: parseFloat(units),
      average_price: parseFloat(avgBuyNav),
      invested_value: investedValue,
      current_value: currentValue,
      source: 'manual',
      notes: JSON.stringify(metadata),
    };
    
    // Add purchase_date if provided (store in both column and metadata for backward compatibility)
    if (purchaseDate) {
      holdingData.purchase_date = purchaseDate;
    }
    
    const { data: holding, error: holdingError } = await supabase
      .from('holdings')
      .insert(holdingData)
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

    if (holdingError || !holding) {
      console.error('[MF Create API] Error creating holding:', holdingError);
      return NextResponse.json(
        { error: 'Failed to create holding' },
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
      allocation: 0, // Will be calculated by portfolio aggregation
    };

    return NextResponse.json(mf, { status: 201 });

  } catch (error: any) {
    console.error('[MF Create API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
