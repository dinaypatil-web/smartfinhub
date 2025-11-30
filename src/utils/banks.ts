import type { BankOption } from '@/types/types';

export const banks: BankOption[] = [
  { name: 'JPMorgan Chase', logo: 'https://logo.clearbit.com/chase.com', country: 'US' },
  { name: 'Bank of America', logo: 'https://logo.clearbit.com/bankofamerica.com', country: 'US' },
  { name: 'Wells Fargo', logo: 'https://logo.clearbit.com/wellsfargo.com', country: 'US' },
  { name: 'Citibank', logo: 'https://logo.clearbit.com/citibank.com', country: 'US' },
  { name: 'Goldman Sachs', logo: 'https://logo.clearbit.com/goldmansachs.com', country: 'US' },
  { name: 'Morgan Stanley', logo: 'https://logo.clearbit.com/morganstanley.com', country: 'US' },
  { name: 'HSBC', logo: 'https://logo.clearbit.com/hsbc.com', country: 'GB' },
  { name: 'Barclays', logo: 'https://logo.clearbit.com/barclays.com', country: 'GB' },
  { name: 'Lloyds Bank', logo: 'https://logo.clearbit.com/lloydsbank.com', country: 'GB' },
  { name: 'Deutsche Bank', logo: 'https://logo.clearbit.com/db.com', country: 'EU' },
  { name: 'BNP Paribas', logo: 'https://logo.clearbit.com/bnpparibas.com', country: 'EU' },
  { name: 'Santander', logo: 'https://logo.clearbit.com/santander.com', country: 'EU' },
  { name: 'Mitsubishi UFJ', logo: 'https://logo.clearbit.com/mufg.jp', country: 'JP' },
  { name: 'Mizuho Bank', logo: 'https://logo.clearbit.com/mizuhobank.com', country: 'JP' },
  { name: 'ICBC', logo: 'https://logo.clearbit.com/icbc.com.cn', country: 'CN' },
  { name: 'China Construction Bank', logo: 'https://logo.clearbit.com/ccb.com', country: 'CN' },
  { name: 'State Bank of India', logo: 'https://logo.clearbit.com/sbi.co.in', country: 'IN' },
  { name: 'HDFC Bank', logo: 'https://logo.clearbit.com/hdfcbank.com', country: 'IN' },
  { name: 'ICICI Bank', logo: 'https://logo.clearbit.com/icicibank.com', country: 'IN' },
  { name: 'Royal Bank of Canada', logo: 'https://logo.clearbit.com/rbc.com', country: 'CA' },
  { name: 'TD Bank', logo: 'https://logo.clearbit.com/td.com', country: 'CA' },
  { name: 'Commonwealth Bank', logo: 'https://logo.clearbit.com/commbank.com.au', country: 'AU' },
  { name: 'ANZ', logo: 'https://logo.clearbit.com/anz.com', country: 'AU' },
  { name: 'DBS Bank', logo: 'https://logo.clearbit.com/dbs.com', country: 'SG' },
  { name: 'UBS', logo: 'https://logo.clearbit.com/ubs.com', country: 'CH' },
  { name: 'Credit Suisse', logo: 'https://logo.clearbit.com/credit-suisse.com', country: 'CH' },
];

export function getBanksByCountry(countryCode: string): BankOption[] {
  return banks.filter(bank => bank.country === countryCode);
}

export function getBankLogo(bankName: string): string {
  const bank = banks.find(b => b.name.toLowerCase() === bankName.toLowerCase());
  if (bank) return bank.logo;
  
  // Try to generate a domain from the bank name
  const cleanName = bankName.toLowerCase()
    .replace(/\s+/g, '')
    .replace(/bank|financial|group|ltd|limited|inc|corporation|corp/gi, '');
  
  // Try Clearbit API first
  return `https://logo.clearbit.com/${cleanName}.com`;
}

export function getDefaultBankLogo(): string {
  // Fallback icon for banks without logos
  return 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0OCIgaGVpZ2h0PSI0OCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiMxRTNBOEEiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMyAyMWgxOCIvPjxwYXRoIGQ9Ik0zIDEwaDE4Ii8+PHBhdGggZD0iTTUgNmgxNGwtNy03eiIvPjxwYXRoIGQ9Ik00IDEwdjExIi8+PHBhdGggZD0iTTggMTB2MTEiLz48cGF0aCBkPSJNMTIgMTB2MTEiLz48cGF0aCBkPSJNMTYgMTB2MTEiLz48cGF0aCBkPSJNMjAgMTB2MTEiLz48L3N2Zz4=';
}
