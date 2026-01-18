# Supabase TypeScript Types Generation Guide

## Problem
The CLI command `npx supabase gen types typescript --project-id` fails with:
```
"Your account does not have the necessary privileges to access this endpoint"
```

## Solutions

### ✅ Solution 1: Generate Types from Supabase Dashboard (Easiest)

1. **Go to your Supabase Dashboard**
   - Visit: https://supabase.com/dashboard
   - Select your project: `oiqonhoqqnqeamzrmxsq`

2. **Navigate to API Settings**
   - Go to **Settings** → **API**
   - Scroll down to **"Generate TypeScript types"** section

3. **Copy the Generated Types**
   - Click **"Generate types"** button
   - Copy the generated TypeScript code

4. **Save to File**
   - Replace the contents of `src/types/database.ts` with the generated types
   - Or save as `src/types/supabase.ts` if you prefer

### ✅ Solution 2: Use Access Token (For CLI)

1. **Get Access Token from Dashboard**
   - Go to: https://supabase.com/dashboard/account/tokens
   - Click **"Generate new token"**
   - Copy the token (you'll only see it once!)

2. **Set Environment Variable**
   ```powershell
   $env:SUPABASE_ACCESS_TOKEN = "your_token_here"
   ```

3. **Generate Types**
   ```powershell
   npx supabase gen types typescript --project-id oiqonhoqqnqeamzrmxsq > src/types/database.ts
   ```

### ✅ Solution 3: Use Supabase CLI with Token Flag

```powershell
npx supabase gen types typescript --project-id oiqonhoqqnqeamzrmxsq --token YOUR_ACCESS_TOKEN > src/types/database.ts
```

### ✅ Solution 4: Manual Update (If Schema Unchanged)

If you haven't changed your database schema, you can keep using the existing types in `src/types/database.ts`. The file is already present and should work fine.

## Quick Check

To verify if your types are up to date:

1. Check if `src/types/database.ts` exists ✅ (It does)
2. Compare your current schema with the types
3. Only regenerate if you've made schema changes

## Current Status

Your project already has types defined in `src/types/database.ts`. Unless you've modified the database schema, you don't need to regenerate them.

## Troubleshooting

### "Access denied" error
- Make sure you're the project owner or have been granted access
- Try using the dashboard method instead

### "Project not found" error
- Verify the project ID: `oiqonhoqqnqeamzrmxsq`
- Check you're logged into the correct Supabase account

### Types are outdated
- Use Solution 1 (Dashboard) - it's the most reliable
- Or use Solution 2 with a fresh access token
