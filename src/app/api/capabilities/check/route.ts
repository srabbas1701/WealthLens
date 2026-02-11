/**
 * Capability Check API – uses shared hasCapability(userId, capabilityKey).
 * GET /api/capabilities/check?key=manage_liabilities
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { hasCapability } from '@/lib/capabilities/server';

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

    const { searchParams } = new URL(request.url);
    const capabilityKey = searchParams.get('key');

    if (!capabilityKey) {
      return NextResponse.json(
        { error: 'Missing capability key', details: 'Please provide ?key=capability_key' },
        { status: 400 }
      );
    }

    const hasAccess = await hasCapability(user.id, capabilityKey, supabase);
    return NextResponse.json({ hasAccess });
  } catch (error) {
    console.error('[Capability Check API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
