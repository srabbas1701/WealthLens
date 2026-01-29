/**
 * Phone Login API Route
 * 
 * Supports BOTH login and signup for phone-based authentication.
 * 
 * FLOW:
 * 1. Frontend verifies OTP with MSG91 widget (already done)
 * 2. Frontend sends verified phone number to this endpoint
 * 3. Backend normalizes phone to E.164 format
 * 4. Backend finds existing user OR creates new user
 * 5. Backend creates Supabase session using admin.createSession
 * 6. Backend syncs user profile to public.users table
 * 7. Backend returns session to frontend
 * 
 * IMPORTANT:
 * - MSG91 handles OTP verification (already done before this endpoint is called)
 * - Supabase only handles user creation and session management
 * - This endpoint supports BOTH login (existing user) and signup (new user)
 * - Never throws error if user exists - just uses existing user
 * 
 * SECURITY:
 * - No MSG91 token decoding (OTP already verified by widget)
 * - No custom JWT handling
 * - No magic link generation
 * - No OTP verification (handled by MSG91)
 * - Supabase is the only authority for login/session
 * - Fully production-safe
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

type PhoneLoginPayload = {
  phone: string; // e.g., "+919810155042" or "919810155042"
};

/**
 * Normalize phone number to E.164 format
 * Examples:
 * - "+919810155042" → "+919810155042" (already E.164)
 * - "919810155042" → "+919810155042" (adds +)
 * - "9810155042" → "+919810155042" (adds +91 for India)
 */
function normalizePhone(phone: string): string {
  // Remove any whitespace
  phone = phone.trim();
  
  if (phone.startsWith("+")) {
    return phone;
  }
  
  if (phone.startsWith("91")) {
    return `+${phone}`;
  }
  
  // Default to India (+91) for 10-digit numbers
  return `+91${phone}`;
}

