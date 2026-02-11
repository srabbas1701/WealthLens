/**
 * POST /api/start-premium-trial
 *
 * Start a 14-day Premium trial for the authenticated user.
 *
 * Rules:
 * - User must NOT have an active or expired trial (no existing user_trials row).
 * - User must meet engagement criteria: holdings count > MIN_HOLDINGS_FOR_TRIAL.
 * - Inserts user_trials (is_active=true, ends_at=now+14d).
 *
 * Returns updated entitlements (getUserEntitlements).
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserEntitlements } from '@/lib/entitlements';

const TRIAL_DAYS = 14;
const MIN_HOLDINGS_FOR_TRIAL = 1;

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', details: 'User not authenticated' },
        { status: 401 }
      );
    }

    const userId = user.id;
    const now = new Date();
    const endsAt = new Date(now);
    endsAt.setDate(endsAt.getDate() + TRIAL_DAYS);

    // 1. User must NOT have an active or expired trial (no existing row)
    const { data: existingTrial, error: trialCheckError } = await supabase
      .from('user_trials')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (trialCheckError) {
      console.error('[StartPremiumTrial] Trial check error:', trialCheckError);
      return NextResponse.json(
        { error: 'Failed to check trial eligibility', details: trialCheckError.message },
        { status: 500 }
      );
    }

    if (existingTrial) {
      return NextResponse.json(
        {
          error: 'Trial not available',
          details: 'You already have or had a trial. Only one trial per account.',
        },
        { status: 409 }
      );
    }

    // 2. Engagement: holdings count for user's primary portfolio must be > MIN
    const { data: portfolio } = await supabase
      .from('portfolios')
      .select('id')
      .eq('user_id', userId)
      .eq('is_primary', true)
      .limit(1)
      .maybeSingle();

    if (!portfolio) {
      return NextResponse.json(
        {
          error: 'Engagement criteria not met',
          details: 'No primary portfolio found. Add a portfolio with holdings to start a trial.',
        },
        { status: 403 }
      );
    }

    const { count: holdingsCount, error: countError } = await supabase
      .from('holdings')
      .select('id', { count: 'exact', head: true })
      .eq('portfolio_id', portfolio.id);

    if (countError) {
      console.error('[StartPremiumTrial] Holdings count error:', countError);
      return NextResponse.json(
        { error: 'Failed to check engagement', details: countError.message },
        { status: 500 }
      );
    }

    const count = holdingsCount ?? 0;
    if (count < MIN_HOLDINGS_FOR_TRIAL) {
      return NextResponse.json(
        {
          error: 'Engagement criteria not met',
          details: `Add at least ${MIN_HOLDINGS_FOR_TRIAL} holding(s) to your portfolio to start a trial.`,
        },
        { status: 403 }
      );
    }

    // 3. Insert user_trials: is_active=true, started_at=now(), ends_at=now+14d
    const { error: insertError } = await supabase.from('user_trials').insert({
      user_id: userId,
      is_active: true,
      started_at: now.toISOString(),
      ends_at: endsAt.toISOString(),
    });

    if (insertError) {
      console.error('[StartPremiumTrial] Insert error:', insertError);
      return NextResponse.json(
        { error: 'Failed to start trial', details: insertError.message },
        { status: 500 }
      );
    }

    // 4. Return updated entitlements
    const entitlements = await getUserEntitlements(userId, supabase);
    return NextResponse.json(entitlements);
  } catch (err) {
    console.error('[StartPremiumTrial] Error:', err);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
