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
 * AMFI NAV file format:
 * - Format: Scheme Code;ISIN Div Payout/ISIN Growth/ISIN Div Reinvestment;Scheme Name;Net Asset Value;Date
 * - Example: 119551;INF209KA12Z1;INF209KA13Z9;Aditya Birla Sun Life Banking & PSU Debt Fund - DIRECT - IDCW;110.3299;08-Dec-2025
 * - Fields are semicolon-separated
 * - ISINs are separated by semicolons (not slashes as in older format)
 * 
 * @param navContent - Raw NAV file content
 * @returns Array of scheme master records
 */
function parseSchemeMasterFromNAV(navContent: string): SchemeMaster[] {
  const schemes: SchemeMaster[] = [];
  const lines = navContent.split('\n');
  
  let currentSection = '';
  const schemeMap = new Map<string, SchemeMaster>();
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Skip empty lines
    if (!trimmed) continue;
    
    // Check for section headers (contains scheme type info)
    if (trimmed.includes('Open Ended Schemes') || trimmed.includes('Close Ended Schemes')) {
      currentSection = trimmed;
      continue;
    }
    
    // Skip header lines
    if (trimmed.includes('Scheme Code') || trimmed.includes('Net Asset Value')) {
      continue;
    }
    
    // Parse data line: Scheme Code;ISIN Div Payout;ISIN Growth;ISIN Div Reinvestment;Scheme Name;Net Asset Value;Date
    // OR: Scheme Code;ISIN Div Payout/ISIN Growth/ISIN Div Reinvestment;Scheme Name;Net Asset Value;Date (older format)
    const parts = trimmed.split(';').map(p => p.trim());
    
    if (parts.length >= 5) {
      const schemeCode = parts[0];
      let isinDivPayout = '';
      let isinGrowth = '';
      let isinDivReinvest = '';
      let schemeName = '';
      let navValue = '';
      
      // Validate scheme code
      if (!schemeCode || !/^\d+$/.test(schemeCode)) {
        continue;
      }
      
      // AMFI format can vary - try to detect format
      // New format: Code;ISIN Payout;ISIN Growth;ISIN Reinv;Name;NAV;Date (7 fields)
      // Old format: Code;ISIN Payout/ISIN Growth/ISIN Reinv;Name;NAV;Date (5 fields)
      if (parts.length >= 7) {
        // New format with separate ISIN fields
        isinDivPayout = parts[1] || '';
        isinGrowth = parts[2] || '';
        isinDivReinvest = parts[3] || '';
        schemeName = parts[4] || '';
        navValue = parts[5] || '';
      } else {
        // Old format with combined ISIN field
        const isinField = parts[1];
        schemeName = parts[2] || '';
        navValue = parts[3] || '';
        
        // Parse ISINs from combined field (may contain slashes or be semicolon-separated)
        const isinParts = isinField.split(/[\/;]/).map(p => p.trim());
        for (const isinPart of isinParts) {
          // Extract 12-character ISIN (format: INF...)
          const isinMatch = isinPart.match(/^([A-Z0-9]{12})/);
          if (isinMatch) {
            const isin = isinMatch[1];
            const lowerPart = isinPart.toLowerCase();
            if (lowerPart.includes('growth') || !isinGrowth) {
              isinGrowth = isin;
            } else if (lowerPart.includes('div') && (lowerPart.includes('payout') || lowerPart.includes('idcw'))) {
              isinDivPayout = isin;
            } else if (lowerPart.includes('div') && (lowerPart.includes('reinv') || lowerPart.includes('reinvest') || lowerPart.includes('iddr'))) {
              isinDivReinvest = isin;
            }
          }
        }
      }
      
      // Validate ISINs (should be 12 characters, starting with INF for Indian MFs)
      const validateISIN = (isin: string): boolean => {
        return isin.length === 12 && /^[A-Z0-9]{12}$/.test(isin) && !['NA', 'NOTAPP', ''].includes(isin);
      };
      
      if (isinGrowth && !validateISIN(isinGrowth)) isinGrowth = '';
      if (isinDivPayout && !validateISIN(isinDivPayout)) isinDivPayout = '';
      if (isinDivReinvest && !validateISIN(isinDivReinvest)) isinDivReinvest = '';
      
      // Extract fund house from scheme name (usually first part before "Mutual Fund" or similar)
      let fundHouse = '';
      const fundHouseMatch = schemeName.match(/^([A-Za-z\s&]+?)(?:\s+(?:Mutual Fund|MF|Fund|Limited|Ltd))?/);
      if (fundHouseMatch) {
        fundHouse = fundHouseMatch[1].trim();
      }
      
      // Store or update scheme master
      if (!schemeMap.has(schemeCode)) {
        schemeMap.set(schemeCode, {
          schemeCode,
          schemeName,
          fundHouse: fundHouse || undefined,
          schemeType: currentSection || undefined,
          isinGrowth: isinGrowth || undefined,
          isinDivPayout: isinDivPayout || undefined,
          isinDivReinvest: isinDivReinvest || undefined,
          schemeStatus: 'Active', // Assume active if present in NAV file
        });
      } else {
        // Update existing scheme with additional ISINs if found
        const existing = schemeMap.get(schemeCode)!;
        if (isinGrowth && !existing.isinGrowth) existing.isinGrowth = isinGrowth;
        if (isinDivPayout && !existing.isinDivPayout) existing.isinDivPayout = isinDivPayout;
        if (isinDivReinvest && !existing.isinDivReinvest) existing.isinDivReinvest = isinDivReinvest;
      }
    }
  }
  
  return Array.from(schemeMap.values());
}

/**
 * Fetch and update scheme master data from AMFI NAV file
 * 
 * Since AMFI doesn't publish a separate scheme master file,
 * we extract scheme info from the NAV file.
 * 
 * @returns Number of schemes processed
 */
export async function updateSchemeMaster(): Promise<number> {
  try {
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
    const schemes = parseSchemeMasterFromNAV(content);
    
    // Store schemes in database using batch upsert (much faster than one-by-one)
    const supabase = createAdminClient();
    
    // Prepare data for batch upsert
    const dataToUpsert = schemes.map(scheme => ({
      scheme_code: scheme.schemeCode,
      scheme_name: scheme.schemeName,
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
    let totalUpserted = 0;
    
    for (let i = 0; i < dataToUpsert.length; i += chunkSize) {
      const chunk = dataToUpsert.slice(i, i + chunkSize);
      
      try {
        const { error } = await supabase
          .from('mf_scheme_master')
          .upsert(chunk, {
            onConflict: 'scheme_code',
            ignoreDuplicates: false,
          });
        
        if (error) {
          console.error(`[MF Scheme Master] Error upserting chunk:`, error);
        } else {
          totalUpserted += chunk.length;
        }
      } catch (error) {
        console.error(`[MF Scheme Master] Error processing chunk:`, error);
      }
    }
    
    return schemes.length;
  } catch (error) {
    console.error(`[MF Scheme Master] Error updating scheme master:`, error);
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

