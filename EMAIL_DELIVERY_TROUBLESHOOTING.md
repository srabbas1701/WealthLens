# Email Delivery Troubleshooting

## Current Status

✅ **Supabase IS sending emails** - Logs confirm:
- `"event":"mail.send"` ✅
- `"mail_to":"richa.cbs@gmail.com"` ✅
- `"mail_type":"magic_link"` ✅

❌ **Users are NOT receiving emails** - This is a **delivery issue**, not a code issue.

## Why Emails Might Not Arrive

### 1. 📧 **Check Spam/Junk Folder** (Most Common)

Gmail, Outlook, and other providers often mark Supabase emails as spam.

**Action:**
- Check spam/junk folder
- Mark as "Not Spam" if found
- Add `noreply@mail.app.supabase.io` to contacts/whitelist

### 2. 🔒 **Email Provider Blocking**

Some email providers block Supabase's default email service.

**Check:**
- Gmail: Usually works, but check spam
- Yahoo: Often blocks Supabase emails
- Corporate emails: May have strict filters

**Test:**
- Try with a different email provider (Gmail recommended)
- Check if emails from `noreply@mail.app.supabase.io` are blocked

### 3. ⏱️ **Email Delivery Delay**

Supabase emails can take 1-5 minutes to arrive.

**Action:**
- Wait 5 minutes after requesting magic link
- Check spam folder after waiting

### 4. 🚫 **Rate Limiting**

Supabase limits emails per hour per address (usually 4/hour).

**Check:**
- Have you requested multiple magic links recently?
- Wait 1 hour and try again

**Solution:**
- Use a different email address for testing
- Or wait for rate limit to reset

### 5. ⚙️ **Supabase Email Configuration**

**Check in Supabase Dashboard:**

1. **Authentication → Providers → Email**
   - Ensure "Enable Email provider" is ON ✅
   - Check for any error messages

2. **Authentication → Email Templates**
   - Check "Magic Link" template
   - Ensure it has `{{ .ConfirmationURL }}` or `{{ .RedirectTo }}`
   - Reset to default if custom template is broken

3. **Authentication → Settings → Rate Limits**
   - Check email rate limits
   - Default: 4 emails/hour per address

### 6. 🔗 **Email Link Configuration**

The email link should point to your callback URL.

**Check the actual email:**
- Open the email (if you find it in spam)
- The link should be: `https://lensonwealth.com/auth/callback?token_hash=...&type=magiclink`
- Or for localhost: `http://localhost:5175/auth/callback?token_hash=...&type=magiclink`

**If link is wrong:**
- Check Supabase URL Configuration
- Ensure redirect URLs are correct

## Immediate Actions

### Step 1: Check Spam Folder
1. Go to email inbox
2. Check spam/junk folder
3. Search for "Supabase" or "LensOnWealth"
4. Check last 24 hours

### Step 2: Verify Supabase Email Settings
1. Go to Supabase Dashboard
2. Authentication → Providers → Email
3. Ensure "Enable Email provider" is ON
4. Check for any error messages

### Step 3: Test with Different Email
1. Try with a Gmail address (most reliable)
2. Request magic link
3. Check spam folder
4. Wait 5 minutes

### Step 4: Check Email Logs in Supabase
1. Go to Supabase Dashboard
2. Logs → Auth Logs
3. Filter by email address
4. Check for delivery errors

## Code Changes (None Needed)

**No code changes are needed** - Supabase is sending emails correctly.

The issue is email delivery, not code. The email sending logic in `src/lib/auth/context.tsx` is correct:

```typescript
emailRedirectTo: `${window.location.origin}/auth/callback`
```

This generates the correct callback URL.

## Production vs Localhost

### Production (`https://lensonwealth.com`)
- Email link: `https://lensonwealth.com/auth/callback?token_hash=...`
- Make sure this URL is in Supabase Redirect URLs

### Localhost (`http://localhost:5175`)
- Email link: `http://localhost:5175/auth/callback?token_hash=...`
- Make sure this URL is in Supabase Redirect URLs

## If Still Not Working

1. **Check Supabase Email Provider Status**
   - Dashboard → Authentication → Providers → Email
   - Look for any error messages or warnings

2. **Check Email Template**
   - Dashboard → Authentication → Email Templates
   - Reset "Magic Link" template to default

3. **Try Custom SMTP** (For Production)
   - Configure custom SMTP in Supabase
   - Use a reliable email service (SendGrid, Mailgun, etc.)

4. **Check Email Logs**
   - Supabase Dashboard → Logs → Auth Logs
   - Filter by email address
   - Look for delivery errors

## Summary

- ✅ Code is correct - Supabase is sending emails
- ❌ Emails not reaching inbox - delivery issue
- 🔍 Check spam folder first
- ⚙️ Verify Supabase email configuration
- 📧 Try different email provider (Gmail recommended)
