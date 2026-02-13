# Real Estate Valuation Service Design

**Status:** Design Document  
**Version:** 1.0  
**Date:** January 2025

---

## Overview

Production-ready Real Estate valuation service for Indian properties. Always returns a **RANGE** (min_value, max_value) with confidence levels. User override takes highest priority.

**Key Principles:**
- Never expose raw scraped data to UI
- Always return ranges, never single values
- User override is the source of truth
- Async/background job architecture
- Conservative adjustments for safety

---

## Architecture

```
┌─────────────────┐
│   Frontend UI   │
│  (React/Next)   │
└────────┬────────┘
         │ GET /api/real-estate/valuation/:assetId
         ▼
┌─────────────────────────────────────┐
│   Valuation API (Read Path)         │
│   - Returns cached valuation        │
│   - Fast, no external calls         │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│   Database (real_estate_assets)     │
│   - system_estimated_min            │
│   - system_estimated_max            │
│   - user_override_value             │
│   - valuation_last_updated          │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│   Background Job (Cron)             │
│   POST /api/real-estate/valuation/  │
│        update                        │
│   - Scrapes property sites          │
│   - Calculates ranges               │
│   - Updates database                │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│   Scraping Service                  │
│   - Magicbricks                     │
│   - 99acres                         │
│   - Housing.com                     │
└─────────────────────────────────────┘
```

---

## API Contract

### 1. Get Valuation (Read Path)

**Endpoint:** `GET /api/real-estate/valuation/:assetId`

**Description:** Returns current valuation for a property. Fast read path, no external calls.

**Request:**
```typescript
// URL parameter
assetId: string (UUID)
```

**Response:**
```typescript
{
  success: boolean;
  data?: {
    assetId: string;
    displayValue: number;           // User override OR midpoint of range
    minEstimatedValue: number;      // Always present
    maxEstimatedValue: number;      // Always present
    valuationSource: 'user_override' | 'system_estimate';
    valuationConfidence: 'low' | 'medium' | 'high';
    source: string;                  // "online listings" or "user override"
    lastUpdated: string;             // ISO timestamp
    areaUsed: 'carpet' | 'builtup'; // Which area was used for calculation
    pricePerSqftRange?: {           // Only if system estimate
      min: number;
      max: number;
    };
  };
  error?: string;
}
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "assetId": "123e4567-e89b-12d3-a456-426614174000",
    "displayValue": 8500000,
    "minEstimatedValue": 8000000,
    "maxEstimatedValue": 9000000,
    "valuationSource": "system_estimate",
    "valuationConfidence": "medium",
    "source": "online listings",
    "lastUpdated": "2025-01-15T10:30:00Z",
    "areaUsed": "carpet",
    "pricePerSqftRange": {
      "min": 8000,
      "max": 9000
    }
  }
}
```

---

### 2. Update Valuation (Background Job)

**Endpoint:** `POST /api/real-estate/valuation/update`

**Description:** Background job to update valuations. Can be triggered manually or via cron.

**Request:**
```typescript
{
  assetIds?: string[];  // Optional: specific assets to update. If empty, updates all.
  force?: boolean;      // Optional: force update even if recently updated
}
```

**Response:**
```typescript
{
  success: boolean;
  updated: number;      // Count of assets updated
  failed: number;       // Count of failures
  skipped: number;      // Count skipped (too recent, no data, etc.)
  results: Array<{
    assetId: string;
    success: boolean;
    minValue?: number;
    maxValue?: number;
    confidence?: 'low' | 'medium' | 'high';
    error?: string;
    skipped?: boolean;
    skipReason?: string;
  }>;
  error?: string;
}
```

