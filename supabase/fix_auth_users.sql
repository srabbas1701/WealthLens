-- =============================================================================
-- FIX AUTH USERS: Diagnostic and Fix Script
-- =============================================================================
-- This script helps diagnose and fix authentication issues when users
-- have been manually updated in the database.
--
-- PROBLEM:
-- When you manually update auth.users or public.users tables, Supabase Auth
-- service doesn't recognize these changes. You MUST use Supabase Admin API
-- to update auth users properly.
--
-- Run this in Supabase SQL Editor to diagnose the issue.
-- =============================================================================

-- =============================================================================
-- STEP 1: DIAGNOSTIC QUERIES
-- =============================================================================

-- Check all auth.users with their public.users status
-- Note: This query works even if primary_auth_method column doesn't exist
SELECT 
  au.id,
  au.email as auth_email,
  au.phone as auth_phone,
  au.email_confirmed_at,
  au.phone_confirmed_at,
  au.created_at as auth_created_at,
  pu.email as public_email,
  pu.phone_number as public_phone,
  CASE 
    WHEN pu.id IS NULL THEN '❌ MISSING IN public.users'
    WHEN au.email IS NOT NULL AND pu.email IS NULL THEN '⚠️ EMAIL MISMATCH'
    WHEN au.phone IS NOT NULL AND pu.phone_number IS NULL THEN '⚠️ PHONE MISMATCH'
    WHEN au.email != pu.email THEN '⚠️ EMAIL DIFFERENT'
    WHEN au.phone != pu.phone_number THEN '⚠️ PHONE DIFFERENT'
    ELSE '✅ SYNCED'
  END as sync_status
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
ORDER BY au.created_at DESC;

-- Check for users with missing email/phone in auth.users but present in public.users
SELECT 
  pu.id,
  pu.email as public_email,
  pu.phone_number as public_phone,
  au.email as auth_email,
  au.phone as auth_phone,
  CASE 
    WHEN au.id IS NULL THEN '❌ USER NOT IN auth.users'
    WHEN pu.email IS NOT NULL AND au.email IS NULL THEN '⚠️ EMAIL MISSING IN auth.users'
    WHEN pu.phone_number IS NOT NULL AND au.phone IS NULL THEN '⚠️ PHONE MISSING IN auth.users'
    ELSE '✅ OK'
  END as issue
FROM public.users pu
LEFT JOIN auth.users au ON pu.id = au.id
WHERE (pu.email IS NOT NULL AND au.email IS NULL)
   OR (pu.phone_number IS NOT NULL AND au.phone IS NULL)
   OR au.id IS NULL;

-- =============================================================================
-- STEP 2: CREATE TRIGGER TO SYNC auth.users → public.users (UPDATES)
-- =============================================================================
-- This trigger will keep public.users in sync when auth.users is updated
-- via Admin API (not direct SQL updates)

CREATE OR REPLACE FUNCTION public.handle_auth_user_update()
RETURNS trigger AS $$
BEGIN
  -- CRITICAL FIX: Only update if the row exists in public.users
  -- This prevents errors during user creation when UPDATE triggers fire
  -- before INSERT trigger completes
  
  -- Check if user exists in public.users first
  IF EXISTS (SELECT 1 FROM public.users WHERE id = NEW.id) THEN
    -- Update public.users when auth.users is updated
    UPDATE public.users
    SET 
      email = NEW.email,
      phone_number = NEW.phone,
      updated_at = NOW(),
      -- Update verification timestamps
      email_verified_at = CASE 
        WHEN NEW.email IS NOT NULL AND NEW.email_confirmed_at IS NOT NULL 
        THEN NEW.email_confirmed_at 
        ELSE NULL 
      END,
      phone_verified_at = CASE 
        WHEN NEW.phone IS NOT NULL AND NEW.phone_confirmed_at IS NOT NULL 
        THEN NEW.phone_confirmed_at 
        ELSE NULL 
      END
    WHERE id = NEW.id;
    
    -- Update primary_auth_method if column exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'users' 
      AND column_name = 'primary_auth_method'
    ) THEN
      UPDATE public.users
      SET primary_auth_method = CASE 
        WHEN NEW.phone IS NOT NULL THEN 'mobile'
        WHEN NEW.email IS NOT NULL THEN 'email'
        ELSE NULL
      END
      WHERE id = NEW.id;
    END IF;
  END IF;
  -- If row doesn't exist yet, do nothing (INSERT trigger will handle it)
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for updates (if it doesn't exist)
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;

CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_auth_user_update();

-- =============================================================================
-- STEP 3: MANUAL SYNC FUNCTION (Run this AFTER using Admin API to update)
-- =============================================================================
-- After you update a user via Admin API, run this to ensure public.users is synced

CREATE OR REPLACE FUNCTION public.sync_user_from_auth(user_id uuid)
RETURNS void AS $$
DECLARE
  auth_email text;
  auth_phone text;
  auth_email_confirmed timestamptz;
  auth_phone_confirmed timestamptz;
BEGIN
  -- Get values from auth.users
  SELECT email, phone, email_confirmed_at, phone_confirmed_at
  INTO auth_email, auth_phone, auth_email_confirmed, auth_phone_confirmed
  FROM auth.users
  WHERE id = user_id;
  
  -- Update basic fields
  UPDATE public.users
  SET 
    email = auth_email,
    phone_number = auth_phone,
    updated_at = NOW(),
    email_verified_at = auth_email_confirmed,
    phone_verified_at = auth_phone_confirmed
  WHERE id = user_id;
  
  -- Update primary_auth_method if column exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'primary_auth_method'
  ) THEN
    UPDATE public.users
    SET primary_auth_method = CASE 
      WHEN auth_phone IS NOT NULL THEN 'mobile'
      WHEN auth_email IS NOT NULL THEN 'email'
      ELSE NULL
    END
    WHERE id = user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Example: Sync a specific user
-- SELECT public.sync_user_from_auth('user-uuid-here');

-- =============================================================================
-- NOTES:
-- =============================================================================
-- 1. You CANNOT directly update auth.users via SQL - Supabase Auth service
--    manages this table and will reject direct updates.
--
-- 2. You MUST use Supabase Admin API (via createAdminClient) to update users:
--    - Use admin.auth.admin.updateUserById() to update email/phone
--    - The trigger will automatically sync to public.users
--
-- 3. After updating via Admin API, the trigger will fire and sync public.users
--
-- 4. If you need to manually sync after an Admin API update, use:
--    SELECT public.sync_user_from_auth('user-id');
--
-- =============================================================================
