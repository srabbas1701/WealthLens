/**
 * Backfill Script: Populate MF Scheme Master Metadata
 * 
 * This script populates the amc_name, category, and plan_type columns
 * in the mf_scheme_master table using extraction functions.
 * 
 * Usage: npx tsx src/scripts/backfill-mf-metadata.ts
 * 
 * The script:
 * 1. Fetches all schemes from mf_scheme_master
 * 2. Extracts metadata using extraction functions
 * 3. Updates each row with the extracted values
 * 4. Shows progress and summary statistics
 */

// Load environment variables from .env.local
import { readFileSync } from 'fs';
import { resolve } from 'path';

function loadEnvFile() {
  const envPaths = [
    resolve(process.cwd(), '.env.local'),
    resolve(process.cwd(), '.env'),
  ];

  for (const envPath of envPaths) {
    try {
      const envContent = readFileSync(envPath, 'utf-8');
      const lines = envContent.split('\n');
      
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const [key, ...valueParts] = trimmed.split('=');
          if (key && valueParts.length > 0) {
            const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
            if (!process.env[key]) {
              process.env[key] = value;
            }
          }
        }
      }
      console.log(`✅ Loaded environment variables from ${envPath}`);
      return;
    } catch (error) {
      // File doesn't exist, try next
      continue;
    }
  }
}

// Load environment variables
loadEnvFile();

// Verify required environment variables
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables!');
  console.error('Please ensure .env.local contains:');
  console.error('  - NEXT_PUBLIC_SUPABASE_URL');
  console.error('  - SUPABASE_SERVICE_ROLE_KEY');
  console.error('\nCurrent values:');
  console.error(`  NEXT_PUBLIC_SUPABASE_URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing'}`);
  console.error(`  SUPABASE_SERVICE_ROLE_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Missing'}`);
  process.exit(1);
}

import { createAdminClient } from '@/lib/supabase/server';
import { extractAMC, extractCategory, extractPlan } from '@/lib/mf-extraction-utils';

interface Scheme {
  id: string;
  scheme_code: string;
  scheme_name: string;
  amc_name: string | null;
  category: string | null;
  plan_type: string | null;
}

interface Stats {
  total: number;
  processed: number;
  updated: number;
  skipped: number;
  errors: number;
  amcStats: Record<string, number>;
  categoryStats: Record<string, number>;
  planStats: Record<string, number>;
}

