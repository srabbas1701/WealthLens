import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { classifyAsset } from '@/lib/asset-classification';

interface SilverHoldingRequest {
  user_id: string;
  holding_id?: string;
  silver_type: 'physical' | 'etf' | 'digital';
  invested_amount: number;
  quantity: number;
  unit_type: 'gram' | 'unit';
  purchase_date: string;
  form?: 'jewellery' | 'coin' | 'bar';
  purity?: string;
  gross_weight?: number;
  net_weight?: number;
  making_charges?: number;
  physical_quantity?: number;
  total_grams?: number;
  etf_name?: string;
  scheme_code?: string;
  isin?: string;
  exchange?: string;
  platform?: string;
  provider?: string;
  vaulted?: boolean;
}

interface HoldingValueRow {
  current_value: number | null;
}

interface PortfolioJoin {
  user_id: string;
}

interface SilverHoldingDetailsRow {
  holding_id: string;
  portfolio_id: string;
  silver_type: 'physical' | 'etf' | 'digital';
  unit_type: 'gram' | 'unit';
  purchase_date: string;
  form: 'jewellery' | 'coin' | 'bar' | null;
  purity: string | null;
  gross_weight: number | null;
  net_weight: number | null;
  making_charges: number | null;
  physical_quantity: number | null;
  total_grams: number | null;
  etf_name: string | null;
  scheme_code: string | null;
  isin: string | null;
  exchange: string | null;
  platform: string | null;
  provider: string | null;
  vaulted: boolean;
  raw_metadata: Record<string, unknown>;
}

async function getOrCreatePortfolio(
  adminClient: ReturnType<typeof createAdminClient>,
  userId: string
): Promise<string> {
  const { data: existing } = await adminClient
    .from('portfolios')
    .select('id')
    .eq('user_id', userId)
    .eq('is_primary', true)
    .single();

  if (existing) return existing.id;

  const { data: created, error } = await adminClient
    .from('portfolios')
    .insert({
      user_id: userId,
      name: 'My Portfolio',
      is_primary: true,
      total_value: 0,
      currency: 'INR',
    })
    .select('id')
    .single();

  if (error || !created) {
    throw new Error('Failed to create portfolio');
  }

  return created.id;
}

function createAssetName(silverType: string, metadata: Record<string, unknown>): string {
  switch (silverType) {
    case 'physical':
      return `Physical Silver (${String(metadata.form || 'Silver')})`;
    case 'etf':
      return String(metadata.etf_name || 'Silver ETF');
    case 'digital':
      return `Digital Silver (${String(metadata.platform || 'Platform')})`;
    default:
      return 'Silver Holding';
  }
}

function buildMetadata(body: SilverHoldingRequest): Record<string, unknown> {
  const metadata: Record<string, unknown> = {
    silver_type: body.silver_type,
    unit_type: body.unit_type,
    purchase_date: body.purchase_date,
    purity: body.purity || '999',
  };

  if (body.silver_type === 'physical') {
    const upperForm = (body.form || 'coin').toUpperCase();
    metadata.form = upperForm;
    if (upperForm === 'JEWELLERY') {
      metadata.gross_weight = body.gross_weight;
      metadata.net_weight = body.net_weight;
      metadata.making_charges = body.making_charges;
    } else {
      metadata.quantity = body.physical_quantity;
      metadata.total_grams = body.total_grams;
    }
  } else if (body.silver_type === 'etf') {
    metadata.etf_name = body.etf_name;
    metadata.scheme_code = body.scheme_code;
    metadata.isin = body.isin;
    metadata.exchange = body.exchange || 'NSE';
  } else if (body.silver_type === 'digital') {
    metadata.platform = body.platform;
    metadata.provider = body.provider;
    metadata.vaulted = body.vaulted || false;
  }

  return metadata;
}

