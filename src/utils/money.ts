import { ExchangeRates } from '../types';

// Used until real rates are saved or fetched; change them from the wallet screen
export const DEFAULT_RATES: ExchangeRates = { USD: 50, EUR: 55, SAR: 13.3, updatedAt: '' };

// Subscriptions store the currency as a symbol ('$', 'ج.م') or a code ('EUR', 'SAR')
export const currencyCode = (currency: string): 'EGP' | 'USD' | 'EUR' | 'SAR' => {
  const c = (currency || '').trim().toUpperCase();
  if (c === '$' || c === 'USD') return 'USD';
  if (c === 'EUR' || c === '€') return 'EUR';
  if (c === 'SAR') return 'SAR';
  return 'EGP';
};

export const rateFor = (currency: string, rates: ExchangeRates) => {
  const code = currencyCode(currency);
  return code === 'EGP' ? 1 : rates[code] || DEFAULT_RATES[code];
};

export const toEgp = (amount: number, currency: string, rates: ExchangeRates) =>
  Math.round((Number(amount) || 0) * rateFor(currency, rates) * 100) / 100;

// "$22.5", "1,200 ج.م", "30 EUR" — the amount in its own currency
export const formatMoney = (amount: number, currency: string) => {
  const n = (Math.round((Number(amount) || 0) * 100) / 100).toLocaleString('en-US', { maximumFractionDigits: 2 });
  const code = currencyCode(currency);
  if (code === 'USD') return `$${n}`;
  if (code === 'EGP') return `${n} ج.م`;
  return `${n} ${code}`;
};

export const formatEgp = (n: number) =>
  `${(Math.round(n * 100) / 100).toLocaleString('en-US', { maximumFractionDigits: 2 })} ج.م`;

// Live rates from a free public API (no key); returns null when offline or blocked
export const fetchLiveRates = async (): Promise<ExchangeRates | null> => {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD');
    if (!res.ok) return null;
    const data = await res.json();
    const r = data?.rates;
    if (!r?.EGP || !r?.EUR || !r?.SAR) return null;
    const round = (n: number) => Math.round(n * 100) / 100;
    return {
      USD: round(r.EGP),
      EUR: round(r.EGP / r.EUR),
      SAR: round(r.EGP / r.SAR),
      updatedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
};
