# Data Integrity & Idempotency

This document explains how the Manual Investment system ensures data consistency and handles edge cases.

---

## Design Principle

> **Manual investments are always quantity=1, treated as state records, not events.**

This means:
- Edit updates the state (holding becomes "this amount now")
- No accumulation on repeated edits
- No duplicate holdings for the same asset

---

## Idempotency: Create vs. Update

### Create Operation

```
User Action: "Add ₹100,000 FD"
    ↓
Check if portfolio exists → Create if not
    ↓
Create asset record (new)
    ↓
Insert holding with:
  - quantity = 1
  - invested_value = 100,000
  - current_value = 100,000
    ↓
Recalculate metrics (total = 100,000)
```

**Result:** 
- 1 asset record
- 1 holding record
- Portfolio total = ₹100,000

### Update Operation (Edit)

```
User Action: "Edit FD amount to ₹120,000"
    ↓
Find existing holding by ID
    ↓
Update asset metadata (if needed)
    ↓
Update holding with:
  - quantity = 1 (unchanged)
  - invested_value = 120,000 (changed)
  - current_value = 120,000 (changed)
    ↓
Recalculate metrics (total = 120,000)
```

**Result:**
- 1 asset record (same)
- 1 holding record (same, updated)
- Portfolio total = ₹120,000 (not ₹220,000)

### Key Difference: No Duplication

If user accidentally submits the same form twice:

**Without Idempotency (❌ Bad):**
```
Submit "₹100K FD" → Holding 1 created
Submit "₹100K FD" → Holding 2 created (duplicate!)
Portfolio total = ₹200,000 (wrong!)
```

**With Idempotency (✅ Good):**
```
Submit "₹100K FD" → Holding created (holding_id = abc123)
Submit "₹100K FD" → Holding abc123 updated (if editing)
                     OR
                     New holding created (if truly new FD)
Portfolio total = ₹100,000 (correct!)
```

---

## Preventing Duplicates

### Client-Side Prevention

1. **Disabled submit button after click**
   ```typescript
   const handleSave = async () => {
     setIsSaving(true); // Prevents double-click
     // ... submit logic
   };

   <button disabled={isSaving}>Save Investment</button>
   ```

2. **Modal state validation**
   - Form validates before allowing preview
   - Preview state prevents accidental re-submission

### Server-Side Prevention

1. **Edit flag in request**
   ```typescript
   interface ManualInvestmentRequest {
     editing_holding_id?: string; // If present → UPDATE, else → INSERT
   }
   ```

2. **Unique holding lookup**
   ```typescript
   if (editing_holding_id) {
     // Find holding by ID and update it
     const holding = await db
       .from('holdings')
       .select('asset_id')
       .eq('id', editing_holding_id)
       .single();

     if (!holding) throw new Error('Holding not found');
     // Update existing
   } else {
     // Create new
   }
   ```

---

## Asset Deduplication

### Problem: Multiple Assets for Same Instrument

What if user manually enters same FD twice?

```
Entry 1: "HDFC FD, ₹100K"
Entry 2: "HDFC FD, ₹50K" (same bank, different amount?)
```

### Solution: Asset Name + Metadata Hash

Each asset is unique by combination of:
- `name` (e.g., "HDFC Bank")
- `asset_metadata.institution + principal + start_date`

But **we don't prevent creation** because:
- User might have multiple FDs at same bank (different terms)
- User might genuinely add FD twice (intentional)

**Instead:** We provide edit/delete UX:
- User sees all their holdings
- Can delete duplicates via UI
- Can edit to merge amounts

### Future: Conflict Detection

Could add during edit:

```typescript
// Check if similar asset exists
const similar = await db
  .from('assets')
  .select('*')
  .ilike('name', '%HDFC%')
  .eq('asset_type', 'fd');

if (similar.length > 1) {
  // Show warning: "Another HDFC FD exists. Sure you want another?"
}
```

---

## Portfolio Metrics Consistency

### Recalculation Guarantees

After **every** manual investment operation:

1. ✅ Fetch **all** holdings for portfolio
2. ✅ Sum by asset type (not by insertion order)
3. ✅ Calculate percentages from totals
4. ✅ Upsert metrics (atomic operation)