async function getOrCreateSilverAsset(
  adminClient: ReturnType<typeof createAdminClient>,
  assetName: string,
  baseSymbol: string,
  classification: ReturnType<typeof classifyAsset>
): Promise<{ id: string } | null> {
  const { data: existingByName } = await adminClient
    .from('assets')
    .select('id')
    .eq('asset_type', 'gold')
    .eq('name', assetName)
    .maybeSingle();

  if (existingByName?.id) return { id: existingByName.id };

  const symbolCandidates = [
    baseSymbol,
    `${baseSymbol.slice(0, 7)}${Date.now().toString().slice(-3)}`.toUpperCase(),
  ];

  for (const symbol of symbolCandidates) {
    const { data: inserted, error } = await adminClient
      .from('assets')
      .insert({
        name: assetName,
        symbol,
        // Reuse commodity-compatible asset_type in DB.
        asset_type: 'gold',
        asset_class: classification.assetClass,
        top_level_bucket: classification.topLevelBucket,
        risk_behavior: classification.riskBehavior,
        valuation_method: classification.valuationMethod,
        risk_bucket: 'medium',
        is_active: true,
      })
      .select('id')
      .single();

    if (!error && inserted?.id) {
      return { id: inserted.id };
    }
  }

  const { data: existingBySymbol } = await adminClient
    .from('assets')
    .select('id')
    .eq('symbol', baseSymbol)
    .maybeSingle();

  if (existingBySymbol?.id) return { id: existingBySymbol.id };
  return null;
}

function calculateCurrentValue(investedAmount: number): number {
  return investedAmount;
}

function buildSilverHoldingDetailsRow(
  body: SilverHoldingRequest,
  holdingId: string,
  portfolioId: string,
  metadata: Record<string, unknown>
): SilverHoldingDetailsRow {
  return {
    holding_id: holdingId,
    portfolio_id: portfolioId,
    silver_type: body.silver_type,
    unit_type: body.unit_type,
    purchase_date: body.purchase_date,
    form: body.form || null,
    purity: body.purity || null,
    gross_weight: body.gross_weight ?? null,
    net_weight: body.net_weight ?? null,
    making_charges: body.making_charges ?? null,
    physical_quantity: body.physical_quantity ?? null,
    total_grams: body.total_grams ?? null,
    etf_name: body.etf_name || null,
    scheme_code: body.scheme_code || null,
    isin: body.isin || null,
    exchange: body.exchange || null,
    platform: body.platform || null,
    provider: body.provider || null,
    vaulted: body.vaulted || false,
    raw_metadata: metadata,
  };
}

async function refreshPortfolioTotal(
  adminClient: ReturnType<typeof createAdminClient>,
  portfolioId: string
): Promise<void> {
  const { data: holdings } = await adminClient
    .from('holdings')
    .select('current_value')
    .eq('portfolio_id', portfolioId);

  const total = ((holdings as HoldingValueRow[] | null) || []).reduce(
    (sum, h) => sum + (h.current_value || 0),
    0
  );

  await adminClient
    .from('portfolios')
    .update({ total_value: total, updated_at: new Date().toISOString() })
    .eq('id', portfolioId);
}

