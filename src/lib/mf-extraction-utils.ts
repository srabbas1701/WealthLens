/**
 * Mutual Fund Metadata Extraction Utilities
 * 
 * Shared extraction functions for extracting AMC name, category, and plan type
 * from scheme names. Used by:
 * - Backfill script (populates database columns)
 * - API endpoints (fallback for new schemes)
 * - Scheme master update logic (auto-populate on insert/update)
 */

// Helper to extract AMC name from scheme name
export function extractAMC(schemeName: string): string {
  if (!schemeName) return 'Other';
  
  const name = schemeName.trim();
  
  // Known AMC patterns - check for full names first (ordered by specificity - longer names first)
  const knownAMCs = [
    'Aditya Birla Sun Life', 'Aditya Birla', 'ICICI Prudential', 'ICICI Pru',
    'Franklin Templeton', 'Franklin', 'DSP Mutual Fund', 'DSP',
    'Nippon India', 'Nippon', 'Tata Mutual Fund', 'Tata',
    'Reliance Mutual Fund', 'Reliance', 'Mirae Asset', 'Mirae',
    'Parag Parikh', 'PPFAS', 'Invesco Mutual Fund', 'Invesco',
    'Edelweiss Mutual Fund', 'Edelweiss', 'Canara Robeco', 'Canara',
    'IDFC Mutual Fund', 'IDFC', 'HSBC Mutual Fund', 'HSBC',
    'BNP Paribas', 'Baroda BNP', 'Baroda', 'BNP',
    'Mahindra Manulife', 'Mahindra', 'PGIM India', 'PGIM',
    'Quant Mutual Fund', 'Quant', 'Sundaram Mutual Fund', 'Sundaram',
    'Union Mutual Fund', 'Union', 'LIC Mutual Fund', 'LIC',
    'JM Financial', 'JM', 'Motilal Oswal', 'Motilal',
    'WhiteOak Capital', 'WhiteOak', 'Samco Mutual Fund', 'Samco',
    'Groww Mutual Fund', 'Groww', 'Zerodha Mutual Fund', 'Zerodha',
    '360 ONE Mutual Fund', '360 ONE', '360 One', '360ONE', '360one',
    'Bandhan Mutual Fund', 'Bandhan',
    'Angel One', 'ANGEL ONE',
    'Bajaj Finserv', 'Bajaj',
    'Abakkus',
    'The Wealth Company',
    'Bank of India', 'BANK OF INDIA', 'BOI',
    'JioBlackRock', 'Jio BlackRock', 'Jio Black Rock',
    'NAVI', 'Navii',
    'Capitalmind',
    'Shriram', 'Shriram Mutual Fund',
    'TRUSTMF', 'TRUST', 'Trust Mutual Fund',
    'Taurus', 'Taurus Mutual Fund',
    'Unifi', 'Unifi Capital',
    'HDFC', 'SBI', 'UTI', 'Kotak', 'Axis', 'ITI', 'NJ', 'PNB'
  ];
  
  // Check for known AMC names (case insensitive)
  const nameLower = name.toLowerCase();
  for (const amc of knownAMCs) {
    if (nameLower.startsWith(amc.toLowerCase())) {
      return amc;
    }
  }
  
  // Pattern 1: Extract before common fund/scheme keywords (MOST IMPORTANT - stops early)
  // These keywords indicate the start of scheme name, not AMC name
  const schemeKeywords = [
    'mutual fund', 'mf', 'fund', 'fmp', 'ftif', 'series', 'scheme', 'plan',
    'equity', 'debt', 'hybrid', 'balanced', 'flexi cap', 'large cap', 'mid cap',
    'small cap', 'multi cap', 'direct', 'regular', 'growth', 'dividend',
    'gold', 'etf', 'fof', 'consumption', 'elss', 'tax saver', 'healthcare',
    'arbitrage', 'aggressive hybrid', 'balanced advantage', 'banking', 'financial services', 'psu',
    'gilt', 'liquid', 'nifty', 'index', 'momentum', 'quality', 'savings',
    'value', 'focused', 'sector', 'sectoral', 'thematic', 'income', 'bond',
    'corporate', 'credit risk', 'dynamic', 'ultra short', 'short term',
    'medium term', 'long term', 'government', 'overnight', 'treasury', 'us',
    'crisil', 'ibx', 'sdl', 'plus', 'allocation', 'maturity', 'fixed', 'term',
    'excellence', 'global', 'retail', 'option', 'payout', 'idcw', 'reinvest',
    'quant', 'multi asset', 'asset allocation', 'bhavishya', 'yojna',
    'bharat', 'cpse', '22', 'april', '2025', '2032', 'choice',
    'aggressive hybrid', 'sector rotation', 'unclaimed', 'redemption', 'education pool'
  ];
  
  for (const keyword of schemeKeywords) {
    const index = nameLower.indexOf(' ' + keyword.toLowerCase());
    if (index > 0) {
      const extracted = name.substring(0, index).trim();
      // AMC names are typically 2-50 characters (scheme names are 50+)
      if (extracted.length >= 2 && extracted.length <= 50) {
        return extracted;
      }
    }
  }
  
  // Pattern 2: Extract first 1-3 words, but stop at scheme indicators
  const words = name.split(/\s+/);
  
  // Comprehensive scheme indicators - if we see these ANYWHERE in the name, stop extracting
  const schemeIndicators = [
    // Fund types
    'gold', 'etf', 'fof', 'nifty', 'index', 'consumption', 'elss', 'healthcare',
    'arbitrage', 'aggressive', 'gilt', 'liquid', 'savings', 'value', 'focused', 'sector',
    'thematic', 'income', 'bond', 'corporate', 'credit', 'risk', 'dynamic',
    'ultra', 'short', 'term', 'medium', 'long', 'government', 'overnight',
    'tax', 'saver', 'banking', 'psu', 'momentum', 'quality', 'advantage',
    'total', 'market', 'rate', '1d', 'treasury', 'us',
    // Index/benchmark related
    'crisil', 'ibx', 'sdl', 'plus', 'sensex', 'bse', 'nse', 'bharat', 'cpse',
    // Fund structure
    'allocation', 'maturity', 'fixed', 'excellence', 'global', 'retail',
    'option', 'payout', 'idcw', 'reinvest', 'quant', 'asset', 'bhavishya', 'yojna',
    // Numbers and dates (often in scheme names)
    '90:10', '10:90', '0-1', '1-3', '3-6', '6-12', '92', '1837', 'days',
    '22', '2025', '2032', 'april', 'choice',
    // Plan types (should stop before these)
    'direct', 'regular', 'growth', 'dividend', 'div'
  ];
  
  // Check ALL words for scheme indicators - if found, stop before that word
  for (let i = 0; i < words.length; i++) {
    const wordLower = words[i].toLowerCase().replace(/[^a-z0-9]/g, ''); // Remove special chars for matching
    if (schemeIndicators.some(ind => {
      const indClean = ind.toLowerCase().replace(/[^a-z0-9]/g, '');
      return wordLower === indClean || wordLower.startsWith(indClean) || indClean.includes(wordLower);
    })) {
      // Stop before this word - extract only words before this
      if (i === 0) {
        return 'Other'; // First word is a scheme indicator, can't extract AMC
      }
      const extracted = words.slice(0, i).join(' ').trim();
      if (extracted.length >= 2 && extracted.length <= 50) {
        return extracted;
      }
    }
  }
  
  // Pattern 3: Conservative extraction - only extract if we're confident
  // Most AMCs are 1-3 words, but we need to be very careful
  if (words.length >= 1) {
    const firstWord = words[0];
    // Only proceed if first word looks like an AMC name (letters only, reasonable length)
    if (firstWord.length >= 2 && firstWord.length <= 20 && /^[A-Za-z]+$/.test(firstWord)) {
      // Check if second word is a known AMC word (not a scheme keyword)
      if (words.length >= 2) {
        const secondWord = words[1];
        const secondWordLower = secondWord.toLowerCase();
        
        // Known AMC second words
        const knownAMCSecondWords = [
          'prudential', 'birla', 'sun', 'life', 'templeton', 'mutual', 'india',
          'asset', 'capital', 'financial', 'one', 'finserv', 'manulife', 'paribas',
          'robeco', 'tata', 'reliance', 'mirae', 'parikh', 'ppfas', 'invesco',
          'edelweiss', 'canara', 'idfc', 'hsbc', 'bnp', 'baroda', 'mahindra',
          'pgim', 'quant', 'sundaram', 'union', 'lic', 'jm', 'motilal', 'oswal',
          'whiteoak', 'samco', 'groww', 'zerodha'
        ];
        
        // Check if second word is a scheme indicator
        const isSchemeKeyword = schemeIndicators.some(ind => {
          const indClean = ind.toLowerCase().replace(/[^a-z0-9]/g, '');
          const wordClean = secondWordLower.replace(/[^a-z0-9]/g, '');
          return wordClean === indClean || wordClean.startsWith(indClean);
        });
        
        // Check if second word is a known AMC word
        const isKnownAMCWord = knownAMCSecondWords.some(word => secondWordLower.includes(word));
        
        // Only combine if it's a known AMC word AND not a scheme keyword
        if (isKnownAMCWord && !isSchemeKeyword && secondWord.length <= 15 && /^[A-Za-z]+$/.test(secondWord)) {
          const twoWord = `${words[0]} ${words[1]}`;
          if (twoWord.length <= 30) {
            // Check third word - if it's "Sun" or "Life", include it (for "Aditya Birla Sun Life")
            if (words.length >= 3) {
              const thirdWord = words[2];
              const thirdWordLower = thirdWord.toLowerCase();
              if ((thirdWordLower === 'sun' || thirdWordLower === 'life') && 
                  !schemeIndicators.some(ind => thirdWordLower === ind)) {
                const threeWord = `${words[0]} ${words[1]} ${words[2]}`;
                if (threeWord.length <= 40) {
                  return threeWord;
                }
              }
            }
            return twoWord;
          }
        }
      }
      
      // Default: return just first word if we can't confidently determine
      // This is safer than extracting too much
      return firstWord;
    }
  }
  
  // Fallback: return first word or "Other"
  return words[0] || 'Other';
}

