/**
 * Demo Portfolio Data
 * 
 * Realistic but fictional portfolio data for sandbox/demo mode.
 * Used to let users explore the product without signing up.
 * 
 * DESIGN PRINCIPLES:
 * - Realistic Indian investor portfolio
 * - Mix of asset types (equity, mutual funds, FDs, etc.)
 * - Realistic values and allocations
 * - No real company names or ISINs
 * - All totals calculated from holdings (consistent with real data)
 */

import { aggregatePortfolioData } from '@/lib/portfolio-aggregation';

// Raw holdings data - source of truth
const DEMO_HOLDINGS_RAW = [
  // Mutual Funds
  {
    id: 'demo-mf-1',
    name: 'Large Cap Equity Fund',
    symbol: null,
    isin: null,
    assetType: 'Mutual Fund',
    quantity: 1250,
    averagePrice: 45.5,
    investedValue: 56875,
    currentValue: 62500,
    sector: null,
  },
  {
    id: 'demo-mf-2',
    name: 'Mid Cap Growth Fund',
    symbol: null,
    isin: null,
    assetType: 'Mutual Fund',
    quantity: 850,
    averagePrice: 52.3,
    investedValue: 44455,
    currentValue: 51000,
    sector: null,
  },
  {
    id: 'demo-mf-3',
    name: 'Balanced Advantage Fund',
    symbol: null,
    isin: null,
    assetType: 'Mutual Fund',
    quantity: 2000,
    averagePrice: 38.2,
    investedValue: 76400,
    currentValue: 82000,
    sector: null,
  },
  {
    id: 'demo-mf-4',
    name: 'Small Cap Fund',
    symbol: null,
    isin: null,
    assetType: 'Mutual Fund',
    quantity: 1500,
    averagePrice: 35.8,
    investedValue: 53700,
    currentValue: 60000,
    sector: null,
  },
  // Equity
  {
    id: 'demo-eq-1',
    name: 'Tech Solutions Ltd',
    symbol: 'TECHSOL',
    isin: null,
    assetType: 'Equity',
    quantity: 100,
    averagePrice: 1250,
    investedValue: 125000,
    currentValue: 142000,
    sector: 'Technology',
  },
  {
    id: 'demo-eq-2',
    name: 'Financial Services Corp',
    symbol: 'FINSERV',
    isin: null,
    assetType: 'Equity',
    quantity: 200,
    averagePrice: 850,
    investedValue: 170000,
    currentValue: 195000,
    sector: 'Financial Services',
  },
  {
    id: 'demo-eq-3',
    name: 'Consumer Goods Inc',
    symbol: 'CONGOOD',
    isin: null,
    assetType: 'Equity',
    quantity: 150,
    averagePrice: 720,
    investedValue: 108000,
    currentValue: 118000,
    sector: 'Consumer Goods',
  },
  // Fixed Deposits
  {
    id: 'demo-fd-1',
    name: 'Bank Fixed Deposit',
    symbol: null,
    isin: null,
    assetType: 'Fixed Deposit',
    quantity: 1,
    averagePrice: 500000,
    investedValue: 500000,
    currentValue: 540000,
    sector: null,
  },
  {
    id: 'demo-fd-2',
    name: 'Corporate Fixed Deposit',
    symbol: null,
    isin: null,
    assetType: 'Fixed Deposit',
    quantity: 1,
    averagePrice: 300000,
    investedValue: 300000,
    currentValue: 330000,
    sector: null,
  },
  // PPF
  {
    id: 'demo-ppf-1',
    name: 'Public Provident Fund',
    symbol: null,
    isin: null,
    assetType: 'PPF',
    quantity: 1,
    averagePrice: 360000,
    investedValue: 360000,
    currentValue: 360000,
    sector: null,
  },
  // NPS
  {
    id: 'demo-nps-1',
    name: 'NPS Tier I',
    symbol: null,
    isin: null,
    assetType: 'NPS',
    quantity: 1,
    averagePrice: 450000,
    investedValue: 450000,
    currentValue: 480000,
    sector: null,
  },
  {
    id: 'demo-nps-2',
    name: 'NPS Tier II',
    symbol: null,
    isin: null,
    assetType: 'NPS',
    quantity: 1,
    averagePrice: 200000,
    investedValue: 200000,
    currentValue: 215000,
    sector: null,
  },
  // Gold
  {
    id: 'demo-gold-1',
    name: 'Gold ETF',
    symbol: null,
    isin: null,
    assetType: 'Gold',
    quantity: 50,
    averagePrice: 4200,
    investedValue: 210000,
    currentValue: 220000,
    sector: null,
  },
];

