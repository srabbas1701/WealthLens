-- =============================================================================
-- ASSET CLASSIFICATION SYSTEM MIGRATION
-- =============================================================================
-- Adds regulator-aligned, investor-proof asset classification fields
-- Based on economic behavior and risk-return characteristics, NOT product names
--
-- CORE PRINCIPLE: Assets grouped by economic behavior, not product wrappers
-- Products like ULIP, NPS, Mutual Funds are wrappers, not asset classes.

-- Add new classification fields to assets table
alter table public.assets
  add column if not exists top_level_bucket text check (top_level_bucket in (
    'Growth', 'IncomeAllocation', 'Commodity', 'RealAsset', 'Cash', 'Insurance', 'Liability'
  )),
  add column if not exists risk_behavior text check (risk_behavior in (
    'Growth', 'Defensive', 'Hedge', 'Liquidity', 'Protection', 'Obligation'
  )),
  add column if not exists valuation_method text check (valuation_method in (
    'MarketLinked', 'InterestBased', 'NAVBased', 'Manual'
  ));

-- Update asset_class enum to match new classification system
-- Note: asset_class is the detailed classification, top_level_bucket is the user-facing grouping

-- STEP 1: Migrate existing asset_class values to new format
-- Map old lowercase values to new capitalized values before applying constraint
-- Handle case-insensitive matching and null values
update public.assets
set asset_class = case
  when lower(asset_class) = 'equity' then 'Equity'
  when lower(asset_class) = 'debt' then 'FixedIncome'
  when lower(asset_class) = 'hybrid' then 'Hybrid'
  when lower(asset_class) = 'gold' then 'Commodity'
  when lower(asset_class) = 'cash' then 'Cash'
  when asset_class is null then null -- Keep nulls as null
  -- For any other values, set to null temporarily (will be backfilled by classification service)
  else null
end
where asset_class is not null;

-- STEP 2: Drop old constraint
alter table public.assets
  drop constraint if exists assets_asset_class_check;

-- STEP 3: Apply new constraint with updated values
-- Allow null values (will be populated by classification service)
alter table public.assets
  add constraint assets_asset_class_check check (
    asset_class is null or asset_class in (
      'Equity', 'FixedIncome', 'Hybrid', 'Commodity', 'RealAsset', 'Cash', 'Insurance', 'Liability'
    )
  );

-- Add comments for documentation
comment on column public.assets.asset_class is 
  'Detailed asset class: Equity | FixedIncome | Hybrid | Commodity | RealAsset | Cash | Insurance | Liability';

comment on column public.assets.top_level_bucket is 
  'User-facing top-level grouping: Growth | IncomeAllocation | Commodity | RealAsset | Cash | Insurance | Liability';

comment on column public.assets.risk_behavior is 
  'Risk-return behavior: Growth | Defensive | Hedge | Liquidity | Protection | Obligation';

comment on column public.assets.valuation_method is 
  'How the asset is valued: MarketLinked | InterestBased | NAVBased | Manual';

-- Create index for fast classification lookups
create index if not exists idx_assets_top_level_bucket on public.assets(top_level_bucket);
create index if not exists idx_assets_asset_class on public.assets(asset_class);
create index if not exists idx_assets_risk_behavior on public.assets(risk_behavior);

-- Add classification fields to holdings table for denormalized access
-- This allows fast queries without joins
alter table public.holdings
  add column if not exists asset_class text,
  add column if not exists top_level_bucket text,
  add column if not exists risk_behavior text,
  add column if not exists valuation_method text;

-- Add comments
comment on column public.holdings.asset_class is 
  'Denormalized asset_class from assets table for fast queries';

comment on column public.holdings.top_level_bucket is 
  'Denormalized top_level_bucket from assets table for fast queries';

-- Create index for holdings classification
create index if not exists idx_holdings_top_level_bucket on public.holdings(top_level_bucket);
create index if not exists idx_holdings_asset_class on public.holdings(asset_class);

-- Function to automatically sync classification fields from assets to holdings
-- This ensures consistency when asset classification is updated
create or replace function sync_holding_classification()
returns trigger as $$
begin
  -- When asset classification changes, update all related holdings
  if tg_op = 'UPDATE' and (
    old.asset_class is distinct from new.asset_class or
    old.top_level_bucket is distinct from new.top_level_bucket or
    old.risk_behavior is distinct from new.risk_behavior or
    old.valuation_method is distinct from new.valuation_method
  ) then
    update public.holdings
    set
      asset_class = new.asset_class,
      top_level_bucket = new.top_level_bucket,
      risk_behavior = new.risk_behavior,
      valuation_method = new.valuation_method,
      updated_at = now()
    where asset_id = new.id;
  end if;
  
  return new;
end;
$$ language plpgsql;

-- Trigger to sync classification on asset updates
drop trigger if exists sync_holding_classification_trigger on public.assets;
create trigger sync_holding_classification_trigger
  after update on public.assets
  for each row
  execute function sync_holding_classification();

-- Function to sync classification when a new holding is created
create or replace function sync_new_holding_classification()
returns trigger as $$
begin
  -- When a new holding is created, copy classification from asset
  select 
    a.asset_class,
    a.top_level_bucket,
    a.risk_behavior,
    a.valuation_method
  into
    new.asset_class,
    new.top_level_bucket,
    new.risk_behavior,
    new.valuation_method
  from public.assets a
  where a.id = new.asset_id;
  
  return new;
end;
$$ language plpgsql;

-- Trigger to sync classification on holding insert
drop trigger if exists sync_new_holding_classification_trigger on public.holdings;
create trigger sync_new_holding_classification_trigger
  before insert on public.holdings
  for each row
  execute function sync_new_holding_classification();