**Example Response:**
```json
{
  "success": true,
  "updated": 5,
  "failed": 1,
  "skipped": 2,
  "results": [
    {
      "assetId": "123e4567-e89b-12d3-a456-426614174000",
      "success": true,
      "minValue": 8000000,
      "maxValue": 9000000,
      "confidence": "medium"
    },
    {
      "assetId": "223e4567-e89b-12d3-a456-426614174001",
      "success": false,
      "error": "No price data found for locality"
    },
    {
      "assetId": "323e4567-e89b-12d3-a456-426614174002",
      "skipped": true,
      "skipReason": "Updated less than 24 hours ago"
    }
  ]
}
```

---

### 3. Trigger Single Asset Valuation

**Endpoint:** `POST /api/real-estate/valuation/:assetId/update`

**Description:** Manually trigger valuation update for a single asset (e.g., user clicks "Refresh Valuation").

**Request:**
```typescript
// URL parameter
assetId: string (UUID)

// Optional query params
force?: boolean
```

**Response:**
```typescript
{
  success: boolean;
  data?: {
    assetId: string;
    minEstimatedValue: number;
    maxEstimatedValue: number;
    valuationConfidence: 'low' | 'medium' | 'high';
    source: string;
    lastUpdated: string;
  };
  error?: string;
}
```

---

## Pseudocode

### Main Valuation Logic

```pseudocode
FUNCTION calculatePropertyValuation(asset):
  // Priority 1: User Override
  IF asset.user_override_value IS NOT NULL:
    RETURN {
      displayValue: asset.user_override_value,
      minEstimatedValue: asset.user_override_value * 0.95,  // -5% buffer
      maxEstimatedValue: asset.user_override_value * 1.05, // +5% buffer
      source: "user_override",
      confidence: "high"
    }
  END IF
  
  // Priority 2: System Estimate
  // Step 1: Determine area to use
  area = NULL
  IF asset.carpet_area_sqft IS NOT NULL:
    area = asset.carpet_area_sqft
    areaType = "carpet"
  ELSE IF asset.builtup_area_sqft IS NOT NULL:
    area = asset.builtup_area_sqft
    areaType = "builtup"
  ELSE:
    RETURN ERROR("No area data available")
  END IF
  
  // Step 2: Fetch locality price-per-sqft range
  localityData = fetchLocalityPriceRange(
    city: asset.city,
    pincode: asset.pincode,
    propertyType: asset.property_type
  )
  
  IF localityData IS NULL:
    RETURN {
      minEstimatedValue: NULL,
      maxEstimatedValue: NULL,
      confidence: "low",
      source: "online listings",
      error: "No price data available for locality"
    }
  END IF
  
  // Step 3: Apply property-specific adjustments
  baseMinPricePerSqft = localityData.minPricePerSqft
  baseMaxPricePerSqft = localityData.maxPricePerSqft
  
  // Adjustments based on property status
  IF asset.property_status == "under_construction":
    baseMinPricePerSqft = baseMinPricePerSqft * 0.85  // -15% discount
    baseMaxPricePerSqft = baseMaxPricePerSqft * 0.85
  END IF
  
  // Step 4: Calculate total value range
  rawMinValue = area * baseMinPricePerSqft
  rawMaxValue = area * baseMaxPricePerSqft
  
  // Step 5: Apply conservative adjustment (-5% to -10%)
  adjustmentFactor = randomBetween(0.90, 0.95)  // Conservative range
  adjustedMinValue = rawMinValue * adjustmentFactor
  adjustedMaxValue = rawMaxValue * adjustmentFactor
  
  // Step 6: Determine confidence level
  confidence = determineConfidence(
    dataPoints: localityData.dataPointCount,
    priceRangeWidth: (adjustedMaxValue - adjustedMinValue) / adjustedMinValue,
    localityData: localityData
  )
  
  RETURN {
    displayValue: (adjustedMinValue + adjustedMaxValue) / 2,  // Midpoint
    minEstimatedValue: adjustedMinValue,
    maxEstimatedValue: adjustedMaxValue,
    source: "online listings",
    confidence: confidence,
    areaUsed: areaType,
    pricePerSqftRange: {
      min: baseMinPricePerSqft,
      max: baseMaxPricePerSqft
    }
  }
END FUNCTION
```

