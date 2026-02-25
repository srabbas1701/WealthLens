import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/dev/reset-ai-usage
 *
 * DEV-ONLY: Resets the current month's analyst_queries counter to 0
 * so the authenticated user can test the full 15-query trial again.
 *
 * DO NOT deploy this to production.
 */
export async function POST() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Dev only' }, { status: 403 });
  }

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const month = monthStart.toISOString().slice(0, 10);

  const { data: existing } = await supabase
    .from('subscription_usage')
    .select('analyst_queries')
    .eq('user_id', user.id)
    .eq('month', month)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('subscription_usage')
      .update({ analyst_queries: 0 })
      .eq('user_id', user.id)
      .eq('month', month);

    if (error) {
      return NextResponse.json({ error: 'Update failed', details: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({
    message: 'AI usage reset successfully',
    user_id: user.id,
    month,
    analyst_queries: 0,
    previous_queries: existing?.analyst_queries ?? 0,
  });
}
