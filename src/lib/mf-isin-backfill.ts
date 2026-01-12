/**
 * IMPROVED MF ISIN Backfill Logic
 * 
 * Addresses critical matching failures for schemes like:
 * - HDFC Transportation & Logistics Growth Direct Plan
 * - HDFC Nifty Next50 Index Growth Direct Plan
 * - Franklin India ELSS Tax Saver IDCW Payout Plan
 * 
 * KEY IMPROVEMENTS:
 * 1. Better normalization (handles &, numbers, hyphens)
 * 2. Token-based matching (handles word order differences)
 * 3. Levenshtein distance for similar tokens
 * 4. More candidates from RPC (100 instead of 25)
 * 5. Multi-stage scoring (tokens + string similarity + preferences)
 */

import { createAdminClient } from '@/lib/supabase/server';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix: number[][] = [];

  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[len1][len2];
}

/**
 * Calculate string similarity (0-1) using Levenshtein distance
 */
function stringSimilarity(str1: string, str2: string): number {
  const maxLen = Math.max(str1.length, str2.length);
  if (maxLen === 0) return 1.0;
  const distance = levenshteinDistance(str1, str2);
  return 1.0 - distance / maxLen;
}

/**
 * Improved normalization that handles common variations
 */
function normalizeAssetName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    // Replace & with and
    .replace(/&/g, 'and')
    // Add space between number and letter (Next50 → Next 50)
    .replace(/([0-9])([a-z])/gi, '$1 $2')
    // Remove hyphens
    .replace(/-/g, ' ')
    // Remove all punctuation except space
    .replace(/[^a-z0-9\s]/g, ' ')
    // Remove noise words
    .replace(/\b(fund|funds|plan|plans|option|options|scheme|schemes)\b/g, '')
    // Collapse multiple spaces
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Tokenize normalized name into array of words
 */
function tokenize(normalizedName: string): string[] {
  return normalizedName
    .split(/\s+/)
    .filter(token => token.length > 0);
}

/**
 * Extract core tokens (remove insignificant words)
 */
function extractCoreTokens(tokens: string[]): string[] {
  const insignificantWords = new Set([
    'a', 'an', 'the', 'of', 'and', 'or', 'in', 'on', 'at', 'to', 'for',
    'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were',
    'fund', 'funds', 'plan', 'plans', 'option', 'options', 'scheme', 'schemes'
  ]);

  return tokens.filter(token => 
    !insignificantWords.has(token) && token.length > 1
  );
}

/**
 * Separate tokens into categories for better matching
 */
interface TokenCategories {
  amc: string[];          // Asset Management Company tokens
  type: string[];         // Fund type tokens (equity, debt, hybrid, etc.)
  plan: string[];         // Plan type tokens (direct, regular, growth, dividend, idcw)
  other: string[];        // Other significant tokens
}

function categorizeTokens(tokens: string[]): TokenCategories {
  const categories: TokenCategories = {
    amc: [],
    type: [],
    plan: [],
    other: []
  };

  const amcKeywords = new Set([
    'hdfc', 'icici', 'sbi', 'axis', 'kotak', 'aditya', 'birla', 'reliance',
    'nippon', 'franklin', 'motilal', 'oswal', 'dsp', 'uti', 'tata',
    'mirae', 'baroda', 'bnp', 'paribas', 'whiteoak', 'quant', 'hsbc',
    'sundaram', 'edelweiss', 'idfc', 'invesco', 'pgim', 'quantum',
    'principal', 'prudential', 'templeton', 'india'
  ]);

  const typeKeywords = new Set([
    'equity', 'debt', 'hybrid', 'liquid', 'gilt', 'elss',
    'large', 'mid', 'small', 'cap', 'multicap', 'flexi',
    'index', 'etf', 'fof', 'arbitrage', 'balanced',
    'infrastructure', 'banking', 'pharma', 'technology', 'it',
    'energy', 'consumption', 'manufacturing', 'transportation',
    'logistics', 'retirement', 'savings', 'tax', 'saver'
  ]);

  const planKeywords = new Set([
    'direct', 'regular', 'growth', 'dividend', 'idcw',
    'payout', 'reinvestment', 'reinvest', 'bonus', 'monthly', 'quarterly',
    'annual', 'cumulative', 'iddr'  // IDDR = IDCW Direct Reinvestment
  ]);

  tokens.forEach(token => {
    if (amcKeywords.has(token)) {
      categories.amc.push(token);
    } else if (typeKeywords.has(token)) {
      categories.type.push(token);
    } else if (planKeywords.has(token)) {
      categories.plan.push(token);
    } else {
      categories.other.push(token);
    }
  });

  return categories;
}

