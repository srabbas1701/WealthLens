# New User Signup Email Not Arriving - Fix Guide

## Problem

New users trying to register with email are not receiving confirmation emails.

## Root Cause Analysis

The signup flow uses the same `signInWithOtp()` function as login. If login emails work but signup emails don't, it's likely:

1. **Email delivery issue** (most common) - Same as login issue
2. **Supabase email configuration** - Email provider settings
3. **UPDATE trigger interference** - If the problematic trigger is still active

## Immediate Checks

### 1. Verify UPDATE Trigger is Removed

**CRITICAL:** Make sure you ran the rollback SQL in production:

```sql
-- Run this in Supabase SQL Editor
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
DROP FUNCTION IF EXISTS public.handle_auth_user_update() CASCADE;
```

**Why:** The UPDATE trigger might be interfering with new user creation if it's still active.

### 2. Check Supabase Email Provider

1. Go to **Supabase Dashboard** → **Authentication** → **Providers**
2. Click **Email** provider
3. Ensure **"Enable Email provider"** is ON ✅
4. Check for any error messages or warnings

### 3. Check Email Templates

1. Go to **Authentication** → **Email Templates**
2. Check **"Magic Link"** template
3. Ensure it has: `{{ .ConfirmationURL }}` or `{{ .RedirectTo }}`
4. If custom template, reset to default and test

### 4. Check Supabase Auth Logs

1. Go to **Supabase Dashboard** → **Logs** → **Auth Logs**
2. Filter by the email address that's trying to signup
3. Look for:
   - `mail.send` events (email was sent)
   - Error messages
   - Rate limit warnings

### 5. Check Email Delivery

**Common issues:**
- Email going to spam folder
- Email provider blocking Supabase emails
- Rate limiting (too many signup attempts)

**Action:**
- Ask user to check spam folder
- Try with a Gmail address (most reliable)
- Wait 5 minutes after requesting
- Check if rate limited (usually 4 emails/hour per address)

---

## Code Check

The signup code uses the same function as login:

```typescript
// src/app/signup/page.tsx
const { error: magicLinkError } = await sendMagicLink(email);

// src/lib/auth/context.tsx
const { data, error } = await supabase.auth.signInWithOtp({
  email,
  options: {
    emailRedirectTo: `${window.location.origin}/auth/callback`,
  },
});
```

**This is correct** - no code changes needed.

---

## Testing Steps

### Test 1: Check if Email is Being Sent

1. Try signup with a test email
2. Check Supabase Auth Logs immediately
3. Look for `mail.send` event
4. If you see `mail.send` → Email is being sent (delivery issue)
5. If you DON'T see `mail.send` → Supabase configuration issue

### Test 2: Check Email Delivery

1. Use a Gmail address for testing
2. Request signup link
3. Check inbox AND spam folder
4. Wait 5 minutes
5. If still no email → Check Supabase email provider settings

### Test 3: Check Rate Limits

1. Have you requested multiple signup links recently?
2. Check Supabase → Authentication → Settings → Rate Limits
3. Default: 4 emails/hour per email address
4. If rate limited, wait 1 hour or use different email

---

## Solutions

### Solution 1: Verify Rollback SQL Ran

**Most Important:** Make sure the problematic UPDATE trigger is removed:

```sql
-- Run in Supabase SQL Editor
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
DROP FUNCTION IF EXISTS public.handle_auth_user_update() CASCADE;

-- Verify it's gone
SELECT trigger_name, event_manipulation, action_timing
FROM information_schema.triggers
WHERE event_object_table = 'users' AND event_object_schema = 'auth';
```

Should only show `on_auth_user_created` (not `on_auth_user_updated`).

### Solution 2: Check Supabase Email Configuration

1. **Dashboard** → **Authentication** → **Providers** → **Email**
2. Ensure **"Enable Email provider"** is ON
3. Check for SMTP configuration (if using custom SMTP)
4. For localhost/testing: Supabase default email should work

### Solution 3: Reset Email Template

1. **Dashboard** → **Authentication** → **Email Templates**
2. Click **"Magic Link"** template
3. Click **"Reset to default"** (if custom template exists)
4. Ensure template has: `{{ .ConfirmationURL }}`

### Solution 4: Check Redirect URLs

1. **Dashboard** → **Authentication** → **URL Configuration**
2. Ensure these are in **Redirect URLs**:
   - `https://lensonwealth.com/auth/callback`
   - `https://lensonwealth.com/**`
   - `http://localhost:5175/auth/callback` (for localhost)

---

## Debugging Commands

### Check if User Was Created

```sql
-- Check if user exists in auth.users
SELECT id, email, email_confirmed_at, created_at
FROM auth.users
WHERE email = 'user@example.com'
ORDER BY created_at DESC;
```

### Check if Trigger Fired

```sql
-- Check if public.users was created
SELECT id, email, phone_number, created_at
FROM public.users
WHERE email = 'user@example.com'
ORDER BY created_at DESC;
```

### Check Auth Logs

In Supabase Dashboard → Logs → Auth Logs, filter by email and look for:
- `mail.send` - Email was sent
- `user.signup` - User signup event
- Any error messages

---

## Expected Behavior

### ✅ Working Signup Flow:

1. User enters email on signup page
2. Clicks "Continue with Email"
3. Supabase sends magic link email
4. User receives email (check spam if not in inbox)
5. User clicks link in email
6. Redirected to `/auth/callback`
7. User authenticated → Redirected to `/onboarding`
8. User record created in `auth.users` and `public.users`

### ❌ If Not Working:

- **No email received** → Check spam, email provider, rate limits
- **Email received but link doesn't work** → Check redirect URLs
- **Error during signup** → Check Supabase logs, trigger status

---

## Quick Fix Checklist

- [ ] Ran rollback SQL to remove UPDATE trigger
- [ ] Verified UPDATE trigger is gone (SQL query)
- [ ] Checked Supabase Email provider is enabled
- [ ] Checked email template is correct
- [ ] Checked redirect URLs are configured
- [ ] Tested with Gmail address
- [ ] Checked spam folder
- [ ] Checked Supabase Auth Logs for `mail.send` events
- [ ] Verified no rate limiting

---

## Most Likely Causes

1. **UPDATE trigger still active** - Remove it with rollback SQL
2. **Email going to spam** - Check spam folder
3. **Email provider blocking** - Try Gmail
4. **Rate limiting** - Wait 1 hour or use different email
5. **Supabase email provider disabled** - Enable in dashboard

---

## Next Steps

1. **First**: Run rollback SQL to remove UPDATE trigger
2. **Second**: Check Supabase Auth Logs for `mail.send` events
3. **Third**: Test signup with Gmail address
4. **Fourth**: Check spam folder

If emails are being sent (logs show `mail.send`) but not arriving, it's a delivery issue - same as the login problem.
