/**
 * Mutual Fund NAV Service
 * 
 * Handles fetching and storing daily NAVs (Net Asset Values) for Mutual Funds from AMFI.
 * Uses scheme_code → ISIN mapping from mf_scheme_master table.
 * 
 * DESIGN PHILOSOPHY:
 * ==================
 * 1. NAVs are fetched once per day (previous trading day)
 * 2. NAVs are shared across all users (not user-specific)
 * 3. NAVs are cached in database to avoid redundant API calls
 * 4. If NAV fetch fails, we keep the last known NAV (never default to avg_buy_nav)
 * 
 * NAV SOURCE:
 * ===========
 * AMFI Official NAV Feed: https://www.amfiindia.com/spages/NAVAll.txt
 * - Free, no authentication
 * - Updated once per trading day
 * - Text format with scheme_code as primary identifier
 */

import { createAdminClient } from '@/lib/supabase/server';
import { getPreviousTradingDay } from './stock-prices';
import { getSchemeCodeByISIN } from './mf-scheme-master';

// ============================================================================
// TYPES
// ============================================================================

export interface MFNav {
  schemeCode: string;
  schemeName: string;
  nav: number;
  navDate: string; // ISO date string (YYYY-MM-DD)
  lastUpdated: string; // ISO timestamp
}

export interface NavUpdateResult {
  schemeCode: string;
  success: boolean;
  nav?: number;
  navDate?: string;
  error?: string;
}

interface ParsedNAVRecord {
  schemeCode: string;
  schemeName: string;
  nav: number;
  navDate: string;
}

// ============================================================================
// NAV FETCHING (AMFI)
// ============================================================================

/**
 * Parse AMFI NAV text file
 * 
 * AMFI NAV file format:
 * - Format: Scheme Code;ISIN Div Payout/ISIN Growth/ISIN Div Reinvestment;Scheme Name;Net Asset Value;Date
 * - Fields are semicolon-separated
 * - Date format: DD-MMM-YYYY (e.g., "01-Jan-2025")
 * 
 * @param content - Raw text content from AMFI NAV file
 * @returns Array of parsed NAV records
 */
