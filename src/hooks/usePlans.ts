/**
 * Plans Hook – pricing page + current subscription status.
 * Fetches plans from GET /api/plans and current subscription 
 * from GET /api/plans/user (for logged-in users).
 */

import { useState, useEffect } from 'react';

export interface PricingPlan {
  id: string;
  name: string;
  monthly_price: number | null;
  annual_price: number | null;
  razorpay_plan_id?: string | null;
}

export interface CurrentSubscription {
  tier: 'free' | 'pro' | 'premium';
  billingCycle: 'monthly' | 'yearly' | 'annual' | null;
  currentPeriodEnd: string | null; // ISO date string
  status: 'active' | 'pending' | 'cancelled' | 'inactive';
}

export function usePlans(fetchCurrentSub = false) {
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentSubscription, setCurrentSubscription] = 
    useState<CurrentSubscription | null>(null);
  const [subLoading, setSubLoading] = useState(false);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch('/api/plans');
        if (!response.ok) 
          throw new Error(`Failed to fetch plans: ${response.statusText}`);
        const data = await response.json();
        setPlans(data.plans || []);
      } catch (err) {
        console.error('Failed to fetch plans:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch plans');
        setPlans([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, []);

  useEffect(() => {
    if (!fetchCurrentSub) return;

    const fetchSub = async () => {
      try {
        setSubLoading(true);
        const res = await fetch('/api/plans/user');
        if (!res.ok) return;
        const data = await res.json();
        
        const tier = data?.plan_id ?? data?.tier ?? 'free';
        if (tier && tier !== 'free') {
          setCurrentSubscription({
            tier: tier as CurrentSubscription['tier'],
            billingCycle: data?.billing_cycle ?? null,
            currentPeriodEnd: data?.current_period_end ?? null,
            status: data?.status ?? 'active',
          });
        } else {
          setCurrentSubscription(null);
        }
      } catch {
        setCurrentSubscription(null);
      } finally {
        setSubLoading(false);
      }
    };

    fetchSub();
  }, [fetchCurrentSub]);

  return { plans, loading, error, currentSubscription, subLoading };
}
