/**
 * GET /api/plans – Pricing page plans (read-only).
 * Uses Supabase SERVICE ROLE client.
 */

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export interface PricingPlanResponse {
  id: string;
  name: string;
  monthly_price: number;
  annual_price: number;
}

export async function GET() {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('plans')
      .select('id, name, monthly_price, annual_price')
      .order('monthly_price', { ascending: true });

    if (error) {
      console.error('[Plans API] Error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch plans', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ plans: data ?? [] });
  } catch (err) {
    console.error('[Plans API] Unexpected error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