export async function POST(req: NextRequest) {
  try {
    const body: SilverHoldingRequest = await req.json();
    if (!body.user_id || !body.silver_type || !body.invested_amount || !body.quantity || !body.purchase_date) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const adminClient = createAdminClient();
    const portfolioId = await getOrCreatePortfolio(adminClient, body.user_id);
    const metadata = buildMetadata(body);
    const assetName = createAssetName(body.silver_type, metadata);
    const classification = classifyAsset('silver');
    const assetSymbol = body.isin
      ? body.isin.slice(0, 10).toUpperCase()
      : assetName.slice(0, 10).toUpperCase().replace(/\s+/g, '');

    const asset = await getOrCreateSilverAsset(adminClient, assetName, assetSymbol, classification);
    if (!asset) {
      return NextResponse.json(
        { success: false, error: 'Failed to create or resolve asset for silver holding' },
        { status: 500 }
      );
    }

    const currentValue = calculateCurrentValue(body.invested_amount);

    const { data: holding, error: holdingError } = await adminClient
      .from('holdings')
      .insert({
        portfolio_id: portfolioId,
        asset_id: asset.id,
        quantity: body.quantity,
        average_price: body.invested_amount / body.quantity,
        invested_value: body.invested_amount,
        current_value: currentValue,
        notes: JSON.stringify(metadata),
        source: 'manual',
      })
      .select('id')
      .single();

    if (holdingError || !holding) {
      return NextResponse.json({ success: false, error: 'Failed to create holding' }, { status: 500 });
    }

    const detailsRow = buildSilverHoldingDetailsRow(body, holding.id, portfolioId, metadata);
    const { error: detailsError } = await adminClient
      .from('silver_holding_details')
      .upsert(detailsRow, { onConflict: 'holding_id' });

    if (detailsError) {
      await adminClient.from('holdings').delete().eq('id', holding.id);
      return NextResponse.json(
        { success: false, error: `Failed to persist silver details: ${detailsError.message}` },
        { status: 500 }
      );
    }

    await refreshPortfolioTotal(adminClient, portfolioId);
    return NextResponse.json({ success: true, holding_id: holding.id, asset_id: asset.id });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to create silver holding' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body: SilverHoldingRequest = await req.json();
    if (!body.holding_id || !body.user_id) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const adminClient = createAdminClient();
    const { data: holding } = await adminClient
      .from('holdings')
      .select('id, portfolio_id, asset_id, portfolio:portfolios!inner(user_id)')
      .eq('id', body.holding_id)
      .single();

    const portfolio = holding?.portfolio as unknown as PortfolioJoin | undefined;
    if (!holding || portfolio?.user_id !== body.user_id) {
      return NextResponse.json({ success: false, error: 'Holding not found' }, { status: 404 });
    }

    const metadata = buildMetadata(body);
    const assetName = createAssetName(body.silver_type || 'physical', metadata);
    await adminClient.from('assets').update({ name: assetName }).eq('id', holding.asset_id);

    const currentValue = calculateCurrentValue(body.invested_amount);
    const { error: updateError } = await adminClient
      .from('holdings')
      .update({
        quantity: body.quantity,
        average_price: body.invested_amount && body.quantity ? body.invested_amount / body.quantity : undefined,
        invested_value: body.invested_amount,
        current_value: currentValue,
        notes: JSON.stringify(metadata),
        updated_at: new Date().toISOString(),
      })
      .eq('id', body.holding_id);

    if (updateError) {
      return NextResponse.json({ success: false, error: 'Failed to update holding' }, { status: 500 });
    }

    const detailsRow = buildSilverHoldingDetailsRow(
      body,
      body.holding_id,
      holding.portfolio_id as string,
      metadata
    );

    const { error: detailsError } = await adminClient
      .from('silver_holding_details')
      .upsert(detailsRow, { onConflict: 'holding_id' });

    if (detailsError) {
      return NextResponse.json(
        { success: false, error: `Failed to update silver details: ${detailsError.message}` },
        { status: 500 }
      );
    }

    await refreshPortfolioTotal(adminClient, holding.portfolio_id as string);
    return NextResponse.json({ success: true, holding_id: body.holding_id });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to update silver holding' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const holding_id = searchParams.get('holding_id');
    const user_id = searchParams.get('user_id');

    if (!holding_id || !user_id) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const adminClient = createAdminClient();
    const { data: holding } = await adminClient
      .from('holdings')
      .select('id, portfolio_id, portfolio:portfolios!inner(user_id)')
      .eq('id', holding_id)
      .single();

    const portfolio = holding?.portfolio as unknown as PortfolioJoin | undefined;
    if (!holding || portfolio?.user_id !== user_id) {
      return NextResponse.json({ success: false, error: 'Holding not found' }, { status: 404 });
    }

    const { error } = await adminClient.from('holdings').delete().eq('id', holding_id);
    if (error) {
      return NextResponse.json({ success: false, error: 'Failed to delete holding' }, { status: 500 });
    }

    await refreshPortfolioTotal(adminClient, holding.portfolio_id as string);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to delete silver holding' },
      { status: 500 }
    );
  }
}
