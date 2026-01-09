/**
 * Type definitions for the new asset-focused onboarding flow
 */

/**
 * Investment categories that users can select
 */
export type InvestmentCategory = 
  // Growth Investments
  | 'mutual_funds'
  | 'stocks'
  | 'etf'
  // Safe / Fixed Investments
  | 'fixed_deposits'
  | 'epf_ppf_nps'
  // Real Assets
  | 'gold'
  | 'real_estate'
  // Protection & Retirement
  | 'insurance'
  | 'pension_retirement'
  // Others
  | 'crypto_startups_aifs'
  | 'esops'
  | 'not_sure';

/**
 * Add method options for each asset category
 */
export type AddMethod = 'upload_cas' | 'upload_broker' | 'upload_amc' | 'manual' | 'skip';

/**
 * Mapping of categories to their database asset types
 */
export const CATEGORY_TO_ASSET_TYPES: Record<InvestmentCategory, string[]> = {
  mutual_funds: ['mutual_fund'],
  stocks: ['equity'],
  etf: ['etf'],
  fixed_deposits: ['fd'],
  epf_ppf_nps: ['epf', 'ppf', 'nps'],
  gold: ['gold'],
  real_estate: ['other'], // Real estate stored as 'other' type
  insurance: ['other'],
  pension_retirement: ['nps', 'other'],
  crypto_startups_aifs: ['other'],
  esops: ['equity', 'other'],
  not_sure: [], // No asset types for "not sure"
};

/**
 * Available add methods per category
 */
export interface CategoryAddMethods {
  mutual_funds: Array<'upload_cas' | 'upload_amc' | 'manual' | 'skip'>;
  stocks: Array<'upload_broker' | 'manual' | 'skip'>;
  etf: Array<'upload_broker' | 'manual' | 'skip'>;
  fixed_deposits: Array<'manual' | 'skip'>;
  epf_ppf_nps: Array<'manual' | 'skip'>;
  gold: Array<'manual' | 'skip'>;
  real_estate: Array<'manual' | 'skip'>;
  insurance: Array<'manual' | 'skip'>;
  pension_retirement: Array<'manual' | 'skip'>;
  crypto_startups_aifs: Array<'manual' | 'skip'>;
  esops: Array<'manual' | 'skip'>;
  not_sure: Array<'skip'>;
}

/**
 * Asset status in the setup queue
 */
export type AssetStatus = 'not_added' | 'added' | 'skipped';

/**
 * Onboarding state - tracks selections but doesn't create assets until user confirms
 */
export interface OnboardingState {
  selectedCategories: InvestmentCategory[];
  categoryAddMethods: Partial<Record<InvestmentCategory, AddMethod>>;
  categoryStatus: Partial<Record<InvestmentCategory, AssetStatus>>;
  uploadedFiles: Partial<Record<InvestmentCategory, File[]>>;
  manualEntries: Array<{
    category: InvestmentCategory;
    data: any; // Form data for manual entry
  }>;
}

/**
 * Category metadata for display
 */
export interface CategoryMetadata {
  id: InvestmentCategory;
  label: string;
  description?: string;
  icon?: string;
  group: 'growth' | 'safe' | 'real_assets' | 'protection' | 'others';
}

/**
 * Add method metadata for display
 */
export interface AddMethodMetadata {
  id: AddMethod;
  label: string;
  description?: string;
  recommended?: boolean;
}

/**
 * Category metadata for display
 */
export const CATEGORY_METADATA: Record<InvestmentCategory, CategoryMetadata> = {
  // Growth Investments
  mutual_funds: {
    id: 'mutual_funds',
    label: 'Mutual Funds',
    icon: '💰',
    group: 'growth',
  },
  stocks: {
    id: 'stocks',
    label: 'Stocks / Shares',
    icon: '📈',
    group: 'growth',
  },
  etf: {
    id: 'etf',
    label: 'ETFs',
    icon: '📊',
    group: 'growth',
  },
  // Safe / Fixed Investments
  fixed_deposits: {
    id: 'fixed_deposits',
    label: 'Fixed Deposits / RDs',
    icon: '🏦',
    group: 'safe',
  },
  epf_ppf_nps: {
    id: 'epf_ppf_nps',
    label: 'EPF / PPF / NPS',
    icon: '🛡️',
    group: 'safe',
  },
  // Real Assets
  gold: {
    id: 'gold',
    label: 'Gold',
    icon: '🥇',
    group: 'real_assets',
  },
  real_estate: {
    id: 'real_estate',
    label: 'Real Estate',
    icon: '🏠',
    group: 'real_assets',
  },
  // Protection & Retirement
  insurance: {
    id: 'insurance',
    label: 'Insurance (Life / Health)',
    icon: '🛡️',
    group: 'protection',
  },
  pension_retirement: {
    id: 'pension_retirement',
    label: 'Pension / Retirement Plans',
    icon: '👴',
    group: 'protection',
  },
  // Others
  crypto_startups_aifs: {
    id: 'crypto_startups_aifs',
    label: 'Crypto / Startups / AIFs',
    icon: '🚀',
    group: 'others',
  },
  esops: {
    id: 'esops',
    label: 'ESOPs / Employer Benefits',
    icon: '💼',
    group: 'others',
  },
  not_sure: {
    id: 'not_sure',
    label: 'Not sure / I\'ll add later',
    icon: '❓',
    group: 'others',
  },
};

/**
 * Group labels for display
 */
export const GROUP_LABELS: Record<string, string> = {
  growth: 'Growth Investments',
  safe: 'Safe / Fixed Investments',
  real_assets: 'Real Assets',
  protection: 'Protection & Retirement',
  others: 'Others',
};

/**
 * Add method metadata
 */
export const ADD_METHOD_METADATA: Record<AddMethod, AddMethodMetadata> = {
  upload_cas: {
    id: 'upload_cas',
    label: 'Upload CAS statement',
    description: 'Consolidated Account Statement from CDSL/NSDL',
    recommended: true,
  },
  upload_amc: {
    id: 'upload_amc',
    label: 'Upload AMC / broker statements',
    description: 'Statements from fund houses or brokers',
  },
  upload_broker: {
    id: 'upload_broker',
    label: 'Upload broker statement',
    description: 'CSV/Excel from Zerodha, Groww, etc.',
  },
  manual: {
    id: 'manual',
    label: 'Enter manually',
    description: 'Add investments one by one',
    recommended: true,
  },
  skip: {
    id: 'skip',
    label: 'Skip for now',
    description: 'Add later',
  },
};

/**
 * Available add methods per category (for validation)
 */
export const CATEGORY_ADD_METHODS: CategoryAddMethods = {
  mutual_funds: ['upload_cas', 'upload_amc', 'manual', 'skip'],
  stocks: ['upload_broker', 'manual', 'skip'],
  etf: ['upload_broker', 'manual', 'skip'],
  fixed_deposits: ['manual', 'skip'],
  epf_ppf_nps: ['manual', 'skip'],
  gold: ['manual', 'skip'],
  real_estate: ['manual', 'skip'],
  insurance: ['manual', 'skip'],
  pension_retirement: ['manual', 'skip'],
  crypto_startups_aifs: ['manual', 'skip'],
  esops: ['manual', 'skip'],
  not_sure: ['skip'],
};