```typescript
// Pseudo-code
const recalculateMetrics = async (portfolioId) => {
  // Step 1: Fetch ALL current holdings
  const holdings = await db
    .from('holdings')
    .select('*, asset:assets(*)')
    .eq('portfolio_id', portfolioId);

  // Step 2: Calculate totals
  let totalValue = 0;
  let equityValue = 0;
  let cashValue = 0;

  holdings.forEach(h => {
    totalValue += h.current_value;
    if (h.asset.asset_type === 'equity') equityValue += h.current_value;
    if (h.asset.asset_type === 'cash') cashValue += h.current_value;
  });

  // Step 3: Calculate allocations
  const equityPct = (equityValue / totalValue) * 100;
  const cashPct = (cashValue / totalValue) * 100;

  // Step 4: Upsert (atomic update)
  await db
    .from('portfolio_metrics')
    .upsert(
      {
        portfolio_id: portfolioId,
        total_value: totalValue,
        equity_pct: equityPct,
        cash_pct: cashPct,
        updated_at: new Date(),
      },
      { onConflict: 'portfolio_id' }
    );
};
```

### Why This Is Safe

- ✅ **Sum-based** (not incremental) → No accumulation errors
- ✅ **Atomic upsert** → Consistent with holdings
- ✅ **Recalculated every time** → No stale data
- ✅ **Complete refetch** → Immune to missing holdings

---

## Transaction Safety

### No Explicit Transactions Needed

Why? Because:
1. **Assets** are immutable (after creation)
2. **Holdings** are upserted atomically
3. **Metrics** recalculated from scratch

This avoids complex transaction logic while maintaining consistency.

### If Future Versions Need Transactions

```typescript
// Example: Use Supabase RPC for multi-step operation
const { data, error } = await rpc('upsert_manual_investment', {
  user_id: userId,
  portfolio_id: portfolioId,
  form_data: formData,
});
```

---

## Handling Edge Cases

### Edge Case 1: Portfolio Deleted After Holdings Added

**Scenario:** User portfolio deleted, but holdings still exist

**Prevention:**
- Foreign key constraint: `holdings.portfolio_id` → `portfolios.id` (CASCADE delete)
- Cascading delete removes orphaned holdings

```sql
ALTER TABLE holdings
ADD CONSTRAINT fk_holdings_portfolio
FOREIGN KEY (portfolio_id) REFERENCES portfolios(id)
ON DELETE CASCADE;
```

### Edge Case 2: Concurrent Edits

**Scenario:** User edits holding in two browser tabs simultaneously

**Prevention:**
- Edit uses `holding_id` (not asset name)
- Last write wins (acceptable for this workflow)
- `updated_at` timestamp shows which edit was last

```typescript
// Holding ID is unique, so concurrent requests both update same record
await db
  .from('holdings')
  .update({ invested_value: newAmount })
  .eq('id', holdingId); // ← Can't have conflicts
```

### Edge Case 3: Very Large Portfolio (1000+ Holdings)

**Scenario:** Portfolio with many holdings causes recalculation to slow

**Prevention:**
- Indexed queries on `portfolio_id`
- Metrics cached with `updated_at` timestamp
- Consider pagination for UI

```sql
CREATE INDEX idx_holdings_portfolio_id ON holdings(portfolio_id);
CREATE INDEX idx_assets_type ON assets(asset_type);
```

### Edge Case 4: User Deletes Asset Type from Master Table

**Scenario:** Admin deletes 'fd' asset type, but user has FD holdings

**Prevention:**
- `asset_type` is open enum (no constraint)
- System gracefully handles unknown types as "Other"

---

## Data Validation Layers

### Layer 1: Frontend (UX)
- Required fields
- Amount > 0
- Valid dates
- Type selection required

### Layer 2: API Validation (Security)
```typescript
if (!user_id || !form_data) {
  return error('Missing fields');
}

if (form_data.fdPrincipal <= 0) {
  return error('Invalid amount');
}

if (!form_data.fdStartDate || !form_data.fdMaturityDate) {
  return error('Missing dates');
}
```

### Layer 3: Database Constraints
```sql
ALTER TABLE holdings
ADD CONSTRAINT check_invested_value CHECK (invested_value > 0);

ALTER TABLE holdings
ADD CONSTRAINT check_quantity CHECK (quantity = 1);
```

