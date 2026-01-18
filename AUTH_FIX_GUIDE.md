# Authentication Fix Guide

## Problem: Users Can't Login After Manual Database Updates

### What Happened?

You manually updated the `auth.users` and `public.users` tables in the database, but users still can't login with the updated email/phone numbers.

### Why This Happens

**Supabase Auth service maintains its own internal state** and doesn't recognize direct SQL updates to `auth.users`. When you manually update the database:

1. ✅ The database tables are updated
2. ❌ Supabase Auth service doesn't know about the changes
3. ❌ When `signInWithOtp()` is called, Supabase checks its internal state
4. ❌ The new email/phone isn't recognized → Login fails

### The Solution

You **MUST** use Supabase Admin API to update authentication credentials. Direct SQL updates to `auth.users` are not allowed and won't work.

---

## Step-by-Step Fix

### Step 1: Run Diagnostic Queries

First, check the current state of your users:

```sql
-- Run this in Supabase SQL Editor
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

This will show you which users have mismatched data.

### Step 2: Install the Fix Script

Run the SQL script to create necessary triggers and functions:

1. Open Supabase Dashboard → SQL Editor
2. Copy and paste the contents of `supabase/fix_auth_users.sql`
3. Run the script

This will:
- Create a trigger to sync `auth.users` → `public.users` on updates
- Create a sync function for manual syncing
- Add diagnostic queries

### Step 3: Update Users via Admin API

You have three options:

#### Option A: Use the Fix Script (Easiest - Recommended)

Use the provided script to fix users:

```bash
# Fix email
npx tsx scripts/fix-user-auth.ts <user-id> --email=user@example.com

# Fix phone
npx tsx scripts/fix-user-auth.ts <user-id> --phone=+919876543210

# Fix both
npx tsx scripts/fix-user-auth.ts <user-id> --email=user@example.com --phone=+919876543210
```

**Example:**
```bash
npx tsx scripts/fix-user-auth.ts 123e4567-e89b-12d3-a456-426614174000 --email=user@example.com
```

The script will:
- ✅ Update the user via Admin API
- ✅ Sync to public.users automatically
- ✅ Show you the results

#### Option B: Use the Admin API Endpoint

Create a script or use curl/Postman to call:

```bash
POST /api/admin/fix-user-auth
Content-Type: application/json

{
  "user_id": "user-uuid-here",
  "email": "correct@email.com",  // optional
  "phone": "+919876543210"       // optional
}
```

**Example using curl:**

```bash
curl -X POST http://localhost:3000/api/admin/fix-user-auth \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "123e4567-e89b-12d3-a456-426614174000",
    "email": "user@example.com",
    "phone": "+919876543210"
  }'
```

#### Option B: Use Admin API Directly in Code

Create a one-time script:

```typescript
import { createAdminClient } from '@/lib/supabase/server';

const supabase = createAdminClient();

// Update user email
await supabase.auth.admin.updateUserById(userId, {
  email: 'new@email.com',
  email_confirm: true, // Mark as confirmed
});

// Update user phone
await supabase.auth.admin.updateUserById(userId, {
  phone: '+919876543210',
  phone_confirm: true, // Mark as confirmed
});

// Update both
await supabase.auth.admin.updateUserById(userId, {
  email: 'new@email.com',
  phone: '+919876543210',
  email_confirm: true,
  phone_confirm: true,
});
```

### Step 4: Verify the Fix

After updating via Admin API:

1. **Check auth.users:**
```sql
SELECT id, email, phone, email_confirmed_at, phone_confirmed_at
FROM auth.users
WHERE id = 'user-id-here';
```

2. **Check public.users (should be auto-synced by trigger):**
```sql
SELECT id, email, phone_number, primary_auth_method
FROM public.users
WHERE id = 'user-id-here';
```

3. **Test login:**
   - Try logging in with the updated email/phone
   - You should now receive the OTP/email link

---

## Important Notes

### ⚠️ **Never update auth.users directly via SQL**

Supabase Auth service will reject or ignore direct SQL updates. You **must** use the Admin API.

### ✅ **The trigger will auto-sync**

After updating via Admin API, the `on_auth_user_updated` trigger will automatically sync changes to `public.users`.

### 🔄 **Manual sync if needed**

If the trigger doesn't fire (rare), you can manually sync:

```sql
SELECT public.sync_user_from_auth('user-uuid-here');
```

### 🔐 **Security Note**

The `/api/admin/fix-user-auth` endpoint should be protected in production. Add authentication:

```typescript
// In route.ts
if (process.env.NODE_ENV === 'production') {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.ADMIN_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
```

---

## Troubleshooting

### Issue: "User not found" error

**Solution:** Verify the user_id exists in `auth.users`:
```sql
SELECT id, email, phone FROM auth.users WHERE id = 'user-id';
```

### Issue: Email/phone already exists

**Solution:** Supabase doesn't allow duplicate emails/phones. Check for conflicts:
```sql
SELECT id, email FROM auth.users WHERE email = 'email@example.com';
SELECT id, phone FROM auth.users WHERE phone = '+919876543210';
```

### Issue: Trigger not syncing

**Solution:** Manually sync:
```sql
SELECT public.sync_user_from_auth('user-id');
```

Or manually update:
```sql
UPDATE public.users
SET 
  email = (SELECT email FROM auth.users WHERE id = 'user-id'),
  phone_number = (SELECT phone FROM auth.users WHERE id = 'user-id'),
  updated_at = NOW()
WHERE id = 'user-id';
```

### Issue: Still can't login after fix

**Check:**
1. Is the email/phone confirmed in `auth.users`? (`email_confirmed_at` / `phone_confirmed_at`)
2. Is the phone number in correct format? (Must include country code: `+919876543210`)
3. Check Supabase logs for authentication errors
4. Verify email/SMS service is configured in Supabase Dashboard

---

## Quick Reference

### Update Single User (Email)
```bash
curl -X POST http://localhost:3000/api/admin/fix-user-auth \
  -H "Content-Type: application/json" \
  -d '{"user_id": "uuid", "email": "new@email.com"}'
```

### Update Single User (Phone)
```bash
curl -X POST http://localhost:3000/api/admin/fix-user-auth \
  -H "Content-Type: application/json" \
  -d '{"user_id": "uuid", "phone": "+919876543210"}'
```

### Update Multiple Users (Script)

Create a script file `fix-users.ts`:

```typescript
import { createAdminClient } from '@/lib/supabase/server';

const supabase = createAdminClient();

const usersToFix = [
  { id: 'uuid1', email: 'user1@example.com' },
  { id: 'uuid2', phone: '+919876543210' },
  { id: 'uuid3', email: 'user3@example.com', phone: '+919876543211' },
];

for (const user of usersToFix) {
  const updateData: any = {};
  if (user.email) {
    updateData.email = user.email;
    updateData.email_confirm = true;
  }
  if (user.phone) {
    updateData.phone = user.phone;
    updateData.phone_confirm = true;
  }
  
  const { error } = await supabase.auth.admin.updateUserById(user.id, updateData);
  if (error) {
    console.error(`Failed to update user ${user.id}:`, error);
  } else {
    console.log(`✅ Updated user ${user.id}`);
  }
}
```

Run: `npx tsx fix-users.ts`

---

## Summary

1. ✅ Run diagnostic queries to identify issues
2. ✅ Install fix script (triggers and functions)
3. ✅ Update users via Admin API (not SQL)
4. ✅ Verify the fix works
5. ✅ Test login with updated credentials

**Remember:** Always use Admin API for auth updates, never direct SQL!