### Locality Price Fetching

```pseudocode
FUNCTION fetchLocalityPriceRange(city, pincode, propertyType):
  // Try to get from cache first (database table: property_price_cache)
  cachedData = getCachedPriceData(city, pincode, propertyType)
  IF cachedData IS NOT NULL AND cachedData.age < 7 DAYS:
    RETURN cachedData
  END IF
  
  // Fetch from multiple sources
  magicbricksData = scrapeMagicbricks(city, pincode, propertyType)
  99acresData = scrape99acres(city, pincode, propertyType)
  housingData = scrapeHousing(city, pincode, propertyType)
  
  // Aggregate data
  allPrices = []
  IF magicbricksData IS NOT NULL:
    allPrices.append(magicbricksData.prices)
  END IF
  IF 99acresData IS NOT NULL:
    allPrices.append(99acresData.prices)
  END IF
  IF housingData IS NOT NULL:
    allPrices.append(housingData.prices)
  END IF
  
  IF allPrices.length == 0:
    RETURN NULL
  END IF
  
  // Calculate range (use 25th and 75th percentiles for robustness)
  sortedPrices = SORT(allPrices)
  minPrice = PERCENTILE(sortedPrices, 25)  // 25th percentile
  maxPrice = PERCENTILE(sortedPrices, 75)  // 75th percentile
  
  // Cache the result
  cachePriceData(city, pincode, propertyType, minPrice, maxPrice, allPrices.length)
  
  RETURN {
    minPricePerSqft: minPrice,
    maxPricePerSqft: maxPrice,
    dataPointCount: allPrices.length,
    sources: ["magicbricks", "99acres", "housing.com"]
  }
END FUNCTION
```

### Confidence Determination

```pseudocode
FUNCTION determineConfidence(dataPoints, priceRangeWidth, localityData):
  confidenceScore = 0
  
  // Factor 1: Number of data points
  IF dataPoints >= 20:
    confidenceScore += 3
  ELSE IF dataPoints >= 10:
    confidenceScore += 2
  ELSE IF dataPoints >= 5:
    confidenceScore += 1
  END IF
  
  // Factor 2: Price range width (narrower = more confident)
  IF priceRangeWidth < 0.15:  // Less than 15% spread
    confidenceScore += 2
  ELSE IF priceRangeWidth < 0.25:  // Less than 25% spread
    confidenceScore += 1
  END IF
  
  // Factor 3: Multiple sources
  IF localityData.sources.length >= 3:
    confidenceScore += 2
  ELSE IF localityData.sources.length == 2:
    confidenceScore += 1
  END IF
  
  // Factor 4: Data freshness
  IF localityData.age < 3 DAYS:
    confidenceScore += 1
  END IF
  
  // Map to confidence level
  IF confidenceScore >= 6:
    RETURN "high"
  ELSE IF confidenceScore >= 3:
    RETURN "medium"
  ELSE:
    RETURN "low"
  END IF
END FUNCTION
```

### Background Job Flow

