/**
 * Real Estate Asset Loan Upsert API
 *
 * Handles upsert (create or update) operations for real estate loans.
 * Creates loan if it doesn't exist, updates if it does.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { upsertRealEstateLoan } from '@/lib/real-estate/upsert-loan';

// ============================================================================
// POST: Upsert loan (create or update)
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    let assetId: string;
    if (params && typeof params === 'object' && 'then' in params) {
      const resolvedParams = await params;
      assetId = resolvedParams.id;
    } else if (params && typeof params === 'object' && 'id' in params) {
      assetId = params.id;
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid asset ID' },
        { status: 400 }
      );
    }

    const body = await request.json();

    const lenderName = body.lender_name?.trim();
    if (!lenderName || lenderName.length < 2) {
      return NextResponse.json(
        { success: false, error: 'Lender name is required (minimum 2 characters)' },
        { status: 400 }
      );
    }

    const loanAmount = body.loan_amount != null ? parseFloat(body.loan_amount) : null;
    if (loanAmount == null || isNaN(loanAmount) || loanAmount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Loan amount must be greater than 0' },
        { status: 400 }
      );
    }

    const parseNum = (v: unknown): number | null => {
      if (v == null || v === '') return null;
      const n = parseFloat(String(v));
      return isNaN(n) ? null : n;
    };

    const loanData = {
      lender_name: lenderName,
      loan_amount: loanAmount,
      interest_rate: parseNum(body.interest_rate) ?? undefined,
      emi: parseNum(body.emi) ?? undefined,
      tenure_months: parseNum(body.tenure_months) ?? undefined,
      outstanding_balance: parseNum(body.outstanding_balance) ?? undefined,
    };

    const loan = await upsertRealEstateLoan(supabase, assetId, user.id, loanData);

    return NextResponse.json({
      success: true,
      data: loan,
    });
  } catch (error) {
    console.error('[Real Estate API] Error upserting loan:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to upsert loan',
      },
      { status: 500 }
    );
  }
}
