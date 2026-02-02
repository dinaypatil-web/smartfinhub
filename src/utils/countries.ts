import type { CountryOption } from '@/types/types';

export const countries: CountryOption[] = [
  { code: 'US', name: 'United States', currency: 'USD' },
  { code: 'GB', name: 'United Kingdom', currency: 'GBP' },
  { code: 'EU', name: 'European Union', currency: 'EUR' },
  { code: 'JP', name: 'Japan', currency: 'JPY' },
  { code: 'CN', name: 'China', currency: 'CNY' },
  { code: 'IN', name: 'India', currency: 'INR' },
  { code: 'CA', name: 'Canada', currency: 'CAD' },
  { code: 'AU', name: 'Australia', currency: 'AUD' },
  { code: 'SG', name: 'Singapore', currency: 'SGD' },
  { code: 'HK', name: 'Hong Kong', currency: 'HKD' },
  { code: 'CH', name: 'Switzerland', currency: 'CHF' },
  { code: 'SE', name: 'Sweden', currency: 'SEK' },
  { code: 'NO', name: 'Norway', currency: 'NOK' },
  { code: 'DK', name: 'Denmark', currency: 'DKK' },
  { code: 'NZ', name: 'New Zealand', currency: 'NZD' },
  { code: 'MX', name: 'Mexico', currency: 'MXN' },
  { code: 'BR', name: 'Brazil', currency: 'BRL' },
  { code: 'ZA', name: 'South Africa', currency: 'ZAR' },
  { code: 'AE', name: 'United Arab Emirates', currency: 'AED' },
  { code: 'SA', name: 'Saudi Arabia', currency: 'SAR' },
];

export const currencies = [
  'USD', 'EUR', 'GBP', 'JPY', 'CNY', 'INR', 'CAD', 'AUD', 
  'SGD', 'HKD', 'CHF', 'SEK', 'NOK', 'DKK', 'NZD', 'MXN', 
  'BRL', 'ZAR', 'AED', 'SAR'
];

export function getCountryByCode(code: string): CountryOption | undefined {
  return countries.find(c => c.code === code);
}

export function getCurrencySymbol(currency: string): string {
  const symbols: Record<string, string> = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    JPY: '¥',
    CNY: '¥',
    INR: '₹',
    CAD: 'C$',
    AUD: 'A$',
    SGD: 'S$',
    HKD: 'HK$',
    CHF: 'CHF',
    SEK: 'kr',
    NOK: 'kr',
    DKK: 'kr',
    NZD: 'NZ$',
    MXN: 'MX$',
    BRL: 'R$',
    ZAR: 'R',
    AED: 'د.إ',
    SAR: '﷼'
  };
  return symbols[currency] || currency;
}
