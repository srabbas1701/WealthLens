/**
 * Admin API: Fix User Authentication
 * 
 * This endpoint uses Supabase Admin API to properly update user email/phone
 * in the auth system. This is REQUIRED when users have been manually updated
 * in the database.
 * 
 * IMPORTANT: You cannot directly update auth.users via SQL. You MUST use
 * the Admin API to update authentication credentials.
 * 
 * Usage:
 * POST /api/admin/fix-user-auth
 * {
 *   "user_id": "uuid",
 *   "email": "new@email.com",  // optional
 *   "phone": "+919876543210"   // optional
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    // Only allow in development or with proper authentication
    // In production, add proper admin authentication here
    if (process.env.NODE_ENV === 'production') {
      // TODO: Add admin authentication check
      // const authHeader = request.headers.get('authorization');
      // if (authHeader !== `Bearer ${process.env.ADMIN_SECRET}`) {
      //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      // }
    }

    const body = await request.json();
    const { user_id, email, phone } = body;

    if (!user_id) {
      return NextResponse.json(
        { error: 'user_id is required' },
        { status: 400 }
      );
    }

    if (!email && !phone) {
      return NextResponse.json(
        { error: 'Either email or phone must be provided' },
        { status: 400 }
      );
    }

    // Create admin client using service role key for admin operations
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Supabase admin credentials not configured' },
        { status: 500 }
      );
    }

    // Use @supabase/supabase-js directly for admin operations
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Build update object
    const updateData: {
      email?: string;
      phone?: string;
      email_confirm?: boolean;
      phone_confirm?: boolean;
    } = {};

    if (email) {
      updateData.email = email;
      // Mark email as confirmed if updating
      updateData.email_confirm = true;
    }

    if (phone) {
      updateData.phone = phone;
      // Mark phone as confirmed if updating
      updateData.phone_confirm = true;
    }

    // Update user via Admin API
    const { data: updatedUser, error: updateError } = await adminClient.auth.admin.updateUserById(
      user_id,
      updateData
    );

    if (updateError) {
      console.error('[Admin] Error updating user:', updateError);
      return NextResponse.json(
        { 
          error: 'Failed to update user',
          details: updateError.message 
        },
        { status: 500 }
      );
    }

    if (!updatedUser || !updatedUser.user) {
      return NextResponse.json(
        { error: 'User update returned no data' },
        { status: 500 }
      );
    }

    // Use regular admin client for database operations
    const supabase = createAdminClient();

    // The trigger should automatically sync to public.users, but let's verify
    // and manually sync if needed
    try {
      const { error: syncError } = await supabase.rpc('sync_user_from_auth', {
        user_id: user_id
      });

      if (syncError) {
        console.warn('[Admin] Sync function not available, manually syncing...');
        // Manual sync if function doesn't exist
        const { error: manualSyncError } = await supabase
          .from('users')
          .update({
            email: updatedUser.user.email,
            phone_number: updatedUser.user.phone,
            updated_at: new Date().toISOString(),
            primary_auth_method: updatedUser.user.phone ? 'mobile' : 'email',
            email_verified_at: updatedUser.user.email_confirmed_at,
            phone_verified_at: updatedUser.user.phone_confirmed_at,
          })
          .eq('id', user_id);

        if (manualSyncError) {
          console.error('[Admin] Error syncing to public.users:', manualSyncError);
          // Don't fail the request, but log the error
        }
      }
    } catch (syncErr) {
      console.warn('[Admin] Sync failed, attempting manual sync...', syncErr);
      // Fallback: manual sync
      const { error: manualSyncError } = await supabase
        .from('users')
        .update({
          email: updatedUser.user.email,
          phone_number: updatedUser.user.phone,
          updated_at: new Date().toISOString(),
          primary_auth_method: updatedUser.user.phone ? 'mobile' : 'email',
          email_verified_at: updatedUser.user.email_confirmed_at,
          phone_verified_at: updatedUser.user.phone_confirmed_at,
        })
        .eq('id', user_id);

      if (manualSyncError) {
        console.error('[Admin] Manual sync also failed:', manualSyncError);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'User updated successfully',
      user: {
        id: updatedUser.user.id,
        email: updatedUser.user.email,
        phone: updatedUser.user.phone,
        email_confirmed_at: updatedUser.user.email_confirmed_at,
        phone_confirmed_at: updatedUser.user.phone_confirmed_at,
      }
    });

  } catch (error) {
    console.error('[Admin] Error in fix-user-auth:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
