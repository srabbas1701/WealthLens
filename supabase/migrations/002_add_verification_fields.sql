-- =============================================================================
-- Migration: Add verification fields for progressive authentication
-- =============================================================================
-- 
-- This migration adds fields to support:
-- 1. Secondary contact verification (email/phone)
-- 2. Auth method tracking for progressive data collection
-- 
-- DESIGN PHILOSOPHY:
-- - Verification is NON-BLOCKING - users can access dashboard without verifying
-- - Progressive data collection - ask for missing contact during onboarding
-- - Track primary auth method to know what to ask for
-- =============================================================================

-- Add verification timestamp fields
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS email_verified_at timestamptz DEFAULT NULL;

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS phone_verified_at timestamptz DEFAULT NULL;

-- Add primary auth method tracking
-- 'mobile' = user signed up via phone OTP
-- 'email' = user signed up via email magic link
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS primary_auth_method text 
CHECK (primary_auth_method IN ('mobile', 'email')) DEFAULT NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.users.email_verified_at IS 'Timestamp when secondary email was verified (NULL if not verified or primary auth method)';
COMMENT ON COLUMN public.users.phone_verified_at IS 'Timestamp when secondary phone was verified (NULL if not verified or primary auth method)';
COMMENT ON COLUMN public.users.primary_auth_method IS 'How user originally authenticated: mobile (OTP) or email (magic link)';

-- =============================================================================
-- Update the handle_new_user trigger to track auth method
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (
    id, 
    email, 
    phone_number, 
    full_name,
    primary_auth_method,
    -- If user has email from auth, mark it as verified via auth
    email_verified_at,
    -- If user has phone from auth, mark it as verified via auth
    phone_verified_at
  )
  VALUES (
    new.id, 
    new.email,  -- Will be null for phone-only users
    new.phone,  -- Will be null for email-only users
    new.raw_user_meta_data->>'full_name',
    -- Determine primary auth method
    CASE 
      WHEN new.phone IS NOT NULL THEN 'mobile'
      WHEN new.email IS NOT NULL THEN 'email'
      ELSE NULL
    END,
    -- Email verified at (from auth, not secondary verification)
    CASE WHEN new.email IS NOT NULL THEN now() ELSE NULL END,
    -- Phone verified at (from auth, not secondary verification)
    CASE WHEN new.phone IS NOT NULL THEN now() ELSE NULL END
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- DONE
-- =============================================================================














