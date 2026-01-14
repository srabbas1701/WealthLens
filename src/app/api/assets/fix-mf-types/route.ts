// @ts-nocheck
/**
 * Fix Mutual Fund Asset Types
 *
 * POST /api/assets/fix-mf-types
 *
 * Updates assets that were incorrectly categorized as "other"
 * but should be "mutual_fund" or "index_fund" based on name patterns.
 *
 * This is a one-time fix for data uploaded before the improved
 * asset type detection was implemented.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

interface FixResult {
  success: boolean;
  mutualFundsFixed: number;
  indexFundsFixed: number;
  totalFixed: number;
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    
    console.log('[Fix MF Types] Starting fix for incorrectly categorized MF assets...');
    
    // Pattern 1: Find mutual fund candidates
    const { data: mfCandidates, error: mfFindError } = await supabase
      .from('assets')
      .select('id, name, asset_class, risk_bucket')
      .eq('asset_type', 'other');
    
    if (mfFindError) {
      console.error('[Fix MF Types] Error finding MF candidates:', mfFindError);
      return NextResponse.json<FixResult>(
        { 
          success: false, 
          mutualFundsFixed: 0,
          indexFundsFixed: 0,
          totalFixed: 0,
          error: mfFindError.message 
        },
        { status: 500 }
      );
    }
    
    if (!mfCandidates) {
      return NextResponse.json<FixResult>({
        success: true,
        mutualFundsFixed: 0,
        indexFundsFixed: 0,
        totalFixed: 0,
      });
    }
    
    // Filter to find mutual funds (exclude index funds for now)
    const mutualFunds = mfCandidates.filter(asset => {
      const nameLower = asset.name.toLowerCase();
      
      // Must have fund-related keywords
      const hasFundKeywords = nameLower.includes('fund') ||
        nameLower.includes('scheme') ||
        nameLower.includes('plan') ||
        nameLower.includes('mf') ||
        nameLower.includes('mutual');
      
      // Exclude if it's an ETF
      const isETF = nameLower.includes('etf') || 
        nameLower.includes('exchange traded');
      
      // Exclude other types
      const isOtherType = nameLower.includes('fixed deposit') ||
        nameLower.includes('fd') ||
        nameLower.includes('bond') ||
        nameLower.includes('gold') ||
        nameLower.includes('sgb') ||
        nameLower.includes('ppf') ||
        nameLower.includes('epf') ||
        nameLower.includes('nps');
      
      // Exclude if it's an index fund (handle separately)
      const isIndexFund = nameLower.includes('index') ||
        nameLower.includes('passive') ||
        nameLower.includes('nifty') ||
        nameLower.includes('sensex');
      
      return hasFundKeywords && !isETF && !isOtherType && !isIndexFund;
    });
    
    // Update each mutual fund individually
    let mutualFundsFixed = 0;
    for (const asset of mutualFunds) {
      const { error: updateError } = await supabase
        .from('assets')
        .update({
          asset_type: 'mutual_fund',
          asset_class: asset.asset_class && asset.asset_class !== 'other' ? asset.asset_class : 'equity',
          risk_bucket: asset.risk_bucket || 'medium',
          updated_at: new Date().toISOString(),
        })
        .eq('id', asset.id);
      
      if (updateError) {
        console.error(`[Fix MF Types] Error updating mutual fund "${asset.name}":`, updateError);
      } else {
        mutualFundsFixed++;
      }
    }
    
    if (mutualFundsFixed > 0) {
      console.log(`[Fix MF Types] Fixed ${mutualFundsFixed} mutual fund assets:`, 
        mutualFunds.slice(0, 5).map(a => a.name)
      );
    }
    
    // Pattern 2: Update to index_fund
    // Filter from remaining candidates that weren't already fixed
    const indexFunds = mfCandidates.filter(asset => {
      // Skip if already processed as mutual fund
      if (mutualFunds.some(mf => mf.id === asset.id)) {
        return false;
      }
      
      const nameLower = asset.name.toLowerCase();
      
      // Must have index-related keywords
      const hasIndexKeywords = nameLower.includes('index') ||
        nameLower.includes('passive') ||
        nameLower.includes('nifty') ||
        nameLower.includes('sensex');
      
      // Must also have fund keywords
      const hasFundKeywords = nameLower.includes('fund') ||
        nameLower.includes('scheme') ||
        nameLower.includes('plan');
      
      return hasIndexKeywords && hasFundKeywords;
    });
    
    let indexFundsFixed = 0;
    
    if (indexFunds.length > 0) {
      
      // Update each index fund individually
      for (const asset of indexFunds) {
        const { error: updateError } = await supabase
          .from('assets')
          .update({
            asset_type: 'index_fund',
            asset_class: asset.asset_class && asset.asset_class !== 'other' ? asset.asset_class : 'equity',
            risk_bucket: asset.risk_bucket || 'medium',
            updated_at: new Date().toISOString(),
          })
          .eq('id', asset.id);
        
        if (updateError) {
          console.error(`[Fix MF Types] Error updating index fund "${asset.name}":`, updateError);
        } else {
          indexFundsFixed++;
        }
      }
      
      if (indexFundsFixed > 0) {
        console.log(`[Fix MF Types] Fixed ${indexFundsFixed} index fund assets`);
      }
    }
    
    const totalFixed = mutualFundsFixed + indexFundsFixed;
    
    const result: FixResult = {
      success: true,
      mutualFundsFixed,
      indexFundsFixed,
      totalFixed,
    };
    
    if (totalFixed > 0) {
      console.log(`[Fix MF Types] ✅ Fixed ${totalFixed} assets (${mutualFundsFixed} mutual funds, ${indexFundsFixed} index funds)`);
    } else {
      console.log('[Fix MF Types] No assets needed fixing');
    }
    
    return NextResponse.json(result);
    
  } catch (error: any) {
    console.error('[Fix MF Types] Unexpected error:', error);
    return NextResponse.json<FixResult>(
      { 
        success: false, 
        mutualFundsFixed: 0,
        indexFundsFixed: 0,
        totalFixed: 0,
        error: error.message || 'Failed to fix asset types' 
      },
      { status: 500 }
    );
  }
}
