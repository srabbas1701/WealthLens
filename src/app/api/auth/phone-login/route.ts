/**
 * ============================================================
 *  PHONE LOGIN / SIGNUP API ROUTE (STABLE VERSION)
 * ============================================================
 *
 *  Architecture:
 *  - MSG91 verifies OTP (frontend)
 *  - Backend bridges to Supabase
 *  - Internal email = digits only
 *  - listUsers() used to find existing users
 *  - Password rotated on every login
 *
 *  ONLY CHANGE FROM ORIGINAL:
 *  - Phone is now always stored in E.164 format (+91...)
 *
 * ============================================================
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * Normalize phone number to E.164 format
 */
function normalizePhone(phone: string): string {
  phone = phone.trim();

  if (phone.startsWith('+')) return phone;
  if (phone.startsWith('91')) return `+${phone}`;
  return `+91${phone}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.phone) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      );
    }

    const rawPhone = body.phone.trim();

    // 🔑 Internal email ALWAYS derived from digits only
    const phoneDigits = rawPhone.replace(/\D/g, '');
    const internalEmail = `${phoneDigits}@lensonwealth.app`;

    // 📱 Phone stored in E.164 format
    const normalizedPhone = normalizePhone(rawPhone);

    const tempPassword = `${phoneDigits}-${Date.now()}`;
    const supabaseAdmin = createAdminClient();

    /**
     * 1️⃣ Fetch all users (original working logic)
     */
    const { data: usersData, error: listError } =
      await supabaseAdmin.auth.admin.listUsers();

    if (listError) {
      throw listError;
    }

    /**
     * 2️⃣ Find existing user by internal email
     */
    let user = usersData?.users?.find(
      (u) => u.email === internalEmail
    );

    /**
     * 3️⃣ Create user if not exists (SIGNUP)
     */
    if (!user) {
      const { data: newUserData, error: createError } =
        await supabaseAdmin.auth.admin.createUser({
          email: internalEmail,
          email_confirm: true,
          password: tempPassword,
        });

      if (createError) {
        throw createError;
      }

      user = newUserData.user;
    }

    /**
     * 4️⃣ Attach / normalize phone
     *    (This is the ONLY improvement added)
     */
    await supabaseAdmin.auth.admin.updateUserById(user.id, {
      phone: normalizedPhone,
      phone_confirm: true,
      password: tempPassword, // rotate password every login
    });

    /**
     * 5️⃣ Sync public.users table
     * Uses only columns that exist in schema (no phone_verified_at, primary_auth_method)
     */
    const fullName = typeof body.fullName === 'string' ? body.fullName.trim() : null;
    const optionalEmail = typeof body.optionalEmail === 'string' ? body.optionalEmail.trim() : null;

    const upsertPayload: Record<string, unknown> = {
      id: user.id,
      phone_number: normalizedPhone,
      updated_at: new Date().toISOString(),
    };
    if (fullName) upsertPayload.full_name = fullName;
    if (optionalEmail && optionalEmail.includes('@')) upsertPayload.email = optionalEmail;

    const { error: upsertError } = await supabaseAdmin.from('users').upsert(upsertPayload);
    if (upsertError) {
      console.warn('[phone-login] public.users upsert failed:', upsertError.message);
    }

    /**
     * 6️⃣ Return credentials for frontend login
     */
    return NextResponse.json({
      success: true,
      credentials: {
        email: internalEmail,
        password: tempPassword,
      },
    });

  } catch (err: any) {
    console.error('🔥 PHONE LOGIN ERROR:', err);

    return NextResponse.json(
      {
        error: 'Internal server error',
        details: err?.message ?? null,
      },
      { status: 500 }
    );
  }
}
