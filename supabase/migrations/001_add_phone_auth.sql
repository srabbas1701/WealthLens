-- =============================================================================
-- MIGRATION: Add Phone Authentication Support
-- =============================================================================
-- This migration adds phone_number column to users table and updates
-- the handle_new_user trigger to support both email and phone auth.
--
-- Run this migration if you have an existing database.
-- For new installations, this is already included in schema.sql.
-- =============================================================================

-- Add phone_number column to users table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'phone_number'
  ) THEN
    ALTER TABLE public.users ADD COLUMN phone_number text;
    COMMENT ON COLUMN public.users.phone_number IS 'Phone number with country code for OTP auth (e.g., +919876543210)';
  END IF;
END $$;

-- Update the handle_new_user trigger to support both email and phone auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, phone_number, full_name)
  VALUES (
    new.id, 
    new.email,  -- Will be null for phone-only users
    new.phone,  -- Will be null for email-only users
    new.raw_user_meta_data->>'full_name'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: The trigger on_auth_user_created should already exist
-- If it doesn't, uncomment the following:
-- 
-- DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- CREATE TRIGGER on_auth_user_created
--   AFTER INSERT ON auth.users
--   FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

