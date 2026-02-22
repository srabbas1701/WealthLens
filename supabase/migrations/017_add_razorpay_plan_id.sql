-- Add Razorpay plan IDs to plans for checkout flow
-- Monthly and yearly are separate Razorpay plans

ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS razorpay_plan_id TEXT,
  ADD COLUMN IF NOT EXISTS razorpay_plan_id_monthly TEXT,
  ADD COLUMN IF NOT EXISTS razorpay_plan_id_yearly TEXT;

-- Pro plans (monthly + yearly)
UPDATE public.plans SET
  razorpay_plan_id = 'plan_SJDa3bvAFiwDPx',
  razorpay_plan_id_monthly = 'plan_SJDa3bvAFiwDPx',
  razorpay_plan_id_yearly = 'plan_SJDcAnyS5AV9Bs'
WHERE name = 'pro';

-- Premium plans (monthly + yearly)
UPDATE public.plans SET
  razorpay_plan_id = 'plan_SJDdBgC3udfdNg',
  razorpay_plan_id_monthly = 'plan_SJDdBgC3udfdNg',
  razorpay_plan_id_yearly = 'plan_SJDf3vBO2UJptn'
WHERE name = 'premium';
