/**
 * Popular Gold ETFs in India
 * Data includes ISIN codes for price tracking
 */

export interface GoldETF {
  name: string;
  symbol: string;
  isin: string;
  exchange: 'NSE' | 'BSE';
  amc: string;
}

export const GOLD_ETFS: GoldETF[] = [
  {
    name: 'Nippon India ETF Gold BeES',
    symbol: 'GOLDBEES',
    isin: 'INF204KB14I2',
    exchange: 'NSE',
    amc: 'Nippon India MF',
  },
  {
    name: 'SBI Gold ETF',
    symbol: 'SETFGOLD',
    isin: 'INF200K01VB1',
    exchange: 'NSE',
    amc: 'SBI MF',
  },
  {
    name: 'ICICI Prudential Gold ETF',
    symbol: 'ICICIGOLD',
    isin: 'INF109KC1722',
    exchange: 'NSE',
    amc: 'ICICI Prudential MF',
  },
  {
    name: 'HDFC Gold ETF',
    symbol: 'HDFCGOLD',
    isin: 'INF179KC1AW3',
    exchange: 'NSE',
    amc: 'HDFC MF',
  },
  {
    name: 'Axis Gold ETF',
    symbol: 'AXISGOLD',
    isin: 'INF846K01EQ7',
    exchange: 'NSE',
    amc: 'Axis MF',
  },
  {
    name: 'Kotak Gold ETF',
    symbol: 'KOTAKGOLD',
    isin: 'INF174K01427',
    exchange: 'NSE',
    amc: 'Kotak MF',
  },
  {
    name: 'UTI Gold ETF',
    symbol: 'UTIGOLD',
    isin: 'INF789F1AXP4',
    exchange: 'NSE',
    amc: 'UTI MF',
  },
  {
    name: 'Quantum Gold Fund ETF',
    symbol: 'QGOLDHALF',
    isin: 'INF082J01014',
    exchange: 'NSE',
    amc: 'Quantum MF',
  },
  {
    name: 'Aditya Birla Sun Life Gold ETF',
    symbol: 'ABSLGOLD',
    isin: 'INF209KB1H27',
    exchange: 'NSE',
    amc: 'Aditya Birla Sun Life MF',
  },
];
