# Fix User: a3611e10-c78e-475d-adfc-54a01e0342f8

## User Details
- **User ID**: `a3611e10-c78e-475d-adfc-54a01e0342f8`
- **Email**: `richa.cbs@gmail.com`
- **Phone**: `919811821093` (format: without + prefix, just the number)

## Step 2: Fix the User

### Option 1: Use Supabase Dashboard (EASIEST - No Code Needed)

1. **Go to Supabase Dashboard**
   - Open: https://supabase.com/dashboard
   - Select your project

2. **Navigate to Authentication → Users**
   - Click "Authentication" in left sidebar
   - Click "Users" tab

3. **Find the User**
   - Search for: `richa.cbs@gmail.com` or `a3611e10-c78e-475d-adfc-54a01e0342f8`
   - Click on the user row

4. **Edit User**
   - Click "Edit" or "Update" button
   - Update **Phone** field to: `919811821093` (format: without + prefix)
   - Ensure **Email** is: `richa.cbs@gmail.com`
   - Click "Save" or "Update"

5. **Verify**
   - Check that phone shows as `+919811821093`
   - Check that email is confirmed

**Done!** User should now be able to login.

---

### Option 2: Use API Endpoint (If Deployed)

If your `/api/admin/fix-user-auth` endpoint is deployed to production:

```bash
curl -X POST https://lensonwealth.com/api/admin/fix-user-auth \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "a3611e10-c78e-475d-adfc-54a01e0342f8",
    "email": "richa.cbs@gmail.com",
    "phone": "919811821093"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "User updated successfully",
  "user": {
    "id": "a3611e10-c78e-475d-adfc-54a01e0342f8",
    "email": "richa.cbs@gmail.com",
    "phone": "919811821093"
  }
}
```

---

### Option 3: Use Script (Local Development)

If you're on your local machine:

1. **Open terminal in project folder**

2. **Run the script:**
```bash
npx tsx scripts/fix-user-auth.ts a3611e10-c78e-475d-adfc-54a01e0342f8 --email=richa.cbs@gmail.com --phone=919811821093
```

**Expected Output:**
```
🔧 Fixing authentication for user: a3611e10-c78e-475d-adfc-54a01e0342f8
   📧 Updating email to: richa.cbs@gmail.com
   📱 Updating phone to: 919811821093

✅ User updated successfully!
   ID: a3611e10-c78e-475d-adfc-54a01e0342f8
   Email: richa.cbs@gmail.com
   Phone: 919811821093
   Email Confirmed: Yes
   Phone Confirmed: Yes

🔄 Syncing to public.users...
✅ public.users synced successfully

✨ Done! User can now login with the updated credentials.
```

---

## Important Notes

1. **Phone Number Format**: Use format without `+` prefix (as per your system)
   - ✅ Correct: `919811821093`
   - ❌ Wrong: `+919811821093` (causes error in your system)

2. **After Fixing**: User should:
   - Try logging in with email: `richa.cbs@gmail.com`
   - OR try logging in with phone: `+919811821093` or `9811821093`
   - Check spam folder for email
   - Wait 1-2 minutes for OTP/email

3. **Verification**: After fixing, verify in Supabase:
   ```sql
   SELECT id, email, phone, email_confirmed_at, phone_confirmed_at
   FROM auth.users
   WHERE id = 'a3611e10-c78e-475d-adfc-54a01e0342f8';
   ```

---

## Recommended: Use Option 1 (Supabase Dashboard)

**This is the easiest and fastest way:**
1. No code needed
2. No terminal commands
3. Visual interface
4. Immediate results

Just go to Supabase Dashboard → Authentication → Users → Find user → Edit → Update phone to `919811821093` → Save.
