/**
 * Liabilities API
 *
 * CRUD for user liabilities stored in the `liabilities` table.
 * Type-specific fields (creditLimit, vehicleType, etc.) are stored
 * as JSON in the `notes` column. Core fields map to dedicated columns.
 *
 * DB column ↔ Liability interface mapping:
 *   liability_type        ↔ type
 *   lender_name           ↔ lender
 *   outstanding_amount    ↔ outstanding
 *   emi_amount            ↔ emi
 *   interest_rate         ↔ interestRate
 *   tenure_remaining_months ↔ tenureMonths
 *   is_secured            ↔ secured
 *   tax_benefit_eligible  ↔ taxBenefit
 *   prepayment_priority   ↔ prepayment
 *   notes (JSON)          ↔ originalLoanAmount, loanStartDate, vehicleType,
 *                            vehicleNumber, creditLimit, billingCycleDate,
 *                            minimumDue, purpose, institutionName, courseName,
 *                            moratoriumMonths, description
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import type { Liability } from '@/lib/liabilities-store';

// ============================================================================
// HELPERS
// ============================================================================

function parseNotes(raw: string | null): Record<string, any> {
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

function rowToLiability(row: any): Liability {
  const n = parseNotes(row.notes);
  return {
    id: row.id,
    type: row.liability_type,
    lender: row.lender_name,
    outstanding: Number(row.outstanding_amount),
    emi: row.emi_amount != null ? Number(row.emi_amount) : null,
    interestRate: row.interest_rate != null ? Number(row.interest_rate) : null,
    tenureMonths: row.tenure_remaining_months ?? n.tenureMonths ?? null,
    secured: row.is_secured ?? false,
    taxBenefit: row.tax_benefit_eligible ?? false,
    prepayment: row.prepayment_priority ?? false,
    createdAt: row.created_at,
    // Type-specific (from notes JSON)
    originalLoanAmount: n.originalLoanAmount ?? null,
    loanStartDate: n.loanStartDate ?? null,
    vehicleType: n.vehicleType ?? null,
    vehicleNumber: n.vehicleNumber ?? null,
    creditLimit: n.creditLimit ?? null,
    billingCycleDate: n.billingCycleDate ?? null,
    minimumDue: n.minimumDue ?? null,
    purpose: n.purpose ?? null,
    institutionName: n.institutionName ?? null,
    courseName: n.courseName ?? null,
    moratoriumMonths: n.moratoriumMonths ?? null,
    description: n.description ?? null,
  };
}

function buildNotes(liability: Partial<Liability>): string {
  return JSON.stringify({
    originalLoanAmount: liability.originalLoanAmount ?? null,
    loanStartDate: liability.loanStartDate ?? null,
    vehicleType: liability.vehicleType ?? null,
    vehicleNumber: liability.vehicleNumber ?? null,
    creditLimit: liability.creditLimit ?? null,
    billingCycleDate: liability.billingCycleDate ?? null,
    minimumDue: liability.minimumDue ?? null,
    purpose: liability.purpose ?? null,
    institutionName: liability.institutionName ?? null,
    courseName: liability.courseName ?? null,
    moratoriumMonths: liability.moratoriumMonths ?? null,
    description: liability.description ?? null,
  });
}

// ============================================================================
// GET — fetch all active liabilities for a user
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');

    if (!userId) {
      return NextResponse.json({ success: false, error: 'Missing user_id' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('liabilities')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: (data ?? []).map(rowToLiability) });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// ============================================================================
// POST — create a new liability
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_id, ...liability } = body;

    if (!user_id) {
      return NextResponse.json({ success: false, error: 'Missing user_id' }, { status: 400 });
    }
    if (!liability.lender || liability.lender.trim().length < 2) {
      return NextResponse.json({ success: false, error: 'Lender name is required' }, { status: 400 });
    }
    if (liability.outstanding == null || Number(liability.outstanding) < 0) {
      return NextResponse.json({ success: false, error: 'Outstanding amount must be 0 or greater' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('liabilities')
      .insert({
        user_id,
        liability_type: liability.type,
        lender_name: liability.lender.trim(),
        outstanding_amount: liability.outstanding,
        emi_amount: liability.emi ?? null,
        interest_rate: liability.interestRate ?? null,
        tenure_remaining_months: liability.tenureMonths ?? null,
        is_secured: liability.secured ?? false,
        tax_benefit_eligible: liability.taxBenefit ?? false,
        prepayment_priority: liability.prepayment ?? false,
        is_active: true,
        notes: buildNotes(liability),
      })
      .select('id, created_at')
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: data.id, createdAt: data.created_at });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// ============================================================================
// PUT — update an existing liability
// ============================================================================

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_id, id, ...liability } = body;

    if (!user_id || !id) {
      return NextResponse.json({ success: false, error: 'Missing user_id or id' }, { status: 400 });
    }
    if (!liability.lender || liability.lender.trim().length < 2) {
      return NextResponse.json({ success: false, error: 'Lender name is required' }, { status: 400 });
    }
    if (liability.outstanding == null || Number(liability.outstanding) < 0) {
      return NextResponse.json({ success: false, error: 'Outstanding amount must be 0 or greater' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Verify ownership
    const { data: existing } = await supabase
      .from('liabilities')
      .select('id')
      .eq('id', id)
      .eq('user_id', user_id)
      .single();

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Liability not found' }, { status: 404 });
    }

    const { error } = await supabase
      .from('liabilities')
      .update({
        liability_type: liability.type,
        lender_name: liability.lender.trim(),
        outstanding_amount: liability.outstanding,
        emi_amount: liability.emi ?? null,
        interest_rate: liability.interestRate ?? null,
        tenure_remaining_months: liability.tenureMonths ?? null,
        is_secured: liability.secured ?? false,
        tax_benefit_eligible: liability.taxBenefit ?? false,
        prepayment_priority: liability.prepayment ?? false,
        notes: buildNotes(liability),
      })
      .eq('id', id);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// ============================================================================
// DELETE — soft-delete a liability (is_active = false)
// ============================================================================

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const id = searchParams.get('id');

    if (!userId || !id) {
      return NextResponse.json({ success: false, error: 'Missing user_id or id' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Verify ownership
    const { data: existing } = await supabase
      .from('liabilities')
      .select('id')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Liability not found' }, { status: 404 });
    }

    const { error } = await supabase
      .from('liabilities')
      .update({ is_active: false })
      .eq('id', id);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