/**
 * Calculate token-based match score
 */
function calculateTokenMatchScore(
  assetTokens: TokenCategories,
  schemeTokens: TokenCategories
): number {
  let score = 0;
  let maxScore = 0;

  // AMC tokens (40 points) - Must match exactly
  const amcMatches = assetTokens.amc.filter(token => 
    schemeTokens.amc.includes(token)
  ).length;
  score += (amcMatches / Math.max(assetTokens.amc.length, 1)) * 40;
  maxScore += 40;

  // Type tokens (30 points) - Allow fuzzy matching
  let typeScore = 0;
  assetTokens.type.forEach(assetToken => {
    const bestMatch = Math.max(
      ...schemeTokens.type.map(schemeToken => 
        stringSimilarity(assetToken, schemeToken)
      ),
      0
    );
    typeScore += bestMatch;
  });
  score += (typeScore / Math.max(assetTokens.type.length, 1)) * 30;
  maxScore += 30;

  // Plan tokens (15 points) - Prefer direct + growth, handle payout vs reinvestment
  let planScore = 0;
  const planMatches = assetTokens.plan.filter(token => 
    schemeTokens.plan.includes(token)
  ).length;
  
  // Check for conflicting plan options (payout vs reinvestment)
  const assetHasPayout = assetTokens.plan.some(t => t === 'payout');
  const assetHasReinvest = assetTokens.plan.some(t => t === 'reinvestment' || t === 'reinvest');
  const schemeHasPayout = schemeTokens.plan.some(t => t === 'payout');
  const schemeHasReinvest = schemeTokens.plan.some(t => t === 'reinvestment' || t === 'reinvest');
  
  // If asset specifies payout but scheme has reinvestment (or vice versa), penalize heavily
  if ((assetHasPayout && schemeHasReinvest) || (assetHasReinvest && schemeHasPayout)) {
    planScore = 0; // No points - conflicting option
    console.log(`[Match] Plan conflict: asset wants ${assetHasPayout ? 'payout' : 'reinvest'} but scheme has ${schemeHasPayout ? 'payout' : 'reinvest'}`);
  } else {
    // Normal scoring
    planScore = (planMatches / Math.max(assetTokens.plan.length, schemeTokens.plan.length, 1)) * 15;
    
    // Bonus: If asset specifies payout/reinvest and scheme matches, add extra confidence
    if ((assetHasPayout && schemeHasPayout) || (assetHasReinvest && schemeHasReinvest)) {
      planScore += 5; // Bonus for explicit match
    }
  }
  
  score += planScore;
  maxScore += 15;

  // Other tokens (15 points)
  let otherScore = 0;
  assetTokens.other.forEach(assetToken => {
    const bestMatch = Math.max(
      ...schemeTokens.other.map(schemeToken => 
        stringSimilarity(assetToken, schemeToken)
      ),
      0
    );
    otherScore += bestMatch;
  });
  score += (otherScore / Math.max(assetTokens.other.length, 1)) * 15;
  maxScore += 15;

  return maxScore > 0 ? (score / maxScore) * 100 : 0;
}

/**
 * Get plan preference score based on Direct/Regular and Growth matching
 * Returns positive score for matches, negative for mismatches
 */
function getPlanPreferenceScore(assetName: string, schemeName: string): number {
  const assetLower = assetName.toLowerCase();
  const schemeLower = schemeName.toLowerCase();
  let score = 0;

  // Direct/Regular matching
  const assetWantsDirect = assetLower.includes('direct');
  const assetWantsRegular = assetLower.includes('regular');
  const schemeIsDirect = schemeLower.includes('direct');
  
  if (assetWantsDirect && schemeIsDirect) {
    score += 10;  // Perfect match: Direct → Direct
  } else if (assetWantsRegular && !schemeIsDirect) {
    score += 10;  // Perfect match: Regular → Regular (non-Direct)
  } else if (!assetWantsDirect && !assetWantsRegular) {
    // Asset doesn't specify Direct/Regular - prefer Regular (more common)
    score += (!schemeIsDirect ? 5 : 0);
  } else if ((assetWantsDirect && !schemeIsDirect) || (assetWantsRegular && schemeIsDirect)) {
    score -= 20;  // Penalty for mismatch
  }

  // Growth matching
  const assetWantsGrowth = assetLower.includes('growth');
  const schemeIsGrowth = schemeLower.includes('growth');
  
  if (assetWantsGrowth && schemeIsGrowth) {
    score += 5;  // Growth match bonus
  } else if (assetWantsGrowth && !schemeIsGrowth) {
    score -= 10;  // Growth mismatch penalty
  }

  return score;
}

