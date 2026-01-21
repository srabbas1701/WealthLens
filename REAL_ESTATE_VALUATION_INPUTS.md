# Real Estate Valuation Engine - Input Requirements

**Status:** ✅ Documented  
**Date:** January 2025

---

## Required Inputs Per Asset

The valuation engine requires the following inputs for each asset:

### Required Inputs

1. **property_type** (Required)
   - Type: `'residential' | 'commercial' | 'land'`
   - Used for: Property type-specific pricing and adjustments
   - Example: `'residential'`

2. **city** (Required)
   - Type: `string`
   - Used for: Locality data lookup, city-level fallback estimates
   - Example: `'Mumbai'`

3. **pincode** (Optional, but improves accuracy)
   - Type: `string | null`
   - Used for: More precise locality data lookup
   - Example: `'400001'`
   - Note: If provided, enables pincode-level pricing (more accurate)

### Area Inputs (At Least One Required)

4. **carpet_area_sqft** OR **builtup_area_sqft** (At least one required)
   - Type: `number | null`
   - Used for: Calculating total value (price-per-sqft × area)
   - Priority: `builtup_area_sqft` preferred, `carpet_area_sqft` as fallback
   - Example: `1200` (sqft)

### Fallback Input

5. **purchase_price** (Fallback)
   - Type: `number | null`
   - Used for: Baseline calculation when locality data unavailable
   - Calculation: `purchase_price / area = price_per_sqft`
   - Example: `10000000` (₹1 crore)

---

## Input Priority for Valuation

### Priority 1: Locality Data (Best)
**Uses:** `city` + `pincode` + `property_type`
- Fetches from Magicbricks, 99acres, Housing.com
- Most accurate, location-specific
- Confidence: High/Medium

### Priority 2: Purchase Price Baseline (Good)
**Uses:** `purchase_price` + `area` + `property_type` + `purchase_date`
- Calculates: `purchase_price / area = price_per_sqft`
- Adjusts for property age (appreciation)
- Confidence: Medium/Low

### Priority 3: City Fallback (Conservative)
**Uses:** `city` + `property_type`
- Tier-based estimates for major cities
- Very conservative, used when no other data
- Confidence: Low

---

## Input Validation

### Required Inputs Check

```typescript
// property_type: Required
if (!propertyType) {
  throw new Error('Cannot calculate valuation: Missing property_type');
}

// city: Required
if (!city) {
  throw new Error('Cannot calculate valuation: Missing city (required input)');
}

// area: At least one required (carpet_area_sqft OR builtup_area_sqft)
const area = builtupArea || carpetArea;
if (!area || area <= 0) {
  throw new Error('Cannot calculate valuation: Missing or invalid area (carpet_area_sqft OR builtup_area_sqft required)');
}
```

### Optional Inputs

- `pincode`: Improves accuracy but not required
- `purchase_price`: Used as fallback if locality data unavailable
- `purchase_date`: Used for age adjustment (appreciation calculation)

---

## Example Input Scenarios

### Scenario 1: Complete Inputs (Best Accuracy)

```typescript
{
  property_type: 'residential',
  city: 'Mumbai',
  pincode: '400001',
  builtup_area_sqft: 1200,
  carpet_area_sqft: 1000,
  purchase_price: 10000000,
  purchase_date: '2020-01-15'
}

// Valuation uses:
// - Locality data (city + pincode + property_type)
// - builtup_area_sqft (preferred over carpet)
// - Confidence: High/Medium
```

### Scenario 2: Without Pincode (Good Accuracy)

```typescript
{
  property_type: 'residential',
  city: 'Mumbai',
  pincode: null,
  builtup_area_sqft: 1200,
  purchase_price: 10000000
}

// Valuation uses:
// - Locality data (city + property_type, no pincode)
// - Confidence: Medium
```

### Scenario 3: Purchase Price Fallback

```typescript
{
  property_type: 'residential',
  city: 'Mumbai',
  pincode: null,
  carpet_area_sqft: 1000,
  purchase_price: 8000000,
  purchase_date: '2018-06-01'
}

// Valuation uses:
// - purchase_price / area = price_per_sqft
// - Age adjustment (appreciation)
// - Confidence: Medium/Low
```

### Scenario 4: Minimal Inputs (City Fallback)