// Helper to extract category from scheme name
export function extractCategory(schemeName: string): string {
  const name = schemeName.toLowerCase();
  
  // Order matters - check more specific patterns first
  
  // Index/ETF (check FIRST - ETFs are always Index category, even if they mention large/mid/small cap)
  if (name.includes('etf') || name.includes('exchange traded')) return 'Index';
  if (name.includes('gold etf') || name.includes('goldetf')) return 'Index'; // Gold ETF is still an index fund
  if (name.includes('index') || name.includes('nifty') || name.includes('sensex') || name.includes('bse')) return 'Index';
  
  // Equity categories (check after ETF/Index)
  if (name.includes('large cap') || name.includes('largecap')) return 'Large Cap';
  if (name.includes('mid cap') || name.includes('midcap')) return 'Mid Cap';
  if (name.includes('small cap') || name.includes('smallcap')) return 'Small Cap';
  if (name.includes('flexi cap') || name.includes('flexicap')) return 'Flexi Cap';
  if (name.includes('multi cap') || name.includes('multicap')) return 'Multi Cap';
  if (name.includes('elite') || name.includes('elss') || name.includes('tax saver')) return 'ELSS';
  if (name.includes('value') || name.includes('value fund')) return 'Value';
  if (name.includes('dividend yield')) return 'Dividend Yield';
  if (name.includes('focused') || name.includes('focused fund')) return 'Focused';
  if (name.includes('sector') || name.includes('sectoral')) return 'Sectoral';
  if (name.includes('thematic') || name.includes('theme')) return 'Thematic';
  if (name.includes('consumption')) return 'Sectoral'; // Consumption is a sectoral theme
  // Sectoral funds (banking, financial services, healthcare, etc.)
  if (name.includes('banking') || name.includes('financial services') || name.includes('financial-services')) return 'Sectoral';
  if (name.includes('healthcare') || name.includes('pharma') || name.includes('pharmaceutical')) return 'Sectoral';
  if (name.includes('technology') || name.includes('tech') || name.includes('it')) return 'Sectoral';
  if (name.includes('infrastructure') || name.includes('infra') || name.includes('manufacturing')) return 'Sectoral';
  if (name.includes('commodity') || name.includes('commodities')) return 'Sectoral';
  // Additional sectoral patterns
  if (name.includes('power') || name.includes('energy')) return 'Sectoral';
  if (name.includes('auto') || name.includes('automobile')) return 'Sectoral';
  if (name.includes('real estate') || name.includes('realty')) return 'Sectoral';
  if (name.includes('media') || name.includes('entertainment')) return 'Sectoral';
  if (name.includes('consumer') || name.includes('fmcg')) return 'Sectoral';
  if (name.includes('services')) return 'Sectoral';
  if (name.includes('esg') || name.includes('environmental') || name.includes('sustainability')) return 'Thematic';
  if (name.includes('emerging') || name.includes('opportunities')) return 'Thematic';
  // Quant funds
  if (name.includes('quant') || name.includes('quantitative')) return 'Other'; // Quant can be equity or debt
  
  // Hybrid categories
  if (name.includes('balanced advantage') || name.includes('balanced-advantage')) return 'Hybrid';
  if (name.includes('conservative hybrid')) return 'Hybrid';
  if (name.includes('aggressive hybrid')) return 'Hybrid';
  if (name.includes('multi asset') || name.includes('multi-asset') || name.includes('asset allocation')) return 'Hybrid';
  // Check for "BAL" (abbreviation for Balanced) - must check before generic "balanced"
  if (name.includes(' bal ') || name.includes(' bal-') || name.includes('-bal ') || name.includes('bhavishya')) return 'Hybrid';
  if (name.includes('balanced') || name.includes('hybrid')) return 'Hybrid';
  
  // Debt categories (order matters - more specific first)
  if (name.includes('ultra short') || name.includes('ultra short term') || name.includes('ultra-short')) return 'Ultra Short Term';
  if (name.includes('overnight')) return 'Liquid';
  if (name.includes('liquid') || name.includes('money market')) return 'Liquid';
  if (name.includes('floating rate') || name.includes('floating-rate')) return 'Debt'; // Floating rate funds are debt
  if (name.includes('long duration') || name.includes('long-duration')) return 'Debt'; // Long duration funds are debt
  if (name.includes('short duration') || name.includes('short-duration')) return 'Debt';
  if (name.includes('medium duration') || name.includes('medium-duration')) return 'Debt';
  if (name.includes('short term') || name.includes('short-term')) return 'Short Term';
  if (name.includes('medium term') || name.includes('medium-term')) return 'Medium Term';
  if (name.includes('long term') || name.includes('long-term')) return 'Long Term';
  if (name.includes('gilt') || name.includes('government') || name.includes('govt')) return 'Gilt';
  if (name.includes('corporate bond') || name.includes('corporate-bond')) return 'Corporate Bond';
  if (name.includes('credit risk')) return 'Credit Risk';
  if (name.includes('dynamic bond') || name.includes('dynamic-bond')) return 'Dynamic Bond';
  if (name.includes('treasury') || name.includes('us treasury')) return 'Debt'; // US Treasury bonds
  if (name.includes('fixed maturity') || name.includes('fixed-maturity') || name.includes('fmp')) return 'Debt';
  if (name.includes('fixed term') || name.includes('fixed-term')) return 'Debt';
  if (name.includes('debt') || name.includes('bond') || name.includes('income')) return 'Debt';
  
  // Other categories
  if (name.includes('arbitrage')) return 'Arbitrage';
  if (name.includes('equity savings')) return 'Equity Savings';
  if (name.includes('fof') || name.includes('fund of fund')) return 'FoF';
  
  return 'Other';
}

// Helper to extract plan from scheme name
export function extractPlan(schemeName: string): string {
  const name = schemeName.toLowerCase();
  const isDirect = name.includes('direct');
  const isRegular = name.includes('regular') || (!isDirect && !name.includes('direct'));
  const isGrowth = name.includes('growth');
  const isDividend = name.includes('dividend') || name.includes('div');
  
  if (isDirect && isGrowth) return 'Direct - Growth';
  if (isDirect && isDividend) return 'Direct - Dividend';
  if (isRegular && isGrowth) return 'Regular - Growth';
  if (isRegular && isDividend) return 'Regular - Dividend';
  if (isDirect) return 'Direct - Growth'; // Default for direct
  return 'Regular - Growth'; // Default
}