// ============================================================================
// MAIN MATCHING LOGIC
// ============================================================================

interface MatchCandidate {
  scheme_code: string;
  scheme_name: string;
  fund_house: string;
  isin_growth: string | null;
  isin_div_payout: string | null;
  isin_div_reinvest: string | null;
  scheme_status: string;
  last_updated: string;
  similarity_score: number;
  name_norm: string;
}

interface MatchResult {
  schemeCode: string;
  schemeName: string;
  isin: string;
  confidence: number;
  matchType: string;
}

async function findBestMatch(
  assetName: string,
  supabase: any
): Promise<MatchResult | null> {
  
  console.log(`\n[Matching] Asset: "${assetName}"`);
  
  // Step 1: Normalize and tokenize asset name
  const normalizedAsset = normalizeAssetName(assetName);
  const assetTokens = extractCoreTokens(tokenize(normalizedAsset));
  const assetCategories = categorizeTokens(assetTokens);
  
  console.log(`[Matching] Normalized: "${normalizedAsset}"`);
  console.log(`[Matching] AMC tokens: [${assetCategories.amc.join(', ')}]`);
  console.log(`[Matching] Type tokens: [${assetCategories.type.join(', ')}]`);
  console.log(`[Matching] Plan tokens: [${assetCategories.plan.join(', ')}]`);
  
  // Step 2: Get candidates from RPC (now returns 100)
  const { data: candidates, error } = await supabase.rpc('mf_match_candidates', {
    p_asset_name: assetName
  });
  
  if (error) {
    console.error(`[Matching] RPC error:`, error);
    return null;
  }
  
  if (!candidates || candidates.length === 0) {
    console.warn(`[Matching] No candidates found from RPC`);
    return null;
  }
  
  console.log(`[Matching] Got ${candidates.length} candidates from RPC`);
  
  // Step 3: Score each candidate using token-based matching
  interface ScoredCandidate extends MatchCandidate {
    tokenScore: number;
    stringScore: number;
    planScore: number;
    totalScore: number;
  }
  
  const scoredCandidates: ScoredCandidate[] = candidates.map((candidate: MatchCandidate) => {
    // Normalize and tokenize scheme name
    const normalizedScheme = normalizeAssetName(candidate.scheme_name);
    const schemeTokens = extractCoreTokens(tokenize(normalizedScheme));
    const schemeCategories = categorizeTokens(schemeTokens);
    
    // Calculate token-based score
    const tokenScore = calculateTokenMatchScore(assetCategories, schemeCategories);
    
    // Calculate string similarity score
    const stringScore = stringSimilarity(normalizedAsset, normalizedScheme) * 100;
    
    // Plan preference score (handles Direct/Regular matching)
    const planScore = getPlanPreferenceScore(assetName, candidate.scheme_name);
    
    // Total score: 70% token-based + 30% string similarity + plan preference
    const totalScore = (tokenScore * 0.7) + (stringScore * 0.3) + planScore;
    
    return {
      ...candidate,
      tokenScore,
      stringScore,
      planScore,
      totalScore
    };
  });
  
  // Step 4: Sort by total score
  scoredCandidates.sort((a, b) => b.totalScore - a.totalScore);
  
  // Step 5: Log top 5 candidates for debugging
  console.log(`\n[Matching] Top 5 candidates:`);
  scoredCandidates.slice(0, 5).forEach((candidate, index) => {
    console.log(`  ${index + 1}. ${candidate.scheme_name}`);
    console.log(`     Token: ${candidate.tokenScore.toFixed(1)}% | String: ${candidate.stringScore.toFixed(1)}% | Plan: ${candidate.planScore > 0 ? '+' : ''}${candidate.planScore} | Total: ${candidate.totalScore.toFixed(1)}%`);
  });
  
  // Step 6: Get best match
  const bestMatch = scoredCandidates[0];
  
  // Confidence threshold: 60% (lowered from 70% due to better matching)
  if (bestMatch.totalScore < 60) {
    console.warn(`[Matching] Best match score ${bestMatch.totalScore.toFixed(1)}% is below threshold (60%)`);
    return null;
  }
  
  // Step 7: Select ISIN (prefer growth > div_payout > div_reinvest)
  const isin = bestMatch.isin_growth || bestMatch.isin_div_payout || bestMatch.isin_div_reinvest;
  
  if (!isin) {
    console.warn(`[Matching] Best match has no ISIN`);
    return null;
  }
  
  console.log(`\n[Matching] ✅ MATCH FOUND: "${bestMatch.scheme_name}"`);
  console.log(`[Matching] ISIN: ${isin} | Confidence: ${bestMatch.totalScore.toFixed(1)}%`);
  
  return {
    schemeCode: bestMatch.scheme_code,
    schemeName: bestMatch.scheme_name,
    isin,
    confidence: Math.round(bestMatch.totalScore),
    matchType: 'token_based'
  };
}

