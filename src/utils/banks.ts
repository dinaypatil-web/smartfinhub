import type { BankOption } from '@/types/types';

export const banks: BankOption[] = [
  // United States Banks
  { name: 'JPMorgan Chase', logo: 'https://logo.clearbit.com/chase.com', country: 'US' },
  { name: 'Bank of America', logo: 'https://logo.clearbit.com/bankofamerica.com', country: 'US' },
  { name: 'Wells Fargo', logo: 'https://logo.clearbit.com/wellsfargo.com', country: 'US' },
  { name: 'Citibank', logo: 'https://logo.clearbit.com/citibank.com', country: 'US' },
  { name: 'U.S. Bank', logo: 'https://logo.clearbit.com/usbank.com', country: 'US' },
  { name: 'PNC Bank', logo: 'https://logo.clearbit.com/pnc.com', country: 'US' },
  { name: 'Capital One', logo: 'https://logo.clearbit.com/capitalone.com', country: 'US' },
  { name: 'TD Bank', logo: 'https://logo.clearbit.com/td.com', country: 'US' },
  { name: 'Bank of New York Mellon', logo: 'https://logo.clearbit.com/bnymellon.com', country: 'US' },
  { name: 'State Street Corporation', logo: 'https://logo.clearbit.com/statestreet.com', country: 'US' },
  { name: 'Goldman Sachs', logo: 'https://logo.clearbit.com/goldmansachs.com', country: 'US' },
  { name: 'Morgan Stanley', logo: 'https://logo.clearbit.com/morganstanley.com', country: 'US' },
  { name: 'American Express', logo: 'https://logo.clearbit.com/americanexpress.com', country: 'US' },
  { name: 'Charles Schwab', logo: 'https://logo.clearbit.com/schwab.com', country: 'US' },
  { name: 'Ally Bank', logo: 'https://logo.clearbit.com/ally.com', country: 'US' },
  { name: 'Discover Bank', logo: 'https://logo.clearbit.com/discover.com', country: 'US' },
  { name: 'Citizens Bank', logo: 'https://logo.clearbit.com/citizensbank.com', country: 'US' },
  { name: 'Fifth Third Bank', logo: 'https://logo.clearbit.com/53.com', country: 'US' },
  { name: 'KeyBank', logo: 'https://logo.clearbit.com/key.com', country: 'US' },
  { name: 'Regions Bank', logo: 'https://logo.clearbit.com/regions.com', country: 'US' },
  { name: 'M&T Bank', logo: 'https://logo.clearbit.com/mtb.com', country: 'US' },
  { name: 'Huntington Bank', logo: 'https://logo.clearbit.com/huntington.com', country: 'US' },
  { name: 'BMO Harris Bank', logo: 'https://logo.clearbit.com/bmoharris.com', country: 'US' },
  { name: 'Santander Bank', logo: 'https://logo.clearbit.com/santanderbank.com', country: 'US' },
  { name: 'SunTrust Bank', logo: 'https://logo.clearbit.com/suntrust.com', country: 'US' },

  // United Kingdom Banks
  { name: 'HSBC UK', logo: 'https://logo.clearbit.com/hsbc.co.uk', country: 'GB' },
  { name: 'Barclays', logo: 'https://logo.clearbit.com/barclays.com', country: 'GB' },
  { name: 'Lloyds Bank', logo: 'https://logo.clearbit.com/lloydsbank.com', country: 'GB' },
  { name: 'NatWest', logo: 'https://logo.clearbit.com/natwest.com', country: 'GB' },
  { name: 'Royal Bank of Scotland', logo: 'https://logo.clearbit.com/rbs.co.uk', country: 'GB' },
  { name: 'Santander UK', logo: 'https://logo.clearbit.com/santander.co.uk', country: 'GB' },
  { name: 'Nationwide Building Society', logo: 'https://logo.clearbit.com/nationwide.co.uk', country: 'GB' },
  { name: 'Halifax', logo: 'https://logo.clearbit.com/halifax.co.uk', country: 'GB' },
  { name: 'TSB Bank', logo: 'https://logo.clearbit.com/tsb.co.uk', country: 'GB' },
  { name: 'Metro Bank', logo: 'https://logo.clearbit.com/metrobankonline.co.uk', country: 'GB' },
  { name: 'Monzo', logo: 'https://logo.clearbit.com/monzo.com', country: 'GB' },
  { name: 'Revolut', logo: 'https://logo.clearbit.com/revolut.com', country: 'GB' },
  { name: 'Starling Bank', logo: 'https://logo.clearbit.com/starlingbank.com', country: 'GB' },
  { name: 'Virgin Money', logo: 'https://logo.clearbit.com/virginmoney.com', country: 'GB' },
  { name: 'Co-operative Bank', logo: 'https://logo.clearbit.com/co-operativebank.co.uk', country: 'GB' },

  // European Union Banks
  { name: 'Deutsche Bank', logo: 'https://logo.clearbit.com/db.com', country: 'EU' },
  { name: 'BNP Paribas', logo: 'https://logo.clearbit.com/bnpparibas.com', country: 'EU' },
  { name: 'Santander', logo: 'https://logo.clearbit.com/santander.com', country: 'EU' },
  { name: 'Crédit Agricole', logo: 'https://logo.clearbit.com/credit-agricole.com', country: 'EU' },
  { name: 'Société Générale', logo: 'https://logo.clearbit.com/societegenerale.com', country: 'EU' },
  { name: 'ING Bank', logo: 'https://logo.clearbit.com/ing.com', country: 'EU' },
  { name: 'UniCredit', logo: 'https://logo.clearbit.com/unicredit.eu', country: 'EU' },
  { name: 'Intesa Sanpaolo', logo: 'https://logo.clearbit.com/intesasanpaolo.com', country: 'EU' },
  { name: 'BBVA', logo: 'https://logo.clearbit.com/bbva.com', country: 'EU' },
  { name: 'Commerzbank', logo: 'https://logo.clearbit.com/commerzbank.com', country: 'EU' },
  { name: 'Rabobank', logo: 'https://logo.clearbit.com/rabobank.com', country: 'EU' },
  { name: 'ABN AMRO', logo: 'https://logo.clearbit.com/abnamro.com', country: 'EU' },
  { name: 'KBC Bank', logo: 'https://logo.clearbit.com/kbc.com', country: 'EU' },
  { name: 'Nordea', logo: 'https://logo.clearbit.com/nordea.com', country: 'EU' },
  { name: 'CaixaBank', logo: 'https://logo.clearbit.com/caixabank.com', country: 'EU' },
  { name: 'Banco Sabadell', logo: 'https://logo.clearbit.com/bancosabadell.com', country: 'EU' },
  { name: 'Bankia', logo: 'https://logo.clearbit.com/bankia.com', country: 'EU' },
  { name: 'La Banque Postale', logo: 'https://logo.clearbit.com/labanquepostale.fr', country: 'EU' },
  { name: 'N26', logo: 'https://logo.clearbit.com/n26.com', country: 'EU' },
  { name: 'Bunq', logo: 'https://logo.clearbit.com/bunq.com', country: 'EU' },

  // India Banks
  { name: 'State Bank of India', logo: 'https://logo.clearbit.com/sbi.co.in', country: 'IN' },
  { name: 'HDFC Bank', logo: 'https://logo.clearbit.com/hdfcbank.com', country: 'IN' },
  { name: 'ICICI Bank', logo: 'https://logo.clearbit.com/icicibank.com', country: 'IN' },
  { name: 'Axis Bank', logo: 'https://logo.clearbit.com/axisbank.com', country: 'IN' },
  { name: 'Kotak Mahindra Bank', logo: 'https://logo.clearbit.com/kotak.com', country: 'IN' },
  { name: 'Punjab National Bank', logo: 'https://logo.clearbit.com/pnbindia.in', country: 'IN' },
  { name: 'Bank of Baroda', logo: 'https://logo.clearbit.com/bankofbaroda.in', country: 'IN' },
  { name: 'Canara Bank', logo: 'https://logo.clearbit.com/canarabank.com', country: 'IN' },
  { name: 'Union Bank of India', logo: 'https://logo.clearbit.com/unionbankofindia.co.in', country: 'IN' },
  { name: 'Bank of India', logo: 'https://logo.clearbit.com/bankofindia.co.in', country: 'IN' },
  { name: 'IndusInd Bank', logo: 'https://logo.clearbit.com/indusind.com', country: 'IN' },
  { name: 'Yes Bank', logo: 'https://logo.clearbit.com/yesbank.in', country: 'IN' },
  { name: 'IDFC First Bank', logo: 'https://logo.clearbit.com/idfcfirstbank.com', country: 'IN' },
  { name: 'Federal Bank', logo: 'https://logo.clearbit.com/federalbank.co.in', country: 'IN' },
  { name: 'South Indian Bank', logo: 'https://logo.clearbit.com/southindianbank.com', country: 'IN' },
  { name: 'Karnataka Bank', logo: 'https://logo.clearbit.com/ktkbank.com', country: 'IN' },
  { name: 'RBL Bank', logo: 'https://logo.clearbit.com/rblbank.com', country: 'IN' },
  { name: 'Bandhan Bank', logo: 'https://logo.clearbit.com/bandhanbank.com', country: 'IN' },
  { name: 'IDBI Bank', logo: 'https://logo.clearbit.com/idbibank.in', country: 'IN' },
  { name: 'Central Bank of India', logo: 'https://logo.clearbit.com/centralbankofindia.co.in', country: 'IN' },
  { name: 'Indian Bank', logo: 'https://logo.clearbit.com/indianbank.in', country: 'IN' },
  { name: 'UCO Bank', logo: 'https://logo.clearbit.com/ucobank.com', country: 'IN' },
  { name: 'Indian Overseas Bank', logo: 'https://logo.clearbit.com/iob.in', country: 'IN' },
  { name: 'Punjab & Sind Bank', logo: 'https://logo.clearbit.com/psbindia.com', country: 'IN' },
  { name: 'Bank of Maharashtra', logo: 'https://logo.clearbit.com/bankofmaharashtra.in', country: 'IN' },

  // Canada Banks
  { name: 'Royal Bank of Canada', logo: 'https://logo.clearbit.com/rbc.com', country: 'CA' },
  { name: 'Toronto-Dominion Bank', logo: 'https://logo.clearbit.com/td.com', country: 'CA' },
  { name: 'Bank of Nova Scotia', logo: 'https://logo.clearbit.com/scotiabank.com', country: 'CA' },
  { name: 'Bank of Montreal', logo: 'https://logo.clearbit.com/bmo.com', country: 'CA' },
  { name: 'Canadian Imperial Bank of Commerce', logo: 'https://logo.clearbit.com/cibc.com', country: 'CA' },
  { name: 'National Bank of Canada', logo: 'https://logo.clearbit.com/nbc.ca', country: 'CA' },
  { name: 'Desjardins Group', logo: 'https://logo.clearbit.com/desjardins.com', country: 'CA' },
  { name: 'Laurentian Bank', logo: 'https://logo.clearbit.com/laurentianbank.ca', country: 'CA' },
  { name: 'Canadian Western Bank', logo: 'https://logo.clearbit.com/cwbank.com', country: 'CA' },
  { name: 'Tangerine Bank', logo: 'https://logo.clearbit.com/tangerine.ca', country: 'CA' },

  // Australia Banks
  { name: 'Commonwealth Bank', logo: 'https://logo.clearbit.com/commbank.com.au', country: 'AU' },
  { name: 'Westpac', logo: 'https://logo.clearbit.com/westpac.com.au', country: 'AU' },
  { name: 'ANZ', logo: 'https://logo.clearbit.com/anz.com', country: 'AU' },
  { name: 'National Australia Bank', logo: 'https://logo.clearbit.com/nab.com.au', country: 'AU' },
  { name: 'Macquarie Bank', logo: 'https://logo.clearbit.com/macquarie.com', country: 'AU' },
  { name: 'Bendigo Bank', logo: 'https://logo.clearbit.com/bendigobank.com.au', country: 'AU' },
  { name: 'Bank of Queensland', logo: 'https://logo.clearbit.com/boq.com.au', country: 'AU' },
  { name: 'Suncorp Bank', logo: 'https://logo.clearbit.com/suncorp.com.au', country: 'AU' },
  { name: 'ING Australia', logo: 'https://logo.clearbit.com/ing.com.au', country: 'AU' },
  { name: 'AMP Bank', logo: 'https://logo.clearbit.com/amp.com.au', country: 'AU' },

  // Singapore Banks
  { name: 'DBS Bank', logo: 'https://logo.clearbit.com/dbs.com', country: 'SG' },
  { name: 'OCBC Bank', logo: 'https://logo.clearbit.com/ocbc.com', country: 'SG' },
  { name: 'United Overseas Bank', logo: 'https://logo.clearbit.com/uob.com.sg', country: 'SG' },
  { name: 'Maybank Singapore', logo: 'https://logo.clearbit.com/maybank.com', country: 'SG' },
  { name: 'Standard Chartered Singapore', logo: 'https://logo.clearbit.com/sc.com', country: 'SG' },
  { name: 'Citibank Singapore', logo: 'https://logo.clearbit.com/citibank.com.sg', country: 'SG' },
  { name: 'HSBC Singapore', logo: 'https://logo.clearbit.com/hsbc.com.sg', country: 'SG' },

  // Hong Kong Banks
  { name: 'HSBC Hong Kong', logo: 'https://logo.clearbit.com/hsbc.com.hk', country: 'HK' },
  { name: 'Hang Seng Bank', logo: 'https://logo.clearbit.com/hangseng.com', country: 'HK' },
  { name: 'Bank of China (Hong Kong)', logo: 'https://logo.clearbit.com/bochk.com', country: 'HK' },
  { name: 'Standard Chartered Hong Kong', logo: 'https://logo.clearbit.com/sc.com', country: 'HK' },
  { name: 'DBS Bank (Hong Kong)', logo: 'https://logo.clearbit.com/dbs.com.hk', country: 'HK' },
  { name: 'Bank of East Asia', logo: 'https://logo.clearbit.com/hkbea.com', country: 'HK' },
  { name: 'Citibank Hong Kong', logo: 'https://logo.clearbit.com/citibank.com.hk', country: 'HK' },

  // Switzerland Banks
  { name: 'UBS', logo: 'https://logo.clearbit.com/ubs.com', country: 'CH' },
  { name: 'Credit Suisse', logo: 'https://logo.clearbit.com/credit-suisse.com', country: 'CH' },
  { name: 'Julius Baer', logo: 'https://logo.clearbit.com/juliusbaer.com', country: 'CH' },
  { name: 'Raiffeisen Switzerland', logo: 'https://logo.clearbit.com/raiffeisen.ch', country: 'CH' },
  { name: 'PostFinance', logo: 'https://logo.clearbit.com/postfinance.ch', country: 'CH' },
  { name: 'Zürcher Kantonalbank', logo: 'https://logo.clearbit.com/zkb.ch', country: 'CH' },

  // Japan Banks
  { name: 'Mitsubishi UFJ Financial Group', logo: 'https://logo.clearbit.com/mufg.jp', country: 'JP' },
  { name: 'Sumitomo Mitsui Financial Group', logo: 'https://logo.clearbit.com/smfg.co.jp', country: 'JP' },
  { name: 'Mizuho Financial Group', logo: 'https://logo.clearbit.com/mizuhobank.com', country: 'JP' },
  { name: 'Resona Holdings', logo: 'https://logo.clearbit.com/resona-gr.co.jp', country: 'JP' },
  { name: 'Norinchukin Bank', logo: 'https://logo.clearbit.com/nochubank.or.jp', country: 'JP' },
  { name: 'Shinsei Bank', logo: 'https://logo.clearbit.com/shinseibank.com', country: 'JP' },
  { name: 'Japan Post Bank', logo: 'https://logo.clearbit.com/jp-bank.japanpost.jp', country: 'JP' },

  // China Banks
  { name: 'Industrial and Commercial Bank of China', logo: 'https://logo.clearbit.com/icbc.com.cn', country: 'CN' },
  { name: 'China Construction Bank', logo: 'https://logo.clearbit.com/ccb.com', country: 'CN' },
  { name: 'Agricultural Bank of China', logo: 'https://logo.clearbit.com/abchina.com', country: 'CN' },
  { name: 'Bank of China', logo: 'https://logo.clearbit.com/boc.cn', country: 'CN' },
  { name: 'Bank of Communications', logo: 'https://logo.clearbit.com/bankcomm.com', country: 'CN' },
  { name: 'China Merchants Bank', logo: 'https://logo.clearbit.com/cmbchina.com', country: 'CN' },
  { name: 'Postal Savings Bank of China', logo: 'https://logo.clearbit.com/psbc.com', country: 'CN' },
  { name: 'Industrial Bank', logo: 'https://logo.clearbit.com/cib.com.cn', country: 'CN' },
  { name: 'China Minsheng Bank', logo: 'https://logo.clearbit.com/cmbc.com.cn', country: 'CN' },
  { name: 'Shanghai Pudong Development Bank', logo: 'https://logo.clearbit.com/spdb.com.cn', country: 'CN' },

  // Sweden Banks
  { name: 'Nordea Sweden', logo: 'https://logo.clearbit.com/nordea.se', country: 'SE' },
  { name: 'Swedbank', logo: 'https://logo.clearbit.com/swedbank.se', country: 'SE' },
  { name: 'SEB', logo: 'https://logo.clearbit.com/seb.se', country: 'SE' },
  { name: 'Handelsbanken', logo: 'https://logo.clearbit.com/handelsbanken.se', country: 'SE' },
  { name: 'Länsförsäkringar Bank', logo: 'https://logo.clearbit.com/lansforsakringar.se', country: 'SE' },

  // Norway Banks
  { name: 'DNB', logo: 'https://logo.clearbit.com/dnb.no', country: 'NO' },
  { name: 'Nordea Norway', logo: 'https://logo.clearbit.com/nordea.no', country: 'NO' },
  { name: 'SpareBank 1', logo: 'https://logo.clearbit.com/sparebank1.no', country: 'NO' },
  { name: 'Danske Bank Norway', logo: 'https://logo.clearbit.com/danskebank.no', country: 'NO' },

  // Denmark Banks
  { name: 'Danske Bank', logo: 'https://logo.clearbit.com/danskebank.dk', country: 'DK' },
  { name: 'Nordea Denmark', logo: 'https://logo.clearbit.com/nordea.dk', country: 'DK' },
  { name: 'Jyske Bank', logo: 'https://logo.clearbit.com/jyskebank.dk', country: 'DK' },
  { name: 'Sydbank', logo: 'https://logo.clearbit.com/sydbank.dk', country: 'DK' },

  // New Zealand Banks
  { name: 'ANZ New Zealand', logo: 'https://logo.clearbit.com/anz.co.nz', country: 'NZ' },
  { name: 'ASB Bank', logo: 'https://logo.clearbit.com/asb.co.nz', country: 'NZ' },
  { name: 'Bank of New Zealand', logo: 'https://logo.clearbit.com/bnz.co.nz', country: 'NZ' },
  { name: 'Westpac New Zealand', logo: 'https://logo.clearbit.com/westpac.co.nz', country: 'NZ' },
  { name: 'Kiwibank', logo: 'https://logo.clearbit.com/kiwibank.co.nz', country: 'NZ' },

  // Mexico Banks
  { name: 'BBVA México', logo: 'https://logo.clearbit.com/bbva.mx', country: 'MX' },
  { name: 'Santander México', logo: 'https://logo.clearbit.com/santander.com.mx', country: 'MX' },
  { name: 'Citibanamex', logo: 'https://logo.clearbit.com/banamex.com', country: 'MX' },
  { name: 'Banorte', logo: 'https://logo.clearbit.com/banorte.com', country: 'MX' },
  { name: 'HSBC México', logo: 'https://logo.clearbit.com/hsbc.com.mx', country: 'MX' },
  { name: 'Scotiabank México', logo: 'https://logo.clearbit.com/scotiabank.com.mx', country: 'MX' },
  { name: 'Inbursa', logo: 'https://logo.clearbit.com/inbursa.com', country: 'MX' },

  // Brazil Banks
  { name: 'Banco do Brasil', logo: 'https://logo.clearbit.com/bb.com.br', country: 'BR' },
  { name: 'Itaú Unibanco', logo: 'https://logo.clearbit.com/itau.com.br', country: 'BR' },
  { name: 'Bradesco', logo: 'https://logo.clearbit.com/bradesco.com.br', country: 'BR' },
  { name: 'Caixa Econômica Federal', logo: 'https://logo.clearbit.com/caixa.gov.br', country: 'BR' },
  { name: 'Santander Brasil', logo: 'https://logo.clearbit.com/santander.com.br', country: 'BR' },
  { name: 'Banco Safra', logo: 'https://logo.clearbit.com/safra.com.br', country: 'BR' },
  { name: 'BTG Pactual', logo: 'https://logo.clearbit.com/btgpactual.com', country: 'BR' },
  { name: 'Nubank', logo: 'https://logo.clearbit.com/nubank.com.br', country: 'BR' },

  // South Africa Banks
  { name: 'Standard Bank', logo: 'https://logo.clearbit.com/standardbank.co.za', country: 'ZA' },
  { name: 'FirstRand Bank', logo: 'https://logo.clearbit.com/firstrand.co.za', country: 'ZA' },
  { name: 'Absa Group', logo: 'https://logo.clearbit.com/absa.co.za', country: 'ZA' },
  { name: 'Nedbank', logo: 'https://logo.clearbit.com/nedbank.co.za', country: 'ZA' },
  { name: 'Capitec Bank', logo: 'https://logo.clearbit.com/capitecbank.co.za', country: 'ZA' },
  { name: 'Investec', logo: 'https://logo.clearbit.com/investec.com', country: 'ZA' },

  // United Arab Emirates Banks
  { name: 'Emirates NBD', logo: 'https://logo.clearbit.com/emiratesnbd.com', country: 'AE' },
  { name: 'First Abu Dhabi Bank', logo: 'https://logo.clearbit.com/fab.ae', country: 'AE' },
  { name: 'Abu Dhabi Commercial Bank', logo: 'https://logo.clearbit.com/adcb.com', country: 'AE' },
  { name: 'Dubai Islamic Bank', logo: 'https://logo.clearbit.com/dib.ae', country: 'AE' },
  { name: 'Mashreq Bank', logo: 'https://logo.clearbit.com/mashreqbank.com', country: 'AE' },
  { name: 'RAKBANK', logo: 'https://logo.clearbit.com/rakbank.ae', country: 'AE' },
  { name: 'Commercial Bank of Dubai', logo: 'https://logo.clearbit.com/cbd.ae', country: 'AE' },

  // Saudi Arabia Banks
  { name: 'Al Rajhi Bank', logo: 'https://logo.clearbit.com/alrajhibank.com.sa', country: 'SA' },
  { name: 'National Commercial Bank', logo: 'https://logo.clearbit.com/alahli.com', country: 'SA' },
  { name: 'Riyad Bank', logo: 'https://logo.clearbit.com/riyadbank.com', country: 'SA' },
  { name: 'Samba Financial Group', logo: 'https://logo.clearbit.com/samba.com', country: 'SA' },
  { name: 'Saudi British Bank', logo: 'https://logo.clearbit.com/sabb.com', country: 'SA' },
  { name: 'Arab National Bank', logo: 'https://logo.clearbit.com/anb.com.sa', country: 'SA' },
  { name: 'Banque Saudi Fransi', logo: 'https://logo.clearbit.com/alfransi.com.sa', country: 'SA' },
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
