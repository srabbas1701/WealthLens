/**
 * Check Duplicate User API
 *
 * Used during signup to prevent duplicate registrations.
 * Checks BOTH auth.users and public.users tables.
 *
 * FLOW:
 * - Email: Check auth.users (getUserByEmail) and public.users (email)
 * - Phone: Check auth.users (listUsers filter) and public.users (phone_number)
 *
 * Returns { exists: boolean } - true if user already exists
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

function normalizePhone(p: string): string {
  return p.replace(/\D/g, '');
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, value } = body;

    if (!type || !value) {
      return NextResponse.json(
        { error: 'type and value are required' },
        { status: 400 }
      );
    }

    if (type !== 'email' && type !== 'phone') {
      return NextResponse.json(
        { error: 'type must be "email" or "phone"' },
        { status: 400 }
      );
    }

    const supabaseAdmin = createAdminClient();

    if (type === 'email') {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value.trim())) {
        return NextResponse.json(
          { error: 'Invalid email format' },
          { status: 400 }
        );
      }

      const email = value.trim().toLowerCase();

      // 1. Check auth.users via listUsers (Supabase Admin API - no getUserByEmail)
      const { data: usersData } = await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });

      const foundInAuth = usersData?.users?.some(
        (u) => u.email?.toLowerCase() === email
      );
      if (foundInAuth) {
        return NextResponse.json({ exists: true });
      }

      // 2. Check public.users table (email column)
      const { data: profileByEmail } = await supabaseAdmin
        .from('users')
        .select('id')
        .ilike('email', email)
        .limit(1)
        .maybeSingle();

      if (profileByEmail) {
        return NextResponse.json({ exists: true });
      }

      return NextResponse.json({ exists: false });
    }

    // type === 'phone'
    const phone = value.trim();
    const phoneDigits = normalizePhone(phone);

    if (phoneDigits.length < 10) {
      return NextResponse.json(
        { error: 'Invalid phone number' },
        { status: 400 }
      );
    }

    // 1. Check public.users (phone_number)
    const { data: profilesWithPhone } = await supabaseAdmin
      .from('users')
      .select('id, phone_number')
      .not('phone_number', 'is', null);

    const matchingProfile = (profilesWithPhone || []).find((p: { phone_number?: string }) => {
      if (!p.phone_number) return false;
      return normalizePhone(p.phone_number) === phoneDigits;
    });

    if (matchingProfile) {
      return NextResponse.json({ exists: true });
    }

    // 2. Check auth.users (phone)
    const { data: usersData } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    const authUserWithPhone = usersData?.users?.find((u) => {
      if (!u.phone) return false;
      return normalizePhone(u.phone) === phoneDigits;
    });

    if (authUserWithPhone) {
      return NextResponse.json({ exists: true });
    }

    return NextResponse.json({ exists: false });
  } catch (error) {
    console.error('[check-duplicate] Error:', error);
    return NextResponse.json(
      { error: 'Failed to check duplicate' },
      { status: 500 }
    );
  }
}
