# Property Valuation Explained

## Your Question: Why Is My Property Value Declining?

Your property shows:
- **Purchase Price (Oct 2014)**: ₹45,57,871
- **Current Value (Today)**: ₹32,74,275
- **Decline**: ₹12,83,596 (-28.1%)

This is **normal and correct**. Here's why:

---

## How Current Value Is Calculated

The system uses a **priority-based approach**:

### Priority 1: Your Manual Override (Highest Priority)
If you set a custom value via the "Update Value" button, that value is used for all calculations. Your preference always takes precedence.

### Priority 2: System Estimate (Most Accurate)
If no manual override is set, the system uses market-based estimation:
- **Data Source**: Market comparables, location analysis, property characteristics
- **Calculation**: Average of minimum and maximum estimates
- **Formula**: (system_estimated_min + system_estimated_max) / 2
- **Includes**: Location trends, property type changes, market conditions

### Priority 3: Fallback
Only if both above are unavailable, the system uses your original purchase price.

---

## Why Your Property Value Declined 28%

Several factors can cause this:

### 1. **Market Conditions Changed Since 2014**
- The real estate market was different in 2014
- Market corrections happen in all property markets
- Location-specific market trends affect valuations

### 2. **Location Value Fluctuations**
- Neighborhoods experience cycles of appreciation and depreciation
- Urban development patterns shift over 10+ years
- Local infrastructure changes impact property values

### 3. **Property-Specific Factors**
- Wear and tear from 10 years of ownership
- Maintenance status affects valuation
- Comparable properties in your area influence estimates

### 4. **Market-Based Assessment**
The system estimate of ₹32,74,275 represents what similar properties are currently selling for in your area, not what you paid 10 years ago.

---

## What This Means for Your Investments

### Important Context
1. **This is about CURRENT valuation**, not your actual financial position
2. **Rental income changes the story** - if your property generates positive cash flow, you may still be earning well
3. **Time horizon matters** - real estate is a long-term investment
4. **Leverage matters** - if you have a loan, your actual equity position is different

### Calculate Your True Position
Your actual return includes:
- **Current Value**: ₹32,74,275
- **Minus Outstanding Loan**: [Check Loan section]
- **Plus Cumulative Rental Income**: [Check Cash Flow section]
- **Minus Cumulative Expenses**: [Check Cash Flow section]
- **Equals Actual Equity Gained**: This is what really matters!

---

## How to Update Your Property's Value

### Option 1: Set Manual Override (If You Know Better)
Click "Update Value" button → Check "Enter your property's current value" → Enter your estimate

**Use this when**:
- You recently got a professional valuation
- You negotiated a sale and know current market price
- You have market data that suggests the estimate is wrong

### Option 2: Accept System Estimate
The system recalculates automatically based on market data. This is updated periodically.

### Option 3: Request Update
Contact support if you believe the estimate is significantly off.

---

## Understanding the Performance Chart

### "Value vs Purchase Price" Shows:
- **X-axis**: Time (Purchase Date → Now)
- **Y-axis**: Property Value Trend
- **Line**: How valuation has changed over your ownership period

### Why It Slopes Down
If the line slopes downward, it means the system estimate of current value is lower than your purchase price. This reflects current market conditions for properties like yours.

### This Doesn't Mean You Lost Money If:
- You received rental income
- You have price appreciation potential ahead
- Your location is recovering (reversal possible)
- Your equity position (after loan) is still positive

---

## Real Estate XIRR Vs Simple Price Change

Your true return is **XIRR** (Extended Internal Rate of Return), which includes:
1. Initial investment (purchase price)
2. All rental income received
3. All expenses paid
4. Current property value
5. Time period

**XIRR is the real metric** - it tells you your actual annual return as an investor, accounting for cash flows, not just price appreciation.

---

## Action Items

### Immediate
1. Check your **XIRR** - this is your real return
2. Review your **Cash Flow** section - rental income matters
3. Check your **Loan** status - equity position is important

### If Concerned
1. Click "Update Value" and set your own estimate if you have market data
2. Review the system estimate explanation (shown on property page)
3. Consider recent market sales of similar properties in your area

### For Long-Term Tracking
- The system recalculates valuations periodically
- Market trends reverse over time
- Your actual financial position depends on XIRR + cash flow, not just price

---

## Key Takeaway

**Property value declining is normal and expected.**

What matters for YOUR financial position:
1. ✅ **XIRR** - Your actual annual return
2. ✅ **Cash Flow** - Rental income minus expenses
3. ✅ **Equity Position** - Current value minus outstanding loan
4. ✅ **Total Net Worth** - This property plus all your other assets

The absolute price change is **not** the full story of your investment performance.

---

## Technical Details

### Current Valuation Formula
```
1. Check if user_override_value exists
2. If not, use: (system_estimated_min + system_estimated_max) / 2
3. If not available, use: system_estimated_min or system_estimated_max
4. Last resort: use purchase_price
5. Apply ownership percentage adjustment
```

### Ownership Adjustment
If you own 50%, the displayed values show 50% of the property value:
```
displayed_value = actual_value × (ownership_percentage / 100)
```

### System Estimate Recalculation
- Market data updated: Periodically (check last update date)
- Based on: Comparable properties, location analysis
- Scope: Regional market trends, property-type trends