async function backfillMFMetadata() {
  console.log('🚀 Starting MF Scheme Master metadata backfill...\n');

  const supabase = createAdminClient();
  const stats: Stats = {
    total: 0,
    processed: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
    amcStats: {},
    categoryStats: {},
    planStats: {},
  };

  try {
    // Get total count (PostgREST defaults to max 1000 rows per response)
    console.log('📊 Counting schemes in mf_scheme_master...');
    const { count: totalCount, error: countError } = await supabase
      .from('mf_scheme_master')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      throw new Error(`Failed to count schemes: ${countError.message}`);
    }

    stats.total = totalCount || 0;
    if (stats.total === 0) {
      console.log('⚠️  No schemes found in mf_scheme_master table');
      return;
    }

    console.log(`✅ Found ${stats.total} schemes to process\n`);

    // Pagination: fetch in pages (Supabase/PostgREST caps responses; use range)
    const PAGE_SIZE = 1000;
    const totalPages = Math.ceil(stats.total / PAGE_SIZE);

    for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
      const from = pageIndex * PAGE_SIZE;
      const to = Math.min(from + PAGE_SIZE - 1, stats.total - 1);

      console.log(`📦 Fetching page ${pageIndex + 1}/${totalPages} (rows ${from + 1}-${to + 1})...`);

      const { data: schemes, error: fetchError } = await supabase
        .from('mf_scheme_master')
        .select('id, scheme_code, scheme_name, amc_name, category, plan_type')
        // Order by primary key for stable pagination
        .order('id', { ascending: true })
        .range(from, to);

      if (fetchError) {
        throw new Error(`Failed to fetch schemes (page ${pageIndex + 1}): ${fetchError.message}`);
      }

      if (!schemes || schemes.length === 0) {
        console.warn(`⚠️  No rows returned for page ${pageIndex + 1}. Stopping early.`);
        break;
      }

      // Build upserts for this page (much faster than 14k individual updates)
      // IMPORTANT: upsert performs an INSERT first, so we must include NOT NULL columns too
      // (scheme_code, scheme_name) to avoid NOT NULL constraint failures.
      const updates: Array<{
        id: string;
        scheme_code: string;
        scheme_name: string;
        amc_name: string | null;
        category: string | null;
        plan_type: string | null;
      }> = [];

      for (const scheme of schemes as any[]) {
        try {
          const schemeName = scheme.scheme_name || '';
          
          // Extract metadata
          const amcName = extractAMC(schemeName);
          const category = extractCategory(schemeName);
          const planType = extractPlan(schemeName);

          // Check if update is needed
          // IMPORTANT: Always update if current value is suspiciously long (might be scheme name)
          const currentAMC = scheme.amc_name;
          const isSuspiciouslyLong = currentAMC && currentAMC.length > 50; // Scheme names are typically 50+ chars
          
          const needsUpdate = 
            isSuspiciouslyLong || // Force update if current value looks like a scheme name
            (scheme.amc_name || null) !== (amcName === 'Other' ? null : amcName) ||
            (scheme.category || null) !== (category === 'Other' ? null : category) ||
            (scheme.plan_type || null) !== planType;

          if (!needsUpdate) {
            stats.skipped++;
            stats.processed++;
            continue;
          }

          updates.push({
            id: scheme.id,
            scheme_code: scheme.scheme_code,
            scheme_name: scheme.scheme_name,
            amc_name: amcName === 'Other' ? null : amcName,
            category: category === 'Other' ? null : category,
            plan_type: planType || null,
          });

          // Stats (based on extracted values)
          stats.amcStats[amcName] = (stats.amcStats[amcName] || 0) + 1;
          stats.categoryStats[category] = (stats.categoryStats[category] || 0) + 1;
          stats.planStats[planType] = (stats.planStats[planType] || 0) + 1;

          stats.processed++;

          // Show progress every 100 schemes
          if (stats.processed % 100 === 0) {
            console.log(`   Progress: ${stats.processed}/${stats.total} (${Math.round((stats.processed / stats.total) * 100)}%)`);
          }
        } catch (error: any) {
          console.error(`❌ Error processing scheme ${scheme.scheme_code}: ${error.message}`);
          stats.errors++;
          stats.processed++;
        }
      }

      if (updates.length > 0) {
        const { error: upsertError } = await supabase
          .from('mf_scheme_master')
          .upsert(updates, { onConflict: 'id', ignoreDuplicates: false });

        if (upsertError) {
          console.error(`❌ Error upserting page ${pageIndex + 1}: ${upsertError.message}`);
          stats.errors++;
        } else {
          stats.updated += updates.length;
        }
      }
    }

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📈 BACKFILL SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total schemes:     ${stats.total}`);
    console.log(`Processed:         ${stats.processed}`);
    console.log(`Updated:           ${stats.updated}`);
    console.log(`Skipped (no change): ${stats.skipped}`);
    console.log(`Errors:            ${stats.errors}`);
    console.log('');

    // Top AMCs
    console.log('🏢 Top 10 AMCs:');
    const topAMCs = Object.entries(stats.amcStats)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10);
    topAMCs.forEach(([amc, count], index) => {
      console.log(`   ${index + 1}. ${amc}: ${count} schemes`);
    });
    console.log('');

    // Top Categories
    console.log('📂 Top 10 Categories:');
    const topCategories = Object.entries(stats.categoryStats)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10);
    topCategories.forEach(([category, count], index) => {
      console.log(`   ${index + 1}. ${category}: ${count} schemes`);
    });
    console.log('');

    // Plan Types
    console.log('📋 Plan Types:');
    const planTypes = Object.entries(stats.planStats)
      .sort(([, a], [, b]) => b - a);
    planTypes.forEach(([plan, count]) => {
      console.log(`   ${plan}: ${count} schemes`);
    });
    console.log('');

    // Check for problematic schemes
    const { data: problematicSchemes } = await supabase
      .from('mf_scheme_master')
      .select('scheme_code, scheme_name, amc_name, category, plan_type')
      .or('amc_name.is.null,amc_name.eq.Other,category.is.null,category.eq.Other,plan_type.is.null')
      .limit(10);

    if (problematicSchemes && problematicSchemes.length > 0) {
      console.log('⚠️  Sample schemes with missing/problematic metadata:');
      problematicSchemes.forEach((scheme, index) => {
        console.log(`   ${index + 1}. ${scheme.scheme_code}: ${scheme.scheme_name}`);
        console.log(`      AMC: ${scheme.amc_name || 'NULL'}, Category: ${scheme.category || 'NULL'}, Plan: ${scheme.plan_type || 'NULL'}`);
      });
      console.log('');
    }

    console.log('✅ Backfill completed successfully!');
  } catch (error: any) {
    console.error('\n❌ Fatal error during backfill:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the backfill
backfillMFMetadata()
  .then(() => {
    console.log('\n✨ Script finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Unhandled error:', error);
    process.exit(1);
  });
