/**
 * Popular Gold ETFs in India
 * Data from mf_scheme_master table - includes scheme_code for NAV lookup
 */

export interface GoldETF {
  name: string;
  symbol: string;
  schemeCode: string; // AMFI scheme code for NAV lookup
  isin: string;
  exchange: 'NSE' | 'BSE';
  amc: string;
}

export const GOLD_ETFS: GoldETF[] = [
  {
    name: 'Nippon India ETF Gold BeES',
    symbol: 'GOLDBEES',
    schemeCode: '140088',
    isin: 'INF204KB17I5',
    exchange: 'NSE',
    amc: 'Nippon India MF',
  },
  {
    name: 'SBI Gold ETF',
    symbol: 'SETFGOLD',
    schemeCode: '111954',
    isin: 'INF200KA16D8',
    exchange: 'NSE',
    amc: 'SBI MF',
  },
  {
    name: 'ICICI Prudential Gold ETF',
    symbol: 'ICICIGOLD',
    schemeCode: '113076',
    isin: 'INF109KC1NT3',
    exchange: 'NSE',
    amc: 'ICICI Prudential MF',
  },
  {
    name: 'HDFC Gold ETF',
    symbol: 'HDFCGOLD',
    schemeCode: '113049',
    isin: 'INF179KC1981',
    exchange: 'NSE',
    amc: 'HDFC MF',
  },
  {
    name: 'Axis Gold ETF',
    symbol: 'AXISGOLD',
    schemeCode: '113434',
    isin: 'INF846K01W80',
    exchange: 'NSE',
    amc: 'Axis MF',
  },
  {
    name: 'Kotak Gold ETF',
    symbol: 'KOTAKGOLD',
    schemeCode: '106193',
    isin: 'INF174KA1HJ8',
    exchange: 'NSE',
    amc: 'Kotak MF',
  },
  {
    name: 'Quantum Gold Fund',
    symbol: 'QGOLDHALF',
    schemeCode: '107693',
    isin: 'INF082J01408',
    exchange: 'NSE',
    amc: 'Quantum MF',
  },
  {
    name: 'Aditya Birla Sun Life Gold ETF',
    symbol: 'ABSLGOLD',
    schemeCode: '115127',
    isin: 'INF209KB18D3',
    exchange: 'NSE',
    amc: 'Aditya Birla Sun Life MF',
  },
  {
    name: 'Mirae Asset Gold ETF',
    symbol: 'MIRAEGOLD',
    schemeCode: '151416',
    isin: 'INF769K01JP9',
    exchange: 'NSE',
    amc: 'Mirae Asset MF',
  },
];
