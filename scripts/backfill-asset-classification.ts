/**
 * Backfill Asset Classification Script
 * 
 * This script populates the new classification fields (top_level_bucket, risk_behavior, valuation_method)
 * for all existing assets based on their asset_type using the classification service.
 * 
 * Usage:
 * 1. Run this script after the migration is complete
 * 2. It will update all assets with their proper classification
 * 3. The triggers will automatically sync to holdings
 * 
 * Run with: npx tsx scripts/backfill-asset-classification.ts
 * 
 * Note: Requires .env.local file with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 */

import { createAdminClient } from '../src/lib/supabase/server';
import { classifyAsset } from '../src/lib/asset-classification';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables from .env.local file
function loadEnvFromFile() {
  const envPath = path.join(process.cwd(), '.env.local');
  
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const lines = envContent.split(/\r?\n/);
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const match = trimmed.match(/^([^=]+)=(.*)$/);
        if (match) {
          const key = match[1].trim();
          let value = match[2].trim();
          // Remove quotes if present
          value = value.replace(/^["']+|["']+$/g, '');
          process.env[key] = value;
        }
      }
    }
  } else {
    console.warn('⚠️  .env.local file not found. Make sure it exists in the project root.');
  }
}

// Load env variables from .env.local before creating the client
loadEnvFromFile();

async function backfillAssetClassification() {
  console.log('🚀 Starting asset classification backfill...\n');

  const supabase = createAdminClient();

  try {
    // 1. Fetch all assets
    console.log('📊 Fetching all assets...');
    const { data: assets, error: fetchError } = await supabase
      .from('assets')
      .select('id, name, asset_type, asset_class')
      .order('created_at', { ascending: true });

    if (fetchError) {
      throw new Error(`Failed to fetch assets: ${fetchError.message}`);
    }

    if (!assets || assets.length === 0) {
      console.log('✅ No assets found. Nothing to backfill.');
      return;
    }

    console.log(`📦 Found ${assets.length} assets to process\n`);

    // 2. Classify and update each asset
    let updated = 0;
    let skipped = 0;
    let errors = 0;

    for (const asset of assets) {
      try {
        // Classify the asset based on asset_type
        // Note: Additional metadata (like ULIP/NPS allocation, MF types) would need to be
        // stored in a metadata column or retrieved from holdings if needed
        const classification = classifyAsset(asset.asset_type, {
          isRealEstate: asset.asset_type === 'real_estate',
        });

        // Update the asset with classification
        const { error: updateError } = await supabase
          .from('assets')
          .update({
            asset_class: classification.assetClass,
            top_level_bucket: classification.topLevelBucket,
            risk_behavior: classification.riskBehavior,
            valuation_method: classification.valuationMethod,
            updated_at: new Date().toISOString(),
          })
          .eq('id', asset.id);

        if (updateError) {
          console.error(`❌ Error updating asset ${asset.name} (${asset.id}):`, updateError.message);
          errors++;
        } else {
          updated++;
          if (updated % 10 === 0) {
            console.log(`  ✓ Processed ${updated}/${assets.length} assets...`);
          }
        }
      } catch (error: any) {
        console.error(`❌ Error processing asset ${asset.name} (${asset.id}):`, error.message);
        errors++;
      }
    }

    // 3. Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 Backfill Summary:');
    console.log(`  ✅ Updated: ${updated}`);
    console.log(`  ⏭️  Skipped: ${skipped}`);
    console.log(`  ❌ Errors: ${errors}`);
    console.log(`  📦 Total: ${assets.length}`);
    console.log('='.repeat(50) + '\n');

    if (errors === 0) {
      console.log('🎉 Backfill completed successfully!');
    } else {
      console.log('⚠️  Backfill completed with some errors. Please review the errors above.');
    }

    // 4. Verify results
    console.log('\n🔍 Verifying results...');
    const { data: verification, error: verifyError } = await supabase
      .from('assets')
      .select('id, asset_class, top_level_bucket, risk_behavior, valuation_method')
      .limit(5);

    if (!verifyError && verification) {
      console.log('\nSample of updated assets:');
      verification.forEach((asset: any) => {
        console.log(`  - ${asset.asset_class} → ${asset.top_level_bucket} (${asset.risk_behavior}, ${asset.valuation_method})`);
      });
    }

  } catch (error: any) {
    console.error('\n❌ Fatal error during backfill:', error.message);
    process.exit(1);
  }
}

// Run the backfill
backfillAssetClassification()
  .then(() => {
    console.log('\n✅ Script completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
