# XIRR (Extended Internal Rate of Return) - Explanation

## What is XIRR?

XIRR stands for **Extended Internal Rate of Return**. It's a financial metric that measures the annualized return on your real estate investment, accounting for the actual timing and amounts of cash flows.

## Why is it Important?

XIRR tells you "how much annual return am I actually getting on my real estate investment?" It's better than simple percentage calculations because it accounts for:

1. **Timing of investments** - When you bought the property matters
2. **Rental income received** - Money you collected over time
3. **Loan repayments** - Debt you paid down
4. **Current value** - What the property is worth today

## How We Calculate XIRR

Since we don't have individual transaction dates for every cash flow (rent, loan payments, etc.), we use a **simplified CAGR approach**:

### The Formula

```
XIRR = (Current Value / Invested Value)^(1 / Years) - 1
```

Then convert to percentage by multiplying by 100.

### Step-by-Step Example

Let's say:
- You bought a property on **Jan 1, 2020** for **₹50,00,000**
- Today (Jan 1, 2024) the property is worth **₹60,00,000**
- **Time period**: 4 years

**Calculation:**
1. Ratio = 60,00,000 / 50,00,000 = 1.2
2. Years = 4 years
3. XIRR = (1.2)^(1/4) - 1 = 1.0466 - 1 = 0.0466
4. **XIRR = 4.66%** (approximately 4.7% annualized return)

## What This Means

- **4.7% XIRR** means your property investment grew at ~4.7% per year on average
- If you had invested ₹50,00,000 elsewhere at 4.7% annual return, you'd have the same amount today
- This accounts for the full holding period and appreciation only (not including rental income in this example)

## Limitations of Our XIRR Calculation

Since we simplify by using start and end dates only:

1. **We don't account for monthly rental income** received throughout the years
2. **We don't account for loan repayments** (EMI paid down)
3. **We assume single initial investment** (not additional capital added later)
4. **Minimum 30 days required** to calculate (need meaningful holding period)

### Real XIRR Would Include

True XIRR with transaction dates would look like:
```
Cash Flows:
- Jan 2020: -₹50,00,000 (purchase)
- Monthly 2020-2024: +₹20,000 (rental income)
- Monthly 2020-2024: -₹15,000 (loan EMI)
- Jan 2024: +₹60,00,000 (current value)

XIRR = IRR of all these cash flows with exact dates
```

This would typically show higher returns due to cumulative rental income.

## How to Interpret Your Property's XIRR

| XIRR Range | Interpretation |
|------------|-----------------|
| < 0% | Negative return (property depreciated) |
| 0-3% | Low return (below inflation for many markets) |
| 3-5% | Moderate return (baseline appreciation) |
| 5-7% | Good return (above typical appreciation) |
| 7%+ | Excellent return (strong appreciation + rental yield) |

## Example Scenarios

### Scenario 1: Pure Appreciation
- Bought: ₹1,00,00,000 (2020)
- Current: ₹1,30,00,000 (2024)
- XIRR ≈ 6.8% (appreciation only, no rental income)

### Scenario 2: With Rental Income
- Bought: ₹50,00,000 (2020)
- Rental income: ₹1,00,000/month × 48 months = ₹48,00,000
- Current value: ₹60,00,000
- **True XIRR would be much higher** due to cumulative rental income (maybe 15-20%)

### Scenario 3: With Losses
- Bought: ₹75,00,000 (2022)
- Current: ₹70,00,000 (2024)
- XIRR ≈ -3.3% (depreciation over 2 years)

## Where XIRR Appears in Your Dashboard

- **Property Performance Tab**: Shows the XIRR for your individual property based on purchase price vs. current valuation
- **Overall Portfolio**: Would aggregate XIRR across all real estate holdings

## Key Takeaway

**XIRR = Your annualized return on real estate investment**

It answers: "If I invested ₹X and now have ₹Y after T years, what's my annual compound growth rate?"

This helps you compare your real estate returns against:
- Fixed deposits (typically 6-7%)
- Stock market (historically ~12-15%)
- Other real estate investments
- Inflation (usually 5-8%)
