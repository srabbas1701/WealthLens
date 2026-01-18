# 🔍 New User Signup Email Not Sending - Troubleshooting Guide

## ✅ Code Status: CORRECT

The signup flow uses the same `sendMagicLink()` function as login:
- ✅ `src/app/signup/page.tsx` → calls `sendMagicLink(email)`
- ✅ `src/lib/auth/context.tsx` → uses `supabase.auth.signInWithOtp()`
- ✅ Trigger status: Only `on_auth_user_created` exists (correct)

**The issue is likely in Supabase Auth configuration, not code.**

---

## 🔧 Step 1: Check Supabase Auth Settings

### A. Email Provider Configuration

1. **Go to Supabase Dashboard** → **Authentication** → **Providers**
2. **Check Email Provider:**
   - ✅ **"Enable Email provider"** must be ON
   - ✅ **"Confirm email"** setting:
     - For **signup**: Should be **OFF** (allows auto-account creation)
     - For **login**: Can be ON or OFF
   - ✅ **"Secure email change"** can be ON or OFF

### B. Email Templates

1. **Go to** **Authentication** → **Email Templates**
2. **Check "Magic Link" template:**
   - ✅ Template exists and is enabled
   - ✅ Subject line is set
   - ✅ Body contains `{{ .ConfirmationURL }}` or `{{ .Token }}`
   - ✅ Redirect URL is correct: `{{ .SiteURL }}/auth/callback`

3. **Check "Signup" template (if separate):**
   - Some Supabase projects have separate templates for signup vs login
   - Ensure signup template is configured

### C. Site URL Configuration

1. **Go to** **Authentication** → **URL Configuration**
2. **Check:**
   - ✅ **Site URL**: Should be `https://www.lensonwealth.com` (production)
   - ✅ **Redirect URLs**: Should include:
     - `https://www.lensonwealth.com/auth/callback`
     - `https://www.lensonwealth.com/**` (wildcard for all routes)

---

## 🔍 Step 2: Check Auth Logs

1. **Go to** **Logs** → **Auth Logs**
2. **Filter by the email trying to signup**
3. **Look for these events:**

### ✅ Expected Events (Good):
```
event: mail.send
level: info
mail_type: magic_link
mail_to: user@example.com
```

### ❌ Missing Events (Problem):
- No `mail.send` event → Email not being sent
- `mail.send` with error → Email delivery issue

### ⚠️ Error Events:
```
event: user.signup
level: error
message: "Email confirmation required"
```
→ **Fix**: Disable "Confirm email" in Auth settings

---

## 🚨 Step 3: Common Issues & Fixes

### Issue 1: "Confirm Email" Setting Blocks Signup

**Symptom:** User receives email but account isn't created until they confirm.

**Fix:**
1. **Authentication** → **Providers** → **Email**
2. **Turn OFF** "Confirm email" (or set to "Optional")
3. This allows `signInWithOtp()` to create accounts automatically

### Issue 2: Rate Limiting

**Symptom:** First signup works, subsequent attempts fail silently.

**Fix:**
1. **Authentication** → **Settings** → **Rate Limits**
2. Check **"Email rate limit"** (default: 4 emails/hour per address)
3. Increase if needed, or wait 1 hour between attempts

### Issue 3: Email Template Missing Redirect URL

**Symptom:** Email sent but link doesn't work.

**Fix:**
1. **Authentication** → **Email Templates** → **Magic Link**
2. Ensure template contains:
   ```
   Click here to sign up: {{ .ConfirmationURL }}
   ```
3. Or use:
   ```
   {{ .SiteURL }}/auth/callback?token={{ .Token }}
   ```

### Issue 4: Site URL Mismatch

**Symptom:** Emails sent but redirect fails.

**Fix:**
1. **Authentication** → **URL Configuration**
2. **Site URL**: `https://www.lensonwealth.com`
3. **Redirect URLs**: Add `https://www.lensonwealth.com/auth/callback`

---

## 🧪 Step 4: Test Signup Flow

### Test 1: Check Browser Console

1. Open browser DevTools (F12)
2. Go to **Console** tab
3. Try to signup with a new email
4. Look for errors:
   - ❌ `Failed to send magic link` → Check Supabase logs
   - ❌ `Rate limit exceeded` → Wait 1 hour
   - ❌ `Email provider disabled` → Enable in Supabase

### Test 2: Check Network Tab

1. Open **Network** tab in DevTools
2. Try signup
3. Look for request to Supabase:
   - **URL**: `https://[project].supabase.co/auth/v1/otp`
   - **Status**: Should be `200 OK`
   - **Response**: Should contain `{}` (empty success)

### Test 3: Check Supabase Auth Logs

1. **Logs** → **Auth Logs**
2. Filter by email
3. Should see:
   ```
   event: user.signup (or mail.send)
   level: info
   ```

---

## 📋 Step 5: Verify Email Delivery

Even if Supabase logs show `mail.send`, emails might not arrive due to:

### A. Spam Filters
- ✅ Check spam/junk folder
- ✅ Add `noreply@mail.app.supabase.io` to contacts
- ✅ Check email provider's spam settings

### B. Email Provider Blocking
- Some providers (Gmail, Outlook) block automated emails
- Try with a different email provider
- Check email provider's security logs

### C. Domain Reputation
- Supabase's email domain might be flagged
- Consider using custom SMTP (SendGrid, Mailgun) in production

---

## 🎯 Quick Fix Checklist

Run through this checklist in order:

- [ ] **Email provider enabled** (Authentication → Providers → Email)
- [ ] **"Confirm email" is OFF** (allows auto-signup)
- [ ] **Site URL is correct** (`https://www.lensonwealth.com`)
- [ ] **Redirect URLs include** `/auth/callback`
- [ ] **Magic Link template exists** and has `{{ .ConfirmationURL }}`
- [ ] **Rate limits not exceeded** (wait 1 hour if needed)
- [ ] **Auth logs show `mail.send`** event
- [ ] **Check spam folder** for test email
- [ ] **Try different email provider** (Gmail, Outlook, etc.)

---

## 🔄 If Still Not Working

### Option 1: Use Custom SMTP

1. **Authentication** → **Settings** → **SMTP Settings**
2. Configure SendGrid, Mailgun, or AWS SES
3. This bypasses Supabase's email service

### Option 2: Check Supabase Status

1. Visit [status.supabase.com](https://status.supabase.com)
2. Check if email service is down
3. Check for known issues

### Option 3: Contact Supabase Support

If all above steps fail:
1. Go to Supabase Dashboard → **Support**
2. Include:
   - Project ID
   - Email address trying to signup
   - Auth log entries
   - Screenshot of Auth settings

---

## 📝 Summary

**Most Likely Causes:**
1. ⚠️ **"Confirm email" setting is ON** → Blocks auto-signup
2. ⚠️ **Rate limit exceeded** → Wait 1 hour
3. ⚠️ **Email template misconfigured** → Check redirect URL
4. ⚠️ **Site URL mismatch** → Check URL configuration
5. ⚠️ **Email delivery issue** → Check spam, try different provider

**Code is correct** - focus on Supabase Auth configuration!
