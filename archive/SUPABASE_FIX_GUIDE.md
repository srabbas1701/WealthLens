# 🔧 Quick Fix Guide: Database Schema Issue

## Problem
Your app is showing these errors:
```
Could not find the table 'public.ai_daily_summaries' in the schema cache
Could not find the table 'public.ai_weekly_summaries' in the schema cache
```

## Solution
These tables are missing from your Supabase database. Follow these steps to add them.

---

## 📋 Steps to Fix (5 minutes)

### Option A: Run the Migration File (RECOMMENDED)

1. **Open Supabase Dashboard**
   - Go to https://supabase.com
   - Select your project: `wealthlensai` (or your project name)

2. **Navigate to SQL Editor**
   - Click on **SQL Editor** in the left sidebar
   - Click **New Query** button (top right)

3. **Copy and Run the Migration**
   - Open the file: `supabase/migrations/002_add_ai_summary_tables.sql`
   - Copy the **entire contents** of that file
   - Paste into the SQL Editor
   - Click **Run** (or press `Ctrl+Enter` / `Cmd+Enter`)

4. **Verify Success**
   - You should see: ✅ "Success. No rows returned"
   - Go to **Table Editor** in the left sidebar
   - You should now see two new tables:
     - `ai_daily_summaries`
     - `ai_weekly_summaries`

---

### Option B: Run the Full Schema (If Option A doesn't work)

If you're missing other tables too, run the complete schema:

1. **Open Supabase Dashboard** → **SQL Editor** → **New Query**

2. **Copy the entire `supabase/schema.sql` file**
   - This file has `CREATE TABLE IF NOT EXISTS` clauses
   - It won't break your existing data

3. **Paste and Run**
   - Click **Run**
   - Wait for completion (~30 seconds)

4. **Verify in Table Editor**
   - Check that all these tables exist:
     - `users`
     - `portfolios`
     - `assets`
     - `holdings`
     - `portfolio_metrics`
     - `portfolio_insights`
     - `market_context`
     - `copilot_sessions`
     - `onboarding_snapshots`
     - `ai_daily_summaries` ← NEW
     - `ai_weekly_summaries` ← NEW

---

## ✅ How to Verify the Fix Worked

### Method 1: Check the App
1. Restart your development server:
   ```bash
   npm run dev
   ```

2. Open the app: http://localhost:5175

3. Check the terminal - you should **NO LONGER** see:
   ```
   Could not find the table 'public.ai_daily_summaries' in the schema cache
   Could not find the table 'public.ai_weekly_summaries' in the schema cache
   ```

### Method 2: Check Supabase Table Editor
1. Go to Supabase Dashboard → **Table Editor**
2. Look for `ai_daily_summaries` and `ai_weekly_summaries` tables
3. They should have these columns:

**ai_daily_summaries:**
- id
- user_id
- portfolio_id
- summary_date
- headline
- summary_points
- status
- portfolio_value_at_generation
- market_mood_at_generation
- risk_score_at_generation
- generated_at
- created_at

**ai_weekly_summaries:**
- id
- user_id
- portfolio_id
- week_start_date
- week_end_date
- headline
- summary_points
- status
- allocation_drift_summary
- risk_alignment_status
- goal_progress_summary
- diversification_note
- reflection_prompt
- portfolio_value_at_generation
- equity_pct_at_generation
- debt_pct_at_generation
- risk_score_at_generation
- generated_at
- created_at

---

## 🎯 What This Fixes

✅ **Removes console errors** about missing tables  
✅ **Prepares the database** for AI daily/weekly summaries  
✅ **Enables the habit loop feature** (once backend jobs are built)  
✅ **App will still show mock data** (until you build the summary generation job)

---

## 🚀 Next Steps After Fixing

Once the tables are added, the app will:
1. ✅ Stop showing "table not found" errors
2. ⚠️ Still show mock summaries (because no real summaries exist yet)
3. 📋 Be ready for you to integrate the Manual Investment Modal
4. 📋 Be ready for backend job to generate real summaries

---

## ❓ Troubleshooting

### "permission denied for table users"
- This means RLS policies might be blocking the query
- Solution: Make sure you ran the **entire** migration file (includes RLS policies)

### "relation already exists"
- This is fine! The migration uses `CREATE TABLE IF NOT EXISTS`
- It means the table was already there
- Just verify the table has all the correct columns

### Still seeing errors after running migration?
- Try restarting your Next.js dev server: `npm run dev`
- Clear browser cache
- Check Supabase logs: Dashboard → Logs → API

---

## 📞 Need Help?

If you're stuck:
1. Check the Supabase Dashboard → Logs → API logs
2. Share the exact error message
3. Verify your `.env.local` has correct Supabase credentials

---

**Good luck! This should take less than 5 minutes to fix.** 🎉













