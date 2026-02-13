# Code Changes to Commit to GitHub

## Files Modified (Need to Commit)

### 1. Session Timeout Changes (30 minutes)
- ✅ `src/hooks/useSessionTimeout.ts` - Increased timeout from 15 to 30 minutes
- ✅ `src/app/page.tsx` - Added timeout message handling on landing page
- ✅ `src/app/dashboard/page.tsx` - Optimized loading when navigating from home page
- ✅ `src/app/account/page.tsx` - Updated timeout text to show 30 minutes

### 2. Authentication Fix Files
- ✅ `supabase/fix_auth_users.sql` - Fixed UPDATE trigger to check if row exists
- ✅ `supabase/ROLLBACK_AUTH_FIX.sql` - Rollback script (NEW FILE)
- ✅ `URGENT_FIX_LOGIN.md` - Documentation (NEW FILE)

### 3. Admin API for Auth Fix
- ✅ `src/app/api/admin/fix-user-auth/route.ts` - Admin API endpoint (NEW FILE)
- ✅ `scripts/fix-user-auth.ts` - Command-line script (NEW FILE)
- ✅ `AUTH_FIX_GUIDE.md` - Complete guide (NEW FILE)
- ✅ `AUTH_FIX_SUMMARY.md` - Quick reference (NEW FILE)

## Files NOT Modified (No Changes)
- ❌ `src/lib/auth/context.tsx` - No changes to email sending logic
- ❌ `src/app/auth/callback/route.ts` - No changes
- ❌ `src/app/login/page.tsx` - No changes to email logic

## Important Notes

1. **The email sending code was NOT changed** - Supabase is sending emails (logs confirm this)
2. **The issue is likely email delivery** - Check spam folder, email provider blocking
3. **Make sure you ran the rollback SQL** before testing login

## What to Commit

```bash
# Core timeout changes
git add src/hooks/useSessionTimeout.ts
git add src/app/page.tsx
git add src/app/dashboard/page.tsx
git add src/app/account/page.tsx

# Auth fix files (optional - for future use)
git add supabase/fix_auth_users.sql
git add supabase/ROLLBACK_AUTH_FIX.sql
git add src/app/api/admin/fix-user-auth/route.ts
git add scripts/fix-user-auth.ts

# Documentation
git add URGENT_FIX_LOGIN.md
git add AUTH_FIX_GUIDE.md
git add AUTH_FIX_SUMMARY.md
git add CODE_CHANGES_TO_COMMIT.md

# Commit
git commit -m "feat: increase session timeout to 30min and add auth fix utilities"
```

## Critical: Before Committing

**Make sure you've run the rollback SQL in production Supabase!**

The `fix_auth_users.sql` script may have broken login. Run this in production:

```sql
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
DROP FUNCTION IF EXISTS public.handle_auth_user_update() CASCADE;
```

Then test login works before committing.
