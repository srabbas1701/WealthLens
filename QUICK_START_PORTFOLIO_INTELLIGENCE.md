# Portfolio Intelligence - Quick Start Guide

## ✅ What Was Built

We've created the **backend infrastructure** for Portfolio Intelligence:

1. **Library Files** (Business Logic):
   - `src/lib/portfolio-intelligence/asset-normalization.ts`
   - `src/lib/portfolio-intelligence/health-score.ts`
   - `src/lib/portfolio-intelligence/stability-analytics.ts`
   - `src/lib/portfolio-intelligence/exposure-analytics.ts`
   - `src/lib/portfolio-intelligence/ui-copy.ts`

2. **API Endpoints** (Ready to Use):
   - `/api/portfolio/health-score` - Returns Portfolio Health Score (0-100)
   - `/api/portfolio/stability-analytics` - Returns Stability & Safety analytics

## ❌ What's Missing

**No UI pages exist yet** - The APIs are ready but there are no frontend pages calling them!

## 🚀 How to Test the APIs

### Option 1: Test in Browser

1. Start your dev server: `npm run dev`
2. Make sure you're logged in
3. Open browser console and run:

```javascript
// Get your user ID from the app (check localStorage or network requests)
const userId = 'YOUR_USER_ID_HERE';

// Test Health Score API
fetch(`/api/portfolio/health-score?user_id=${userId}`)
  .then(r => r.json())
  .then(console.log);

// Test Stability Analytics API
fetch(`/api/portfolio/stability-analytics?user_id=${userId}`)
  .then(r => r.json())
  .then(console.log);
```

### Option 2: Test with curl/Postman

```bash
# Health Score
curl "http://localhost:3000/api/portfolio/health-score?user_id=YOUR_USER_ID"

# Stability Analytics
curl "http://localhost:3000/api/portfolio/stability-analytics?user_id=YOUR_USER_ID"
```

## 📝 Next Steps: Create UI Pages

To see the Portfolio Health Score in your app, you need to create UI pages. Here's what you can build:

### 1. Portfolio Health Score Page

Create: `src/app/portfolio/health-score/page.tsx`

Example structure:
```typescript
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';

export default function HealthScorePage() {
  const { user } = useAuth();
  const [healthScore, setHealthScore] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    
    fetch(`/api/portfolio/health-score?user_id=${user.id}`)
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setHealthScore(data.data);
        }
      })
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) return <div>Loading...</div>;
  if (!healthScore) return <div>No data</div>;

  return (
    <div>
      <h1>Portfolio Health Score</h1>
      <div>Score: {healthScore.totalScore}/100</div>
      <div>Grade: {healthScore.grade}</div>
      {/* Add more UI here */}
    </div>
  );
}
```

### 2. Stability Analytics Page

Create: `src/app/analytics/stability-safety/page.tsx`

(Same pattern - fetch from `/api/portfolio/stability-analytics`)

### 3. Add to Dashboard

You can also add a Health Score widget to your existing dashboard page.

## 🗄️ Database: No Changes Needed!

**Important**: We're using your EXISTING database tables:
- `holdings` - Your portfolio holdings
- `assets` - Asset metadata
- `portfolios` - Portfolio information

**No migrations needed!** The APIs read from existing data.

## ✅ Verification Checklist

- [x] API endpoints created
- [x] Library files created
- [x] No database changes needed
- [ ] UI pages created (TODO)
- [ ] Test APIs work
- [ ] Integrate into app

## 📚 Documentation

- `PORTFOLIO_INTELLIGENCE_IMPLEMENTATION.md` - Full implementation details
- `PORTFOLIO_INTELLIGENCE_UI_COPY_GUIDE.md` - UI copy guidelines
- `src/lib/portfolio-intelligence/ui-copy.ts` - All UI copy constants

## 🆘 Troubleshooting

**"I can't see any changes"**
- ✅ Correct! No UI pages exist yet
- The backend is ready, but you need to create frontend pages

**"Should I run migrations?"**
- ❌ No! We use existing tables

**"How do I test if it works?"**
- Use the API endpoints directly (see Option 1 above)
- Or create a simple test page

**"Where do I start?"**
1. Test the APIs first (Option 1 above)
2. Create a simple Health Score page
3. Add it to your navigation
4. Build out the full UI

---

**Last Updated**: January 2025