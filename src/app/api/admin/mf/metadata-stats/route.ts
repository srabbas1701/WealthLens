/**
 * Admin API: MF Metadata Statistics
 * 
 * GET /api/admin/mf/metadata-stats
 * 
 * Returns statistics about the metadata quality in mf_scheme_master table.
 * Helps monitor data quality after migration and backfill.
 * 
 * Returns:
 * {
 *   total: number,
 *   withCompleteMetadata: number,
 *   missingAMC: number,
 *   missingCategory: number,
 *   missingPlanType: number,
 *   amcIsOther: number,
 *   categoryIsOther: number,
 *   problematicSchemes: Array<{scheme_code, scheme_name, amc_name, category, plan_type}>
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();

    // Get total count
    const { count: totalCount, error: countError } = await supabase
      .from('mf_scheme_master')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('[MF Metadata Stats] Error getting total count:', countError);
      return NextResponse.json(
        { error: 'Failed to get statistics' },
        { status: 500 }
      );
    }

    const total = totalCount || 0;

    // Get schemes with missing/problematic metadata
    const { data: problematicSchemes, error: problematicError } = await supabase
      .from('mf_scheme_master')
      .select('scheme_code, scheme_name, amc_name, category, plan_type')
      .or('amc_name.is.null,amc_name.eq.Other,category.is.null,category.eq.Other,plan_type.is.null')
      .limit(10)
      .order('scheme_name', { ascending: true });

    if (problematicError) {
      console.error('[MF Metadata Stats] Error getting problematic schemes:', problematicError);
    }

    // Count missing AMC
    const { count: missingAMCCount } = await supabase
      .from('mf_scheme_master')
      .select('*', { count: 'exact', head: true })
      .or('amc_name.is.null,amc_name.eq.Other');

    // Count missing Category
    const { count: missingCategoryCount } = await supabase
      .from('mf_scheme_master')
      .select('*', { count: 'exact', head: true })
      .or('category.is.null,category.eq.Other');

    // Count missing Plan Type
    const { count: missingPlanTypeCount } = await supabase
      .from('mf_scheme_master')
      .select('*', { count: 'exact', head: true })
      .is('plan_type', null);

    // Count schemes with complete metadata
    const { count: completeMetadataCount } = await supabase
      .from('mf_scheme_master')
      .select('*', { count: 'exact', head: true })
      .not('amc_name', 'is', null)
      .neq('amc_name', 'Other')
      .not('category', 'is', null)
      .neq('category', 'Other')
      .not('plan_type', 'is', null);

    // Get AMC distribution
    const { data: amcDistribution } = await supabase
      .from('mf_scheme_master')
      .select('amc_name')
      .not('amc_name', 'is', null)
      .neq('amc_name', 'Other');

    const amcStats: Record<string, number> = {};
    if (amcDistribution) {
      amcDistribution.forEach((item: any) => {
        const amc = item.amc_name;
        amcStats[amc] = (amcStats[amc] || 0) + 1;
      });
    }

    // Get category distribution
    const { data: categoryDistribution } = await supabase
      .from('mf_scheme_master')
      .select('category')
      .not('category', 'is', null)
      .neq('category', 'Other');

    const categoryStats: Record<string, number> = {};
    if (categoryDistribution) {
      categoryDistribution.forEach((item: any) => {
        const category = item.category;
        categoryStats[category] = (categoryStats[category] || 0) + 1;
      });
    }

    // Get plan type distribution
    const { data: planDistribution } = await supabase
      .from('mf_scheme_master')
      .select('plan_type')
      .not('plan_type', 'is', null);

    const planStats: Record<string, number> = {};
    if (planDistribution) {
      planDistribution.forEach((item: any) => {
        const plan = item.plan_type;
        planStats[plan] = (planStats[plan] || 0) + 1;
      });
    }

    const stats = {
      total,
      withCompleteMetadata: completeMetadataCount || 0,
      missingAMC: missingAMCCount || 0,
      missingCategory: missingCategoryCount || 0,
      missingPlanType: missingPlanTypeCount || 0,
      metadataQuality: total > 0 
        ? Math.round(((completeMetadataCount || 0) / total) * 100) 
        : 0,
      topAMCs: Object.entries(amcStats)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([amc, count]) => ({ amc, count })),
      topCategories: Object.entries(categoryStats)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([category, count]) => ({ category, count })),
      planTypes: Object.entries(planStats)
        .sort(([, a], [, b]) => b - a)
        .map(([plan, count]) => ({ plan, count })),
      problematicSchemes: problematicSchemes || [],
    };

    return NextResponse.json(stats);
  } catch (error: any) {
    console.error('[MF Metadata Stats] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
