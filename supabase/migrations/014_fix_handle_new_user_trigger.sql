-- =============================================================================
-- Migration 014: Fix "Database error creating new user"
-- =============================================================================
-- 1. Remove triggers that sync to public.users (app does that now).
-- 2. FIX (not drop) on_user_signup → assign_free_plan: set search_path so it doesn't fail.
--    (Security Advisor: "Function Search Path Mutable" was likely breaking signup.)
-- =============================================================================

-- Drop INSERT trigger and function (app creates public.users in callback + phone-login)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Drop UPDATE trigger and function
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
DROP FUNCTION IF EXISTS public.handle_auth_user_update() CASCADE;

-- Drop sync function and any trigger that uses it
DROP FUNCTION IF EXISTS public.handle_auth_user_sync() CASCADE;

-- Fix assign_free_plan: set search_path so the trigger on_user_signup doesn't fail
-- (Do NOT drop on_user_signup – it assigns free plan to new users.)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.proname = 'assign_free_plan') THEN
    EXECUTE 'ALTER FUNCTION public.assign_free_plan() SET search_path = public, pg_temp';
  END IF;
END $$;
