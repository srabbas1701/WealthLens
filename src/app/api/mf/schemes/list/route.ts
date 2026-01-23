/**
 * API Route: List Mutual Fund Schemes
 * 
 * GET /api/mf/schemes/list
 * 
 * Returns list of AMCs, categories, plans, or schemes filtered by AMC/Category/Plan
 * Uses database-level filtering with the normalized columns (amc_name, category, plan_type)
 * 
 * Query params:
 *   - amc: (optional) Filter schemes by amc_name
 *   - category: (optional) Filter schemes by category
 *   - plan: (optional) Filter schemes by plan_type
 * 
 * Returns:
 *   - Without params: Array of unique amc_name values
 *   - With amc only: Array of unique categories for that AMC
 *   - With amc + category: Array of unique plan_types for that AMC + category
 *   - With amc + category + plan: Array of {scheme_name, scheme_code, isin_*} for that combination
 * 
 * Performance: Uses indexed columns for fast database-level filtering
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { extractAMC, extractCategory, extractPlan } from '@/lib/mf-extraction-utils';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const amc = searchParams.get('amc');
    const category = searchParams.get('category');
    const plan = searchParams.get('plan');

    const supabase = createAdminClient();

    // Return schemes filtered by AMC + Category + Plan
    if (amc && category && plan) {
      const { data, error } = await supabase
        .from('mf_scheme_master')
        .select('scheme_name, scheme_code, isin_growth, isin_div_payout, isin_div_reinvest')
        .eq('scheme_status', 'Active')
        .eq('amc_name', amc)
        .eq('category', category)
        .eq('plan_type', plan)
        .order('scheme_name', { ascending: true });

      if (error) {
        console.error('[MF Schemes API] Error fetching schemes:', error);
        return NextResponse.json(
          { error: 'Failed to fetch schemes' },
          { status: 500 }
        );
      }

      // Fallback: If no results and columns might not be populated, try extraction
      if ((!data || data.length === 0) && (amc || category || plan)) {
        console.warn('[MF Schemes API] No results with database columns, trying fallback extraction');
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('mf_scheme_master')
          .select('scheme_name, scheme_code, isin_growth, isin_div_payout, isin_div_reinvest')
          .eq('scheme_status', 'Active')
          .order('scheme_name', { ascending: true });

        if (!fallbackError && fallbackData) {
          const filtered = (fallbackData || []).filter((scheme: any) => {
            const schemeAMC = extractAMC(scheme.scheme_name);
            const schemeCategory = extractCategory(scheme.scheme_name);
            const schemePlan = extractPlan(scheme.scheme_name);
            return schemeAMC === amc && schemeCategory === category && schemePlan === plan;
          });
          return NextResponse.json(filtered);
        }
      }

      return NextResponse.json(data || []);
    }

    // Return plans for AMC + Category
    if (amc && category) {
      const { data, error } = await supabase
        .from('mf_scheme_master')
        .select('plan_type')
        .eq('scheme_status', 'Active')
        .eq('amc_name', amc)
        .eq('category', category)
        .not('plan_type', 'is', null);

      if (error) {
        console.error('[MF Schemes API] Error fetching plans:', error);
        return NextResponse.json(
          { error: 'Failed to fetch plans' },
          { status: 500 }
        );
      }

      // Extract unique plan types
      const plans = Array.from(
        new Set((data || []).map((item: any) => item.plan_type).filter(Boolean))
      ).sort();

      // Fallback: If no results, try extraction
      if (plans.length === 0) {
        console.warn('[MF Schemes API] No results with database columns, trying fallback extraction');
        const { data: fallbackData } = await supabase
          .from('mf_scheme_master')
          .select('scheme_name')
          .eq('scheme_status', 'Active');

        if (fallbackData) {
          const extractedPlans = Array.from(
            new Set(
              (fallbackData || [])
                .filter((scheme: any) => {
                  const schemeAMC = extractAMC(scheme.scheme_name);
                  const schemeCategory = extractCategory(scheme.scheme_name);
                  return schemeAMC === amc && schemeCategory === category;
                })
                .map((scheme: any) => extractPlan(scheme.scheme_name))
            )
          ).sort();
          return NextResponse.json(extractedPlans);
        }
      }

      return NextResponse.json(plans);
    }

    // Return categories for a specific AMC
    if (amc) {
      const { data, error } = await supabase
        .from('mf_scheme_master')
        .select('category')
        .eq('scheme_status', 'Active')
        .eq('amc_name', amc)
        .not('category', 'is', null);

      if (error) {
        console.error('[MF Schemes API] Error fetching categories:', error);
        return NextResponse.json(
          { error: 'Failed to fetch categories' },
          { status: 500 }
        );
      }

      // Extract unique categories
      const categories = Array.from(
        new Set((data || []).map((item: any) => item.category).filter(Boolean))
      ).sort();

      // Fallback: If no results, try extraction
      if (categories.length === 0) {
        console.warn('[MF Schemes API] No results with database columns, trying fallback extraction');
        const { data: fallbackData } = await supabase
          .from('mf_scheme_master')
          .select('scheme_name')
          .eq('scheme_status', 'Active');

        if (fallbackData) {
          const extractedCategories = Array.from(
            new Set(
              (fallbackData || [])
                .filter((scheme: any) => extractAMC(scheme.scheme_name) === amc)
                .map((scheme: any) => extractCategory(scheme.scheme_name))
            )
          ).sort();
          return NextResponse.json(extractedCategories);
        }
      }

      return NextResponse.json(categories);
    }

    // Return unique AMCs - SIMPLE: Just get DISTINCT amc_name from database
    // The database should have correct AMC names, so we just need distinct values
    // Use pagination to get ALL AMCs (Supabase default limit is 1000 rows)
    const allAMCNames = new Set<string>();
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;
    
    while (hasMore) {
      const from = page * pageSize;
      const to = from + pageSize - 1;
      
      const { data, error } = await supabase
        .from('mf_scheme_master')
        .select('amc_name')  // Only select amc_name column
        .eq('scheme_status', 'Active')
        .not('amc_name', 'is', null)
        .neq('amc_name', 'Other')
        .range(from, to);
      
      if (error) {
        console.error(`[MF Schemes API] Error fetching AMCs (page ${page}):`, error.message);
        // If first page fails, try without scheme_status filter
        if (page === 0) {
          console.warn('[MF Schemes API] Error with scheme_status filter, trying without');
          const fallbackQuery = await supabase
            .from('mf_scheme_master')
            .select('amc_name')
            .not('amc_name', 'is', null)
            .neq('amc_name', 'Other')
            .range(from, to);
          
          if (fallbackQuery.error) {
            console.error('[MF Schemes API] Error fetching AMCs (fallback):', fallbackQuery.error);
            break;
          }
          
          // Add to set (automatically handles uniqueness)
          (fallbackQuery.data || []).forEach((item: any) => {
            if (item?.amc_name && typeof item.amc_name === 'string') {
              const trimmed = item.amc_name.trim();
              if (trimmed && trimmed !== 'Other') {
                allAMCNames.add(trimmed);
              }
            }
          });
          hasMore = (fallbackQuery.data?.length || 0) >= pageSize;
        } else {
          break;
        }
      } else {
        // Add to set (automatically handles uniqueness)
        (data || []).forEach((item: any) => {
          if (item?.amc_name && typeof item.amc_name === 'string') {
            const trimmed = item.amc_name.trim();
            if (trimmed && trimmed !== 'Other') {
              allAMCNames.add(trimmed);
            }
          }
        });
        hasMore = (data?.length || 0) >= pageSize;
      }
      
      if (hasMore) {
        page++;
      }
    }
    
    // Convert Set to sorted array
    // Filter out obvious scheme names (entries that contain scheme keywords)
    const schemeKeywords = [
      'multi asset', 'asset allocation', 'multi sector', 'sector rotation',
      'banking &', '& psu', 'fixed maturity', 'short duration', 'multi cap',
      'unclaimed', 'redemption', 'education pool', 'ethical', 'infrastructure',
      'value', 'liquid', 'money market', 'overnight', 'bond', 'etf', 'fof',
      'nifty', 'index', 'sensex', 'bse', 'bharat', 'cpse',
      'aggressive hybrid', 'balanced advantage', 'elss tax saver', 'flexi cap',
      'large cap', 'mid cap', 'small cap', 'arbitrage'
    ];
    
    const filteredAMCs = Array.from(allAMCNames).filter(amc => {
      const amcLower = amc.toLowerCase();
      // Reject if contains scheme keywords (these are scheme names, not AMC names)
      if (schemeKeywords.some(keyword => amcLower.includes(keyword))) {
        console.warn(`[MF Schemes API] Filtering out scheme name as AMC: ${amc}`);
        return false;
      }
      // Reject if contains numbers (AMC names don't have numbers)
      if (/\d/.test(amc)) {
        console.warn(`[MF Schemes API] Filtering out AMC with numbers: ${amc}`);
        return false;
      }
      return true;
    }).sort();

    console.log(`[MF Schemes API] Returning ${filteredAMCs.length} unique AMCs from database (filtered from ${allAMCNames.size} total)`);
    console.log(`[MF Schemes API] Sample AMCs (first 10):`, filteredAMCs.slice(0, 10));
    
    if (filteredAMCs.length === 0) {
      console.error('[MF Schemes API] WARNING: No AMCs found after filtering!');
      return NextResponse.json([]);
    }
    
    return NextResponse.json(filteredAMCs);
  } catch (error: any) {
    console.error('[MF Schemes API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
