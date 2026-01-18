# Immediate Fix Steps for 500 Error

## The Problem
You're getting a **500 Internal Server Error** from Supabase's `/auth/v1/otp` endpoint. This is a **Supabase server-side error**, not a code issue.

## ⚡ IMMEDIATE ACTION REQUIRED

### Step 1: Check Supabase Auth Logs (MOST IMPORTANT)

This will tell you the **exact reason** for the 500 error:

1. Go to **Supabase Dashboard**
2. Navigate to **Logs** → **Auth Logs** (or **Logs** → **API Logs**)
3. Look for the most recent error entry
4. **Copy the exact error message**

The error message will tell you:
- "Email provider not configured" → Enable email provider
- "Rate limit exceeded" → Wait or use different email
- "Invalid redirect URL" → Check URL configuration
- "SMTP error" → Fix SMTP settings
- etc.

### Step 2: Enable Email Provider

**This fixes 90% of 500 errors:**

1. **Supabase Dashboard** → **Authentication** → **Providers**
2. Find **Email** in the list
3. Click on it or toggle it
4. Ensure **"Enable Email provider"** is **ON** ✅
5. **Save** changes
6. Try again

### Step 3: Check Email Provider Settings

1. **Authentication** → **Providers** → **Email**
2. Check **Settings** or **Configuration** tab
3. Look for:
   - **SMTP Settings** (if using custom SMTP)
   - **Email Templates** (should have valid templates)
   - **Rate Limits** (check if exceeded)

### Step 4: Test with Gmail

Yahoo (`sr_abbas@yahoo.com`) sometimes blocks automated emails:

1. Try with a **Gmail address** instead
2. Gmail is more compatible with Supabase's default email service
3. If Gmail works, the issue is with Yahoo's email filtering

### Step 5: Check Rate Limits

1. **Authentication** → **Settings** → **Rate Limits**
2. Check **Email rate limits**
3. Default: 4 emails per hour per address
4. If exceeded, wait 1 hour or use a different email

---

## What the Error Logs Will Show

After checking **Supabase Auth Logs**, you'll see one of these:

### Error 1: "Email provider not configured"
**Fix:** Enable email provider (Step 2 above)

### Error 2: "Rate limit exceeded"
**Fix:** Wait 1 hour or use different email

### Error 3: "Invalid redirect URL"
**Fix:** Verify URL configuration:
- `http://localhost:5175/auth/callback` ✅
- `http://localhost:5175/**` ✅

### Error 4: "SMTP connection failed"
**Fix:** Check SMTP settings in Email provider configuration

### Error 5: "Email template error"
**Fix:** Reset email templates to default

---

## Quick Diagnostic Checklist

Run through these in order:

- [ ] **Step 1:** Check Supabase Auth Logs for exact error
- [ ] **Step 2:** Enable Email provider if disabled
- [ ] **Step 3:** Test with Gmail instead of Yahoo
- [ ] **Step 4:** Check rate limits
- [ ] **Step 5:** Verify URL configuration (already done ✅)
- [ ] **Step 6:** Check Supabase project status (not paused)

---

## After Fixing

Once you fix the issue:
1. ✅ No 500 error in console
2. ✅ Success message: "Check your email for the login link"
3. ✅ Email received (check spam folder)
4. ✅ Magic link works when clicked

---

## Still Not Working?

If you've done all the above and it's still failing:

1. **Share the exact error from Supabase Auth Logs**
2. **Check Supabase Status:** [status.supabase.com](https://status.supabase.com)
3. **Verify project is active:** Settings → General → Project Status
4. **Try Supabase Support:** They can check your project's specific configuration

---

## Most Common Solution

**90% of the time, the fix is:**
1. Email provider not enabled → **Enable it**
2. Rate limit exceeded → **Wait or use different email**

Start with these two!