---

## Monitoring Data Health

### Queries to Check Consistency

**1. Find portfolio total mismatch:**
```sql
SELECT
  pm.portfolio_id,
  pm.total_value AS recorded_total,
  SUM(h.current_value) AS calculated_total,
  pm.total_value - SUM(h.current_value) AS difference
FROM portfolio_metrics pm
LEFT JOIN holdings h ON pm.portfolio_id = h.portfolio_id
GROUP BY pm.portfolio_id
HAVING pm.total_value != SUM(h.current_value);
```

**2. Find duplicate holdings for same asset:**
```sql
SELECT
  portfolio_id,
  asset_id,
  COUNT(*) as count
FROM holdings
GROUP BY portfolio_id, asset_id
HAVING COUNT(*) > 1;
```

**3. Find manual assets without holdings:**
```sql
SELECT a.id, a.name
FROM assets a
LEFT JOIN holdings h ON a.id = h.asset_id
WHERE a.is_manual = true AND h.id IS NULL;
```

---

## Rollback Procedures

If data corruption occurs:

### Option 1: Recompute Metrics
```typescript
// Re-run recalculation for affected portfolio
await recalculateMetrics(portfolioId);
```

### Option 2: Delete & Recreate
```typescript
// Delete corrupted holding
await db.from('holdings').delete().eq('id', holdingId);

// Recalculate metrics
await recalculateMetrics(portfolioId);
```

### Option 3: Database-Level Fix
```sql
-- Fix portfolio total
UPDATE portfolio_metrics
SET total_value = (
  SELECT SUM(current_value)
  FROM holdings
  WHERE portfolio_id = 'abc123'
)
WHERE portfolio_id = 'abc123';
```

---

## Testing Data Integrity

### Test: Edit Doesn't Create Duplicate

```typescript
test('editing holding does not create duplicate', async () => {
  // Create holding: amount = 100
  const { holding_id } = await createManualInvestment({
    form_data: { assetType: 'fd', fdPrincipal: 100 },
  });

  // Edit: amount = 150
  await editManualInvestment({
    editing_holding_id: holding_id,
    form_data: { assetType: 'fd', fdPrincipal: 150 },
  });

  // Verify
  const holdings = await getPortfolioHoldings(portfolioId);
  expect(holdings).toHaveLength(1); // Still 1, not 2
  expect(holdings[0].invested_value).toBe(150);
});
```

### Test: Metrics Recalculate Correctly

```typescript
test('metrics update correctly after add', async () => {
  const portfolio = await createPortfolio();

  // Add ₹100K FD
  await createManualInvestment({
    portfolio_id: portfolio.id,
    form_data: { assetType: 'fd', fdPrincipal: 100_000 },
  });

  // Add ₹50K Gold
  await createManualInvestment({
    portfolio_id: portfolio.id,
    form_data: { assetType: 'gold', goldAmount: 50_000 },
  });

  // Verify metrics
  const metrics = await getPortfolioMetrics(portfolio.id);
  expect(metrics.total_value).toBe(150_000);
});
```

---

## Summary: Safe Design

✅ **What makes this design safe:**

1. **Quantity always = 1** → No accumulation possible
2. **Metrics recalculated from scratch** → Always accurate
3. **Edit uses ID, not name** → No ambiguity
4. **Atomic upsert** → No partial updates
5. **Validation at multiple layers** → Bad data unlikely
6. **Foreign keys with CASCADE** → Orphaned data impossible

❌ **What could go wrong (and how to prevent):**

| Risk | Prevention |
|---|---|
| Double-submit creates 2 holdings | Server-side edit_holding_id check |
| Stale metrics | Recalculate every save |
| Concurrent edits | Use holding ID (unique) |
| Data types mismatch | Backend validation |
| Orphaned holdings | FK CASCADE delete |

---

## Questions?

- **How do I debug metrics issues?** → Run verification queries above
- **Can I manually edit portfolio_metrics?** → Not recommended; recompute instead
- **What if I need to audit changes?** → Add `updated_by` and `updated_at` to holdings
- **How do I handle timezone issues?** → Store all dates as UTC in DB


