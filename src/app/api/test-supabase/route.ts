import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/test-supabase
 * 
 * Test endpoint to verify Supabase connection
 * DELETE THIS FILE after testing!
 */
export async function GET() {
  const results: {
    env_check: { url: boolean; anon_key: boolean; service_key: boolean };
    connection: string;
    tables: string[];
    error?: string;
  } = {
    env_check: {
      url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      anon_key: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      service_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    },
    connection: 'not_tested',
    tables: [],
  };

  // Check if URL looks valid
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  if (!url.includes('supabase.co')) {
    results.error = 'URL does not look like a valid Supabase URL. It should be like: https://xxxxx.supabase.co';
    return NextResponse.json(results);
  }

  // Check if anon key looks valid (JWT format)
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  if (!anonKey.startsWith('eyJ')) {
    results.error = 'Anon key does not look like a valid JWT. It should start with "eyJ"';
    return NextResponse.json(results);
  }

  // Try to connect
  try {
    const supabase = await createClient();
    
    // Try a simple query to test connection
    const { data, error } = await supabase
      .from('assets')
      .select('id')
      .limit(1);

    if (error) {
      results.connection = 'failed';
      results.error = `Query error: ${error.message}`;
    } else {
      results.connection = 'success';
      
      // List available tables
      const tables = ['users', 'portfolios', 'assets', 'holdings', 'portfolio_metrics', 'portfolio_insights', 'market_context', 'copilot_sessions', 'onboarding_snapshots'];
      
      for (const table of tables) {
        try {
          const { count, error: countError } = await supabase
            .from(table)
            .select('*', { count: 'exact', head: true });
          
          if (!countError) {
            results.tables.push(`✅ ${table} (${count || 0} rows)`);
          } else {
            results.tables.push(`❌ ${table}: ${countError.message}`);
          }
        } catch (e) {
          results.tables.push(`❌ ${table}: table not found`);
        }
      }
    }
  } catch (e: any) {
    results.connection = 'failed';
    results.error = e.message;
  }

  return NextResponse.json(results, { status: results.connection === 'success' ? 200 : 500 });
}

