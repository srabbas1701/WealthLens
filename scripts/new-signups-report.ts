/**
 * Report: New user signups in last 24 hours and their asset entries
 *
 * Usage:
 *   npx tsx scripts/new-signups-report.ts [--hours=24]
 *
 * Example:
 *   npx tsx scripts/new-signups-report.ts
 *   npx tsx scripts/new-signups-report.ts --hours=48
 *
 * Note: Requires .env.local with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
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
          value = value.replace(/^["']+|["']+$/g, '');
          process.env[key] = value;
        }
      }
    }
  }
}

loadEnvFromFile();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

type AssetEntry = {
  type: string;
  count: number;
  details?: string[];
};

type UserReport = {
  id: string;
  fullName: string | null;
  email: string | null;
  phoneNumber: string | null;
  createdAt: string;
  assets: AssetEntry[];
};

function parseHoursArg(): number {
  const arg = process.argv.find((a) => a.startsWith('--hours='));
  if (!arg) return 24;
  const val = parseInt(arg.split('=')[1], 10);
  return isNaN(val) || val < 1 ? 24 : val;
}

async function getNewSignups(hours: number): Promise<UserReport[]> {
  const since = new Date();
  since.setHours(since.getHours() - hours);
  const sinceIso = since.toISOString();

  const { data: users, error } = await adminClient
    .from('users')
    .select('id, full_name, email, phone_number, created_at')
    .gte('created_at', sinceIso)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Failed to fetch users:', error.message);
    process.exit(1);
  }

  if (!users?.length) {
    return [];
  }

  const reports: UserReport[] = [];

  for (const u of users) {
    const assets: AssetEntry[] = [];

    // 1. Holdings (via portfolios) - equity, mutual_fund, gold, fd, etc.
    const { data: portfolios } = await adminClient
      .from('portfolios')
      .select('id')
      .eq('user_id', u.id);

    if (portfolios?.length) {
      const portfolioIds = portfolios.map((p) => p.id);
      const { data: holdings } = await adminClient
        .from('holdings')
        .select('asset_id, assets(asset_type, name)')
        .in('portfolio_id', portfolioIds);

      if (holdings?.length) {
        const byType = new Map<string, string[]>();
        for (const h of holdings) {
          const asset = h.assets as { asset_type?: string; name?: string } | null;
          const type = asset?.asset_type ?? 'unknown';
          const name = asset?.name ?? '';
          if (!byType.has(type)) byType.set(type, []);
          byType.get(type)!.push(name || type);
        }
        for (const [type, names] of byType) {
          assets.push({
            type: `holdings:${type}`,
            count: names.length,
            details: [...new Set(names)].slice(0, 5),
          });
        }
      }
    }

    // 2. Real estate
    const { data: realEstate } = await adminClient
      .from('real_estate_assets')
      .select('id, property_nickname')
      .eq('user_id', u.id);

    if (realEstate?.length) {
      assets.push({
        type: 'real_estate',
        count: realEstate.length,
        details: realEstate.map((r) => r.property_nickname ?? 'Property'),
      });
    }

    // 3. Insurance (table may not exist in all deployments)
    try {
      const { data: insurance } = await adminClient
        .from('insurance_policies')
        .select('id, category, policy_name')
        .eq('user_id', u.id);

      if (insurance?.length) {
        const byCat = new Map<string, string[]>();
        for (const p of insurance) {
          const cat = (p as { category?: string }).category ?? 'OTHER';
          const name = (p as { policy_name?: string }).policy_name ?? '';
          if (!byCat.has(cat)) byCat.set(cat, []);
          byCat.get(cat)!.push(name || cat);
        }
        for (const [cat, names] of byCat) {
          assets.push({
            type: `insurance:${cat}`,
            count: names.length,
            details: names.slice(0, 3),
          });
        }
      }
    } catch {
      // insurance_policies table may not exist
    }

    reports.push({
      id: u.id,
      fullName: u.full_name ?? null,
      email: u.email ?? null,
      phoneNumber: u.phone_number ?? null,
      createdAt: u.created_at,
      assets,
    });
  }

  return reports;
}

function formatReport(reports: UserReport[], hours: number): string {
  const lines: string[] = [];
  lines.push('');
  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push(`  NEW SIGNUPS REPORT (last ${hours} hours)`);
  lines.push(`  Generated: ${new Date().toISOString()}`);
  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('');

  if (reports.length === 0) {
    lines.push('  No new signups in the specified period.');
    lines.push('');
    return lines.join('\n');
  }

  lines.push(`  Total new users: ${reports.length}`);
  lines.push('');

  for (const r of reports) {
    const contact = r.email ?? r.phoneNumber ?? '(no contact)';
    const name = r.fullName ? ` (${r.fullName})` : '';
    lines.push(`  ─────────────────────────────────────────────────────────────`);
    lines.push(`  User: ${contact}${name}`);
    lines.push(`  ID:   ${r.id}`);
    lines.push(`  Registered: ${new Date(r.createdAt).toLocaleString()}`);
    lines.push('');

    if (r.assets.length === 0) {
      lines.push('    Assets entered: None yet');
    } else {
      lines.push('    Assets entered:');
      for (const a of r.assets) {
        const detailStr = a.details?.length ? ` — ${a.details.join(', ')}` : '';
        lines.push(`      • ${a.type}: ${a.count}${detailStr}`);
      }
    }
    lines.push('');
  }

  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('');
  return lines.join('\n');
}

async function main() {
  const hours = parseHoursArg();
  console.log(`\nFetching users who signed up in the last ${hours} hours...`);

  const reports = await getNewSignups(hours);
  const output = formatReport(reports, hours);

  console.log(output);
}

main().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});
