import { SupportedCurrency, CURRENCY_SYMBOLS } from '@/types/workspace';

export function formatCurrencyShort(value: number, currency: SupportedCurrency = 'INR'): string {
  if (!isFinite(value) || isNaN(value)) return `${CURRENCY_SYMBOLS[currency]}0`;
  const sym = CURRENCY_SYMBOLS[currency];
  const abs = Math.abs(value);

  if (currency === 'INR') {
    if (abs >= 10_000_000) return `${sym}${(value / 10_000_000).toFixed(1)}Cr`;
    if (abs >= 100_000)    return `${sym}${(value / 100_000).toFixed(1)}L`;
    if (abs >= 1_000)      return `${sym}${(value / 1_000).toFixed(0)}K`;
    return `${sym}${Math.round(value)}`;
  } else {
    if (abs >= 1_000_000_000) return `${sym}${(value / 1_000_000_000).toFixed(1)}B`;
    if (abs >= 1_000_000)     return `${sym}${(value / 1_000_000).toFixed(1)}M`;
    if (abs >= 1_000)         return `${sym}${(value / 1_000).toFixed(0)}K`;
    return `${sym}${Math.round(value)}`;
  }
}

export function formatCurrency(value: number, currency: SupportedCurrency = 'INR'): string {
  if (!isFinite(value) || isNaN(value)) return `${CURRENCY_SYMBOLS[currency]}0`;
  const sym = CURRENCY_SYMBOLS[currency];
  const abs = Math.abs(value);

  if (currency === 'INR') {
    if (abs >= 10_000_000) return `${sym}${(value / 10_000_000).toFixed(2)} Cr`;
    if (abs >= 100_000)    return `${sym}${(value / 100_000).toFixed(2)} L`;
    return `${sym}${Math.round(value).toLocaleString('en-IN')}`;
  } else {
    if (abs >= 1_000_000_000) return `${sym}${(value / 1_000_000_000).toFixed(2)}B`;
    if (abs >= 1_000_000)     return `${sym}${(value / 1_000_000).toFixed(2)}M`;
    if (abs >= 1_000)         return `${sym}${(value / 1_000).toFixed(1)}K`;
    return `${sym}${Math.round(value).toLocaleString()}`;
  }
}

export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}
