export interface AssetCatalogItem {
  id: string;
  label: string;
  icon: string;
  description: string;
  requiredCapability?: string;
  requiredPlan?: 'Pro' | 'Premium';
}

export interface AssetCatalogGroup {
  id: string;
  label: string;
  items: AssetCatalogItem[];
}

/**
 * Shared asset catalog used by:
 * - /onboarding/select
 * - /portfolio/holdings/add
 */
export const ASSET_CATALOG_GROUPS: AssetCatalogGroup[] = [
  {
    id: 'growth_assets',
    label: 'GROWTH ASSETS',
    items: [
      { id: 'mutual_funds', label: 'Mutual Funds', icon: '💰', description: 'SIPs, lump-sum, index funds, ELSS' },
      { id: 'stocks', label: 'Stocks / Shares', icon: '📈', description: 'NSE / BSE listed equities' },
      { id: 'etf', label: 'ETFs', icon: '📊', description: 'Nifty BeES, Gold ETFs, etc.' },
    ],
  },
  {
    id: 'income_fixed',
    label: 'INCOME & FIXED',
    items: [
      { id: 'fixed_deposits', label: 'Fixed Deposits / RDs', icon: '🏦', description: 'Bank FDs, recurring deposits' },
      { id: 'bonds', label: 'Bonds', icon: '📜', description: 'Government, corporate, tax-free bonds' },
      { id: 'epf', label: 'EPF', icon: '🛡️', description: 'Employee Provident Fund' },
      { id: 'ppf', label: 'PPF', icon: '📘', description: 'Public Provident Fund' },
      { id: 'nps', label: 'NPS', icon: '👴', description: 'National Pension System' },
    ],
  },
  {
    id: 'real_assets',
    label: 'REAL ASSETS',
    items: [
      {
        id: 'real_estate',
        label: 'Property / Real Estate',
        icon: '🏠',
        description: 'Residential, commercial, land',
        requiredCapability: 'manage_real_assets',
        requiredPlan: 'Pro',
      },
    ],
  },
  {
    id: 'commodities',
    label: 'COMMODITIES',
    items: [
      {
        id: 'gold',
        label: 'Gold',
        icon: '🥇',
        description: 'Physical gold, SGB, gold funds',
        requiredCapability: 'manage_commodities',
        requiredPlan: 'Pro',
      },
      {
        id: 'silver',
        label: 'Silver',
        icon: '🪙',
        description: 'Physical silver or silver ETFs',
        requiredCapability: 'manage_commodities',
        requiredPlan: 'Pro',
      },
    ],
  },
  {
    id: 'cash',
    label: 'CASH',
    items: [
      { id: 'savings_cash', label: 'Savings / Liquid Funds', icon: '💵', description: 'Bank savings, liquid funds' },
    ],
  },
  {
    id: 'protection',
    label: 'PROTECTION',
    items: [
      {
        id: 'life_insurance',
        label: 'Life Insurance',
        icon: '🛡️',
        description: 'Term, whole-life, ULIP',
        requiredCapability: 'manage_insurance',
        requiredPlan: 'Pro',
      },
      {
        id: 'health_insurance',
        label: 'Health Insurance',
        icon: '🩺',
        description: 'Family floater, mediclaim',
        requiredCapability: 'manage_insurance',
        requiredPlan: 'Pro',
      },
    ],
  },
  {
    id: 'liabilities',
    label: 'LIABILITIES',
    items: [
      {
        id: 'loans_liabilities',
        label: 'Loans & EMIs',
        icon: '🏧',
        description: 'Home loan, car loan, personal loan',
        requiredCapability: 'manage_liabilities',
        requiredPlan: 'Pro',
      },
    ],
  },
];

export const ASSET_CATALOG_BY_ID = ASSET_CATALOG_GROUPS
  .flatMap((g) => g.items)
  .reduce<Record<string, AssetCatalogItem>>((acc, item) => {
    acc[item.id] = item;
    return acc;
  }, {});
