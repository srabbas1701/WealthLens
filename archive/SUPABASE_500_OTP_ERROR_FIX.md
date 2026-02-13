# Supabase 500 Error on OTP Endpoint - Fix Guide

## Error Analysis

**Error:** `POST https://oigonhoggngeamzrmxsq.supabase.co/auth/v1/otp?redirect_to=http%3A%2F%2Flocalhost%3A5175%2Fauth%2Fcallback`
**Status:** `500 (Internal Server Error)`

**Key Observation:**
- ✅ Redirect URL is correct: `http://localhost:5175/auth/callback`
- ✅ URL Configuration looks correct (both wildcard and specific URL added)
- ❌ Error is happening at Supabase's API level, not your callback route

This means Supabase is rejecting the request **before** it even tries to send the email.

## Root Causes & Solutions

### 1. ✅ **Email Provider Not Configured** (Most Likely)

Supabase needs an email provider to send magic links. If it's not configured, you'll get a 500 error.

**Check:**
1. Go to **Supabase Dashboard** → **Authentication** → **Providers**
2. Find **Email** provider
3. Ensure it's **Enabled** (toggle should be ON)

**If Email Provider is Disabled:**
1. Click the **Email** provider
2. Toggle **Enable Email provider** to **ON**
3. **Save** changes

**If Email Provider is Enabled but Still Failing:**
- Check if you need to configure SMTP (see below)

---

### 2. ✅ **SMTP Configuration Missing** (For Production)

For production, you need custom SMTP. For localhost testing, Supabase's built-in email should work.

**Check SMTP Settings:**
1. Go to **Authentication** → **Settings** (or **Providers** → **Email** → **Settings**)
2. Look for **SMTP Settings** or **Email Provider Configuration**
3. For localhost testing, you can use Supabase's default email (limited but works)

**If Using Custom SMTP:**
- Ensure SMTP credentials are correct
- Test SMTP connection
- Check for any SMTP errors in Supabase logs

---

### 3. ✅ **Email Rate Limiting**

Supabase has rate limits on email sending. If you've sent too many emails, you'll get errors.

**Check:**
1. Go to **Authentication** → **Settings** → **Rate Limits**
2. Check **Email rate limits**
3. Default is usually 4 emails per hour per email address

**Solution:**
- Wait for rate limit to reset
- Or increase rate limit in settings (if available)
- Or use a different email address for testing

---

### 4. ✅ **Email Template Issues**

If email templates are misconfigured, Supabase might fail to send emails.

**Check:**
1. Go to **Authentication** → **Email Templates**
2. Check **Magic Link** template
3. Ensure it has valid template variables

**Common Issues:**
- Missing `{{ .ConfirmationURL }}` or `{{ .RedirectTo }}` in template
- Invalid template syntax
- Template variables not matching Supabase's format

**Fix:**
- Use Supabase's default templates (reset to default)
- Or ensure custom templates use correct variables

---

### 5. ✅ **Redirect URL Validation Failing**

Even though your URL is in the allow list, Supabase might be validating it server-side and failing.

**Double-Check:**
1. Go to **Authentication** → **URL Configuration**
2. Verify these URLs are **exactly** as shown (no extra spaces, correct protocol):
   - `http://localhost:5175/auth/callback` ✅
   - `http://localhost:5175/**` ✅
3. Ensure both are **enabled/checked**

**Test:**
- Try removing the wildcard and keeping only the specific URL
- Or try adding `http://localhost:5175` (without path) as well

---

### 6. ✅ **Supabase Project Status**

Check if your Supabase project is active and not paused.

**Check:**
1. Go to **Settings** → **General**
2. Check project status
3. Check for any billing/quota warnings

**Common Issues:**
- Project paused due to inactivity
- Quota exceeded (free tier limits)
- Billing issues

---

### 7. ✅ **Email Domain Blocking**

Some email providers (like Yahoo) might block Supabase's default email service.

**Check:**
- Are you using `sr_abbas@yahoo.com`? (Yahoo can be strict)
- Try with a Gmail address to test
- Check spam folder (sometimes emails are sent but marked as spam)

**Solution:**
- Use Gmail for testing: `yourname@gmail.com`
- Or configure custom SMTP with a trusted provider

---

## Step-by-Step Diagnostic

### Step 1: Check Email Provider Status
```
Supabase Dashboard → Authentication → Providers → Email
✅ Should be ENABLED
```

### Step 2: Check Supabase Logs
```
Supabase Dashboard → Logs → Auth Logs
Look for errors related to OTP/email sending
```

### Step 3: Test with Different Email
Try with a Gmail address instead of Yahoo:
- Gmail is more permissive with Supabase's default email service
- Yahoo sometimes blocks automated emails

### Step 4: Check Rate Limits
```
Authentication → Settings → Rate Limits
Check if you've exceeded email sending limits
```

### Step 5: Verify URL Configuration
```
Authentication → URL Configuration
Ensure:
- http://localhost:5175/auth/callback (exact match)
- http://localhost:5175/** (wildcard)
Both should be enabled
```

---

## Quick Fixes to Try

### Fix 1: Enable Email Provider
1. **Authentication** → **Providers** → **Email**
2. Toggle **Enable Email provider** → **ON**
3. **Save**

### Fix 2: Reset Email Templates
1. **Authentication** → **Email Templates**
2. Click **Magic Link** template
3. Click **Reset to default** (if available)
4. **Save**

### Fix 3: Test with Gmail
Instead of `sr_abbas@yahoo.com`, try:
- `yourname@gmail.com`
- Gmail is more compatible with Supabase's default email

### Fix 4: Check Supabase Status
1. Go to [status.supabase.com](https://status.supabase.com)
2. Check if there are any service outages
3. Check your project's status in dashboard

---

## Expected Behavior After Fix

Once fixed, you should see:
1. ✅ No 500 error in console
2. ✅ Success message: "Check your email for the login link"
3. ✅ Email received in inbox (or spam folder)
4. ✅ Magic link works when clicked

---

## Still Not Working?

### Check Supabase Logs
1. Go to **Logs** → **Auth Logs** in Supabase Dashboard
2. Look for the exact error message
3. This will tell you the specific reason for the 500 error

### Common Error Messages:
- `"Email provider not configured"` → Enable email provider
- `"Rate limit exceeded"` → Wait or increase limit
- `"Invalid redirect URL"` → Check URL configuration
- `"SMTP connection failed"` → Fix SMTP settings
- `"Template error"` → Fix email template

### Contact Supabase Support
If none of the above works:
1. Check Supabase community forums
2. Open a support ticket with Supabase
3. Include the error from Auth Logs

---

## Verification Checklist

After applying fixes, verify:
- [ ] Email provider is enabled
- [ ] URL configuration has localhost URLs
- [ ] No rate limit errors
- [ ] Email templates are valid
- [ ] Tested with Gmail (if Yahoo was the issue)
- [ ] Checked Supabase Auth Logs for specific errors
- [ ] Restarted dev server after any changes

---

## Most Common Solution

**90% of the time, the issue is:**
1. Email provider not enabled → Enable it
2. Rate limit exceeded → Wait or use different email
3. Email domain blocking → Use Gmail for testing

Try these first!
