/**
 * Plans Hook – pricing page. Fetches from GET /api/plans (read-only, service role).
 * Response shape: { plans: { id, name, monthly_price, annual_price }[] }
 */

import { useState, useEffect } from 'react';

export interface PricingPlan {
  id: string;
  name: string;
  monthly_price: number | null;
  annual_price: number | null;
}

export function usePlans() {
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch('/api/plans');
        if (!response.ok) throw new Error(`Failed to fetch plans: ${response.statusText}`);
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

  return { plans, loading, error };
}
