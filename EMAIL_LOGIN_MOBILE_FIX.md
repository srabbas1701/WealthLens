# 🔧 Email Magic Link Login Not Working on Mobile - Fix Guide

## Issue
- ✅ Mobile OTP login works fine
- ❌ Email magic link login does NOT work (even after copying link to Safari)

## What I Fixed

### 1. Updated Callback Route (`src/app/auth/callback/route.ts`)

**Changes:**
- ✅ **Check `code` parameter FIRST** (modern Supabase magic links use `code`, not `token_hash`)
- ✅ **Better logging** to see exactly what parameters are received
- ✅ **Session verification** after authentication to ensure it's stored
- ✅ **Improved error handling** with detailed logging

**Why this matters:**
- Supabase magic links can use either `code` or `token_hash` format
- The old code checked `token_hash` first, but modern links use `code`
- iOS Safari has session persistence issues, so we verify the session is stored

---

## 🔍 Diagnostic Steps

### Step 1: Check Server Logs

When user clicks the email link, check your server logs (or Vercel/Netlify logs) for:

```
[Auth Callback] URL params: { hasCode: true/false, hasTokenHash: true/false, ... }
[Auth Callback] Processing code exchange...
[Auth Callback] Code exchange successful, user: <user-id>
[Auth Callback] Session confirmed, user ID: <user-id>
[Auth Callback] Redirecting to: /dashboard
```

**What to look for:**
- ✅ If you see "Code exchange successful" → Authentication worked
- ❌ If you see "Code exchange error" → Check the error message
- ⚠️ If you see "No session found after authentication" → Session storage issue

### Step 2: Check the Email Link Format

Ask the user to:
1. **Copy the full email link**
2. **Check what parameters it has:**
   - Should have: `?code=...` OR `?token_hash=...&type=magiclink`
   - Should point to: `https://www.lensonwealth.com/auth/callback?...`

**Common issues:**
- Link points to wrong domain
- Missing `code` or `token_hash` parameter
- Link expired (magic links expire after 1 hour)

### Step 3: Check Supabase Redirect URLs

1. Go to **Supabase Dashboard** → **Authentication** → **URL Configuration**
2. Ensure these URLs are in **Redirect URLs**:
   - `https://www.lensonwealth.com/auth/callback`
   - `https://www.lensonwealth.com/**` (wildcard)

**If missing, add them!**

### Step 4: Test the Link Directly

Ask user to:
1. Copy the full email link
2. Paste it in Safari address bar
3. **Before pressing Enter**, check the URL:
   - Does it have `code=...` or `token_hash=...`?
   - Does it point to your domain?
4. Press Enter
5. **Watch what happens:**
   - Does it redirect to `/dashboard` or `/onboarding`?
   - Does it redirect to `/login?error=...`?
   - Does it get stuck on a loading screen?

---

## 🚨 Common Issues & Fixes

### Issue 1: Link Uses Wrong Format

**Symptom:** Link has `token_hash` but code expects `code`

**Fix:** The updated callback route now handles both formats. If still not working, check server logs.

### Issue 2: Session Not Stored on iOS

**Symptom:** Authentication succeeds but user is immediately logged out

**Fix:** 
1. Check if cookies are blocked in Safari settings
2. Try disabling "Prevent Cross-Site Tracking" temporarily
3. The updated code now verifies session is stored before redirecting

### Issue 3: Redirect URL Mismatch

**Symptom:** Link redirects to login page with error

**Fix:**
1. Check Supabase Redirect URLs include your domain
2. Ensure `emailRedirectTo` in code matches exactly
3. Check for trailing slash mismatches

### Issue 4: Link Expired

**Symptom:** Error message about expired token

**Fix:** Request a new magic link (they expire after 1 hour)

---

## 🧪 Testing Checklist

- [ ] Email link has `code=...` or `token_hash=...` parameter
- [ ] Link points to `https://www.lensonwealth.com/auth/callback`
- [ ] Supabase Redirect URLs include your domain
- [ ] Server logs show "Code exchange successful"
- [ ] Server logs show "Session confirmed"
- [ ] User is redirected to `/dashboard` or `/onboarding` (not `/login`)
- [ ] User stays logged in after redirect

---

## 📋 What to Ask User

1. **"What happens when you click the email link?"**
   - Does it open Safari?
   - Does it redirect somewhere?
   - Does it show an error?

2. **"Can you copy the full email link and send it to me?"**
   - Check the URL format
   - Check the domain
   - Check the parameters

3. **"After clicking the link, are you logged in or redirected to login page?"**
   - If redirected to login → Authentication failed
   - If logged in but then logged out → Session storage issue

4. **"Check Safari settings:"**
   - Settings → Safari → "Prevent Cross-Site Tracking" → Turn OFF (temporarily)
   - Settings → Safari → "Block All Cookies" → Turn OFF

---

## 🔄 Next Steps

1. **Deploy the updated callback route** (already done in code)
2. **Check server logs** when user tries again
3. **Verify Supabase Redirect URLs** are correct
4. **Test with a fresh magic link** (request new one)

The code fix should resolve the issue, but we need to verify with actual testing and logs.