```pseudocode
FUNCTION updateValuations(assetIds = NULL, force = false):
  // Get assets to update
  IF assetIds IS NULL:
    assets = getAllRealEstateAssets()
  ELSE:
    assets = getRealEstateAssetsByIds(assetIds)
  END IF
  
  results = []
  updated = 0
  failed = 0
  skipped = 0
  
  FOR EACH asset IN assets:
    // Skip if recently updated (unless forced)
    IF NOT force AND asset.valuation_last_updated IS NOT NULL:
      hoursSinceUpdate = (NOW() - asset.valuation_last_updated) / HOURS
      IF hoursSinceUpdate < 24:
        results.append({
          assetId: asset.id,
          skipped: true,
          skipReason: "Updated less than 24 hours ago"
        })
        skipped++
        CONTINUE
      END IF
    END IF
    
    // Skip if user override exists (don't overwrite)
    IF asset.user_override_value IS NOT NULL:
      results.append({
        assetId: asset.id,
        skipped: true,
        skipReason: "User override exists"
      })
      skipped++
      CONTINUE
    END IF
    
    // Calculate valuation
    TRY:
      valuation = calculatePropertyValuation(asset)
      
      IF valuation.error IS NOT NULL:
        // No data available
        results.append({
          assetId: asset.id,
          success: false,
          error: valuation.error
        })
        failed++
      ELSE:
        // Update database
        UPDATE real_estate_assets SET
          system_estimated_min = valuation.minEstimatedValue,
          system_estimated_max = valuation.maxEstimatedValue,
          valuation_last_updated = NOW()
        WHERE id = asset.id
        
        results.append({
          assetId: asset.id,
          success: true,
          minValue: valuation.minEstimatedValue,
          maxValue: valuation.maxEstimatedValue,
          confidence: valuation.confidence
        })
        updated++
      END IF
    CATCH error:
      results.append({
        assetId: asset.id,
        success: false,
        error: error.message
      })
      failed++
    END TRY
  END FOR
  
  RETURN {
    success: true,
    updated: updated,
    failed: failed,
    skipped: skipped,
    results: results
  }
END FUNCTION
```

---

## Folder Structure

```
src/
├── app/
│   └── api/
│       └── real-estate/
│           ├── valuation/
│           │   ├── [assetId]/
│           │   │   └── route.ts          # GET /api/real-estate/valuation/:assetId
│           │   ├── update/
│           │   │   └── route.ts          # POST /api/real-estate/valuation/update
│           │   └── [assetId]/
│           │       └── update/
│           │           └── route.ts      # POST /api/real-estate/valuation/:assetId/update
│           └── assets/
│               └── route.ts              # CRUD for real_estate_assets (if needed)
│
├── lib/
│   └── real-estate/
│       ├── valuation-service.ts         # Main valuation logic
│       ├── locality-scraper.ts          # Scraping service (Magicbricks, 99acres, Housing)
│       ├── price-cache.ts               # Cache management for locality prices
│       └── types.ts                     # TypeScript types
│
├── services/
│   └── realEstateValuationService.ts   # Frontend service (API client)
│
└── types/
    └── real-estate.ts                   # Shared types
```

### Detailed File Structure

#### 1. `src/lib/real-estate/valuation-service.ts`
Main valuation calculation logic. Contains:
- `calculatePropertyValuation()` - Core valuation function
- `determineConfidence()` - Confidence level calculation
- `applyPropertyAdjustments()` - Status-based adjustments

#### 2. `src/lib/real-estate/locality-scraper.ts`
Scraping service for property listing sites. Contains:
- `scrapeMagicbricks()` - Magicbricks scraper
- `scrape99acres()` - 99acres scraper
- `scrapeHousing()` - Housing.com scraper
- `aggregatePriceData()` - Combine data from multiple sources

#### 3. `src/lib/real-estate/price-cache.ts`
Cache management for locality prices. Contains:
- `getCachedPriceData()` - Retrieve cached prices
- `cachePriceData()` - Store prices in cache
- `invalidateCache()` - Clear stale cache

#### 4. `src/app/api/real-estate/valuation/[assetId]/route.ts`
GET endpoint for fetching valuation (read path).

#### 5. `src/app/api/real-estate/valuation/update/route.ts`
POST endpoint for background job (updates all or specific assets).

#### 6. `src/app/api/real-estate/valuation/[assetId]/update/route.ts`
POST endpoint for single asset update.

#### 7. `src/services/realEstateValuationService.ts`
Frontend service for API calls.

---

## Database Schema Additions

### Property Price Cache Table

```sql
CREATE TABLE property_price_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    city TEXT NOT NULL,
    pincode TEXT,
    property_type property_type_enum NOT NULL,
    min_price_per_sqft NUMERIC(10, 2) NOT NULL,
    max_price_per_sqft NUMERIC(10, 2) NOT NULL,
    data_point_count INTEGER NOT NULL,
    sources TEXT[], -- Array of source names
    cached_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Composite unique constraint
    UNIQUE(city, pincode, property_type)
);

CREATE INDEX idx_property_price_cache_lookup 
    ON property_price_cache(city, pincode, property_type);

CREATE INDEX idx_property_price_cache_expires 
    ON property_price_cache(expires_at);
```

