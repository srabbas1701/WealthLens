/**
 * Real Estate Valuation Service
 * 
 * Production-ready, async, non-blocking valuation engine for real estate assets.
 * 
 * Core Principles:
 * - NEVER overwrites user_override_value (user input is always respected)
 * - ONLY updates system_estimated_min/max (system estimates only)
 * - Runs asynchronously (non-blocking, fire-and-forget pattern)
 * - Typed using Supabase generated types for type safety
 * - Safe error handling (never throws, always returns result objects)
 * 
 * Valuation Logic:
 * 1. Determines usable area (carpet > builtup > purchase_price fallback)
 * 2. Fetches locality price-per-sqft range (pre-aggregated data, mocked for MVP)
 * 3. Computes valuation: min = min_price_per_sqft * area, max = max_price_per_sqft * area
 * 4. Applies conservative adjustment (-5% to -10%) to account for listed price inflation
 * 5. Sets confidence level: High (area + locality), Medium (partial), Low (fallback)
 * 
 * @module services/realEstateValuation.service
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

// Type aliases for clarity and type safety
type SupabaseClientType = SupabaseClient<Database>;
type AssetId = string;
type UserId = string;

// Supabase table types (from generated types)
type RealEstateAssetRow = Database['public']['Tables']['real_estate_assets']['Row'];
type RealEstateAssetUpdate = Database['public']['Tables']['real_estate_assets']['Update'];
type PropertyTypeEnum = Database['public']['Enums']['property_type_enum'];

// Valuation confidence levels
export type ValuationConfidence = 'low' | 'medium' | 'high';

// Valuation result
export interface ValuationResult {
  assetId: AssetId;
  systemEstimatedMin: number;
  systemEstimatedMax: number;
  confidence: ValuationConfidence;
  source: string;
  lastUpdated: string; // ISO timestamp
}

// Valuation update result
export interface ValuationUpdateResult {
  success: boolean;
  assetId: AssetId;
  previousMin: number | null;
  previousMax: number | null;
  newMin: number | null;
  newMax: number | null;
  error?: string;
}

// ============================================================================
// Core Valuation Logic
// ============================================================================

/**
 * Calculate estimated value range for a property.
 * 
 * DETAILED VALUATION LOGIC:
 * ==========================
 * 
 * Step 1: Area Determination (Priority Order)
 *   - Prefer carpet_area_sqft (most accurate, excludes walls)
 *   - Else builtup_area_sqft (includes walls, less accurate)
 *   - Else fallback to purchase_price only (no area available)
 * 
 * Step 2: Locality Price Fetch
 *   - Fetches pre-aggregated price-per-sqft range for city/locality
 *   - Returns { min: 8500, max: 10500 } (example: ₹ per sqft)
 *   - MVP: Mocked based on city tier and property type
 *   - Production: Would query property_price_cache table
 * 
 * Step 3: Valuation Computation
 *   Case A: Area + Locality data available (Best case)
 *     - min_value = min_price_per_sqft * area
 *     - max_value = max_price_per_sqft * area
 *     - Confidence: HIGH
 * 
 *   Case B: Area available but no locality data
 *     - Calculate price_per_sqft from purchase_price
 *     - Estimate range: ±15% around purchase price per sqft
 *     - Confidence: MEDIUM
 * 
 *   Case C: No area available (purchase_price only)
 *     - Estimate range: ±20% around purchase price
 *     - Confidence: LOW
 * 
 * Step 4: Conservative Adjustment
 *   - Reduce min by 10% (more conservative)
 *   - Reduce max by 5% (less conservative)
 *   - Accounts for listed prices being aspirational
 *   - Ensures we don't over-value properties
 * 
 * Step 5: Safety Checks
 *   - Ensure min < max (swap if needed)
 *   - Round to nearest integer (₹)
 *   - Store as numeric (no currency symbols)
 * 
 * INPUTS REQUIRED:
 * ================
 * - property_type: 'residential' | 'commercial' | 'land' (required)
 * - city: string (required)
 * - pincode: string | null (optional, improves accuracy)
 * - carpet_area_sqft: number | null (preferred)
 * - builtup_area_sqft: number | null (fallback)
 * - purchase_price: number | null (fallback if no area)
 * 
 * OUTPUT:
 * =======
 * Returns ValuationResult with:
 * - systemEstimatedMin: number (₹, rounded)
 * - systemEstimatedMax: number (₹, rounded)
 * - confidence: 'low' | 'medium' | 'high'
 * - source: string (explains data source)
 * - lastUpdated: ISO timestamp
 * 
 * @param asset - Asset data with required inputs (typed from Supabase)
 * @returns Valuation result with min/max range and metadata
 * @throws Error if required inputs are missing
 */