// ============================================================================
// BACKFILL FUNCTION
// ============================================================================

interface BackfillResult {
  scanned: number;
  resolved: number;
  unresolved: number;
  sample_unresolved: string[];
  rejection_reasons?: Record<string, number>;
}

export async function backfillMFISINs(): Promise<BackfillResult> {
  const supabase = createAdminClient();
  
  console.log('\n========================================');
  console.log('MF ISIN BACKFILL - IMPROVED TOKEN-BASED MATCHING');
  console.log('========================================\n');
  
  // Step 1: Get all MF assets without ISIN
  const { data: assets, error: assetsError } = await supabase
    .from('assets')
    .select('id, name, asset_type, isin, symbol')
    .eq('asset_type', 'mutual_fund')
    .eq('is_active', true)
    .is('isin', null);
  
  if (assetsError) {
    console.error('[Backfill] Error fetching assets:', assetsError);
    throw assetsError;
  }
  
  if (!assets || assets.length === 0) {
    console.log('[Backfill] No assets need ISIN resolution');
    return {
      scanned: 0,
      resolved: 0,
      unresolved: 0,
      sample_unresolved: []
    };
  }
  
  console.log(`[Backfill] Found ${assets.length} assets without ISIN\n`);
  
  // Step 2: Process each asset
  let resolved = 0;
  let unresolved = 0;
  const unresolvedNames: string[] = [];
  const rejectionReasons: Record<string, number> = {};
  
  for (const asset of assets) {
    try {
      const match = await findBestMatch(asset.name, supabase);
      
      if (match) {
        // Update asset with ISIN and scheme_code
        const { error: updateError } = await supabase
          .from('assets')
          .update({
            isin: match.isin,
            symbol: match.schemeCode,
            updated_at: new Date().toISOString()
          })
          .eq('id', asset.id);
        
        if (updateError) {
          console.error(`[Backfill] Error updating asset ${asset.id}:`, updateError);
          unresolved++;
          unresolvedNames.push(asset.name);
        } else {
          resolved++;
          console.log(`[Backfill] ✅ Resolved: "${asset.name}" → ${match.isin}\n`);
        }
      } else {
        unresolved++;
        unresolvedNames.push(asset.name);
        rejectionReasons['no_match_above_threshold'] = (rejectionReasons['no_match_above_threshold'] || 0) + 1;
        console.log(`[Backfill] ❌ No match: "${asset.name}"\n`);
      }
    } catch (error) {
      console.error(`[Backfill] Error processing asset "${asset.name}":`, error);
      unresolved++;
      unresolvedNames.push(asset.name);
      rejectionReasons['processing_error'] = (rejectionReasons['processing_error'] || 0) + 1;
    }
  }
  
  // Step 3: Return results
  console.log('\n========================================');
  console.log('BACKFILL COMPLETE');
  console.log('========================================');
  console.log(`Scanned: ${assets.length}`);
  console.log(`Resolved: ${resolved}`);
  console.log(`Unresolved: ${unresolved}`);
  console.log(`Success Rate: ${((resolved / assets.length) * 100).toFixed(1)}%\n`);
  
  return {
    scanned: assets.length,
    resolved,
    unresolved,
    sample_unresolved: unresolvedNames.slice(0, 10),
    rejection_reasons: rejectionReasons
  };
}