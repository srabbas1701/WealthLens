/**
 * Plan Types
 * 
 * Types for subscription plans stored in Supabase plans table
 */

export interface Plan {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  price_monthly: number | null;
  price_yearly: number | null;
  currency: string;
  features: string[] | null;
  is_active: boolean;
  display_order: number | null;
  created_at: string;
  updated_at: string;
}

export interface PlanWithSavings extends Plan {
  yearly_savings_percent?: number;
  yearly_monthly_equivalent?: number;
}

export interface UserPlan {
  user_id: string;
  plan_id: string;
  plan: Plan;
}
