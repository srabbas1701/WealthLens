-- Migration: Allow authenticated users to read plan reference tables
--
-- Root cause: plan_capabilities and capabilities are reference/config tables.
-- entitlements.ts uses the regular auth client (subject to RLS) to read them.
-- Without a SELECT policy, authenticated users can't read these tables,
-- so getUserEntitlements() silently returns all capabilities as false.
--
-- Fix: Add SELECT policies for authenticated users on both reference tables.

-- Allow any authenticated user to read capabilities (public reference data)
DROP POLICY IF EXISTS "authenticated_read_capabilities" ON public.capabilities;
CREATE POLICY "authenticated_read_capabilities"
  ON public.capabilities
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow any authenticated user to read plan_capabilities (public reference data)
DROP POLICY IF EXISTS "authenticated_read_plan_capabilities" ON public.plan_capabilities;
CREATE POLICY "authenticated_read_plan_capabilities"
  ON public.plan_capabilities
  FOR SELECT
  TO authenticated
  USING (true);
