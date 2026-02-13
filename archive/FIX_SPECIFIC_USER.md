# Fix Specific User Login Issue

## Problem

You manually updated a user's email/phone in the database, but they still can't login because:
- Supabase Auth service doesn't recognize manual database updates
- The user's email/phone in `auth.users` doesn't match what you updated
- When they try to login, Supabase can't find them with the new credentials

## Solution: Use Admin API to Update Auth User

You **MUST** use Supabase Admin API to update authentication credentials. Direct SQL updates don't work.

## Option 1: Use the Admin API Endpoint (Easiest)

### Step 1: Get the User ID

Run this in Supabase SQL Editor to find the user:

```sql
-- Find user by email
SELECT id, email, phone 
FROM auth.users 
WHERE email = 'user@example.com';

-- OR find user by phone
SELECT id, email, phone 
FROM auth.users 
WHERE phone = '+919876543210';
```

### Step 2: Call the Admin API

**For Production:**

```bash
# Update email
curl -X POST https://lensonwealth.com/api/admin/fix-user-auth \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user-uuid-from-step-1",
    "email": "correct@email.com"
  }'

# Update phone
curl -X POST https://lensonwealth.com/api/admin/fix-user-auth \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user-uuid-from-step-1",
    "phone": "+919876543210"
  }'

# Update both
curl -X POST https://lensonwealth.com/api/admin/fix-user-auth \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user-uuid-from-step-1",
    "email": "correct@email.com",
    "phone": "+919876543210"
  }'
```

**For Localhost:**

```bash
curl -X POST http://localhost:5175/api/admin/fix-user-auth \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user-uuid-from-step-1",
    "email": "correct@email.com"
  }'
```

### Step 3: Verify

After running the API call:
1. Check the response - should show success
2. User should now be able to login with the updated email/phone
3. They should receive OTP/email link

---

## Option 2: Use the Script (If API Endpoint Not Available)

### Step 1: Get User ID

Same as Option 1, Step 1.

### Step 2: Run the Script

```bash
# Update email
npx tsx scripts/fix-user-auth.ts <user-id> --email=correct@email.com

# Update phone
npx tsx scripts/fix-user-auth.ts <user-id> --phone=+919876543210

# Update both
npx tsx scripts/fix-user-auth.ts <user-id> --email=correct@email.com --phone=+919876543210
```

**Example:**
```bash
npx tsx scripts/fix-user-auth.ts 123e4567-e89b-12d3-a456-426614174000 --email=user@example.com
```

---

## Option 3: Use Supabase Admin API Directly (Advanced)

If the endpoint/script don't work, use Supabase Admin API directly:

### Create a Temporary Script

Create a file `fix-user.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function fixUser() {
  const userId = 'USER-ID-HERE'; // Replace with actual user ID
  const email = 'correct@email.com'; // Replace with correct email
  const phone = '+919876543210'; // Replace with correct phone (optional)

  const updateData: any = {};
  if (email) {
    updateData.email = email;
    updateData.email_confirm = true;
  }
  if (phone) {
    updateData.phone = phone;
    updateData.phone_confirm = true;
  }

  const { data, error } = await adminClient.auth.admin.updateUserById(
    userId,
    updateData
  );

  if (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }

  console.log('✅ User updated successfully!');
  console.log('Email:', data.user.email);
  console.log('Phone:', data.user.phone);
}

fixUser().catch(console.error);
```

Run:
```bash
npx tsx fix-user.ts
```

---

## Step-by-Step for Your Specific User

### 1. Find the User

```sql
-- In Supabase SQL Editor
SELECT 
  au.id,
  au.email as auth_email,
  au.phone as auth_phone,
  pu.email as public_email,
  pu.phone_number as public_phone
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE au.email = 'user-email-here' 
   OR au.phone = '+91XXXXXXXXXX'
   OR pu.email = 'user-email-here'
   OR pu.phone_number = '+91XXXXXXXXXX';
```

### 2. Note the User ID

Copy the `id` (UUID) from the query result.

### 3. Get the Correct Email/Phone

What email/phone should this user have? (The ones you manually updated)

### 4. Fix via Admin API

Use Option 1 (API endpoint) or Option 2 (script) above.

### 5. Test

Ask the user to:
1. Try logging in with the updated email/phone
2. Check spam folder for email
3. Wait 1-2 minutes for OTP/email

---

## Why This Happens

When you manually update `auth.users` or `public.users`:
- ✅ Database tables are updated
- ❌ Supabase Auth service doesn't know about the changes
- ❌ When user tries to login, Supabase checks its internal state
- ❌ User not found → Login fails

**Solution:** Admin API updates Supabase Auth's internal state, so login works.

---

## Verification

After fixing, verify:

```sql
-- Check auth.users
SELECT id, email, phone, email_confirmed_at, phone_confirmed_at
FROM auth.users
WHERE id = 'user-id-here';

-- Check public.users (should be auto-synced)
SELECT id, email, phone_number, primary_auth_method
FROM public.users
WHERE id = 'user-id-here';
```

Both should show the correct email/phone.

---

## Important Notes

1. **Always use Admin API** - Never update `auth.users` directly via SQL
2. **The trigger will auto-sync** - After Admin API update, `public.users` syncs automatically
3. **User must use the updated credentials** - They need to login with the email/phone you set via Admin API
4. **Check spam folder** - Even after fixing, emails might go to spam

---

## Quick Reference

```bash
# Find user
SELECT id, email, phone FROM auth.users WHERE email = 'user@example.com';

# Fix user (replace USER_ID and credentials)
curl -X POST https://lensonwealth.com/api/admin/fix-user-auth \
  -H "Content-Type: application/json" \
  -d '{"user_id": "USER_ID", "email": "correct@email.com", "phone": "+919876543210"}'
```