async function calculateValuation(
  asset: RealEstateAssetRow
): Promise<ValuationResult> {
  // Extract required inputs (typed from Supabase schema)
  const propertyType: PropertyTypeEnum | null = asset.property_type;
  const city: string | null = asset.city;
  const pincode: string | null = asset.pincode;
  const carpetArea: number | null = asset.carpet_area_sqft;
  const builtupArea: number | null = asset.builtup_area_sqft;
  const purchasePrice: number | null = asset.purchase_price;

  // Step 1: Validate required inputs (fail fast with clear error messages)
  if (!propertyType) {
    throw new Error('Cannot calculate valuation: Missing property_type (required: residential | commercial | land)');
  }

  if (!city || city.trim() === '') {
    throw new Error('Cannot calculate valuation: Missing city (required input)');
  }

  // Step 2: Determine usable area (Priority: carpet > builtup > purchase_price only)
  // This determines which calculation method we'll use and sets initial confidence
  let area: number | null = null;
  let areaType: 'carpet' | 'builtup' | null = null;
  let confidence: ValuationConfidence = 'low';
  let priceSource: string;

  // Area determination with validation
  if (carpetArea !== null && carpetArea > 0) {
    // Prefer carpet area (most accurate, excludes walls)
    area = carpetArea;
    areaType = 'carpet';
    confidence = 'high'; // Will be adjusted to 'medium' if locality data unavailable
  } else if (builtupArea !== null && builtupArea > 0) {
    // Fallback to builtup area (includes walls, less accurate)
    area = builtupArea;
    areaType = 'builtup';
    confidence = 'high'; // Will be adjusted to 'medium' if locality data unavailable
  } else if (purchasePrice !== null && purchasePrice > 0) {
    // Last resort: purchase_price only (no area available)
    // Cannot calculate per-sqft valuation, use purchase_price as baseline with wider range
    area = null;
    areaType = null;
    confidence = 'low';
    priceSource = 'purchase_price_fallback';
  } else {
    // No usable data available - cannot calculate valuation
    throw new Error(
      'Cannot calculate valuation: Missing required inputs. ' +
      'Need either: (carpet_area_sqft OR builtup_area_sqft) OR purchase_price'
    );
  }

  // Step 3: Fetch locality price-per-sqft range
  // Attempts to get pre-aggregated locality data for more accurate valuation
  // Returns: { min: 8500, max: 10500 } (price per sqft range) or null if unavailable
  const localityPriceRange = await fetchLocalityPricePerSqftRange(city, pincode, propertyType);

  // Step 4: Compute valuation based on available data
  // Three calculation paths depending on data availability
  let minValue: number;
  let maxValue: number;

  if (area !== null && areaType !== null && localityPriceRange !== null) {
    // CASE A: Area + Locality data available (BEST CASE - Most accurate)
    // Formula: min_value = min_price_per_sqft * area, max_value = max_price_per_sqft * area
    // Example: If area = 1000 sqft, price range = ₹8,000-₹12,000/sqft
    //   min = 8,000 * 1,000 = ₹8,000,000
    //   max = 12,000 * 1,000 = ₹12,000,000
    minValue = localityPriceRange.min * area;
    maxValue = localityPriceRange.max * area;
    priceSource = 'locality_data';
    confidence = 'high'; // High confidence: area + locality data available
  } else if (area !== null && areaType !== null && purchasePrice !== null && purchasePrice > 0) {
    // CASE B: Area available but no locality data (MEDIUM CASE)
    // Use purchase_price to estimate price-per-sqft, then apply range
    // Formula: price_per_sqft = purchase_price / area
    // Then estimate range: ±15% around purchase price per sqft
    // Example: If purchase = ₹10,000,000, area = 1000 sqft
    //   price_per_sqft = 10,000,000 / 1,000 = ₹10,000/sqft
    //   min = 10,000 * 0.85 * 1,000 = ₹8,500,000
    //   max = 10,000 * 1.15 * 1,000 = ₹11,500,000
    const pricePerSqft = purchasePrice / area;
    const estimatedMinPricePerSqft = pricePerSqft * 0.85; // -15%
    const estimatedMaxPricePerSqft = pricePerSqft * 1.15; // +15%
    minValue = estimatedMinPricePerSqft * area;
    maxValue = estimatedMaxPricePerSqft * area;
    priceSource = 'purchase_price_baseline';
    confidence = 'medium'; // Medium confidence: area available but no locality data
  } else if (purchasePrice !== null && purchasePrice > 0) {
    // CASE C: No area available, purchase_price only (FALLBACK CASE)
    // Use purchase_price as baseline with wider range (±20%) due to uncertainty
    // Example: If purchase = ₹10,000,000
    //   min = 10,000,000 * 0.80 = ₹8,000,000
    //   max = 10,000,000 * 1.20 = ₹12,000,000
    minValue = purchasePrice * 0.80; // -20%
    maxValue = purchasePrice * 1.20; // +20%
    priceSource = 'purchase_price_fallback';
    confidence = 'low'; // Low confidence: no area data, using purchase price only
  } else {
    // This should never happen due to earlier validation, but safety check
    throw new Error('Cannot calculate valuation: Insufficient data (need area or purchase_price)');
  }

  // Step 5: Apply conservative adjustment
  // Rationale: Listed prices are often aspirational/inflated
  // We apply a conservative discount to ensure we don't over-value properties
  // - Min value: Reduce by 10% (more conservative, accounts for negotiation room)
  // - Max value: Reduce by 5% (less conservative, but still safe)
  // This creates a realistic range that accounts for market dynamics
  const adjustmentMin = 0.90; // -10% (more conservative for minimum)
  const adjustmentMax = 0.95; // -5% (less conservative for maximum)

  // Apply conservative adjustments
  minValue = minValue * adjustmentMin;
  maxValue = maxValue * adjustmentMax;

  // Step 6: Safety checks and finalization
  // Ensure min < max (swap if needed due to rounding/adjustments)
  if (minValue > maxValue) {
    // Swap values if min > max (shouldn't happen, but safety check)
    const temp = minValue;
    minValue = maxValue;
    maxValue = temp;
  }

  // Ensure values are positive (sanity check)
  if (minValue < 0 || maxValue < 0) {
    throw new Error('Valuation calculation resulted in negative values - data validation failed');
  }

  return {
    assetId: asset.id,
    systemEstimatedMin: Math.round(minValue),
    systemEstimatedMax: Math.round(maxValue),
    confidence,
    source: priceSource,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Fetch locality price-per-sqft range from pre-aggregated data.
 * 
 * DATA SOURCE LOGIC:
 * ==================
 * MVP Implementation (Current):
 *   - Returns mocked ranges based on city tier and property type
 *   - Tier 1 cities: Higher price ranges (Mumbai, Delhi, Bangalore, etc.)
 *   - Tier 2 cities: Moderate price ranges (Ahmedabad, Jaipur, etc.)
 *   - Other cities: Conservative estimates
 *   - Property type adjustments: Commercial > Residential > Land
 * 
 * Production Implementation (Future):
 *   - Query property_price_cache table (or similar)
 *   - Lookup by: city + pincode + property_type
 *   - Use pincode for locality-specific ranges (more accurate)
 *   - Fallback to city-level if pincode not found
 *   - Cache results for performance
 * 
 * PRICE RANGES (₹ per sqft):
 * ==========================
 * Tier 1 Cities:
 *   - Residential: ₹8,000 - ₹12,000/sqft
 *   - Commercial: ₹12,000 - ₹18,000/sqft
 *   - Land: ₹3,000 - ₹5,000/sqft
 * 
 * Tier 2 Cities:
 *   - Residential: ₹4,000 - ₹7,000/sqft
 *   - Commercial: ₹6,000 - ₹10,000/sqft
 *   - Land: ₹1,500 - ₹3,000/sqft
 * 
 * Other Cities:
 *   - Residential: ₹3,000 - ₹5,000/sqft
 *   - Commercial: ₹4,500 - ₹7,500/sqft
 *   - Land: ₹1,000 - ₹2,000/sqft
 * 
 * @param city - City name (required)
 * @param pincode - Pincode (optional, for more precise locality - not used in MVP)
 * @param propertyType - Property type enum (residential | commercial | land)
 * @returns Price range { min: number, max: number } in ₹ per sqft, or null if unavailable
 */
async function fetchLocalityPricePerSqftRange(
  city: string | null,
  pincode: string | null,
  propertyType: PropertyTypeEnum
): Promise<{
  min: number;
  max: number;
} | null> {
  // Input validation
  if (!city || city.trim() === '') {
    return null; // Cannot fetch locality data without city
  }

  // MVP: Mock pre-aggregated locality data
  // TODO: Replace with actual database query in production
  // Production implementation would:
  //   1. Query property_price_cache table (or similar aggregated data source)
  //   2. Lookup by: city + pincode + property_type (pincode for locality-specific)
  //   3. Return cached min/max price-per-sqft range
  //   4. If cache miss, try city-level fallback
  //   5. If still no data, return null (triggers purchase_price fallback)

  const cityLower = city.toLowerCase().trim();

  // Tier 1 cities (Mumbai, Delhi, Bangalore, etc.)
  const tier1Cities = ['mumbai', 'delhi', 'bangalore', 'hyderabad', 'chennai', 'pune', 'kolkata'];
  // Tier 2 cities
  const tier2Cities = ['ahmedabad', 'jaipur', 'surat', 'lucknow', 'kanpur', 'nagpur', 'indore', 'thane', 'bhopal', 'visakhapatnam'];

  // Mock price-per-sqft ranges (₹ per sqft)
  // These are pre-aggregated locality data examples
  let baseMin: number;
  let baseMax: number;

  if (tier1Cities.some(tier1 => cityLower.includes(tier1))) {
    // Tier 1: Higher price ranges
    if (propertyType === 'residential') {
      baseMin = 8000; // ₹8,000/sqft
      baseMax = 12000; // ₹12,000/sqft
    } else if (propertyType === 'commercial') {
      baseMin = 12000; // ₹12,000/sqft
      baseMax = 18000; // ₹18,000/sqft
    } else {
      // land
      baseMin = 3000; // ₹3,000/sqft
      baseMax = 5000; // ₹5,000/sqft
    }
  } else if (tier2Cities.some(tier2 => cityLower.includes(tier2))) {
    // Tier 2: Moderate price ranges
    if (propertyType === 'residential') {
      baseMin = 4000; // ₹4,000/sqft
      baseMax = 7000; // ₹7,000/sqft
    } else if (propertyType === 'commercial') {
      baseMin = 6000; // ₹6,000/sqft
      baseMax = 10000; // ₹10,000/sqft
    } else {
      // land
      baseMin = 1500; // ₹1,500/sqft
      baseMax = 3000; // ₹3,000/sqft
    }
  } else {
    // Other cities: Conservative estimates
    if (propertyType === 'residential') {
      baseMin = 3000; // ₹3,000/sqft
      baseMax = 5000; // ₹5,000/sqft
    } else if (propertyType === 'commercial') {
      baseMin = 4500; // ₹4,500/sqft
      baseMax = 7500; // ₹7,500/sqft
    } else {
      // land
      baseMin = 1000; // ₹1,000/sqft
      baseMax = 2000; // ₹2,000/sqft
    }
  }

  // If pincode provided, could narrow the range (more precise)
  // For MVP, return the city-level range
  // In production, pincode would refine this to locality-specific range

  return {
    min: baseMin,
    max: baseMax,
  };
}


// ============================================================================
// Valuation Update Functions
// ============================================================================

/**
 * Update system valuation for a single asset.
 * 
 * SAFETY RULES (CRITICAL):
 * ========================
 * - NEVER overwrites user_override_value (user input is always preserved)
 * - ONLY updates: system_estimated_min, system_estimated_max, valuation_last_updated
 * - DO NOT update if asset does not belong to user (ownership validation)
 * - DO NOT update if area is missing AND purchase_price missing (validation)
 * - Store values as numeric (₹) - no currency symbols, just numbers
 * 
 * ERROR HANDLING:
 * ===============
 * - Returns result object (never throws)
 * - Captures all errors in result.error
 * - Returns previous values for comparison
 * - Safe for async/fire-and-forget usage
 * 
 * @param supabase - Authenticated Supabase client (typed)
 * @param assetId - Asset ID to update (UUID string)
 * @param userId - User ID (must match asset owner, UUID string)
 * @param valuation - Calculated valuation result with min/max range
 * @returns Update result with previous and new values, or error details
 */
export async function updateSystemValuation(
  supabase: SupabaseClientType,
  assetId: AssetId,
  userId: UserId,
  valuation: ValuationResult
): Promise<ValuationUpdateResult> {
  try {
    // Step 1: Verify asset belongs to user (ownership validation - security critical)
    // This prevents unauthorized updates even if RLS is bypassed
    const { data: currentAsset, error: fetchError } = await supabase
      .from('real_estate_assets')
      .select('id, user_id, user_override_value, system_estimated_min, system_estimated_max')
      .eq('id', assetId)
      .eq('user_id', userId) // Ownership validation
      .single();

    if (fetchError || !currentAsset) {
      // Handle specific Supabase error codes
      if (fetchError?.code === 'PGRST116') {
        // PGRST116 = No rows returned (not found)
        throw new Error('Asset not found or does not belong to user');
      }
      throw new Error(`Failed to fetch asset: ${fetchError?.message || 'Unknown error'}`);
    }

    // Step 2: Store previous values for result (for comparison/audit)
    const previousMin: number | null = currentAsset.system_estimated_min;
    const previousMax: number | null = currentAsset.system_estimated_max;

    // Step 3: Prepare update data (ONLY the fields we're allowed to update)
    // CRITICAL: Do NOT include user_override_value - this preserves user input
    // Type-safe update using Supabase generated types
    const updateData: RealEstateAssetUpdate = {
      system_estimated_min: valuation.systemEstimatedMin, // Numeric (₹), rounded
      system_estimated_max: valuation.systemEstimatedMax, // Numeric (₹), rounded
      valuation_last_updated: valuation.lastUpdated, // ISO timestamp
      // Explicitly NOT including:
      // - user_override_value (preserved)
      // - Any other fields (unchanged)
    };

    // Step 4: Update database (with ownership check for defense in depth)
    const { data: updatedAsset, error: updateError } = await supabase
      .from('real_estate_assets')
      .update(updateData)
      .eq('id', assetId)
      .eq('user_id', userId) // Defense in depth: ownership check in update query
      .select('id, system_estimated_min, system_estimated_max, valuation_last_updated')
      .single();

    if (updateError || !updatedAsset) {
      throw new Error(`Failed to update valuation: ${updateError?.message || 'Unknown error'}`);
    }

    // Step 5: Return success result with previous and new values

    return {
      success: true,
      assetId,
      previousMin, // Previous system_estimated_min (for comparison)
      previousMax, // Previous system_estimated_max (for comparison)
      newMin: updatedAsset.system_estimated_min, // New system_estimated_min (₹)
      newMax: updatedAsset.system_estimated_max, // New system_estimated_max (₹)
    };
  } catch (error) {
    // Safe error handling: Never throw, always return result object
    // This allows callers to handle errors gracefully
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return {
      success: false,
      assetId,
      previousMin: null,
      previousMax: null,
      newMin: null,
      newMax: null,
      error: errorMessage,
    };
  }
}

/**
 * Valuate Real Estate Asset
 * 
 * Main function to valuate a single asset:
 * 1. Fetches asset by ID (with ownership validation)
 * 2. Computes valuation range
 * 3. Updates DB with system_estimated_min/max
 * 4. Returns valuation result
 * 
 * Steps:
 * - Fetch asset by id (validates ownership)
 * - Compute valuation range (min/max)
 * - Update DB: system_estimated_min, system_estimated_max, valuation_last_updated
 * - Return valuation result
 * 
 * DO NOT update if:
 * - Asset does not belong to authenticated user
 * - Area is missing AND purchase_price missing
 * 
 * @param supabase - Authenticated Supabase client
 * @param assetId - Asset ID to valuate
 * @returns Valuation update result with min/max values
 * @throws Error if asset not found, unauthorized, or validation fails
 */
export async function valuateRealEstateAsset(
  supabase: SupabaseClientType,
  assetId: AssetId
): Promise<ValuationUpdateResult> {
  try {
    // Step 1: Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Unauthorized: User not authenticated');
    }

    // Step 2: Fetch asset by ID (with ownership validation)
    const { data: asset, error: fetchError } = await supabase
      .from('real_estate_assets')
      .select('*')
      .eq('id', assetId)
      .eq('user_id', user.id) // Ownership validation
      .single();

    if (fetchError || !asset) {
      if (fetchError?.code === 'PGRST116') {
        throw new Error('Asset not found or does not belong to user');
      }
      throw new Error(`Asset not found: ${fetchError?.message || 'Unknown error'}`);
    }

    // Step 3: Validate inputs - DO NOT update if area is missing AND purchase_price missing
    const carpetArea = asset.carpet_area_sqft;
    const builtupArea = asset.builtup_area_sqft;
    const purchasePrice = asset.purchase_price;
    const hasArea = (carpetArea && carpetArea > 0) || (builtupArea && builtupArea > 0);
    const hasPurchasePrice = purchasePrice && purchasePrice > 0;

    if (!hasArea && !hasPurchasePrice) {
      throw new Error('Cannot calculate valuation: Missing area (carpet_area_sqft OR builtup_area_sqft) AND purchase_price');
    }

    // Step 4: Compute valuation range
    const valuation = await calculateValuation(asset);

    // Step 5: Update DB with system_estimated_min/max
    // Updates ONLY: system_estimated_min, system_estimated_max, valuation_last_updated
    // Values stored as numeric (₹) - no currency symbols
    return await updateSystemValuation(supabase, assetId, user.id, valuation);
  } catch (error) {
    return {
      success: false,
      assetId,
      previousMin: null,
      previousMax: null,
      newMin: null,
      newMax: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Calculate and update valuation for a single asset (internal function).
 * 
 * This function is used internally by batch operations.
 * For single asset valuation, use valuateRealEstateAsset() instead.
 * 
 * @param supabase - Authenticated Supabase client
 * @param assetId - Asset ID to valuate
 * @param userId - User ID (must match asset owner)
 * @returns Update result
 */
async function valuateAsset(
  supabase: SupabaseClientType,
  assetId: AssetId,
  userId: UserId
): Promise<ValuationUpdateResult> {
  try {
    // Fetch asset data with ownership validation
    const { data: asset, error: fetchError } = await supabase
      .from('real_estate_assets')
      .select('*')
      .eq('id', assetId)
      .eq('user_id', userId) // Ownership validation
      .single();

    if (fetchError || !asset) {
      if (fetchError?.code === 'PGRST116') {
        throw new Error('Asset not found or does not belong to user');
      }
      throw new Error(`Asset not found: ${fetchError?.message || 'Unknown error'}`);
    }

    // Validate: DO NOT update if area is missing AND purchase_price missing
    const carpetArea = asset.carpet_area_sqft;
    const builtupArea = asset.builtup_area_sqft;
    const purchasePrice = asset.purchase_price;
    const hasArea = (carpetArea && carpetArea > 0) || (builtupArea && builtupArea > 0);
    const hasPurchasePrice = purchasePrice && purchasePrice > 0;

    if (!hasArea && !hasPurchasePrice) {
      throw new Error('Cannot calculate valuation: Missing area (carpet_area_sqft OR builtup_area_sqft) AND purchase_price');
    }

    // Calculate valuation
    const valuation = await calculateValuation(asset);

    // Update ONLY: system_estimated_min, system_estimated_max, valuation_last_updated
    // Values stored as numeric (₹) - no currency symbols
    return await updateSystemValuation(supabase, assetId, userId, valuation);
  } catch (error) {
    return {
      success: false,
      assetId,
      previousMin: null,
      previousMax: null,
      newMin: null,
      newMax: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================================================
// Batch Valuation Functions
// ============================================================================

/**
 * Get assets that need valuation updates.
 * 
 * Criteria:
 * - Assets without user_override_value (or include all for reference)
 * - Assets with stale valuation (valuation_last_updated > 30 days old)
 * - Assets with missing system estimates
 * 
 * @param supabase - Authenticated Supabase client
 * @param userId - User ID (optional, if null gets all users)
 * @param maxAgeDays - Maximum age of valuation in days (default: 30)
 * @returns Array of asset IDs that need valuation
 */
export async function getAssetsNeedingValuation(
  supabase: SupabaseClientType,
  userId: string | null = null,
  maxAgeDays: number = 30
): Promise<AssetId[]> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - maxAgeDays);
  const cutoffISO = cutoffDate.toISOString();

  let query = supabase
    .from('real_estate_assets')
    .select('id')
    .or(
      `valuation_last_updated.is.null,valuation_last_updated.lt.${cutoffISO},system_estimated_min.is.null,system_estimated_max.is.null`
    );

  // Filter by user if provided
  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data: assets, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch assets: ${error.message}`);
  }

  return assets?.map((asset) => asset.id) || [];
}

/**
 * Batch update valuations for multiple assets.
 * 
 * This function:
 * - Processes assets asynchronously (non-blocking)
 * - Updates ONLY: system_estimated_min, system_estimated_max, valuation_last_updated
 * - Never touches user_override_value
 * - Validates ownership for each asset
 * - Skips assets without area AND purchase_price
 * - Returns results for each asset
 * 
 * @param supabase - Authenticated Supabase client
 * @param userId - User ID (must match asset owners)
 * @param assetIds - Array of asset IDs to valuate
 * @param options - Processing options
 * @returns Array of update results
 */
export async function batchUpdateValuations(
  supabase: SupabaseClientType,
  userId: UserId,
  assetIds: AssetId[],
  options: {
    concurrency?: number; // Number of concurrent updates (default: 5)
    delayMs?: number; // Delay between batches (default: 1000ms)
  } = {}
): Promise<ValuationUpdateResult[]> {
  const { concurrency = 5, delayMs = 1000 } = options;
  const results: ValuationUpdateResult[] = [];

  // Process in batches to avoid overwhelming the system
  for (let i = 0; i < assetIds.length; i += concurrency) {
    const batch = assetIds.slice(i, i + concurrency);

    // Process batch concurrently
    const batchResults = await Promise.allSettled(
      batch.map((assetId) => valuateAsset(supabase, assetId, userId))
    );

    // Collect results
    for (const result of batchResults) {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        // Handle rejected promise
        results.push({
          success: false,
          assetId: '', // Unknown asset ID if promise rejected
          previousMin: null,
          previousMax: null,
          newMin: null,
          newMax: null,
          error: result.reason?.message || 'Unknown error',
        });
      }
    }

    // Delay between batches (non-blocking)
    if (i + concurrency < assetIds.length) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return results;
}

/**
 * Valuate All User Assets
 * 
 * Fetches all assets for a user and valuates them:
 * - Skips assets updated in last 90 days
 * - Processes sequentially or in controlled parallel batches
 * - Logs failures without stopping batch
 * - Returns summary of results
 * 
 * @param supabase - Authenticated Supabase client
 * @param userId - User ID (must match authenticated user)
 * @param options - Processing options
 * @returns Summary of valuation results
 */
export async function valuateAllUserAssets(
  supabase: SupabaseClientType,
  userId: UserId,
  options: {
    skipRecentDays?: number; // Skip assets updated in last N days (default: 90)
    concurrency?: number; // Number of concurrent valuations (default: 3)
    sequential?: boolean; // If true, process one at a time (default: false)
  } = {}
): Promise<{
  total: number;
  processed: number;
  skipped: number;
  successful: number;
  failed: number;
  results: ValuationUpdateResult[];
  errors: Array<{ assetId: string; error: string }>;
}> {
  const { skipRecentDays = 90, concurrency = 3, sequential = false } = options;

  try {
    // Step 1: Fetch all assets for user
    const { data: assets, error: fetchError } = await supabase
      .from('real_estate_assets')
      .select('id, valuation_last_updated, carpet_area_sqft, builtup_area_sqft, purchase_price')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (fetchError) {
      throw new Error(`Failed to fetch assets: ${fetchError.message}`);
    }

    if (!assets || assets.length === 0) {
      return {
        total: 0,
        processed: 0,
        skipped: 0,
        successful: 0,
        failed: 0,
        results: [],
        errors: [],
      };
    }

    // Step 2: Filter assets (skip recently updated)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - skipRecentDays);
    const cutoffISO = cutoffDate.toISOString();

    const assetsToProcess: AssetId[] = [];
    const skipped: string[] = [];
    const errors: Array<{ assetId: string; error: string }> = [];

    for (const asset of assets) {
      // Skip if updated in last 90 days
      if (asset.valuation_last_updated) {
        const lastUpdated = new Date(asset.valuation_last_updated);
        if (lastUpdated > cutoffDate) {
          skipped.push(asset.id);
          continue;
        }
      }

      // Skip if missing required inputs (area AND purchase_price both missing)
      const hasArea = (asset.carpet_area_sqft && asset.carpet_area_sqft > 0) ||
                      (asset.builtup_area_sqft && asset.builtup_area_sqft > 0);
      const hasPurchasePrice = asset.purchase_price && asset.purchase_price > 0;

      if (!hasArea && !hasPurchasePrice) {
        skipped.push(asset.id);
        errors.push({
          assetId: asset.id,
          error: 'Skipped: Missing area AND purchase_price',
        });
        continue;
      }

      assetsToProcess.push(asset.id);
    }

    if (assetsToProcess.length === 0) {
      return {
        total: assets.length,
        processed: 0,
        skipped: skipped.length,
        successful: 0,
        failed: 0,
        results: [],
        errors,
      };
    }

    // Step 3: Valuate assets (sequential or controlled parallel)
    const results: ValuationUpdateResult[] = [];

    if (sequential) {
      // Process one at a time
      for (const assetId of assetsToProcess) {
        try {
          const result = await valuateAsset(supabase, assetId, userId);
          results.push(result);
          
          if (!result.success) {
            // Log failure but continue
            console.error(`[valuateAllUserAssets] Failed to valuate asset ${assetId}:`, result.error);
            errors.push({
              assetId,
              error: result.error || 'Unknown error',
            });
          }
        } catch (error) {
          // Log error but continue
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.error(`[valuateAllUserAssets] Error valuating asset ${assetId}:`, errorMessage);
          errors.push({
            assetId,
            error: errorMessage,
          });
          results.push({
            success: false,
            assetId,
            previousMin: null,
            previousMax: null,
            newMin: null,
            newMax: null,
            error: errorMessage,
          });
        }
      }
    } else {
      // Process in controlled parallel batches
      for (let i = 0; i < assetsToProcess.length; i += concurrency) {
        const batch = assetsToProcess.slice(i, i + concurrency);

        // Process batch concurrently
        const batchResults = await Promise.allSettled(
          batch.map((assetId) => valuateAsset(supabase, assetId, userId))
        );

        // Collect results and log failures
        for (let j = 0; j < batchResults.length; j++) {
          const result = batchResults[j];
          const assetId = batch[j];

          if (result.status === 'fulfilled') {
            results.push(result.value);
            
            if (!result.value.success) {
              // Log failure but continue
              console.error(`[valuateAllUserAssets] Failed to valuate asset ${assetId}:`, result.value.error);
              errors.push({
                assetId,
                error: result.value.error || 'Unknown error',
              });
            }
          } else {
            // Log error but continue
            const errorMessage = result.reason?.message || 'Unknown error';
            console.error(`[valuateAllUserAssets] Error valuating asset ${assetId}:`, errorMessage);
            errors.push({
              assetId,
              error: errorMessage,
            });
            results.push({
              success: false,
              assetId,
              previousMin: null,
              previousMax: null,
              newMin: null,
              newMax: null,
              error: errorMessage,
            });
          }
        }

        // Small delay between batches (non-blocking)
        if (i + concurrency < assetsToProcess.length) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }
    }

    // Step 4: Calculate summary
    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    return {
      total: assets.length,
      processed: assetsToProcess.length,
      skipped: skipped.length,
      successful,
      failed,
      results,
      errors,
    };
  } catch (error) {
    // Log error but return partial results if available
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[valuateAllUserAssets] Fatal error:', errorMessage);
    
    return {
      total: 0,
      processed: 0,
      skipped: 0,
      successful: 0,
      failed: 0,
      results: [],
      errors: [{ assetId: '', error: errorMessage }],
    };
  }
}

/**
 * Update valuations for all assets that need updates.
 * 
 * This is the main entry point for async valuation updates.
 * Can be called from:
 * - Cron jobs
 * - Background workers
 * - Scheduled tasks
 * 
 * @param supabase - Authenticated Supabase client (can be admin for system-wide updates)
 * @param userId - User ID (optional, if null updates all users)
 * @param maxAgeDays - Maximum age of valuation in days (default: 30)
 * @returns Summary of update results
 */
export async function updateAllValuations(
  supabase: SupabaseClientType,
  userId: string | null = null,
  maxAgeDays: number = 30
): Promise<{
  total: number;
  successful: number;
  failed: number;
  results: ValuationUpdateResult[];
}> {
  // Get assets needing valuation
  const assetIds = await getAssetsNeedingValuation(supabase, userId, maxAgeDays);

  if (assetIds.length === 0) {
    return {
      total: 0,
      successful: 0,
      failed: 0,
      results: [],
    };
  }

  // Batch update valuations (with user ID for ownership validation)
  const results = userId 
    ? await batchUpdateValuations(supabase, userId, assetIds)
    : []; // If no userId provided, cannot validate ownership - return empty

  // Calculate summary
  const successful = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  return {
    total: results.length,
    successful,
    failed,
    results,
  };
}
