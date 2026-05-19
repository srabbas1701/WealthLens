-- Migration 026: Set Razorpay plan IDs in plans table
--
-- Migration 017 used WHERE name = 'pro' / 'premium' but the actual name
-- column has capitalised values ('Pro', 'Premium'), so those UPDATEs
-- matched zero rows — all razorpay_plan_id columns are still NULL.
--
-- This migration uses WHERE id = 'pro' / 'premium' (id is lowercase text PK)
-- which matches correctly.
--
-- Plan IDs are taken from Vercel → Project Settings → Environment Variables.

UPDATE public.plans SET
  razorpay_plan_id          = 'plan_SJDa3bvAFiwDPx',
  razorpay_plan_id_monthly  = 'plan_SJDa3bvAFiwDPx',
  razorpay_plan_id_yearly   = 'plan_SJDcAnyS5AV9Bs'
WHERE id = 'pro';

UPDATE public.plans SET
  razorpay_plan_id          = 'plan_SM1BCwYGm1mQqw',
  razorpay_plan_id_monthly  = 'plan_SM1BCwYGm1mQqw',
  razorpay_plan_id_yearly   = 'plan_SM1BcXN663t9j0'
WHERE id = 'premium';