```typescript
{
  property_type: 'residential',
  city: 'Mumbai',
  pincode: null,
  builtup_area_sqft: 1200,
  purchase_price: null
}

// Valuation uses:
// - City-level fallback estimate
// - Confidence: Low
```

### Scenario 5: Missing Required Inputs (Error)

```typescript
{
  property_type: null,  // ❌ Missing required
  city: 'Mumbai',
  builtup_area_sqft: 1200
}

// Error: "Cannot calculate valuation: Missing property_type"
```

```typescript
{
  property_type: 'residential',
  city: null,  // ❌ Missing required
  builtup_area_sqft: 1200
}

// Error: "Cannot calculate valuation: Missing city (required input)"
```

```typescript
{
  property_type: 'residential',
  city: 'Mumbai',
  carpet_area_sqft: null,
  builtup_area_sqft: null  // ❌ Missing area
}

// Error: "Cannot calculate valuation: Missing or invalid area (carpet_area_sqft OR builtup_area_sqft required)"
```

---

## Input Usage in Valuation Logic

### Step 1: Area Determination
```typescript
// Uses: carpet_area_sqft OR builtup_area_sqft
const area = builtupArea || carpetArea; // Prefer builtup
const areaType = builtupArea ? 'builtup' : 'carpet';
```

### Step 2: Price-Per-Sqft Source
```typescript
// Priority 1: Locality data
// Uses: city + pincode + property_type
const localityPrice = await fetchLocalityPricePerSqft(city, pincode, propertyType);

// Priority 2: Purchase price fallback
// Uses: purchase_price + area
if (purchasePrice && purchasePrice > 0) {
  basePricePerSqft = purchasePrice / area;
}

// Priority 3: City fallback
// Uses: city + property_type
basePricePerSqft = getCityFallbackPricePerSqft(city, propertyType);
```

### Step 3: Property-Specific Adjustments
```typescript
// Uses: property_type, property_status
if (propertyStatus === 'under_construction') {
  adjustmentFactor *= 0.85; // -15%
}

if (propertyType === 'commercial') {
  adjustmentFactor *= 0.98; // -2%
}
```

### Step 4: Age Adjustment (if purchase_date available)
```typescript
// Uses: purchase_date, property_type
if (purchaseDate) {
  const yearsSincePurchase = calculateYearsSince(purchaseDate);
  // Apply appreciation based on property_type
  const annualAppreciation = propertyType === 'residential' ? 0.04 : 0.03;
}
```

---

## Input Summary Table

| Input | Required | Used For | Priority |
|-------|----------|----------|----------|
| `property_type` | ✅ Yes | Type-specific pricing, adjustments | High |
| `city` | ✅ Yes | Locality lookup, fallback estimates | High |
| `pincode` | ⚠️ Optional | Improved locality accuracy | Medium |
| `carpet_area_sqft` OR `builtup_area_sqft` | ✅ Yes (at least one) | Total value calculation | High |
| `purchase_price` | ⚠️ Fallback | Baseline when locality unavailable | Medium |
| `purchase_date` | ⚠️ Optional | Age adjustment (appreciation) | Low |

---

## Best Practices

### For Best Accuracy

1. **Provide all inputs:**
   - `property_type` ✅
   - `city` ✅
   - `pincode` ✅ (improves accuracy)
   - `builtup_area_sqft` OR `carpet_area_sqft` ✅
   - `purchase_price` ✅ (fallback)
   - `purchase_date` ✅ (for age adjustment)

2. **Prefer builtup_area_sqft:**
   - More accurate for valuation
   - Includes common areas
   - Standard for property listings

3. **Provide pincode when available:**
   - Enables pincode-level pricing
   - More accurate than city-level
   - Improves confidence

### Minimum Viable Inputs

For basic valuation, provide:
- ✅ `property_type`
- ✅ `city`
- ✅ `carpet_area_sqft` OR `builtup_area_sqft`

Fallback logic will use city-level estimates if other data unavailable.

---

## Summary

**Required Inputs:**
- ✅ `property_type` (residential | commercial | land)
- ✅ `city` (string)
- ✅ `carpet_area_sqft` OR `builtup_area_sqft` (at least one)

**Optional but Recommended:**
- ⚠️ `pincode` (improves accuracy)
- ⚠️ `purchase_price` (fallback when locality data unavailable)
- ⚠️ `purchase_date` (for age adjustment)

**Valuation Engine handles all scenarios gracefully!** 🚀
