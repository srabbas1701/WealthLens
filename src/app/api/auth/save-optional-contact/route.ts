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

    if (!body.phoneNumber && !body.email) {
      return NextResponse.json(
        { error: 'At least one contact field is required' },
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

    // Build update object (only set fields that aren't already populated)
    const { data: existingProfile } = await supabaseAdmin
      .from('users')
      .select('id, phone_number, email')
      .eq('id', body.userId)
      .maybeSingle();

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    // Only set phone if not already set
    if (body.phoneNumber && !existingProfile?.phone_number) {
      updates.phone_number = body.phoneNumber;
      console.log('📱 Saving optional phone for user:', body.userId);
    }

    // Only set email if not already set (or if it's an internal @lensonwealth.app email)
    if (body.email && (!existingProfile?.email || existingProfile.email.endsWith('@lensonwealth.app'))) {
      updates.email = body.email;
      console.log('📧 Saving optional email for user:', body.userId);
    }

    if (Object.keys(updates).length <= 1) {
      // Only updated_at, nothing to change
      return NextResponse.json({ success: true, message: 'No updates needed' });
    }

    if (existingProfile) {
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
    } else {
      // Profile doesn't exist yet, create it
      const { error: insertError } = await supabaseAdmin
        .from('users')
        .insert({
          id: body.userId,
          phone_number: body.phoneNumber || null,
          email: body.email || null,
          ...updates,
        });

      if (insertError) {
        console.error('❌ Error creating profile:', insertError);
        return NextResponse.json(
          { error: 'Failed to create profile' },
          { status: 500 }
        );
      }
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