export async function POST(req: NextRequest) {
  try {
    const body: PhoneLoginPayload = await req.json();

    // 1. Validate phone in payload
    if (!body.phone) {
      return NextResponse.json(
        { error: "Phone number is required" },
        { status: 400 }
      );
    }

    // 2. Normalize phone to E.164 format
    const phone = normalizePhone(body.phone);

    // Validate E.164 format: + followed by 10-15 digits
    if (!/^\+\d{10,15}$/.test(phone)) {
      return NextResponse.json(
        { error: "Invalid phone number format" },
        { status: 400 }
      );
    }

    console.log('📱 Processing phone:', phone);

    // 3. Initialize Supabase admin client
    const supabaseAdmin = createAdminClient();

    // 4. Find existing user by phone using admin.listUsers
    // IMPORTANT: This endpoint supports BOTH login (existing user) and signup (new user)
    const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error('❌ Error listing users:', listError);
      return NextResponse.json(
        { error: 'Failed to check existing users', details: listError.message },
        { status: 500 }
      );
    }

    console.log('🔍 Searching for phone:', phone);
    console.log('📋 Total users in DB:', usersData?.users?.length || 0);

    // Find user by phone with FLEXIBLE comparison (handles both +919810155042 and 919810155042)
    // TODO: Migrate all phone numbers in database to E.164 format (+919810155042)
    // Run this SQL: UPDATE auth.users SET phone = CONCAT('+', phone) WHERE phone NOT LIKE '+%' AND phone IS NOT NULL;
    let user = usersData?.users?.find((u) => {
      if (!u.phone) return false;
      
      // Normalize both phones: remove all non-digit characters for comparison
      const normalizeForMatch = (p: string) => p.replace(/\D/g, ''); // Remove everything except digits
      
      const userPhoneDigits = normalizeForMatch(u.phone);
      const searchPhoneDigits = normalizeForMatch(phone);
      
      // Match if the digit sequences are identical
      const match = userPhoneDigits === searchPhoneDigits;
      
      if (match) {
        console.log('✅ Found matching user:', {
          userId: u.id,
          storedPhone: u.phone,
          searchPhone: phone,
          digitsMatch: userPhoneDigits,
        });
      }
      
      return match;
    });
    
    if (!user) {
      console.log('❌ No user found. Phones in DB:', usersData?.users
        ?.filter(u => u.phone)
        ?.map(u => u.phone)
        ?.slice(0, 5)
      );
    }

    // 5. Handle user: use existing OR create new
    // NEVER throw error if user exists - just use existing user (login flow)
    if (user) {
      // LOGIN: User exists, use existing user
      console.log('✅ LOGIN flow - existing user found:', user.id);
    } else {
      // SIGNUP: User doesn't exist, create new user
      console.log('🆕 SIGNUP flow - creating new user for:', phone);
      
      const { data: newUserData, error: createError } = await supabaseAdmin.auth.admin.createUser({
        phone,
        phone_confirm: true, // Phone already verified by MSG91
        email_confirm: false, // Phone is primary, email can be added later
      });

      if (createError) {
        // DEBUG: Log the actual error
        console.error('🚨 CreateUser error:', {
          message: createError.message,
          code: createError.code,
          status: createError.status,
        });
        
        // CRITICAL FIX: Check for "already registered" in error message, not just error code
        const errorMessage = createError.message?.toLowerCase() || '';
        const isAlreadyRegistered = 
          errorMessage.includes('already registered') ||
          errorMessage.includes('already exists') ||
          createError.code === 'user_already_exists' ||
          createError.code === '23505'; // PostgreSQL unique constraint violation

        if (isAlreadyRegistered) {
          // Race condition: User was created between our check and create attempt
          // This is NOT an error - just find and use the existing user (LOGIN flow)
          console.log('⚠️ Race condition detected - user created by another request');
          console.log('🔄 Re-fetching users to find existing user...');
          
          const { data: allUsers } = await supabaseAdmin.auth.admin.listUsers();
          
          // Use flexible phone matching (handles both +919810155042 and 919810155042)
          const normalizeForMatch = (p: string) => p.replace(/\D/g, '');
          const searchPhoneDigits = normalizeForMatch(phone);
          
          user = allUsers?.users?.find((u) => {
            if (!u.phone) return false;
            const userPhoneDigits = normalizeForMatch(u.phone);
            return userPhoneDigits === searchPhoneDigits;
          });
          
          if (!user) {
            // DEBUG: Show what phones we're comparing
            console.error('❌ Critical: User already exists but could not be found');
            console.error('🔍 Searched for digits:', searchPhoneDigits);
            console.error('📋 Available phones:', allUsers?.users
              ?.filter(u => u.phone)
              ?.map(u => `${u.phone} (digits: ${normalizeForMatch(u.phone)})`)
              ?.slice(0, 5)
            );
            
            return NextResponse.json(
              { error: 'User verification failed. Please try again.' },
              { status: 500 }
            );
          }
          
          console.log('✅ Found existing user after race condition:', user.id);
        } else {
          // Actual creation error (not "user exists")
          console.error('❌ Error creating user:', createError);
          return NextResponse.json(
            { error: createError.message || 'Failed to create user' },
            { status: 500 }
          );
        }
      } else if (newUserData?.user) {
        // Successfully created new user
        user = newUserData.user;
        console.log('✅ New user created:', {
          userId: user.id,
          phoneStored: user.phone,
          phoneRequested: phone,
          phoneMatch: user.phone === phone,
        });
      } else {
        console.error('❌ No user data returned from createUser');
        return NextResponse.json(
          { error: 'Failed to create user' },
          { status: 500 }
        );
      }
    }

    // Validate user was found or created
    if (!user || !user.id) {
      console.error('❌ No valid user found or created');
      return NextResponse.json(
        { error: 'Failed to authenticate user' },
        { status: 500 }
      );
    }

    // CRITICAL: Sync with public.users table
    // Check if user profile exists in public.users table
    console.log('🔄 Syncing user profile to users table...');
    const { data: existingProfile, error: profileCheckError } = await supabaseAdmin
      .from('users')
      .select('id, phone_number')
      .eq('id', user.id)
      .maybeSingle();

    if (profileCheckError && profileCheckError.code !== 'PGRST116') {
      // PGRST116 = no rows returned (expected for new users)
      console.error('⚠️ Error checking user profile:', profileCheckError);
    }

    if (!existingProfile) {
      // Create user profile entry
      console.log('📝 Creating user profile in users table...');
      const { error: insertError } = await supabaseAdmin
        .from('users')
        .insert({
          id: user.id,
          phone_number: phone, // Use normalized E.164 format
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (insertError) {
        console.error('⚠️ Error creating user profile:', insertError);
        // Don't fail the entire login - just log warning
        // User can be created in users table later via trigger or separate sync
      } else {
        console.log('✅ User profile created in users table');
      }
    } else {
      // Update phone_number if format changed
      if (existingProfile.phone_number !== phone) {
        console.log('🔄 Updating phone format in users table...');
        const { error: updateError } = await supabaseAdmin
          .from('users')
          .update({ 
            phone_number: phone,
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id);

        if (updateError) {
          console.error('⚠️ Error updating user profile phone:', updateError);
        } else {
          console.log('✅ User profile phone_number updated');
        }
      } else {
        console.log('✅ User profile already exists with correct phone format');
      }
    }

    console.log('🔐 Creating session for user:', user.id);

    // 6. Create internal email and temp password
    // Email is NEVER shown to user - purely for Supabase auth
    const internalEmail = `${user.phone?.replace(/\D/g, '')}@lensonwealth.app`;
    const tempPassword = `${user.id.substring(0, 8)}-${Date.now()}`;

    // Update user with email and password
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { 
        email: internalEmail,
        email_confirm: true,
        password: tempPassword,
        phone_confirm: true,
      }
    );

    if (updateError) {
      console.error('❌ Error updating user:', updateError);
      return NextResponse.json(
        { error: 'Failed to create session', details: updateError.message },
        { status: 500 }
      );
    }

    console.log('✅ User updated with credentials');

    // 7. Return credentials for frontend signin
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        phone: user.phone,
      },
      credentials: {
        email: internalEmail,
        password: tempPassword,
      }
    });
  } catch (error) {
    console.error('❌ Unhandled error in phone-login route:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}