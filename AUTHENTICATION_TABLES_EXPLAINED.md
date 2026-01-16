# Supabase Authentication Tables Explained

## Understanding Your Authentication Setup

### The Problem

You see 2 users in `public.users` table, but only 1 user in `auth.users` (Authentication Users table in Supabase dashboard).

---

## Supabase Authentication Architecture

Supabase uses **TWO separate tables** for authentication:

### 1. `auth.users` - Core Authentication Table (Supabase Managed)

**Location:** `auth.users` (not visible in public schema)  
**Purpose:** Stores authentication credentials (email, phone, password hashes)  
**Managed by:** Supabase Auth service  
**View:** Supabase Dashboard → Authentication → Users

**Structure:**
```
auth.users
├── id (uuid) - Primary key
├── email (text) - Can be NULL for phone-only users
├── phone (text) - Can be NULL for email-only users
├── encrypted_password (text) - For email/password auth
├── email_confirmed_at (timestamp) - Email verification
├── phone_confirmed_at (timestamp) - Phone verification
├── created_at (timestamp)
└── raw_user_meta_data (jsonb) - Custom metadata
```

**Important:** This table is **managed by Supabase** and you can't directly insert into it.

---

### 2. `public.users` - User Profile Table (Your Application)

**Location:** `public.users` (visible in Table Editor)  
**Purpose:** Stores user profile data (name, preferences, settings)  
**Managed by:** Your application  
**View:** Supabase Dashboard → Table Editor → `public.users`

**Structure:**
```
public.users
├── id (uuid) - References auth.users.id
├── email (text) - Copied from auth.users.email
├── phone_number (text) - Copied from auth.users.phone
├── full_name (text)
├── risk_score (int)
├── primary_goal (text)
├── created_at (timestamp)
└── ... other profile fields
```

**Important:** This table is created by a **trigger** (`handle_new_user()`) that fires when a new user is inserted into `auth.users`.

---

## How User Creation Works

### Email Authentication Flow

```
1. User enters email → signInWithOtp({ email })
2. Supabase creates record in auth.users:
   - id: <uuid>
   - email: "user@example.com"
   - phone: NULL
   - email_confirmed_at: NULL (until verified)
3. Trigger fires → Creates record in public.users:
   - id: <same uuid>
   - email: "user@example.com"
   - phone_number: NULL
```

### Phone Authentication Flow

```
1. User enters phone → signInWithOtp({ phone })
2. Supabase creates record in auth.users:
   - id: <uuid>
   - email: NULL
   - phone: "+919876543210"
   - phone_confirmed_at: NULL (until verified)
3. Trigger fires → Creates record in public.users:
   - id: <same uuid>
   - email: NULL
   - phone_number: "+919876543210"
```

---

## Why You Might See Only One User in auth.users

### Possible Reasons:

#### 1. **Supabase Dashboard Filter** ⚠️ MOST LIKELY

The Supabase Dashboard → Authentication → Users view has filters that might hide phone users:

**Check:**
- Look for a filter dropdown (might say "All" or "Email")
- Try filtering by "All users" or "Phone users"
- The default view might only show email users

**Solution:** Clear all filters and search by phone number.

---

#### 2. **Phone User Created Before Trigger Was Set Up**

If the phone user was created before the `handle_new_user()` trigger was created, the trigger wouldn't have fired.

**Check:**
```sql
-- Run this in Supabase SQL Editor
SELECT 
  id,
  email,
  phone,
  created_at,
  email_confirmed_at,
  phone_confirmed_at
FROM auth.users
ORDER BY created_at;
```

**Solution:** Manually create the profile:
```sql
-- Get the phone user's ID from auth.users
INSERT INTO public.users (id, phone_number, primary_auth_method, phone_verified_at)
VALUES (
  'user-id-from-auth-users',
  'phone-number',
  'mobile',
  NOW()
)
ON CONFLICT (id) DO UPDATE
SET phone_number = EXCLUDED.phone_number;
```

---

#### 3. **Trigger Failed Silently**

The trigger might have failed when the phone user was created, but the auth user was still created.

**Check:**
```sql
-- Check if trigger exists
SELECT * FROM pg_trigger 
WHERE tgname = 'on_auth_user_created';

-- Check trigger function
SELECT * FROM pg_proc 
WHERE proname = 'handle_new_user';
```

**Solution:** Check Supabase logs for errors, or re-run the trigger manually.

---

#### 4. **Phone Number Format Mismatch**

If the phone number in `auth.users` has a different format than `public.users`, they might not match.

**Check:**
```sql
-- Compare phone formats
SELECT 
  au.id,
  au.phone as auth_phone,
  pu.phone_number as public_phone
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE au.phone IS NOT NULL;
```

---

#### 5. **Different Database/Project**

You might be looking at different Supabase projects.

**Check:** Verify you're looking at the same project for both tables.

---

## How to Verify Phone User in auth.users

### Step 1: Check auth.users Directly

Run this in Supabase SQL Editor:

```sql
-- See all auth users
SELECT 
  id,
  email,
  phone,
  created_at,
  email_confirmed_at IS NOT NULL as email_verified,
  phone_confirmed_at IS NOT NULL as phone_verified,
  raw_user_meta_data
FROM auth.users
ORDER BY created_at DESC;
```

