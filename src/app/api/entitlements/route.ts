/**
 * GET /api/entitlements
 *
 * Returns getUserEntitlements(userId) – the ONLY source of truth.
 * Flat map: { view_holdings: true, use_ai_help: true, ai_remaining: 8, scenario_remaining: 2, ... }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserEntitlements } from '@/lib/entitlements';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', details: 'User not authenticated' },
        { status: 401 }
      );
    }

    const entitlements = await getUserEntitlements(user.id, supabase);
    return NextResponse.json(entitlements, {
      headers: {
        'Cache-Control': 'private, max-age=300, stale-while-revalidate=60',
      },
    });
  } catch (error) {
    console.error('[Entitlements API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
