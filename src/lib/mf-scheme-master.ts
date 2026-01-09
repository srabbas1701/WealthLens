/**
 * MF Scheme Master Service
 * 
 * Handles fetching and storing AMFI scheme master data.
 * Maps scheme_code (AMFI) to ISIN (used in assets table).
 * 
 * DESIGN PHILOSOPHY:
 * ==================
 * 1. Scheme master data is populated automatically from AMFI
 * 2. No user input required - system responsibility only
 * 3. ISIN ↔ scheme_code mapping is deterministic
 * 4. No name-based fuzzy matching
 * 5. Updates periodically to sync with AMFI changes
 */

import { createAdminClient } from '@/lib/supabase/server';

// ============================================================================
// TYPES
// ============================================================================

export interface SchemeMaster {
  schemeCode: string;
  schemeName: string;
  fundHouse?: string;
  schemeType?: string;
  isinGrowth?: string;
  isinDivPayout?: string;
  isinDivReinvest?: string;
  schemeStatus?: string;
}

// ============================================================================
// SCHEME MASTER FETCHING (AMFI)
// ============================================================================

/**
 * Parse AMFI NAV file to extract scheme master data
 * 
 * AMFI NAV file format (semicolon separated):
 * Index 0 → scheme_code
 * Index 1 → isin_growth (or ISIN Div Payout)
 * Index 2 → isin_div_reinvest
 * Index 3 → scheme_name (HUMAN READABLE NAME)
 * Index 4 → nav (DO NOT STORE IN SCHEME MASTER)
 * Index 5 → nav_date
 * 
 * @param navContent - Raw NAV file content
 * @returns Object with schemes array and rejection statistics
 */
