# Advanced Analytics - Quick Reference

## 🔗 URLs

| Screen | URL | Access From |
|--------|-----|-------------|
| Analytics Overview | `/analytics/overview` | Dashboard → "View Advanced Analytics" |
| MF Exposure Analytics | `/analytics/mutualfund-exposure` | Analytics Overview → MF Exposure card |
| Sector Exposure | `/analytics/sector-exposure` | Analytics Overview → Sector Exposure card |
| Market Cap Exposure | `/analytics/marketcap-exposure` | Analytics Overview → Market Cap card |
| Geography Exposure | `/analytics/geography-exposure` | Analytics Overview → Geography Exposure card |

---

## 📊 What Each Screen Shows

### Analytics Overview
- Warning banner explaining analytics vs dashboard
- Ownership vs Exposure comparison table
- Quick links to all 4 analytics screens

### MF Exposure Analytics
- **Your MF Holdings**: Total MF value, scheme count (what you OWN)
- **Exposure Breakdown**: Equity, Debt, Cash/Other (via MF)
- **Combined View**: Direct Holdings + Exposure (with warning)
- **Scheme-wise Breakdown**: Expandable per-scheme exposure

### Sector Exposure
- **Sector Table**: Technology, Banking, FMCG, Pharma, Others
- **Columns**: Direct Equity, Via MF, Total, % of Total
- **Concentration Risk**: Alerts if any sector > 25%

### Market Cap Exposure
- **Market Cap Table**: Large Cap, Mid Cap, Small Cap
- **Columns**: Direct Equity, Via MF, Total, % of Total
- **Risk Profile**: Color-coded alerts (Large=stable, Small=risky)

### Geography Exposure
- **Geography Table**: India vs International
- **Columns**: Direct Equity, Via MF, Total, % of Total
- **International Sources**: Lists which funds contribute

---

## ⚠️ Key Principles

### 1. Ownership ≠ Exposure
- **Dashboard**: Shows what you OWN
- **Analytics**: Shows what you're EXPOSED TO
- **Never mix**: Dashboard values never change

### 2. Clear Labeling
- Exposure values: "(via MF)"
- Direct holdings: "(owned)"
- Combined views: "(total exposure)"

### 3. Warning Banners
- Every analytics screen has a warning at the top
- Explains values may differ from dashboard
- States dashboard values remain authoritative

---

## 🎨 Visual Indicators

### Warning Banners
- 🟡 **Yellow** (#FEF3C7): Analytics view warning (every screen)

### Risk Alerts
- 🟢 **Green** (#D1FAE5): Large Cap Dominant (stable)
- 🔵 **Blue** (#EFF6FF): Mid Cap Allocation (moderate)
- 🟡 **Yellow** (#FEF3C7): Small Cap Allocation (risky)
- 🟡 **Yellow** (#FEF3C7): Concentration Risk (>25% in one sector)

### Data Quality Badges
- 🟢 **Green**: Factsheet (high confidence)
- 🟡 **Yellow**: Estimated (lower confidence)

---

## 🧪 Quick Test

### Basic Flow
1. Go to Dashboard
2. Scroll to bottom, click "View Advanced Analytics"
3. See warning banner and comparison table
4. Click any analytics screen card
5. Explore exposure data
6. Click "Back to Analytics" to return
7. Click "Back to Dashboard" to return

### Verify Dashboard Values Never Change
1. Note dashboard equity value
2. Go to Analytics → MF Exposure
3. Check "Direct Holdings" in Combined View
4. Return to dashboard
5. Verify value unchanged ✓

---

## 📱 Files Created

### New Pages
- `src/app/analytics/overview/page.tsx`
- `src/app/analytics/mutualfund-exposure/page.tsx`
- `src/app/analytics/sector-exposure/page.tsx`
- `src/app/analytics/marketcap-exposure/page.tsx`
- `src/app/analytics/geography-exposure/page.tsx`

### Modified Files
- `src/app/dashboard/page.tsx` (Added analytics link)

---

## ⚡ Key Features

✅ **Warning Banners**: Every screen explains analytics vs dashboard  
✅ **Clear Labels**: "(via MF)", "(owned)", "(total exposure)"  
✅ **Separate Views**: Ownership shown first, then exposure  
✅ **Combined View**: Only in analytics, with clear warning  
✅ **Data Source**: Shows factsheet vs estimated, accuracy notes  
✅ **Risk Alerts**: Concentration risk, market cap risk profile  
✅ **Navigation**: Clear paths between all screens  

---

## 🎯 Design Principles Applied

1. **Spreadsheet-like Precision**: Monospace numbers, clear alignment
2. **Zero Information Loss**: All exposure data visible
3. **Data Transparency**: Source labels, confidence indicators
4. **Professional Look**: Clean tables, consistent spacing
5. **Trust-first Colors**: Calm blues, professional greens/yellows
6. **User Education**: Warning banners prevent confusion

---

## 🚀 Ready for Production

- All 5 screens fully implemented ✓
- Dashboard integration complete ✓
- Professional design system applied ✓
- No linter errors ✓
- Authentication & auth flow working ✓
- Loading states & error handling ✓
- Warning banners on every screen ✓
- Clear separation ownership vs exposure ✓

**Start testing at: `http://localhost:5175/dashboard`**

**Then click: "View Advanced Analytics" at the bottom**

---

## 📝 Important Reminders

1. **Dashboard values NEVER change** based on exposure analytics
2. **Every exposure value** must be labeled "(via MF)"
3. **Warning banners** on every analytics screen
4. **Combined views** are for analytics only, not dashboard
5. **Data source** always visible (factsheet vs estimated)

---

**All Advanced Analytics screens are production-ready! 🎉**

