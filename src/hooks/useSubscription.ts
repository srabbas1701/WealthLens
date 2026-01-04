/**
 * Subscription Status Hook
 * 
 * Checks user's subscription tier.
 * Mock implementation for now - replace with actual API call.
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';

export function useSubscription() {
  const { user } = useAuth();
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);
  const [usage, setUsage] = useState({
    analystQueries: 0,
    insightsViewed: 0,
    analyticsViews: 0,
  });

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    const fetchSubscription = async () => {
      try {
        // TODO: Replace with actual API call
        // const response = await fetch(`/api/subscription/status?user_id=${user.id}`);
        // const data = await response.json();
        // setIsPremium(data.tier === 'premium');
        // setUsage(data.usage || { analystQueries: 0, insightsViewed: 0, analyticsViews: 0 });

        // Mock for now - always free tier
        setIsPremium(false);
        setUsage({
          analystQueries: 0, // Will be tracked separately
          insightsViewed: 0,
          analyticsViews: 0,
        });
      } catch (error) {
        console.error('Failed to fetch subscription status:', error);
        setIsPremium(false);
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
  };
}








