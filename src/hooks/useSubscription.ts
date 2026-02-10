/**
 * Subscription Status Hook
 *
 * For feature gates and buttons: use hasCapability(capabilityKey) from useCapabilities() instead.
 * Never check plan === premium; use the shared hasCapability helper everywhere.
 *
 * This hook provides isPremium / plan for backward compatibility (e.g. display only).
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import type { UserPlan } from '@/types/plans';
import { CAPABILITY_KEYS } from '@/types/capabilities';

export function useSubscription() {
  const { user } = useAuth();
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userPlan, setUserPlan] = useState<UserPlan | null>(null);
  const [usage, setUsage] = useState({
    analystQueries: 0,
    insightsViewed: 0,
    analyticsViews: 0,
  });

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      setIsPremium(false);
      setUserPlan(null);
      return;
    }

    const fetchSubscription = async () => {
      try {
        setLoading(true);
        
        // Fetch plan and entitlements (single source of truth for capabilities)
        const [planResponse, entitlementsResponse] = await Promise.all([
          fetch('/api/plans/user'),
          fetch('/api/entitlements'),
        ]);

        // Handle plan data
        let planData = null;
        if (planResponse.ok) {
          planData = await planResponse.json();
          if (planData.plan) {
            setUserPlan({
              user_id: user.id,
              plan_id: planData.plan_id || planData.plan.id,
              plan: planData.plan,
            });
          }
        }

        // Premium status from entitlements API only (no client-side inference)
        if (entitlementsResponse.ok) {
          const entitlements = await entitlementsResponse.json();
          const hasPremiumCapability = [
            CAPABILITY_KEYS.ADVANCED_ANALYTICS,
            CAPABILITY_KEYS.UNLIMITED_ANALYST,
            CAPABILITY_KEYS.ADVANCED_INSIGHTS,
            CAPABILITY_KEYS.PDF_REPORTS,
            CAPABILITY_KEYS.PORTFOLIO_HEALTH_SCORE,
          ].some((key) => entitlements[key] === true);
          setIsPremium(hasPremiumCapability);
        } else {
          setIsPremium(false);
        }

        // Usage tracking would come from a separate endpoint if needed
        setUsage({
          analystQueries: 0,
          insightsViewed: 0,
          analyticsViews: 0,
        });
      } catch (error) {
        console.error('Failed to fetch subscription status:', error);
        setIsPremium(false);
        setUserPlan(null);
      } finally {
        setLoading(false);
      }
    };

    fetchSubscription();
  }, [user?.id]);

  return {
    isPremium,
    loading,
    usage,
    plan: userPlan?.plan || null,
  };
}









