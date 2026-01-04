/**
 * Email Verification API Route
 * 
 * Sends a verification email to the user's secondary email address.
 * This is NON-BLOCKING - user can continue using the app without verifying.
 * 
 * FLOW:
 * 1. User provides email during onboarding or from settings
 * 2. We send a verification link to that email
 * 3. User clicks link to verify (handled by callback route)
 * 4. We update email_verified_at in the database
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/types/database';

export async function POST(request: NextRequest) {
  try {
    const { email, user_id } = await request.json();
    
    if (!email || !user_id) {
      return NextResponse.json(
        { error: 'Email and user_id are required' },
        { status: 400 }
      );
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
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
    
    // Update the user's email in the profile
    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        email,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user_id);
    
    if (updateError) {
      console.error('Error updating email:', updateError);
      return NextResponse.json(
        { error: 'Failed to update email' },
        { status: 500 }
      );
    }
    
    // For now, we'll use Supabase's built-in email verification
    // In production, you might want to use a custom email service
    // and generate your own verification tokens
    
    // Note: Supabase doesn't have a direct API for sending verification
    // to a secondary email. For MVP, we'll mark it as "pending verification"
    // and the user can verify later through settings.
    
    // In a production app, you would:
    // 1. Generate a verification token
    // 2. Store it in a verification_tokens table
    // 3. Send an email with a link containing the token
    // 4. When clicked, verify the token and update email_verified_at
    
    return NextResponse.json({
      success: true,
      message: 'Email saved. Verification will be available soon.',
    });
    
  } catch (error) {
    console.error('Error in verify-email route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}













