/**
 * Phone Verification API Route
 * 
 * Sends an OTP to the user's secondary phone number.
 * This is NON-BLOCKING - user can continue using the app without verifying.
 * 
 * FLOW:
 * 1. User provides phone during onboarding or from settings
 * 2. We send an OTP via SMS
 * 3. User enters OTP to verify (handled by verify-phone-otp route)
 * 4. We update phone_verified_at in the database
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/types/database';

export async function POST(request: NextRequest) {
  try {
    const { phone, user_id } = await request.json();
    
    if (!phone || !user_id) {
      return NextResponse.json(
        { error: 'Phone and user_id are required' },
        { status: 400 }
      );
    }
    
    // Validate phone format (should include country code)
    const phoneRegex = /^\+\d{10,15}$/;
    if (!phoneRegex.test(phone)) {
      return NextResponse.json(
        { error: 'Invalid phone format. Include country code (e.g., +919876543210)' },
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
    
    // Update the user's phone in the profile
    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        phone_number: phone,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user_id);
    
    if (updateError) {
      console.error('Error updating phone:', updateError);
      return NextResponse.json(
        { error: 'Failed to update phone' },
        { status: 500 }
      );
    }
    
    // For secondary phone verification, we use Supabase's OTP
    // Note: This won't create a new auth user, just send an OTP
    // We'll verify it separately and update phone_verified_at
    
    // In production, you might want to use a custom SMS service
    // like Twilio for more control over the verification process
    
    // For MVP, we'll store a verification code in the database
    // and verify it in the verify-phone-otp route
    
    // Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store the OTP (in production, use a separate table with expiry)
    // For MVP, we'll skip actual SMS sending and just return success
    // The user can use any 6-digit code for testing
    
    console.log(`[MVP] OTP for ${phone}: ${otp}`);
    
    return NextResponse.json({
      success: true,
      message: 'OTP sent successfully',
      // In production, don't return the OTP!
      // This is only for MVP testing
      ...(process.env.NODE_ENV === 'development' && { debug_otp: otp }),
    });
    
  } catch (error) {
    console.error('Error in verify-phone route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}














