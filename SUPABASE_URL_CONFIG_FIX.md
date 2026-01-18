# Supabase URL Configuration Fix for Localhost

## Current Configuration Analysis

Based on your Supabase dashboard:

✅ **What's Correct:**
- Redirect URLs include: `http://localhost:5175/**` (with wildcard)
- Production URLs are properly configured

⚠️ **Potential Issue:**
- **Site URL** is set to `https://lensonwealth.com` (production)
- This might cause Supabase to default to production URL in some cases

## Recommended Fix

### Option 1: Keep Current Setup (Recommended)

Your current setup **should work**, but you need to ensure:

1. **The redirect URL pattern matches exactly:**
   - Current: `http://localhost:5175/**` ✅
   - This should match: `http://localhost:5175/auth/callback`

2. **Verify the magic link is using the correct URL:**
   - Check the email you receive
   - The link should point to: `http://localhost:5175/auth/callback?...`
   - NOT: `https://lensonwealth.com/auth/callback?...`

### Option 2: Add More Specific Redirect URLs

Add these **additional** redirect URLs (don't remove the wildcard):

```
http://localhost:5175/auth/callback
http://localhost:5175/**
```

This gives Supabase both:
- Specific callback URL (more explicit)
- Wildcard pattern (catches everything)

### Option 3: Use Environment-Based Site URL (Advanced)

If you want different Site URLs for dev vs production, you'd need to:
1. Keep production Site URL in Supabase dashboard
2. Ensure redirect URLs cover both environments
3. The code already uses `window.location.origin` which is correct

## What to Check

### 1. Check the Magic Link Email

When you receive the magic link email:
- **Should be:** `http://localhost:5175/auth/callback?token_hash=...&type=magiclink`
- **Should NOT be:** `https://lensonwealth.com/auth/callback?...`

If the email contains the production URL, that's the problem!

### 2. Verify Redirect URL Pattern

In Supabase Dashboard → Authentication → URL Configuration:
- Ensure `http://localhost:5175/**` is checked/enabled
- The wildcard `**` should match `/auth/callback`

### 3. Test the Pattern

The wildcard `**` should match:
- ✅ `http://localhost:5175/auth/callback`
- ✅ `http://localhost:5175/dashboard`
- ✅ `http://localhost:5175/anything`

## Recommended Action

**Keep your current setup** but add a more specific redirect URL:

1. Go to Supabase Dashboard
2. Authentication → URL Configuration
3. Click **"Add URL"**
4. Add: `http://localhost:5175/auth/callback` (without wildcard)
5. **Keep** the existing `http://localhost:5175/**` entry
6. Click **"Save changes"**

Now you'll have:
- `http://localhost:5175/auth/callback` (specific)
- `http://localhost:5175/**` (wildcard fallback)

This ensures the callback URL is explicitly allowed.

## Why This Should Work

The code in `src/lib/auth/context.tsx` uses:
```typescript
emailRedirectTo: `${window.location.origin}/auth/callback`
```

When running on localhost:
- `window.location.origin` = `http://localhost:5175`
- So it generates: `http://localhost:5175/auth/callback`

This URL must be in your Supabase Redirect URLs list, which it is (via the wildcard).

## If Still Not Working

1. **Check the actual magic link URL** in your email
2. **Check browser console** for the exact error
3. **Check server terminal** for `[Auth Callback]` error messages
4. **Verify environment variables** are loaded correctly

The updated callback route now logs detailed errors - check your terminal!
