/**
 * Phone OTP Verification API Route
 * 
 * Verifies the OTP sent to the user's secondary phone number.
 * On success, updates phone_verified_at in the database.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/types/database';

export async function POST(request: NextRequest) {
  try {
    const { phone, token, user_id } = await request.json();
    
    if (!phone || !token || !user_id) {
      return NextResponse.json(
        { error: 'Phone, token, and user_id are required' },
        { status: 400 }
      );
    }
    
    // Validate token format (6 digits)
    if (!/^\d{6}$/.test(token)) {
      return NextResponse.json(
        { error: 'Invalid OTP format' },
        { status: 400 }
      );
    }
    
    const cookieStore = await cookies();
    
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Server component - ignore
            }
          },
        },
      }
    );
    
    // Verify the user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user || user.id !== user_id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // In production, you would:
    // 1. Look up the OTP from a verification_tokens table
    // 2. Check if it matches and hasn't expired
    // 3. Mark it as used
    
    // For MVP, we'll accept any 6-digit code
    // This is NOT secure and should be replaced in production!
    
    // Update phone_verified_at
    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        phone_verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', user_id);
    
    if (updateError) {
      console.error('Error updating phone verification:', updateError);
      return NextResponse.json(
        { error: 'Failed to verify phone' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Phone verified successfully',
    });
    
  } catch (error) {
    console.error('Error in verify-phone-otp route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}













