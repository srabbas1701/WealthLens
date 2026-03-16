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

    // Track which email to return as credentials
    // - Phone-only users: internalEmail (phoneDigits@lensonwealth.app)
    // - Email-signup users found via public.users: their real email
    let returnEmail = internalEmail;

    /**
     * 2b️⃣ If not found by internal email, check public.users by phone_number.
     *     This handles email-signup users who added an optional phone number.
     *     Phone in public.users may be stored in different formats (+91..., 91..., 10-digit),
     *     so match on the last 10 digits to be format-agnostic.
     */
    if (!user) {
      const last10Digits = phoneDigits.slice(-10);
      const { data: publicUserByPhone } = await supabaseAdmin
        .from('users')
        .select('id')
        .like('phone_number', `%${last10Digits}`)
        .maybeSingle();

      if (publicUserByPhone?.id) {
        const { data: existingAuthData } = await supabaseAdmin.auth.admin.getUserById(publicUserByPhone.id);
        if (existingAuthData?.user) {
          user = existingAuthData.user;
          // Use their real auth email so signInWithPassword works with their account
          returnEmail = existingAuthData.user.email || internalEmail;
          console.log('[phone-login] Found existing email-signup user via public.users phone lookup');
        }
      }
    }

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
      returnEmail = internalEmail;
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
     * 5b️⃣ If optional email was provided, update auth.users.email so the user
     *     can later log in via email magic link.
     *     Without this, auth.users.email stays as the internal email and
     *     magic link login would fail for this user.
     *     Only runs when optionalEmail is present (signup path, not login path).
     */
    if (optionalEmail && optionalEmail.includes('@')) {
      const { error: authEmailError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
        email: optionalEmail,
        email_confirm: true,
      });
      if (authEmailError) {
        console.warn('[phone-login] Could not update auth.users email:', authEmailError.message);
        // Non-fatal: public.users has the email; phone login still works
      } else {
        console.log('[phone-login] Updated auth.users.email to real email for phone-signup user');
        // Must use real email for signInWithPassword since auth.users.email is now updated
        returnEmail = optionalEmail;
      }
    }

    /**
     * 6️⃣ Return credentials for frontend login
     */
    return NextResponse.json({
      success: true,
      credentials: {
        email: returnEmail,
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
