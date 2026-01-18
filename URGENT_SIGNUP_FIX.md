# 🚨 URGENT: New User Signup Email Not Working

## Critical: Check UPDATE Trigger Status

**The UPDATE trigger from `fix_auth_users.sql` might be interfering with new user creation!**

### Step 1: Verify UPDATE Trigger is Removed (MOST IMPORTANT)

Run this in Supabase SQL Editor:

```sql
-- Check if UPDATE trigger exists
SELECT 
  trigger_name,
  event_manipulation,
  action_timing
FROM information_schema.triggers
WHERE event_object_table = 'users'
  AND event_object_schema = 'auth'
ORDER BY trigger_name;
```

**Expected Result:**
- ✅ Should show: `on_auth_user_created` (AFTER INSERT)
- ❌ Should NOT show: `on_auth_user_updated` (AFTER UPDATE)

**If you see `on_auth_user_updated`, run this immediately:**

```sql
-- Remove the problematic trigger
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
DROP FUNCTION IF EXISTS public.handle_auth_user_update() CASCADE;
```

---

## Why This Happens

The UPDATE trigger tries to update `public.users` when `auth.users` is updated. During new user creation:
1. Supabase creates user in `auth.users`
2. INSERT trigger fires → Creates `public.users` row ✅
3. **UPDATE trigger might fire** → Tries to update `public.users` before INSERT completes ❌
4. Error occurs → User creation fails or email doesn't send

---

## Quick Fix Steps

### 1. Remove UPDATE Trigger (CRITICAL)

```sql
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
DROP FUNCTION IF EXISTS public.handle_auth_user_update() CASCADE;
```

### 2. Verify INSERT Trigger Exists

```sql
-- Should return on_auth_user_created
SELECT trigger_name 
FROM information_schema.triggers
WHERE event_object_table = 'users' 
  AND event_object_schema = 'auth'
  AND event_manipulation = 'INSERT';
```

### 3. Test Signup

1. Try creating a new user with email
2. Check if email arrives
3. Check Supabase Auth Logs for `mail.send` events

---

## Additional Checks

### Check Supabase Email Provider

1. **Dashboard** → **Authentication** → **Providers** → **Email**
2. Ensure **"Enable Email provider"** is ON ✅
3. Check for error messages

### Check Email Logs

1. **Dashboard** → **Logs** → **Auth Logs**
2. Filter by the email trying to signup
3. Look for:
   - `mail.send` - Email was sent ✅
   - `user.signup` - Signup event ✅
   - Error messages ❌

### Check Email Delivery

- Check spam folder
- Try with Gmail address
- Wait 5 minutes
- Check rate limits (4 emails/hour per address)

---

## Code Status

✅ **No code changes needed** - Signup uses the same email function as login:
- `sendMagicLink()` in `src/lib/auth/context.tsx`
- Uses `supabase.auth.signInWithOtp()` correctly

The issue is likely the UPDATE trigger interfering with user creation.

---

## Summary

1. **CRITICAL**: Remove UPDATE trigger (run rollback SQL)
2. Verify INSERT trigger exists
3. Test signup
4. Check email delivery (spam, provider blocking)

**The UPDATE trigger is the most likely culprit** - it was designed for updates, not new user creation, and might be causing conflicts.