function parseAMFINAVFile(content: string): ParsedNAVRecord[] {
  const records: ParsedNAVRecord[] = [];
  const lines = content.split('\n');
  
  let navDate = getPreviousTradingDay(); // Default fallback
  
  let skippedEmpty = 0;
  let skippedHeaders = 0;
  let skippedInvalidLength = 0;
  let skippedInvalidCode = 0;
  let skippedInvalidNav = 0;
  let parsedCount = 0;
  let sampleLines: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // Skip empty lines
    if (!trimmed) {
      skippedEmpty++;
      continue;
    }
    
    // Check for section headers
    if (trimmed.includes('Open Ended Schemes') || trimmed.includes('Close Ended Schemes')) {
      skippedHeaders++;
      continue;
    }
    
    // Skip header lines
    if (trimmed.includes('Scheme Code') || trimmed.includes('Net Asset Value')) {
      skippedHeaders++;
      if (sampleLines.length < 3) {
        sampleLines.push(`Line ${i}: ${trimmed.substring(0, 100)}`);
      }
      continue;
    }
    
    // Parse data line: Scheme Code;ISIN Div Payout;ISIN Growth;ISIN Div Reinvestment;Scheme Name;Net Asset Value;Date
    // OR: Scheme Code;ISIN Div Payout/ISIN Growth/ISIN Div Reinvestment;Scheme Name;Net Asset Value;Date (older format)
    // IMPORTANT: AMFI format can have scheme names with semicolons, so we need to parse from the END backwards
    const parts = trimmed.split(';');
    
    if (parts.length < 5) {
      skippedInvalidLength++;
      if (sampleLines.length < 5 && parts.length > 0) {
        sampleLines.push(`Line ${i} (${parts.length} parts): ${trimmed.substring(0, 100)}`);
      }
      continue;
    }
    
    const schemeCode = parts[0].trim();
    
    // AMFI format: Code;ISIN1;ISIN2;Name;NAV;Date (6 fields)
    // But some lines may be incomplete (5 fields, missing date)
    // Parse from the end backwards for reliability
    let dateStr = '';
    let navValue = '';
    let schemeName = '';
    
    if (parts.length >= 6) {
      // Complete 6-field format: Code;ISIN1;ISIN2;Name;NAV;Date
      dateStr = parts[5].trim();
      navValue = parts[4].trim();
      schemeName = parts[3].trim();
    } else if (parts.length === 5) {
      // Incomplete 5-field format: Code;ISIN1;ISIN2;Name;NAV (date missing)
      navValue = parts[4].trim();
      schemeName = parts[3].trim();
      dateStr = ''; // Date missing, will use fallback
    } else {
      // Invalid format (less than 5 fields)
      skippedInvalidLength++;
      if (sampleLines.length < 5 && parts.length > 0) {
        sampleLines.push(`Line ${i} (${parts.length} parts, need 5+): ${trimmed.substring(0, 100)}`);
      }
      continue;
    }
    
    // Validate scheme code
    if (!schemeCode || !/^\d+$/.test(schemeCode)) {
      skippedInvalidCode++;
      if (sampleLines.length < 7) {
        sampleLines.push(`Line ${i} invalid code "${schemeCode}": ${trimmed.substring(0, 100)}`);
      }
      continue;
    }
    
    // Parse NAV value - handle incomplete values like "110." by trying to parse anyway
    let nav = parseFloat(navValue);
    if (isNaN(nav) || nav <= 0) {
      // Try to parse if it ends with "." (incomplete number)
      if (navValue.endsWith('.')) {
        const cleanedNav = navValue.slice(0, -1);
        nav = parseFloat(cleanedNav);
      }
      
      if (isNaN(nav) || nav <= 0) {
        skippedInvalidNav++;
        if (sampleLines.length < 8) {
          sampleLines.push(`Line ${i} invalid NAV "${navValue}": ${trimmed.substring(0, 100)}`);
        }
        continue;
      }
    }
    
    // Parse date (DD-MMM-YYYY format)
    let parsedDate = navDate; // Default fallback
    if (dateStr) {
      try {
        const dateParts = dateStr.split('-');
        if (dateParts.length === 3) {
          const day = parseInt(dateParts[0], 10);
          const monthMap: Record<string, string> = {
            'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
            'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
            'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
          };
          const month = monthMap[dateParts[1]] || '01';
          const year = dateParts[2];
          parsedDate = `${year}-${month}-${(day < 10 ? '0' : '') + day}`;
          
          // Update navDate to the actual date from AMFI file (most recent)
          if (parsedDate > navDate) {
            navDate = parsedDate;
          }
        }
      } catch (error) {
        console.warn(`[MF NAV Service] Failed to parse date: ${dateStr}`);
      }
    }
    
    records.push({
      schemeCode,
      schemeName,
      nav,
      navDate: parsedDate,
    });
    parsedCount++;
    
    if (parsedCount <= 5) {
      console.log(`[MF NAV Service] Parsed record ${parsedCount}: ${schemeCode} - ${schemeName.substring(0, 50)} - NAV: ${nav} - Date: ${parsedDate}`);
    }
  }
  
  console.log(`[MF NAV Service] Parse summary: ${parsedCount} parsed, ${skippedEmpty} empty, ${skippedHeaders} headers, ${skippedInvalidLength} invalid length, ${skippedInvalidCode} invalid code, ${skippedInvalidNav} invalid NAV`);
  if (sampleLines.length > 0) {
    console.log(`[MF NAV Service] Sample lines:`, sampleLines);
  }
  
  return records;
}

/**
 * Fetch NAV data from AMFI
 * 
 * @param schemeCodes - Optional array of scheme codes to fetch (if empty, fetches all)
 * @returns Map of scheme code to NAV data
 */