**Purpose:** Cache locality price data to avoid repeated scraping. Cache expires after 7 days.

---

## Implementation Notes

### 1. Scraping Strategy

**Important:** Web scraping must be done carefully to avoid:
- Rate limiting
- IP blocking
- Legal issues

**Recommended Approach:**
- Use official APIs if available (some sites offer paid APIs)
- Use headless browser (Puppeteer/Playwright) with delays
- Rotate user agents
- Respect robots.txt
- Consider using proxy services for production
- Implement exponential backoff on failures

**Alternative (MVP):**
- Use third-party real estate data APIs (e.g., PropTiger API, Square Yards API)
- Or use manual data entry for initial launch

### 2. Conservative Adjustments

The -5% to -10% adjustment is applied to be conservative because:
- Listed prices are often aspirational
- Actual transaction prices are typically lower
- We want to avoid over-valuation
- Better to underestimate than overestimate

### 3. User Override Priority

User override always wins because:
- User knows their property best
- May have recent transaction data
- May have professional valuation
- Trust user input over automated estimates

### 4. Async Architecture

Background job runs:
- Daily via cron (e.g., 2 AM IST)
- Can be triggered manually
- Non-blocking for UI
- Updates happen in background

### 5. Error Handling

- If scraping fails: Keep last known valuation
- If no data: Return low confidence, NULL values
- If area missing: Return error, don't calculate
- Always log errors for monitoring

### 6. UI Display Guidelines

**Never show:**
- Raw scraped prices
- Individual listing prices
- Source-specific data

**Always show:**
- "Estimated Value" label (never "Market Value")
- Range (min - max)
- Confidence indicator
- "Last updated" timestamp
- Option to set user override

**Example UI:**
```
Estimated Value: ₹85,00,000
Range: ₹80,00,000 - ₹90,00,000
Confidence: Medium
Last updated: 2 days ago
[Set Custom Value] [Refresh Estimate]
```

---

## Cron Job Setup

### Vercel Cron (if using Vercel)

Add to `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/real-estate/valuation/update",
    "schedule": "0 2 * * *"
  }]
}
```

Runs daily at 2 AM UTC (7:30 AM IST).

### External Cron Service

Use any cron service to call:
```
POST https://your-domain.com/api/real-estate/valuation/update
```

---

## Testing Strategy

### Unit Tests
- Valuation calculation logic
- Confidence determination
- Adjustment factors
- Area selection logic

### Integration Tests
- API endpoints
- Database updates
- Cache management

### Manual Testing
- Test with real properties
- Verify scraping works
- Check cache behavior
- Test error scenarios

---

## Security Considerations

1. **RLS Policies:** Already enforced in schema
2. **Rate Limiting:** Add rate limits to update endpoints
3. **Authentication:** All endpoints require auth
4. **Input Validation:** Validate all inputs
5. **Scraping Ethics:** Respect robots.txt, use delays

---

## Future Enhancements

1. **Machine Learning:** Train model on transaction data
2. **Historical Trends:** Track price changes over time
3. **Neighborhood Factors:** Consider schools, metro, etc.
4. **Property Age:** Factor in depreciation
5. **Amenities:** Adjust for building amenities
6. **RERA Data:** Integrate RERA project data
7. **Government Data:** Use circle rates as baseline

---

## Summary

This design provides:
- ✅ Range-based valuations (never single values)
- ✅ User override priority
- ✅ Async background jobs
- ✅ Conservative adjustments
- ✅ Confidence levels
- ✅ Clean API contract
- ✅ Scalable architecture
- ✅ Production-ready structure

The service is designed to be reliable, transparent, and user-friendly while maintaining data privacy and avoiding over-valuation.
