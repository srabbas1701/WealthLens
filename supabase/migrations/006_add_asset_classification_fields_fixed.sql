-- =============================================================================
-- ASSET CLASSIFICATION SYSTEM MIGRATION (FIXED VERSION)
-- =============================================================================
-- This version handles existing data migration more safely
-- Run this if the original migration failed partway through

-- STEP 0: First, check and fix any existing constraint issues
-- Drop the constraint if it exists (in case of partial migration)
alter table public.assets
  drop constraint if exists assets_asset_class_check;

-- STEP 1: Migrate existing asset_class values to new format
-- Map old lowercase values to new capitalized values
-- Handle ALL possible variations
update public.assets
set asset_class = case
  when lower(trim(asset_class)) = 'equity' then 'Equity'
  when lower(trim(asset_class)) = 'debt' then 'FixedIncome'
  when lower(trim(asset_class)) = 'hybrid' then 'Hybrid'
  when lower(trim(asset_class)) = 'gold' then 'Commodity'
  when lower(trim(asset_class)) = 'cash' then 'Cash'
  when lower(trim(asset_class)) = 'fixedincome' then 'FixedIncome'
  when lower(trim(asset_class)) = 'commodity' then 'Commodity'
  when lower(trim(asset_class)) = 'realasset' then 'RealAsset'
  when lower(trim(asset_class)) = 'insurance' then 'Insurance'
  when lower(trim(asset_class)) = 'liability' then 'Liability'
  -- If already in correct format, keep it
  when asset_class in ('Equity', 'FixedIncome', 'Hybrid', 'Commodity', 'RealAsset', 'Cash', 'Insurance', 'Liability') then asset_class
  -- For any other values, set to null (will be backfilled)
  else null
end
where asset_class is not null;

-- STEP 2: Verify all asset_class values are now valid or null
-- (This is just for verification - won't fail if there are issues)

-- STEP 3: Add new classification fields to assets table (if not already added)
alter table public.assets
  add column if not exists top_level_bucket text,
  add column if not exists risk_behavior text,
  add column if not exists valuation_method text;

-- STEP 4: Apply constraints to new columns
-- Remove any existing constraints first
alter table public.assets
  drop constraint if exists assets_top_level_bucket_check,
  drop constraint if exists assets_risk_behavior_check,
  drop constraint if exists assets_valuation_method_check;

-- Add constraints (allow null for now)
alter table public.assets
  add constraint assets_top_level_bucket_check check (
    top_level_bucket is null or top_level_bucket in (
      'Growth', 'IncomeAllocation', 'Commodity', 'RealAsset', 'Cash', 'Insurance', 'Liability'
    )
  ),
  add constraint assets_risk_behavior_check check (
    risk_behavior is null or risk_behavior in (
      'Growth', 'Defensive', 'Hedge', 'Liquidity', 'Protection', 'Obligation'
    )
  ),
  add constraint assets_valuation_method_check check (
    valuation_method is null or valuation_method in (
      'MarketLinked', 'InterestBased', 'NAVBased', 'Manual'
    )
  );

-- STEP 5: Apply new constraint for asset_class (allow null)
alter table public.assets
  add constraint assets_asset_class_check check (
    asset_class is null or asset_class in (
      'Equity', 'FixedIncome', 'Hybrid', 'Commodity', 'RealAsset', 'Cash', 'Insurance', 'Liability'
    )
  );

-- STEP 6: Add comments for documentation
comment on column public.assets.asset_class is 
  'Detailed asset class: Equity | FixedIncome | Hybrid | Commodity | RealAsset | Cash | Insurance | Liability';

comment on column public.assets.top_level_bucket is 
  'User-facing top-level grouping: Growth | IncomeAllocation | Commodity | RealAsset | Cash | Insurance | Liability';

comment on column public.assets.risk_behavior is 
  'Risk-return behavior: Growth | Defensive | Hedge | Liquidity | Protection | Obligation';

comment on column public.assets.valuation_method is 
  'How the asset is valued: MarketLinked | InterestBased | NAVBased | Manual';

-- STEP 7: Create indexes for fast classification lookups
create index if not exists idx_assets_top_level_bucket on public.assets(top_level_bucket);
create index if not exists idx_assets_asset_class on public.assets(asset_class);
create index if not exists idx_assets_risk_behavior on public.assets(risk_behavior);

-- STEP 8: Add classification fields to holdings table
alter table public.holdings
  add column if not exists asset_class text,
  add column if not exists top_level_bucket text,
  add column if not exists risk_behavior text,
  add column if not exists valuation_method text;

-- STEP 9: Add comments for holdings
comment on column public.holdings.asset_class is 
  'Denormalized asset_class from assets table for fast queries';

comment on column public.holdings.top_level_bucket is 
  'Denormalized top_level_bucket from assets table for fast queries';

-- STEP 10: Create indexes for holdings classification
create index if not exists idx_holdings_top_level_bucket on public.holdings(top_level_bucket);
create index if not exists idx_holdings_asset_class on public.holdings(asset_class);

-- STEP 11: Create function to sync classification from assets to holdings
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

-- STEP 12: Create trigger to sync on asset updates
drop trigger if exists sync_holding_classification_trigger on public.assets;
create trigger sync_holding_classification_trigger
  after update on public.assets
  for each row
  execute function sync_holding_classification();

-- STEP 13: Create function to sync when new holding is created
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

-- STEP 14: Create trigger to sync on holding insert
drop trigger if exists sync_new_holding_classification_trigger on public.holdings;
create trigger sync_new_holding_classification_trigger
  before insert on public.holdings
  for each row
  execute function sync_new_holding_classification();
