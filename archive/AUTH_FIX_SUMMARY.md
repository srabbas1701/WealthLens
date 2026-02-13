# 🔐 Authentication Fix - Quick Summary

## The Problem

You manually updated `auth.users` and `public.users` tables, but users can't login with the updated email/phone because **Supabase Auth service doesn't recognize direct SQL updates**.

## ✅ The Solution

You **MUST** use Supabase Admin API to update authentication credentials. I've created everything you need:

### Files Created:

1. **`supabase/fix_auth_users.sql`** - SQL script with:
   - Diagnostic queries to check user sync status
   - Trigger to auto-sync `auth.users` → `public.users` on updates
   - Sync function for manual syncing

2. **`src/app/api/admin/fix-user-auth/route.ts`** - Admin API endpoint to fix users

3. **`scripts/fix-user-auth.ts`** - Command-line script to fix users easily

4. **`AUTH_FIX_GUIDE.md`** - Complete step-by-step guide

---

## 🚀 Quick Start (3 Steps)

### Step 1: Run the SQL Script

1. Open Supabase Dashboard → SQL Editor
2. Copy and paste contents of `supabase/fix_auth_users.sql`
3. Click Run

This creates the trigger and sync function.

### Step 2: Fix Your Users

**Option A: Use the Script (Easiest)**
```bash
npx tsx scripts/fix-user-auth.ts <user-id> --email=user@example.com
npx tsx scripts/fix-user-auth.ts <user-id> --phone=+919876543210
```

**Option B: Use the API Endpoint**
```bash
curl -X POST http://localhost:3000/api/admin/fix-user-auth \
  -H "Content-Type: application/json" \
  -d '{"user_id": "uuid", "email": "user@example.com"}'
```

**Option C: Use Admin API in Code**
```typescript
import { createClient } from '@supabase/supabase-js';

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

await adminClient.auth.admin.updateUserById(userId, {
  email: 'new@email.com',
  email_confirm: true,
});
```

### Step 3: Verify

Test login with the updated email/phone - it should work now!

---

## 📋 Diagnostic Queries

Run these in Supabase SQL Editor to check user status:

```sql
-- Check sync status
SELECT 
  au.id,
  au.email as auth_email,
  au.phone as auth_phone,
  pu.email as public_email,
  pu.phone_number as public_phone,
  CASE 
    WHEN au.email != pu.email THEN '⚠️ EMAIL MISMATCH'
    WHEN au.phone != pu.phone_number THEN '⚠️ PHONE MISMATCH'
    ELSE '✅ SYNCED'
  END as sync_status
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
ORDER BY au.created_at DESC;
```

---

## ⚠️ Important Notes

1. **Never update `auth.users` directly via SQL** - Supabase Auth will ignore it
2. **Always use Admin API** - This is the only way Supabase recognizes changes
3. **The trigger auto-syncs** - After Admin API update, `public.users` syncs automatically
4. **Phone format matters** - Must include country code: `+919876543210`

---

## 🔍 Troubleshooting

### "User not found"
- Verify user_id exists: `SELECT id FROM auth.users WHERE id = 'uuid';`

### "Email/phone already exists"
- Check for duplicates: `SELECT id, email FROM auth.users WHERE email = 'email@example.com';`

### "Still can't login"
- Check `email_confirmed_at` / `phone_confirmed_at` are set
- Verify phone format includes country code
- Check Supabase logs for errors

---

## 📚 Full Documentation

See `AUTH_FIX_GUIDE.md` for complete documentation with all options and troubleshooting steps.

---

## ✅ What Happens After Fix

1. Admin API updates `auth.users` ✅
2. Trigger fires and syncs to `public.users` ✅
3. User can login with updated email/phone ✅
4. OTP/email link is sent successfully ✅

---

**Remember:** Always use Admin API for auth updates, never direct SQL!
