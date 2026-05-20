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
import { useCapabilities } from '@/hooks/useCapabilities';
import type { UserPlan } from '@/types/plans';
import { FEATURE_ACCESS } from '@/config/feature-access';

export function useSubscription() {
  const { user } = useAuth();
  const { hasCapability, loading: capabilitiesLoading } = useCapabilities();
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
        
        // Fetch plan only. Capabilities come from useCapabilities().
        const planResponse = await fetch('/api/plans/user');

        // Handle plan data
        if (planResponse.ok) {
          const planData = await planResponse.json();
          if (planData.plan) {
            setUserPlan({
              user_id: user.id,
              plan_id: planData.plan_id || planData.plan.id,
              plan: planData.plan,
            });
          }
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

  useEffect(() => {
    if (!user?.id) {
      setIsPremium(false);
      return;
    }
    if (capabilitiesLoading) return;

    const hasPremiumCapability = [
      FEATURE_ACCESS.ANALYTICS_HEALTH.capability,
      FEATURE_ACCESS.DOWNLOAD.capability,
      FEATURE_ACCESS.AI_HELP.capability,
    ].some((key) => hasCapability(key));

    setIsPremium(hasPremiumCapability);
  }, [user?.id, capabilitiesLoading, hasCapability]);

  return {
    isPremium,
    loading: loading || capabilitiesLoading,
    usage,
    plan: userPlan?.plan || null,
  };
}