### Step 2: Find Phone-Only Users

```sql
-- Find users with phone but no email
SELECT 
  id,
  phone,
  phone_confirmed_at,
  created_at
FROM auth.users
WHERE phone IS NOT NULL 
  AND email IS NULL
ORDER BY created_at DESC;
```

### Step 3: Check if Trigger Created public.users Record

```sql
-- Check if phone user has corresponding public.users record
SELECT 
  au.id,
  au.phone as auth_phone,
  pu.phone_number as public_phone,
  pu.full_name,
  CASE 
    WHEN pu.id IS NULL THEN '❌ MISSING IN public.users'
    ELSE '✅ EXISTS'
  END as status
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE au.phone IS NOT NULL;
```

---

## Fix Missing Phone User in public.users

If you find a phone user in `auth.users` but NOT in `public.users`, fix it:

### Option 1: Manual Insert (Quick Fix)

```sql
-- Replace with actual values from your auth.users query
INSERT INTO public.users (
  id,
  phone_number,
  primary_auth_method,
  phone_verified_at,
  created_at,
  updated_at
)
SELECT 
  id,
  phone,
  'mobile',
  phone_confirmed_at,
  created_at,
  NOW()
FROM auth.users
WHERE phone IS NOT NULL
  AND id NOT IN (SELECT id FROM public.users)
ON CONFLICT (id) DO NOTHING;
```

### Option 2: Re-run Trigger (If Trigger Exists)

The trigger should fire automatically, but if it didn't, you can't "re-trigger" it. You'll need to manually insert.

### Option 3: Fix and Re-create User

If the trigger is broken, fix it first:

```sql
-- Ensure trigger exists and is correct
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();
```

Then manually insert the missing user (as shown in Option 1).

---

## Common Issues & Solutions

### Issue 1: Phone User Shows in public.users but NOT in auth.users

**This should NEVER happen** - `public.users` can't exist without `auth.users` (foreign key constraint).

If you see this, there's a data integrity issue. Check:
- Database constraints
- Foreign key relationship between tables

---

### Issue 2: Both Users Show in public.users but Only One in auth.users

**Most Likely:** Dashboard filter is hiding phone users.

**Solution:** 
1. Clear all filters in Supabase Dashboard
2. Search by phone number instead of email
3. Or use SQL query to see all users

---

### Issue 3: Phone User Can Login But Not Visible in Dashboard

**Reason:** Dashboard UI might filter out phone-only users by default.

**Solution:** 
- Use SQL Editor to verify
- Check if RLS policies are hiding the user
- Verify the user exists in auth.users

---

## Verification Checklist

Use this checklist to diagnose:

- [ ] Run SQL query to see ALL auth.users (both email and phone)
- [ ] Verify phone user exists in auth.users table
- [ ] Check if phone user has corresponding public.users record
- [ ] Verify trigger `on_auth_user_created` exists and is active
- [ ] Check Supabase logs for trigger errors
- [ ] Compare phone number format between tables
- [ ] Clear all filters in Supabase Dashboard
- [ ] Verify you're looking at the same project/database

---

## Expected Behavior

### ✅ Correct Setup:

```
Email User:
├── auth.users: { id: xxx, email: "user@example.com", phone: NULL }
└── public.users: { id: xxx, email: "user@example.com", phone_number: NULL }

Phone User:
├── auth.users: { id: yyy, email: NULL, phone: "+919876543210" }
└── public.users: { id: yyy, email: NULL, phone_number: "+919876543210" }
```

**Both should show 2 records in auth.users** when queried via SQL.

---

## Quick Diagnostic Queries

Run these in Supabase SQL Editor:

```sql
-- 1. Count users by auth method
SELECT 
  CASE 
    WHEN email IS NOT NULL AND phone IS NULL THEN 'Email Only'
    WHEN phone IS NOT NULL AND email IS NULL THEN 'Phone Only'
    WHEN email IS NOT NULL AND phone IS NOT NULL THEN 'Both'
    ELSE 'Neither'
  END as auth_type,
  COUNT(*) as count
FROM auth.users
GROUP BY auth_type;

-- 2. Show all users with their public.users status
SELECT 
  au.id,
  au.email,
  au.phone,
  au.created_at,
  CASE WHEN pu.id IS NOT NULL THEN '✅' ELSE '❌' END as has_profile
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
ORDER BY au.created_at DESC;

-- 3. Find orphaned records
-- auth.users without public.users
SELECT au.* 
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL;

-- public.users without auth.users (shouldn't exist!)
SELECT pu.* 
FROM public.users pu
LEFT JOIN auth.users au ON pu.id = au.id
WHERE au.id IS NULL;
```

---

## Summary

**The phone user SHOULD exist in `auth.users`.** If you don't see it:

1. **Check dashboard filters** (most common issue)
2. **Run SQL queries** to verify directly
3. **Check if trigger fired** when user was created
4. **Manually insert** if trigger failed

Both email and phone authentication create records in `auth.users` - the difference is just which field is populated (email vs phone).

---

**Next Steps:**
1. Run the diagnostic SQL queries above
2. Share the results to identify the exact issue
3. Fix based on what's missing
