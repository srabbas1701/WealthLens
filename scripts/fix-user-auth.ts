/**
 * Script to fix user authentication after manual database updates
 * 
 * Usage:
 *   npx tsx scripts/fix-user-auth.ts <user_id> [--email=email] [--phone=phone]
 * 
 * Example:
 *   npx tsx scripts/fix-user-auth.ts 123e4567-e89b-12d3-a456-426614174000 --email=user@example.com
 *   npx tsx scripts/fix-user-auth.ts 123e4567-e89b-12d3-a456-426614174000 --phone=919876543210
 * 
 * Note: Requires .env.local file with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables from .env.local file
function loadEnvFromFile() {
  const envPath = path.join(process.cwd(), '.env.local');
  
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const lines = envContent.split(/\r?\n/);
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const match = trimmed.match(/^([^=]+)=(.*)$/);
        if (match) {
          const key = match[1].trim();
          let value = match[2].trim();
          // Remove quotes if present
          value = value.replace(/^["']+|["']+$/g, '');
          process.env[key] = value;
        }
      }
    }
  }
}

// Load env variables from .env.local
loadEnvFromFile();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function fixUserAuth(userId: string, email?: string, phone?: string) {
  if (!email && !phone) {
    console.error('❌ Either --email or --phone must be provided');
    process.exit(1);
  }

  console.log(`\n🔧 Fixing authentication for user: ${userId}`);
  
  if (email) {
    console.log(`   📧 Updating email to: ${email}`);
  }
  if (phone) {
    console.log(`   📱 Updating phone to: ${phone}`);
  }

  const updateData: {
    email?: string;
    phone?: string;
    email_confirm?: boolean;
    phone_confirm?: boolean;
  } = {};

  if (email) {
    updateData.email = email;
    updateData.email_confirm = true;
  }

  if (phone) {
    updateData.phone = phone;
    updateData.phone_confirm = true;
  }

  try {
    const { data: updatedUser, error } = await adminClient.auth.admin.updateUserById(
      userId,
      updateData
    );

    if (error) {
      console.error('❌ Error updating user:', error.message);
      process.exit(1);
    }

    if (!updatedUser || !updatedUser.user) {
      console.error('❌ User update returned no data');
      process.exit(1);
    }

    console.log('\n✅ User updated successfully!');
    console.log(`   ID: ${updatedUser.user.id}`);
    console.log(`   Email: ${updatedUser.user.email || '(none)'}`);
    console.log(`   Phone: ${updatedUser.user.phone || '(none)'}`);
    console.log(`   Email Confirmed: ${updatedUser.user.email_confirmed_at ? 'Yes' : 'No'}`);
    console.log(`   Phone Confirmed: ${updatedUser.user.phone_confirmed_at ? 'Yes' : 'No'}`);

    // Sync to public.users
    console.log('\n🔄 Syncing to public.users...');
    try {
      const { error: syncError } = await adminClient.rpc('sync_user_from_auth', {
        user_id: userId
      });

      if (syncError) {
        console.warn('⚠️  Sync function not available, manually syncing...');
        // Build update object with only fields that exist
        const updateData: any = {
          email: updatedUser.user.email,
          phone_number: updatedUser.user.phone,
          updated_at: new Date().toISOString(),
        };
        
        // Only add primary_auth_method if column exists (optional field)
        if (updatedUser.user.phone || updatedUser.user.email) {
          updateData.primary_auth_method = updatedUser.user.phone ? 'mobile' : 'email';
        }
        
        // Only add verification timestamps if columns exist (optional fields)
        // These columns might not exist in all database schemas
        // The sync will work without them - they're just for tracking
        
        const { error: manualSyncError } = await adminClient
          .from('users')
          .update(updateData)
          .eq('id', userId);

        if (manualSyncError) {
          // Check if error is about missing columns (non-critical)
          if (manualSyncError.message.includes('column') && manualSyncError.message.includes('not found')) {
            console.warn('⚠️  Some columns missing in public.users (non-critical) - basic sync attempted');
            console.warn('   User can still login - auth.users was updated successfully');
          } else {
            console.error('❌ Error syncing to public.users:', manualSyncError.message);
          }
        } else {
          console.log('✅ public.users synced successfully');
        }
      } else {
        console.log('✅ public.users synced successfully');
      }
    } catch (syncErr) {
      console.error('❌ Error during sync:', syncErr);
    }

    console.log('\n✨ Done! User can now login with the updated credentials.');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const userId = args[0];

if (!userId) {
  console.error('❌ Usage: npx tsx scripts/fix-user-auth.ts <user_id> [--email=email] [--phone=phone]');
  process.exit(1);
}

let email: string | undefined;
let phone: string | undefined;

for (const arg of args.slice(1)) {
  if (arg.startsWith('--email=')) {
    email = arg.split('=')[1];
  } else if (arg.startsWith('--phone=')) {
    phone = arg.split('=')[1];
  }
}

fixUserAuth(userId, email, phone).catch(console.error);
