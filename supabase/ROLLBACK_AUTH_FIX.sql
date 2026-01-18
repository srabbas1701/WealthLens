-- =============================================================================
-- ROLLBACK AUTH FIX: Remove the problematic update trigger
-- =============================================================================
-- This script removes the update trigger that's causing login failures.
-- Run this IMMEDIATELY to restore login functionality.
--
-- The update trigger was trying to update public.users rows that don't exist
-- yet during user creation, causing "Database error updating user" errors.
-- =============================================================================

-- Remove the problematic update trigger
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;

-- Drop the update function (optional, but cleaner)
DROP FUNCTION IF EXISTS public.handle_auth_user_update() CASCADE;

-- Verify the original insert trigger still exists
-- This should NOT be dropped - it's needed for user creation
-- DO NOT run this if you're not sure:
-- DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================

-- Check which triggers exist on auth.users
SELECT 
  trigger_name,
  event_manipulation,
  action_timing
FROM information_schema.triggers
WHERE event_object_table = 'users'
  AND event_object_schema = 'auth'
ORDER BY trigger_name;

-- Check if handle_new_user function exists (should exist)
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('handle_new_user', 'handle_auth_user_update')
ORDER BY routine_name;

-- =============================================================================
-- NOTES
-- =============================================================================
-- 1. This removes ONLY the UPDATE trigger that was causing issues
-- 2. The original INSERT trigger (on_auth_user_created) remains intact
-- 3. User creation should work after running this
-- 4. Login should work normally after this
