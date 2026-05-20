-- =============================================================================
-- Add manage_commodities capability and map to plans
-- Free: disabled | Pro/Premium: enabled
-- =============================================================================

BEGIN;

INSERT INTO public.capabilities (key, description)
VALUES ('manage_commodities', 'Access to Gold and Silver tracking')
ON CONFLICT (key)
DO UPDATE SET description = EXCLUDED.description;

ALTER TABLE public.plan_capabilities
ADD COLUMN IF NOT EXISTS enabled boolean NOT NULL DEFAULT true;

-- Update existing rows if present
UPDATE public.plan_capabilities
SET enabled = false
WHERE plan_id = 'free'
  AND capability_key = 'manage_commodities';

UPDATE public.plan_capabilities
SET enabled = true
WHERE plan_id IN ('pro', 'premium')
  AND capability_key = 'manage_commodities';

-- Insert missing rows
INSERT INTO public.plan_capabilities (plan_id, capability_key, enabled)
SELECT 'free', 'manage_commodities', false
WHERE NOT EXISTS (
  SELECT 1
  FROM public.plan_capabilities
  WHERE plan_id = 'free'
    AND capability_key = 'manage_commodities'
);

INSERT INTO public.plan_capabilities (plan_id, capability_key, enabled)
SELECT 'pro', 'manage_commodities', true
WHERE NOT EXISTS (
  SELECT 1
  FROM public.plan_capabilities
  WHERE plan_id = 'pro'
    AND capability_key = 'manage_commodities'
);

INSERT INTO public.plan_capabilities (plan_id, capability_key, enabled)
SELECT 'premium', 'manage_commodities', true
WHERE NOT EXISTS (
  SELECT 1
  FROM public.plan_capabilities
  WHERE plan_id = 'premium'
    AND capability_key = 'manage_commodities'
);

COMMIT;
