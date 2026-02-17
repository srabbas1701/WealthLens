-- Migration: Ensure Pro plan has pdf_reports and excel_exports
--
-- Pricing model (PricingSection.tsx):
--   Pro: PDF & Excel exports (among other Pro features)
--   Premium: Everything in Pro + AI
--
-- Without this, Pro users would incorrectly see locked state for downloads
-- because pdf_reports was only assigned to Premium in plan_capabilities.
--
-- Idempotent: safe to run multiple times (uses INSERT ... ON CONFLICT DO NOTHING).

-- Add pdf_reports and excel_exports to Pro plan (if Pro plan exists)
INSERT INTO public.plan_capabilities (plan_id, capability_id)
SELECT 
  (SELECT id FROM public.plans WHERE name = 'pro' AND is_active = true LIMIT 1),
  c.id
FROM public.capabilities c
WHERE c.key IN ('pdf_reports', 'excel_exports')
  AND c.is_active = true
  AND EXISTS (SELECT 1 FROM public.plans WHERE name = 'pro' AND is_active = true)
ON CONFLICT (plan_id, capability_id) DO NOTHING;