function parseSchemeMasterFromNAV(navContent: string): {
  schemes: SchemeMaster[];
  stats: {
    totalRows: number;
    parsed: number;
    rejected: {
      missingSchemeCode: number;
      missingSchemeName: number;
      schemeNameStartsWithINF: number;
      schemeNameTooShort: number;
      invalidSchemeCode: number;
      headerOrEmpty: number;
    };
  };
} {
  const lines = navContent.split('\n');
  const schemeMap = new Map<string, SchemeMaster>();
  
  let currentSection = '';
  const stats = {
    totalRows: lines.length,
    parsed: 0,
    rejected: {
      missingSchemeCode: 0,
      missingSchemeName: 0,
      schemeNameStartsWithINF: 0,
      schemeNameTooShort: 0,
      invalidSchemeCode: 0,
      headerOrEmpty: 0,
    },
  };
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Skip empty lines
    if (!trimmed) {
      stats.rejected.headerOrEmpty++;
      continue;
    }
    
    // Check for section headers (contains scheme type info)
    if (trimmed.includes('Open Ended Schemes') || trimmed.includes('Close Ended Schemes')) {
      currentSection = trimmed;
      stats.rejected.headerOrEmpty++;
      continue;
    }
    
    // Skip header lines
    if (trimmed.includes('Scheme Code') || trimmed.includes('Net Asset Value') || trimmed.includes('Date')) {
      stats.rejected.headerOrEmpty++;
      continue;
    }
    
    // Parse data line using correct column mapping
    // Format: scheme_code;isin_growth;isin_div_reinvest;scheme_name;nav;nav_date
    const parts = trimmed.split(';').map(p => p.trim());
    
    // Must have at least 6 fields (0-5)
    if (parts.length < 6) {
      stats.rejected.headerOrEmpty++;
      continue;
    }
    
    // Extract fields according to correct mapping
    const schemeCode = parts[0] || '';
    const isinGrowth = parts[1] || '';
    const isinDivReinvest = parts[2] || '';
    const schemeName = parts[3] || '';
    // parts[4] = nav (IGNORE - do not store)
    // parts[5] = nav_date (IGNORE - do not store)
    
    // VALIDATION RULE 1: Skip rows where scheme_code is missing
    if (!schemeCode) {
      stats.rejected.missingSchemeCode++;
      continue;
    }
    
    // VALIDATION RULE 2: Validate scheme code format (must be numeric)
    if (!/^\d+$/.test(schemeCode)) {
      stats.rejected.invalidSchemeCode++;
      continue;
    }
    
    // VALIDATION RULE 3: Skip rows where scheme_name is missing
    if (!schemeName) {
      stats.rejected.missingSchemeName++;
      continue;
    }
    
    // VALIDATION RULE 4: Reject rows where scheme_name starts with "INF"
    if (schemeName.toUpperCase().startsWith('INF')) {
      stats.rejected.schemeNameStartsWithINF++;
      continue;
    }
    
    // VALIDATION RULE 5: Reject rows where scheme_name length < 5
    if (schemeName.length < 5) {
      stats.rejected.schemeNameTooShort++;
      continue;
    }
    
    // Validate ISINs (should be 12 characters, starting with INF for Indian MFs)
    const validateISIN = (isin: string): string | undefined => {
      if (!isin) return undefined;
      const cleanIsin = isin.toUpperCase().trim();
      if (cleanIsin.length === 12 && /^[A-Z0-9]{12}$/.test(cleanIsin) && !['NA', 'NOTAPP', ''].includes(cleanIsin)) {
        return cleanIsin;
      }
      return undefined;
    };
    
    // Index 1 could be Growth OR Div Payout (varies by scheme)
    // Index 2 is Div Reinvest
    // We'll store index 1 as Growth by default (most common case)
    // If needed, we can add logic to detect Div Payout vs Growth later
    const validatedIsinGrowth = validateISIN(isinGrowth);
    const validatedIsinDivReinvest = validateISIN(isinDivReinvest);
    
    // For now, treat index 1 as Growth (most common)
    // Div Payout ISINs are less common and may not always be present
    let isinDivPayout: string | undefined = undefined;
    let finalIsinGrowth: string | undefined = validatedIsinGrowth;
    
    // Extract fund house from scheme name (usually first part before "Mutual Fund" or similar)
    let fundHouse = '';
    const fundHouseMatch = schemeName.match(/^([A-Za-z\s&]+?)(?:\s+(?:Mutual Fund|MF|Fund|Limited|Ltd))?/);
    if (fundHouseMatch) {
      fundHouse = fundHouseMatch[1].trim();
    }
    
    // Store or update scheme master (upsert by scheme_code)
    if (!schemeMap.has(schemeCode)) {
      schemeMap.set(schemeCode, {
        schemeCode,
        schemeName,
        fundHouse: fundHouse || undefined,
        schemeType: currentSection || undefined,
        isinGrowth: finalIsinGrowth,
        isinDivPayout: isinDivPayout,
        isinDivReinvest: validatedIsinDivReinvest,
        schemeStatus: 'Active', // Assume active if present in NAV file
      });
      stats.parsed++;
    } else {
      // Update existing scheme with additional ISINs if found
      const existing = schemeMap.get(schemeCode)!;
      if (finalIsinGrowth && !existing.isinGrowth) existing.isinGrowth = finalIsinGrowth;
      if (isinDivPayout && !existing.isinDivPayout) existing.isinDivPayout = isinDivPayout;
      if (validatedIsinDivReinvest && !existing.isinDivReinvest) existing.isinDivReinvest = validatedIsinDivReinvest;
      // Update scheme name if it's more complete
      if (schemeName.length > (existing.schemeName?.length || 0)) {
        existing.schemeName = schemeName;
      }
    }
  }
  
  return {
    schemes: Array.from(schemeMap.values()),
    stats,
  };
}

