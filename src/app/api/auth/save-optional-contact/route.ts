/**
 * Save Optional Contact API Route
 * 
 * Saves an optional phone number or email to the user's profile.
 * Used when:
 * - User signs up via email and provides an optional phone number
 * - User signs up via phone and provides an optional email (handled by phone-login route)
 * 
 * The contact info is NOT verified - just stored for future use.
 * This is part of the progressive data collection approach.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

type SaveContactPayload = {
  userId: string;
  fullName?: string;
  phoneNumber?: string;
  email?: string;
};

export async function POST(req: NextRequest) {
  try {
    const body: SaveContactPayload = await req.json();

    if (!body.userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    if (!body.fullName && !body.phoneNumber && !body.email) {
      return NextResponse.json(
        { error: 'At least one of fullName, phoneNumber, or email is required' },
        { status: 400 }
      );
    }

    const supabaseAdmin = createAdminClient();

    // Verify the user exists
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(body.userId);
    if (authError || !authUser?.user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const authEmail = authUser.user.email;
    const isInternalEmail = authEmail?.endsWith('@lensonwealth.app');

    const { data: existingProfile } = await supabaseAdmin
      .from('users')
      .select('id, full_name, phone_number, email')
      .eq('id', body.userId)
      .maybeSingle();

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (body.fullName?.trim() && !existingProfile?.full_name) {
      updates.full_name = body.fullName.trim();
      console.log('👤 Saving full name for user:', body.userId);
    }
    if (body.phoneNumber && !existingProfile?.phone_number) {
      updates.phone_number = body.phoneNumber;
      console.log('📱 Saving optional phone for user:', body.userId);
    }
    if (body.email && (!existingProfile?.email || existingProfile.email?.endsWith('@lensonwealth.app'))) {
      updates.email = body.email;
      console.log('📧 Saving optional email for user:', body.userId);

      // Phone-signup users have auth.users.email = internalEmail@lensonwealth.app.
      // Update it to the real email immediately so they can log in via magic link.
      if (isInternalEmail) {
        const { error: authEmailError } = await supabaseAdmin.auth.admin.updateUserById(body.userId, {
          email: body.email,
          email_confirm: true,
        });
        if (authEmailError) {
          console.warn('⚠️ Could not update auth.users email:', authEmailError.message);
          // Non-fatal: public.users still gets updated
        } else {
          console.log('✅ Updated auth.users.email to real email for phone-signup user:', body.userId);
        }
      }
    }

    if (!existingProfile) {
      const insertPayload: Record<string, unknown> = {
        id: body.userId,
        full_name: body.fullName?.trim() || null,
        phone_number: body.phoneNumber || null,
        email: body.email || (authEmail && !isInternalEmail ? authEmail : null),
        updated_at: new Date().toISOString(),
      };
      const { error: insertError } = await supabaseAdmin
        .from('users')
        .insert(insertPayload);

      if (insertError) {
        console.error('❌ Error creating profile:', insertError);
        return NextResponse.json(
          { error: 'Failed to create profile' },
          { status: 500 }
        );
      }
      return NextResponse.json({ success: true });
    }

    if (Object.keys(updates).length <= 1) {
      return NextResponse.json({ success: true, message: 'No updates needed' });
    }

    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update(updates)
      .eq('id', body.userId);

    if (updateError) {
      console.error('❌ Error updating profile:', updateError);
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ Error in save-optional-contact:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
