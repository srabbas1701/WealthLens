/**
 * Real Estate Valuation Trigger Utility
 * 
 * Non-blocking utility to trigger valuation updates asynchronously.
 * Used after asset creation and when location/area fields are updated.
 * 
 * @module lib/real-estate/trigger-valuation
 */

import { valuateRealEstateAsset } from '@/services/realEstateValuation.service';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

type SupabaseClientType = SupabaseClient<Database>;

/**
 * Trigger valuation update asynchronously (non-blocking)
 * 
 * This function:
 * - Triggers valuation in the background
 * - Does NOT block the calling function
 * - Logs errors but does not throw
 * - Returns immediately
 * 
 * Usage:
 * - After asset creation
 * - After location/area updates
 * 
 * @param supabase - Authenticated Supabase client
 * @param assetId - Asset ID to valuate
 */
export async function triggerValuationAsync(
  supabase: SupabaseClientType,
  assetId: string
): Promise<void> {
  // Fire and forget - don't await, don't block
  valuateRealEstateAsset(supabase, assetId)
    .then((result) => {
      if (result.success) {
        console.log(`[triggerValuationAsync] Valuation updated for asset ${assetId}:`, {
          min: result.newMin,
          max: result.newMax,
        });
      } else {
        console.warn(`[triggerValuationAsync] Valuation failed for asset ${assetId}:`, result.error);
      }
    })
    .catch((error) => {
      // Log error but don't throw - this is async, non-blocking
      console.error(`[triggerValuationAsync] Error triggering valuation for asset ${assetId}:`, error);
    });
}

/**
 * Check if location or area fields were updated
 * 
 * Determines if valuation should be triggered after an update.
 * 
 * @param updates - Update object
 * @returns true if location or area fields were changed
 */
export function shouldTriggerValuation(updates: {
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  address?: string | null;
  carpet_area_sqft?: number | null;
  builtup_area_sqft?: number | null;
}): boolean {
  // Check if any location or area field is being updated
  return (
    updates.city !== undefined ||
    updates.state !== undefined ||
    updates.pincode !== undefined ||
    updates.address !== undefined ||
    updates.carpet_area_sqft !== undefined ||
    updates.builtup_area_sqft !== undefined
  );
}