/**
 * Fetch and update scheme master data from AMFI NAV file
 * 
 * Since AMFI doesn't publish a separate scheme master file,
 * we extract scheme info from the NAV file.
 * 
 * VALIDATION RULES (MANDATORY):
 * - Skip rows where scheme_code or scheme_name is missing
 * - Reject any row where scheme_name starts with "INF"
 * - Reject rows where scheme_name length < 5
 * - Log count of rejected rows with reasons
 * 
 * IDEMPOTENCY:
 * - Uses UPSERT on scheme_code
 * - Safe to run daily
 * - Does not require truncation every time
 * 
 * @returns Number of schemes processed
 */
export async function updateSchemeMaster(): Promise<number> {
  try {
    console.log('[MF Scheme Master] Fetching AMFI NAV file...');
    
    // Fetch AMFI NAV file (contains scheme info)
    const url = 'https://www.amfiindia.com/spages/NAVAll.txt';
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    
    if (!response.ok) {
      throw new Error(`AMFI API returned ${response.status}: ${response.statusText}`);
    }
    
    const content = await response.text();
    console.log(`[MF Scheme Master] Fetched ${content.length} bytes from AMFI`);
    
    // Parse scheme master data with validation
    const { schemes, stats } = parseSchemeMasterFromNAV(content);
    
    // Log parsing statistics
    console.log(`[MF Scheme Master] Parsing complete:`);
    console.log(`  Total rows processed: ${stats.totalRows}`);
    console.log(`  Successfully parsed: ${stats.parsed}`);
    console.log(`  Rejected rows:`);
    console.log(`    - Missing scheme_code: ${stats.rejected.missingSchemeCode}`);
    console.log(`    - Missing scheme_name: ${stats.rejected.missingSchemeName}`);
    console.log(`    - scheme_name starts with INF: ${stats.rejected.schemeNameStartsWithINF}`);
    console.log(`    - scheme_name too short (<5 chars): ${stats.rejected.schemeNameTooShort}`);
    console.log(`    - Invalid scheme_code format: ${stats.rejected.invalidSchemeCode}`);
    console.log(`    - Headers/empty lines: ${stats.rejected.headerOrEmpty}`);
    
    if (schemes.length === 0) {
      throw new Error('No valid schemes found in AMFI file after parsing');
    }
    
    console.log(`[MF Scheme Master] Preparing ${schemes.length} schemes for database upsert...`);
    
    // Store schemes in database using batch upsert (much faster than one-by-one)
    const supabase = createAdminClient();
    
    // Prepare data for batch upsert
    // DO NOT store NAV values or nav_date - only scheme master data
    const dataToUpsert = schemes.map(scheme => ({
      scheme_code: scheme.schemeCode,
      scheme_name: scheme.schemeName, // Must come ONLY from column 3
      fund_house: scheme.fundHouse || null,
      scheme_type: scheme.schemeType || null,
      isin_growth: scheme.isinGrowth || null,
      isin_div_payout: scheme.isinDivPayout || null,
      isin_div_reinvest: scheme.isinDivReinvest || null,
      scheme_status: scheme.schemeStatus || 'Active',
      last_updated: new Date().toISOString(),
    }));
    
    // Batch upsert in chunks of 1000 (Supabase limit)
    const chunkSize = 1000;
    let totalInserted = 0;
    let totalUpdated = 0;
    let totalErrors = 0;
    
    console.log(`[MF Scheme Master] Upserting in chunks of ${chunkSize}...`);
    
    for (let i = 0; i < dataToUpsert.length; i += chunkSize) {
      const chunk = dataToUpsert.slice(i, i + chunkSize);
      const chunkNum = Math.floor(i / chunkSize) + 1;
      const totalChunks = Math.ceil(dataToUpsert.length / chunkSize);
      
      try {
        const { data, error } = await supabase
          .from('mf_scheme_master')
          .upsert(chunk, {
            onConflict: 'scheme_code',
            ignoreDuplicates: false,
          })
          .select('scheme_code');
        
        if (error) {
          console.error(`[MF Scheme Master] Error upserting chunk ${chunkNum}/${totalChunks}:`, error);
          totalErrors++;
        } else {
          // Count how many were inserted vs updated by checking if they existed before
          // For simplicity, we'll assume all were upserted successfully
          const chunkProcessed = data?.length || chunk.length;
          totalInserted += chunkProcessed; // In reality, some may be updates, but we count as processed
          console.log(`[MF Scheme Master] Processed chunk ${chunkNum}/${totalChunks}: ${chunkProcessed} schemes`);
        }
      } catch (error) {
        console.error(`[MF Scheme Master] Error processing chunk ${chunkNum}/${totalChunks}:`, error);
        totalErrors++;
      }
    }
    
    console.log(`[MF Scheme Master] ✅ Update complete:`);
    console.log(`  Total schemes processed: ${totalInserted}`);
    console.log(`  Chunks with errors: ${totalErrors}`);
    console.log(`  Expected final count: ~${schemes.length} schemes`);
    
    return schemes.length;
  } catch (error) {
    console.error(`[MF Scheme Master] ❌ Error updating scheme master:`, error);
    throw error;
  }
}

