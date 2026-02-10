import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { ensureUserSubscription } from '@/lib/ensure-user-subscription';

function normalizePhone(phone: string) {
  phone = phone.trim();
  if (phone.startsWith('+')) return phone;
  if (phone.startsWith('91')) return `+${phone}`;
  return `+91${phone}`;
}

export async function POST(req: NextRequest) {
  try {
    const { phone } = await req.json();
    if (!phone) {
      return NextResponse.json({ error: 'Phone required' }, { status: 400 });
    }

    const normalizedPhone = normalizePhone(phone);
    const phoneDigits = normalizedPhone.replace(/\D/g, '');
    const internalEmail = `${phoneDigits}@lensonwealth.app`;
    const tempPassword = `${crypto.randomUUID()}`;

    const supabase = createAdminClient();

    let userId: string;
    let isNewUser = false;

    /**
     * 1️⃣ Create user by EMAIL (most stable Supabase path)
     */
    const { data: created, error: createError } =
      await supabase.auth.admin.createUser({
        email: internalEmail,
        email_confirm: true,
        password: tempPassword,
      });

    if (createError) {
      if (
        createError.message?.toLowerCase().includes('already') ||
        createError.code === 'user_already_exists'
      ) {
        // Fetch existing user by email (SAFE)
        const { data: existing } =
          await supabase.auth.admin.getUserByEmail(internalEmail);

        if (!existing?.user) {
          throw new Error('User exists but could not be retrieved');
        }

        userId = existing.user.id;
      } else {
        throw createError;
      }
    } else {
      userId = created.user.id;
      isNewUser = true;
    }

    /**
     * 2️⃣ Attach phone (non-fatal UPDATE)
     */
    await supabase.auth.admin.updateUserById(userId, {
      phone: normalizedPhone,
      phone_confirm: true,
    });

    /**
     * 3️⃣ Sync public.users (admin client bypasses RLS)
     */
    await supabase.from('users').upsert({
      id: userId,
      phone_number: normalizedPhone,
      primary_auth_method: 'mobile',
      phone_verified_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...(isNewUser ? { created_at: new Date().toISOString() } : {}),
    });

    try {
      await ensureUserSubscription(userId);
    } catch (e) {
      console.warn('[Phone Login] Subscription ensure skipped (non-fatal):', e);
    }

    /**
     * 4️⃣ Rotate password for existing users
     */
    if (!isNewUser) {
      await supabase.auth.admin.updateUserById(userId, {
        password: tempPassword,
      });
    }

    /**
     * 5️⃣ Return credentials for frontend signInWithPassword
     */
    return NextResponse.json({
      success: true,
      credentials: {
        email: internalEmail,
        password: tempPassword,
      },
    });
  } catch (err: any) {
    console.error('🔥 PHONE LOGIN FATAL ERROR ↓↓↓');
    console.error(err);
    console.error(JSON.stringify(err, null, 2));
  
    return NextResponse.json(
      { error: 'Internal server error', details: err?.message },
      { status: 500 }
    );
  }
  
}
