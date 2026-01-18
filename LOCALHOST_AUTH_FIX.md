# Localhost Authentication Error Fix Guide

## Problem
Getting a **500 error** on `/auth/callback` in localhost, but it works fine in production.

## Common Causes & Solutions

### 1. ✅ **Missing Environment Variables** (Most Common)

**Check:** Your `.env.local` file has the correct Supabase credentials.

**Solution:**
1. Create/verify `.env.local` in the project root:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

2. **Restart your dev server** after adding/updating env vars:
```bash
# Stop the server (Ctrl+C) and restart
npm run dev
```

3. Verify env vars are loaded:
   - Check terminal output when starting dev server
   - Visit `http://localhost:5175/api/test-supabase` to verify connection

---

### 2. ✅ **Supabase Redirect URL Not Configured for Localhost**

**This is the #1 cause of localhost auth failures!**

**Solution:**
1. Go to your Supabase Dashboard
2. Navigate to **Authentication** → **URL Configuration**
3. Under **Redirect URLs**, add:
   ```
   http://localhost:5175/auth/callback
   http://localhost:5175/**
   ```
4. Under **Site URL**, set:
   ```
   http://localhost:5175
   ```
5. **Save** the changes

**Note:** Production URLs should already be configured. This is specifically for localhost.

---

### 3. ✅ **Port Mismatch**

**Check:** Your dev server port matches the redirect URL.

**Solution:**
- Default port is `5175` (check `package.json` scripts)
- If using a different port, update Supabase redirect URLs accordingly
- Or update `package.json` to use port 5175:
```json
"dev": "next dev --port 5175"
```

---

### 4. ✅ **Magic Link Email Configuration**

**Check:** Email provider is configured in Supabase.

**Solution:**
1. Go to **Authentication** → **Providers** → **Email**
2. Ensure **Enable Email provider** is ON
3. For localhost testing, you can use:
   - **Supabase's built-in email** (limited, but works for testing)
   - **Custom SMTP** (recommended for production)

---

### 5. ✅ **Cookie/Session Issues**

**Check:** Browser cookies are enabled and not blocked.

**Solution:**
1. Clear browser cookies for `localhost`
2. Try in **Incognito/Private mode**
3. Check browser console for cookie-related errors
4. Ensure you're using `http://` not `https://` for localhost

---

### 6. ✅ **Database Connection Issues**

**Check:** Can connect to Supabase from localhost.

**Solution:**
1. Test connection: Visit `http://localhost:5175/api/test-supabase`
2. Check Supabase Dashboard → **Settings** → **Database** → **Connection string**
3. Verify your IP is not blocked (unlikely for localhost)

---

## Quick Diagnostic Steps

### Step 1: Check Environment Variables
```bash
# In your terminal, verify env vars are loaded
echo $NEXT_PUBLIC_SUPABASE_URL
```

Or create a test endpoint to check:
```typescript
// Visit: http://localhost:5175/api/test-supabase
```

### Step 2: Check Supabase Dashboard
1. Go to **Authentication** → **URL Configuration**
2. Verify `http://localhost:5175/auth/callback` is in **Redirect URLs**
3. Verify **Site URL** includes localhost

### Step 3: Check Browser Console
1. Open DevTools (F12)
2. Go to **Console** tab
3. Look for specific error messages
4. Check **Network** tab for the failed `/auth/callback` request

### Step 4: Check Server Logs
Look at your terminal where `npm run dev` is running:
- Should see `[Auth Callback]` error messages
- These will tell you exactly what's failing

---

## Updated Code

The auth callback route has been updated with:
- ✅ Better error handling
- ✅ Detailed logging
- ✅ Environment variable checks
- ✅ Graceful error redirects

**After fixing the issues above, the callback should work!**

---

## Still Not Working?

### Check These:

1. **Supabase Project Status**
   - Is your project active? (Check Supabase Dashboard)
   - Any billing/quota issues?

2. **Network/Firewall**
   - Can you access `https://your-project.supabase.co`?
   - Any corporate firewall blocking localhost?

3. **Next.js Version**
   - Ensure you're using a compatible Next.js version
   - Try: `npm install next@latest`

4. **Clear Next.js Cache**
   ```bash
   rm -rf .next
   npm run dev
   ```

5. **Check Server Logs**
   - Look for `[Auth Callback]` messages in terminal
   - These will show the exact error

---

## Production vs Localhost Differences

| Setting | Production | Localhost |
|---------|-----------|-----------|
| **Site URL** | `https://yourdomain.com` | `http://localhost:5175` |
| **Redirect URL** | `https://yourdomain.com/auth/callback` | `http://localhost:5175/auth/callback` |
| **Protocol** | `https://` | `http://` |
| **Port** | None (default 443) | `5175` |

**Key Point:** Supabase needs BOTH URLs configured in the dashboard!

---

## Test After Fixing

1. **Send magic link** from login page
2. **Click the link** in your email
3. **Should redirect** to `/dashboard` or `/onboarding`
4. **Check browser console** - should see no 500 errors
5. **Check terminal** - should see successful auth logs

---

## Need More Help?

Check the server terminal output for detailed error messages. The updated callback route now logs:
- Missing environment variables
- Auth verification errors
- Portfolio check errors
- Unexpected errors

These logs will help pinpoint the exact issue!