/**
 * Get scheme_code for a given ISIN
 * 
 * @param isin - ISIN (can be Growth, Dividend Payout, or Dividend Reinvestment)
 * @returns scheme_code or null if not found
 */
export async function getSchemeCodeByISIN(isin: string): Promise<string | null> {
  try {
    const supabase = createAdminClient();
    
    const cleanIsin = isin.toUpperCase().trim();
    
    // Try to find scheme_code by matching any ISIN field
    const { data, error } = await supabase
      .from('mf_scheme_master')
      .select('scheme_code, scheme_name, isin_growth, isin_div_payout, isin_div_reinvest')
      .or(`isin_growth.eq.${cleanIsin},isin_div_payout.eq.${cleanIsin},isin_div_reinvest.eq.${cleanIsin}`)
      .limit(1)
      .maybeSingle();
    
    if (error) {
      console.error(`[MF Scheme Master] Error querying scheme_code for ISIN ${cleanIsin}:`, error);
      return null;
    }
    
    if (!data) {
      // Only log if this is an error case (not routine lookups)
      return null;
    }
    
    // Removed verbose logging - mapping happens silently, only log errors
    return data.scheme_code;
  } catch (error) {
    console.error(`[MF Scheme Master] Error getting scheme_code for ISIN ${isin}:`, error);
    return null;
  }
}

/**
 * Get ISINs for a given scheme_code
 * 
 * @param schemeCode - AMFI scheme code
 * @returns Object with ISINs (growth, divPayout, divReinvest) or null
 */
export async function getISINsBySchemeCode(schemeCode: string): Promise<{
  isinGrowth?: string;
  isinDivPayout?: string;
  isinDivReinvest?: string;
} | null> {
  try {
    const supabase = createAdminClient();
    
    const { data, error } = await supabase
      .from('mf_scheme_master')
      .select('isin_growth, isin_div_payout, isin_div_reinvest')
      .eq('scheme_code', schemeCode)
      .single();
    
    if (error || !data) {
      return null;
    }
    
    return {
      isinGrowth: data.isin_growth || undefined,
      isinDivPayout: data.isin_div_payout || undefined,
      isinDivReinvest: data.isin_div_reinvest || undefined,
    };
  } catch (error) {
    console.error(`[MF Scheme Master] Error getting ISINs for scheme_code ${schemeCode}:`, error);
    return null;
  }
}

/**
 * Get all ISINs that map to a scheme_code (for NAV lookup)
 * 
 * @param schemeCode - AMFI scheme code
 * @returns Array of ISINs
 */
export async function getAllISINsForScheme(schemeCode: string): Promise<string[]> {
  const isins = await getISINsBySchemeCode(schemeCode);
  if (!isins) return [];
  
  const result: string[] = [];
  if (isins.isinGrowth) result.push(isins.isinGrowth);
  if (isins.isinDivPayout) result.push(isins.isinDivPayout);
  if (isins.isinDivReinvest) result.push(isins.isinDivReinvest);
  
  return result;
}

