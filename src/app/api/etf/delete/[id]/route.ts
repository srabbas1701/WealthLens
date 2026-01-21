/**
 * API Route: Delete ETF Holding
 * 
 * DELETE /api/etf/delete/[id]
 * 
 * Deletes an ETF holding for the authenticated user
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { searchParams } = new URL(request.url);
    const user_id = searchParams.get('user_id');

    if (!user_id) {
      return NextResponse.json(
        { error: 'Missing user_id query parameter' },
        { status: 400 }
      );
    }

    const { id: holdingId } = await params;

    if (!holdingId) {
      return NextResponse.json(
        { error: 'Missing holding ID' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // First, verify the holding exists and belongs to the user
    const { data: existingHolding, error: fetchError } = await supabase
      .from('holdings')
      .select(`
        id,
        portfolios!inner (
          user_id
        )
      `)
      .eq('id', holdingId)
      .eq('portfolios.user_id', user_id)
      .single();

    if (fetchError || !existingHolding) {
      return NextResponse.json(
        { error: 'Holding not found or unauthorized' },
        { status: 404 }
      );
    }

    // Hard delete
    const { error: deleteError } = await supabase
      .from('holdings')
      .delete()
      .eq('id', holdingId);

    if (deleteError) {
      console.error('[ETF Delete API] Error deleting holding:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete holding' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'ETF holding deleted successfully' },
      { status: 200 }
    );

  } catch (error: any) {
    console.error('[ETF Delete API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