// Calculate totals and allocation from holdings (ensures consistency)
const DEMO_AGGREGATION = aggregatePortfolioData(DEMO_HOLDINGS_RAW.map(h => ({
  id: h.id,
  name: h.name,
  assetType: h.assetType,
  investedValue: h.investedValue,
  currentValue: h.currentValue,
})));

// Add allocation percentages to holdings
const DEMO_HOLDINGS_WITH_ALLOCATION = DEMO_HOLDINGS_RAW.map(holding => {
  const allocationPct = DEMO_AGGREGATION.totalInvested > 0 
    ? (holding.investedValue / DEMO_AGGREGATION.totalInvested) * 100 
    : 0;
  
  return {
    ...holding,
    allocationPct,
  };
});

// Calculate net worth change (demo value)
const DEMO_NET_WORTH_CHANGE = 2.3; // +2.3%

export const DEMO_PORTFOLIO = {
  metrics: {
    netWorth: DEMO_AGGREGATION.totalCurrent,
    netWorthChange: DEMO_NET_WORTH_CHANGE,
    riskScore: 65,
    riskLabel: 'Moderate',
    goalAlignment: 72,
  },
  allocation: DEMO_AGGREGATION.allocation,
  holdings: DEMO_HOLDINGS_WITH_ALLOCATION,
  topHoldings: DEMO_HOLDINGS_WITH_ALLOCATION
    .sort((a, b) => b.investedValue - a.investedValue)
    .slice(0, 3),
  insights: [
    {
      id: 1,
      type: 'info' as const,
      title: 'Portfolio Performance',
      description: 'Your portfolio has shown steady growth over the past quarter, with equity holdings contributing significantly to overall returns.',
    },
    {
      id: 2,
      type: 'opportunity' as const,
      title: 'Diversification Opportunity',
      description: 'Consider adding exposure to debt instruments to balance your equity-heavy allocation and reduce overall portfolio risk.',
    },
    {
      id: 3,
      type: 'info' as const,
      title: 'Tax Efficiency',
      description: 'Your PPF and ELSS investments provide tax benefits under Section 80C. Current tax-saving allocation is 8% of portfolio.',
    },
  ],
  hasData: DEMO_AGGREGATION.isValid,
  summary: {
    totalHoldings: DEMO_HOLDINGS_RAW.length,
    totalAssetTypes: DEMO_AGGREGATION.allocation.length,
    largestHoldingPct: Math.max(...DEMO_HOLDINGS_WITH_ALLOCATION.map(h => h.allocationPct)),
    lastUpdated: new Date().toISOString(),
  },
};

export const DEMO_DAILY_SUMMARY = {
  status: 'no_action_required' as const,
  summary: [
    'Your portfolio shows steady performance this week, with equity holdings up 2.3%.',
    `Allocation remains balanced across asset classes, with mutual funds at ${DEMO_AGGREGATION.allocation.find(a => a.name === 'Mutual Funds')?.percentage.toFixed(0) || 0}% and equity at ${DEMO_AGGREGATION.allocation.find(a => a.name === 'Equity')?.percentage.toFixed(0) || 0}%.`,
    'No significant changes or actions required at this time.',
  ],
  risk_alignment: {
    status: 'aligned' as const,
    message: 'Your portfolio risk profile aligns well with your moderate risk tolerance.',
  },
  goal_progress: {
    status: 'on_track' as const,
    message: 'You are on track to meet your long-term financial goals.',
  },
};

export const DEMO_WEEKLY_SUMMARY = {
  summary: [
    `Portfolio value increased by ₹${((DEMO_AGGREGATION.totalCurrent * DEMO_NET_WORTH_CHANGE) / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })} (${DEMO_NET_WORTH_CHANGE}%) over the past week.`,
    'Equity holdings performed well, with Financial Services Corp and Tech Solutions Ltd showing strong gains.',
    'Fixed deposits continue to provide stable returns, contributing to portfolio stability.',
    'Overall allocation remains well-diversified across asset classes.',
  ],
  key_changes: [
    'Equity allocation increased slightly due to market appreciation.',
    'No new investments or redemptions this week.',
  ],
  next_steps: [
    'Continue monitoring portfolio performance.',
    'Consider rebalancing if allocation drifts significantly from target.',
  ],
};
