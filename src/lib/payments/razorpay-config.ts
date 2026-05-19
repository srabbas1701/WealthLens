/**
 * Razorpay configuration helper.
 *
 * Call validateRazorpayConfig() in any payment route that needs all four plan
 * env vars. Missing vars are detected immediately with a descriptive error
 * instead of silently returning 400 "Plan not found" to the customer.
 */

export type RazorpayPlanConfig = {
  proMonthly: string;
  proYearly: string;
  premiumMonthly: string;
  premiumYearly: string;
};

export function validateRazorpayConfig(): RazorpayPlanConfig {
  const required = {
    proMonthly:     'RAZORPAY_PRO_MONTHLY_PLAN',
    proYearly:      'RAZORPAY_PRO_ANNUAL_PLAN',
    premiumMonthly: 'RAZORPAY_PREMIUM_MONTHLY_PLAN',
    premiumYearly:  'RAZORPAY_PREMIUM_ANNUAL_PLAN',
  } as const;

  const missing: string[] = [];
  const result: Partial<RazorpayPlanConfig> = {};

  for (const [key, envVar] of Object.entries(required)) {
    const value = process.env[envVar];
    if (!value) {
      missing.push(envVar);
    } else {
      result[key as keyof RazorpayPlanConfig] = value;
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing Razorpay plan env vars: ${missing.join(', ')}. ` +
      'Add them to Vercel → Project Settings → Environment Variables ' +
      '(and to .env.local for local dev). ' +
      'Find the plan IDs in the Razorpay dashboard under Subscriptions → Plans.'
    );
  }

  return result as RazorpayPlanConfig;
}

export function getRazorpayPlanId(
  config: RazorpayPlanConfig,
  planId: 'pro' | 'premium',
  billingCycle: 'monthly' | 'yearly'
): string {
  if (planId === 'pro')     return billingCycle === 'yearly' ? config.proYearly     : config.proMonthly;
  if (planId === 'premium') return billingCycle === 'yearly' ? config.premiumYearly : config.premiumMonthly;
  throw new Error(`Unknown planId: ${planId}`);
}