async function fetchNAVFromAMFI(schemeCodes?: string[]): Promise<Map<string, ParsedNAVRecord>> {
  try {
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
    const records = parseAMFINAVFile(content);
    
    // Only log if very few records (likely holiday file)
    if (records.length < 100) {
      console.warn(`[MF NAV Service] Very few NAV records parsed (${records.length}). AMFI file may be incomplete or from a holiday.`);
    }
    
    // Filter by scheme codes if provided
    const navMap = new Map<string, ParsedNAVRecord>();
    if (schemeCodes && schemeCodes.length > 0) {
      let matchedCount = 0;
      const schemeCodeSet = new Set(schemeCodes);
      const foundSchemeCodes = new Set<string>();
      
      for (const record of records) {
        foundSchemeCodes.add(record.schemeCode);
        if (schemeCodeSet.has(record.schemeCode)) {
          navMap.set(record.schemeCode, record);
          matchedCount++;
        }
      }
      
      console.log(`[MF NAV Service] Looking for ${schemeCodes.length} scheme codes:`, schemeCodes.slice(0, 5));
      console.log(`[MF NAV Service] Found ${foundSchemeCodes.size} unique scheme codes in AMFI file`);
      console.log(`[MF NAV Service] Matched ${matchedCount} out of ${schemeCodes.length} requested`);
      
      if (matchedCount === 0) {
        console.warn(`[MF NAV Service] ❌ No scheme codes matched!`);
        console.warn(`[MF NAV Service] First 10 requested:`, schemeCodes.slice(0, 10));
        const foundArray = Array.from(foundSchemeCodes).slice(0, 10);
        console.warn(`[MF NAV Service] First 10 found in file:`, foundArray);
        
        // Check if there's a type mismatch (string vs number)
        const requestedAsNumbers = schemeCodes.map(c => parseInt(c, 10));
        const foundAsNumbers = Array.from(foundSchemeCodes).map(c => parseInt(c, 10));
        console.warn(`[MF NAV Service] Checking type mismatch - requested (first 3):`, requestedAsNumbers.slice(0, 3));
        console.warn(`[MF NAV Service] Checking type mismatch - found (first 3):`, foundAsNumbers.slice(0, 3));
      }
    } else {
      // No filtering - include all records
      for (const record of records) {
        navMap.set(record.schemeCode, record);
      }
    }
    
    return navMap;
  } catch (error) {
    console.error(`[MF NAV Service] Failed to fetch AMFI NAV data:`, error);
    throw error;
  }
}

// ============================================================================
// DATABASE OPERATIONS
// ============================================================================

/**
 * Get NAV from database by ISIN (via scheme_code mapping)
 * 
 * @param isin - ISIN (used in assets table)
 * @param navDate - Optional date (defaults to previous trading day)
 * @returns NAV or null if not found
 */
export async function getMFNavByISIN(
  isin: string,
  navDate?: string
): Promise<MFNav | null> {
  try {
    // Get scheme_code from ISIN using scheme master
    const schemeCode = await getSchemeCodeByISIN(isin);
    if (!schemeCode) {
      console.warn(`[MF NAV Service] No scheme_code found for ISIN: ${isin}`);
      return null;
    }
    
    // Get NAV using scheme_code
    return getMFNav(schemeCode, navDate);
  } catch (error) {
    console.error(`[MF NAV Service] Error getting NAV for ISIN ${isin}:`, error);
    return null;
  }
}

/**
 * Get NAV from database by scheme_code
 * 
 * @param schemeCode - AMFI scheme code
 * @param navDate - Optional date (defaults to previous trading day)
 * @returns NAV or null if not found
 */
