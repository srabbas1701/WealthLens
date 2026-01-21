# Real Estate Export Implementation

## Overview

Advisor-ready export functionality for Real Estate portfolio has been implemented. Supports both CSV and PDF formats for portfolio summary and individual property details.

## Files Created

### 1. `src/exports/realEstate.export.ts`

Main export module with the following functions:

#### Portfolio Export
- `exportRealEstatePortfolio(dashboardData, format, loanOutstandingMap?)`
  - Exports entire Real Estate portfolio
  - Formats: 'csv' | 'pdf'
  - Optional loan outstanding map for accurate net worth calculation

#### Property Detail Export
- `exportRealEstateProperty(propertyData, alerts, sellVsHold?, format)`
  - Exports single property detail report
  - Includes KPIs, loan details, cash flow, alerts, and optional sell vs hold simulation
  - Formats: 'csv' | 'pdf'

## Export Data Included

### Portfolio Summary Export
- Property name
- City
- Property type
- Current value
- Loan outstanding (if available)
- Net worth
- Rental yield
- Cash flow status
- Ownership percentage

### Property Detail Export
- **Basic Info**: Property name, city, type, ownership %
- **KPIs**: Current value, unrealized gain/loss, XIRR, rental yield, EMI vs rent gap
- **Performance**: Purchase price, purchase date, holding period
- **Loan Details**: Lender, loan amount, interest rate, EMI, outstanding balance, tenure
- **Cash Flow**: Monthly rent, EMI, expenses, net cash flow, escalation %
- **Property Details**: Address, area, RERA number, builder, project name
- **Alerts**: All property-level alerts with severity
- **Sell vs Hold**: Optional simulation results

## UI Integration

### Real Estate Dashboard (`src/app/portfolio/real-estate/page.tsx`)
- Added "Export" button next to "Add Property" button
- Currently shows placeholder alert (will be wired when data fetching is implemented)

### Property Detail Page (`src/app/portfolio/real-estate/[propertyId]/page.tsx`)
- Added "Export Property" button in header actions
- Fully functional - exports property data, alerts, and analytics
- CSV format by default (can be extended to PDF)

## Usage Examples

### Export Portfolio (when data is available)
```typescript
import { exportRealEstatePortfolio } from '@/exports/realEstate.export';
import { getRealEstateDashboardData } from '@/analytics/realEstateDashboard.mapper';

// Get dashboard data
const dashboardData = await getRealEstateDashboardData(assetsData, totalNetWorth);

// Create loan outstanding map (optional, for accurate net worth)
const loanOutstandingMap = new Map<string, number>();
assetsData.forEach(asset => {
  if (asset.loan?.outstanding_balance) {
    const adjusted = asset.loan.outstanding_balance * (asset.asset.ownership_percentage / 100);
    loanOutstandingMap.set(asset.asset.id, adjusted);
  }
});

// Export as CSV
await exportRealEstatePortfolio(dashboardData, 'csv', loanOutstandingMap);

// Export as PDF
await exportRealEstatePortfolio(dashboardData, 'pdf', loanOutstandingMap);
```

### Export Property Detail
```typescript
import { exportRealEstateProperty } from '@/exports/realEstate.export';
import { getPropertyAlerts } from '@/analytics/realEstatePropertyAlerts.engine';

// Get property data and alerts
const propertyData = await getRealEstatePropertyDetailData(assetData);
const alerts = getPropertyAlerts(propertyData);

// Export as CSV
await exportRealEstateProperty(propertyData, alerts, null, 'csv');

// Export as PDF
await exportRealEstateProperty(propertyData, alerts, null, 'pdf');
```

## Technical Details

### CSV Format
- Table-friendly format with headers
- Proper escaping of quotes and commas
- Raw numeric values (no currency symbols)
- Percentages formatted as "X.XX%"

### PDF Format
- Uses jsPDF library (same as other holdings exports)
- Landscape orientation for portfolio summary
- Portrait orientation for property detail
- Print-friendly layout with sections
- Indian numbering system for currency

### Data Handling
- All values are ownership-adjusted (from analytics)
- Handles null/missing values gracefully
- No formatting in export data (raw numbers)
- UI layer handles currency/percentage formatting

## Constraints Met

✅ Read-only exports (no editing)
✅ No schema changes
✅ No email sending
✅ Reuses existing analytics outputs
✅ Advisor-readable format
✅ Table-friendly CSV
✅ Print-friendly PDF

## Next Steps

1. **Wire Dashboard Export**: When data fetching is implemented in `src/app/portfolio/real-estate/page.tsx`, connect the export button to `exportRealEstatePortfolio()`

2. **Add Format Selection**: Consider adding a dropdown to choose CSV vs PDF format

3. **Sell vs Hold Integration**: If Sell vs Hold simulation results need to be included in exports, pass the result to `exportRealEstateProperty()`

4. **Loan Outstanding Map**: For accurate portfolio exports, create a loan outstanding map from asset data when calling `exportRealEstatePortfolio()`

## Notes

- Export functions are client-side only (use `document.createElement` for downloads)
- PDF generation uses dynamic import of jsPDF to avoid SSR issues
- All exports include timestamp in filename
- Footer includes "Generated by LensOnWealth" with timestamp