export async function getMFNav(
  schemeCode: string,
  navDate?: string
): Promise<MFNav | null> {
  try {
    const supabase = createAdminClient();
    const targetDate = navDate || getPreviousTradingDay();
    
    // Try to get NAV for the specific date
    const { data, error } = await supabase
      .from('mf_navs')
      .select('scheme_code, scheme_name, nav, nav_date, last_updated')
      .eq('scheme_code', schemeCode)
      .eq('nav_date', targetDate)
      .single();
    
    if (error || !data) {
      // Try to get the most recent NAV for this scheme (even if stale)
      const { data: latestData, error: latestError } = await supabase
        .from('mf_navs')
        .select('scheme_code, scheme_name, nav, nav_date, last_updated')
        .eq('scheme_code', schemeCode)
        .order('nav_date', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (latestData && !latestError) {
        // Return last stored NAV silently (stale checking happens at higher level)
        return {
          schemeCode: latestData.scheme_code,
          schemeName: latestData.scheme_name,
          nav: latestData.nav,
          navDate: latestData.nav_date,
          lastUpdated: latestData.last_updated,
        };
      }
      
      if (latestError) {
        console.warn(`[MF NAV Service] Error fetching latest NAV for ${schemeCode}:`, latestError);
      }
      
      return null;
    }
    
    return {
      schemeCode: data.scheme_code,
      schemeName: data.scheme_name,
      nav: data.nav,
      navDate: data.nav_date,
      lastUpdated: data.last_updated,
    };
  } catch (error) {
    console.error(`[MF NAV Service] Error getting NAV for ${schemeCode}:`, error);
    return null;
  }
}

/**
 * Store NAV in database
 * 
 * @param schemeCode - AMFI scheme code
 * @param schemeName - Scheme name
 * @param nav - NAV value
 * @param navDate - Trading date
 * @param priceSource - Source of the NAV (default: 'AMFI_DAILY')
 */
export async function storeMFNav(
  schemeCode: string,
  schemeName: string,
  nav: number,
  navDate: string,
  priceSource: string = 'AMFI_DAILY'
): Promise<boolean> {
  try {
    const supabase = createAdminClient();
    
    const { error } = await supabase
      .from('mf_navs')
      .upsert({
        scheme_code: schemeCode,
        scheme_name: schemeName,
        nav: nav,
        nav_date: navDate,
        price_source: priceSource,
        last_updated: new Date().toISOString(),
      }, {
        onConflict: 'scheme_code,nav_date',
      });
    
    if (error) {
      console.error(`[MF NAV Service] Error storing NAV for ${schemeCode}:`, error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error(`[MF NAV Service] Error storing NAV for ${schemeCode}:`, error);
    return false;
  }
}

/**
 * Update NAVs for a list of scheme codes
 * 
 * Fetches NAVs from AMFI and stores them in database.
 * Only updates if NAV for today's trading day is missing.
 * 
 * @param schemeCodes - Array of AMFI scheme codes (if empty, fetches all)
 * @returns Array of update results
 */
export async function updateMFNavs(schemeCodes?: string[]): Promise<NavUpdateResult[]> {
  const results: NavUpdateResult[] = [];
  
  try {
    console.log(`[MF NAV Service] updateMFNavs called with ${schemeCodes?.length || 0} scheme codes`);
    if (schemeCodes && schemeCodes.length > 0) {
      console.log(`[MF NAV Service] First 5 scheme codes:`, schemeCodes.slice(0, 5));
    }
    
    const supabase = createAdminClient();
    
    // Fetch NAVs from AMFI
    console.log(`[MF NAV Service] Fetching NAVs from AMFI...`);
    const navMap = await fetchNAVFromAMFI(schemeCodes);
    
    console.log(`[MF NAV Service] Fetched ${navMap.size} NAV records from AMFI`);
    
    if (navMap.size === 0) {
      console.warn(`[MF NAV Service] ❌ No NAV records found in AMFI file`);
      return results;
    }
    
    // Determine the actual NAV date from the fetched data
    const actualNavDate = Array.from(navMap.values())[0]?.navDate || getPreviousTradingDay();
    
    // Store NAVs in database using batch upsert
    const navsToStore = Array.from(navMap.entries()).map(([schemeCode, record]) => ({
      scheme_code: record.schemeCode,
      scheme_name: record.schemeName,
      nav: record.nav,
      nav_date: record.navDate,
      price_source: 'AMFI_DAILY',
      last_updated: new Date().toISOString(),
    }));
    
    try {
      const { error, data: upsertData } = await supabase
        .from('mf_navs')
        .upsert(navsToStore, {
          onConflict: 'scheme_code,nav_date',
          ignoreDuplicates: false,
        })
        .select('scheme_code, nav_date');
      
      if (error) {
        console.error(`[MF NAV Service] Error batch upserting NAVs:`, error);
        console.error(`[MF NAV Service] Error details:`, JSON.stringify(error, null, 2));
        
        // Fallback to one-by-one insert on error
        for (const [schemeCode, record] of navMap.entries()) {
          try {
            const stored = await storeMFNav(
              record.schemeCode,
              record.schemeName,
              record.nav,
              record.navDate,
              'AMFI_DAILY'
            );
            
            if (stored) {
              results.push({
                schemeCode,
                success: true,
                nav: record.nav,
                navDate: record.navDate,
              });
            } else {
              results.push({
                schemeCode,
                success: false,
                error: 'Failed to store NAV',
              });
            }
          } catch (error) {
            results.push({
              schemeCode,
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }
      } else {
        // Batch upsert succeeded - Supabase upsert may not return data if rows already exist
        // So we'll assume success for all, but log if verification is needed
        const storedSchemeCodes = new Set<string>();
        if (upsertData && Array.isArray(upsertData) && upsertData.length > 0) {
          for (const row of upsertData) {
            const key = `${row.scheme_code}_${row.nav_date}`;
            storedSchemeCodes.add(key);
          }
          console.log(`[MF NAV Service] Batch upsert returned ${upsertData.length} rows (some may have been updates)`);
        } else {
          // upsertData is null/empty - this is normal for upserts that update existing rows
          // Supabase doesn't return data for updates unless explicitly requested
          console.log(`[MF NAV Service] Batch upsert succeeded (no data returned - likely updates to existing rows)`);
        }
        
        // Verify NAVs were actually stored by querying a sample
        const sampleSchemeCode = Array.from(navMap.keys())[0];
        const sampleRecord = navMap.get(sampleSchemeCode);
        if (sampleRecord) {
          const { data: verifyData, error: verifyError } = await supabase
            .from('mf_navs')
            .select('scheme_code, nav, nav_date')
            .eq('scheme_code', sampleSchemeCode)
            .eq('nav_date', sampleRecord.navDate)
            .maybeSingle();
          
          if (verifyData) {
            console.log(`[MF NAV Service] ✅ Verified NAV stored: ${sampleSchemeCode} = ${verifyData.nav} on ${verifyData.nav_date}`);
          } else if (verifyError) {
            console.error(`[MF NAV Service] ❌ Verification failed for ${sampleSchemeCode}:`, verifyError);
          } else {
            console.warn(`[MF NAV Service] ⚠️ NAV not found after upsert for ${sampleSchemeCode} on ${sampleRecord.navDate}`);
          }
        }
        
        // Mark all as successful (upsert succeeded, so they should be stored)
        // If verification is needed, we can add it later, but upsert errors would have been caught above
        for (const [schemeCode, record] of navMap.entries()) {
          results.push({
            schemeCode,
            success: true,
            nav: record.nav,
            navDate: record.navDate,
          });
        }
      }
    } catch (error) {
      console.error(`[MF NAV Service] Error during batch upsert:`, error);
      // If batch fails completely, try individual inserts
      for (const [schemeCode, record] of navMap.entries()) {
        try {
          const stored = await storeMFNav(
            record.schemeCode,
            record.schemeName,
            record.nav,
            record.navDate,
            'AMFI_DAILY'
          );
          
          results.push({
            schemeCode,
            success: stored,
            nav: stored ? record.nav : undefined,
            navDate: stored ? record.navDate : undefined,
            error: stored ? undefined : 'Failed to store NAV',
          });
        } catch (err) {
          results.push({
            schemeCode,
            success: false,
            error: err instanceof Error ? err.message : 'Unknown error',
          });
        }
      }
    }
    
    return results;
  } catch (error) {
    console.error(`[MF NAV Service] Error updating NAVs:`, error);
    throw error;
  }
}

/**
 * Get NAVs for multiple ISINs (via scheme_code mapping)
 * 
 * @param isins - Array of ISINs (used in assets table)
 * @returns Map of ISIN to NAV (or null if not found)
 */
export async function getMFNavsByISIN(
  isins: string[]
): Promise<Map<string, MFNav | null>> {
  const navMap = new Map<string, MFNav | null>();
  
  for (const isin of isins) {
    const nav = await getMFNavByISIN(isin);
    navMap.set(isin.toUpperCase(), nav);
  }
  
  return navMap;
}

