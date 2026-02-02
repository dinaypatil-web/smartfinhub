import type { BankOption } from '@/types/types';

export const banks: BankOption[] = [
  // United States Banks
  { name: 'JPMorgan Chase', logo: 'https://www.google.com/s2/favicons?domain=chase.com&sz=128', country: 'US' },
  { name: 'Bank of America', logo: 'https://www.google.com/s2/favicons?domain=bankofamerica.com&sz=128', country: 'US' },
  { name: 'Wells Fargo', logo: 'https://www.google.com/s2/favicons?domain=wellsfargo.com&sz=128', country: 'US' },
  { name: 'Citibank', logo: 'https://www.google.com/s2/favicons?domain=citibank.com&sz=128', country: 'US' },
  { name: 'U.S. Bank', logo: 'https://www.google.com/s2/favicons?domain=usbank.com&sz=128', country: 'US' },
  { name: 'PNC Bank', logo: 'https://www.google.com/s2/favicons?domain=pnc.com&sz=128', country: 'US' },
  { name: 'Capital One', logo: 'https://www.google.com/s2/favicons?domain=capitalone.com&sz=128', country: 'US' },
  { name: 'TD Bank', logo: 'https://www.google.com/s2/favicons?domain=td.com&sz=128', country: 'US' },
  { name: 'Bank of New York Mellon', logo: 'https://www.google.com/s2/favicons?domain=bnymellon.com&sz=128', country: 'US' },
  { name: 'State Street Corporation', logo: 'https://www.google.com/s2/favicons?domain=statestreet.com&sz=128', country: 'US' },
  { name: 'Goldman Sachs', logo: 'https://www.google.com/s2/favicons?domain=goldmansachs.com&sz=128', country: 'US' },
  { name: 'Morgan Stanley', logo: 'https://www.google.com/s2/favicons?domain=morganstanley.com&sz=128', country: 'US' },
  { name: 'American Express', logo: 'https://www.google.com/s2/favicons?domain=americanexpress.com&sz=128', country: 'US' },
  { name: 'Charles Schwab', logo: 'https://www.google.com/s2/favicons?domain=schwab.com&sz=128', country: 'US' },
  { name: 'Ally Bank', logo: 'https://www.google.com/s2/favicons?domain=ally.com&sz=128', country: 'US' },
  { name: 'Discover Bank', logo: 'https://www.google.com/s2/favicons?domain=discover.com&sz=128', country: 'US' },
  { name: 'Citizens Bank', logo: 'https://www.google.com/s2/favicons?domain=citizensbank.com&sz=128', country: 'US' },
  { name: 'Fifth Third Bank', logo: 'https://www.google.com/s2/favicons?domain=53.com&sz=128', country: 'US' },
  { name: 'KeyBank', logo: 'https://www.google.com/s2/favicons?domain=key.com&sz=128', country: 'US' },
  { name: 'Regions Bank', logo: 'https://www.google.com/s2/favicons?domain=regions.com&sz=128', country: 'US' },
  { name: 'M&T Bank', logo: 'https://www.google.com/s2/favicons?domain=mtb.com&sz=128', country: 'US' },
  { name: 'Huntington Bank', logo: 'https://www.google.com/s2/favicons?domain=huntington.com&sz=128', country: 'US' },
  { name: 'BMO Harris Bank', logo: 'https://www.google.com/s2/favicons?domain=bmoharris.com&sz=128', country: 'US' },
  { name: 'Santander Bank', logo: 'https://www.google.com/s2/favicons?domain=santanderbank.com&sz=128', country: 'US' },
  { name: 'SunTrust Bank', logo: 'https://www.google.com/s2/favicons?domain=suntrust.com&sz=128', country: 'US' },

  // United Kingdom Banks
  { name: 'HSBC UK', logo: 'https://www.google.com/s2/favicons?domain=hsbc.co.uk&sz=128', country: 'GB' },
  { name: 'Barclays', logo: 'https://www.google.com/s2/favicons?domain=barclays.com&sz=128', country: 'GB' },
  { name: 'Lloyds Bank', logo: 'https://www.google.com/s2/favicons?domain=lloydsbank.com&sz=128', country: 'GB' },
  { name: 'NatWest', logo: 'https://www.google.com/s2/favicons?domain=natwest.com&sz=128', country: 'GB' },
  { name: 'Royal Bank of Scotland', logo: 'https://www.google.com/s2/favicons?domain=rbs.co.uk&sz=128', country: 'GB' },
  { name: 'Santander UK', logo: 'https://www.google.com/s2/favicons?domain=santander.co.uk&sz=128', country: 'GB' },
  { name: 'Nationwide Building Society', logo: 'https://www.google.com/s2/favicons?domain=nationwide.co.uk&sz=128', country: 'GB' },
  { name: 'Halifax', logo: 'https://www.google.com/s2/favicons?domain=halifax.co.uk&sz=128', country: 'GB' },
  { name: 'TSB Bank', logo: 'https://www.google.com/s2/favicons?domain=tsb.co.uk&sz=128', country: 'GB' },
  { name: 'Metro Bank', logo: 'https://www.google.com/s2/favicons?domain=metrobankonline.co.uk&sz=128', country: 'GB' },
  { name: 'Monzo', logo: 'https://www.google.com/s2/favicons?domain=monzo.com&sz=128', country: 'GB' },
  { name: 'Revolut', logo: 'https://www.google.com/s2/favicons?domain=revolut.com&sz=128', country: 'GB' },
  { name: 'Starling Bank', logo: 'https://www.google.com/s2/favicons?domain=starlingbank.com&sz=128', country: 'GB' },
  { name: 'Virgin Money', logo: 'https://www.google.com/s2/favicons?domain=virginmoney.com&sz=128', country: 'GB' },
  { name: 'Co-operative Bank', logo: 'https://www.google.com/s2/favicons?domain=co-operativebank.co.uk&sz=128', country: 'GB' },

  // European Union Banks
  { name: 'Deutsche Bank', logo: 'https://www.google.com/s2/favicons?domain=db.com&sz=128', country: 'EU' },
  { name: 'BNP Paribas', logo: 'https://www.google.com/s2/favicons?domain=bnpparibas.com&sz=128', country: 'EU' },
  { name: 'Santander', logo: 'https://www.google.com/s2/favicons?domain=santander.com&sz=128', country: 'EU' },
  { name: 'Crédit Agricole', logo: 'https://www.google.com/s2/favicons?domain=credit-agricole.com&sz=128', country: 'EU' },
  { name: 'Société Générale', logo: 'https://www.google.com/s2/favicons?domain=societegenerale.com&sz=128', country: 'EU' },
  { name: 'ING Bank', logo: 'https://www.google.com/s2/favicons?domain=ing.com&sz=128', country: 'EU' },
  { name: 'UniCredit', logo: 'https://www.google.com/s2/favicons?domain=unicredit.eu&sz=128', country: 'EU' },
  { name: 'Intesa Sanpaolo', logo: 'https://www.google.com/s2/favicons?domain=intesasanpaolo.com&sz=128', country: 'EU' },
  { name: 'BBVA', logo: 'https://www.google.com/s2/favicons?domain=bbva.com&sz=128', country: 'EU' },
  { name: 'Commerzbank', logo: 'https://www.google.com/s2/favicons?domain=commerzbank.com&sz=128', country: 'EU' },
  { name: 'Rabobank', logo: 'https://www.google.com/s2/favicons?domain=rabobank.com&sz=128', country: 'EU' },
  { name: 'ABN AMRO', logo: 'https://www.google.com/s2/favicons?domain=abnamro.com&sz=128', country: 'EU' },
  { name: 'KBC Bank', logo: 'https://www.google.com/s2/favicons?domain=kbc.com&sz=128', country: 'EU' },
  { name: 'Nordea', logo: 'https://www.google.com/s2/favicons?domain=nordea.com&sz=128', country: 'EU' },
  { name: 'CaixaBank', logo: 'https://www.google.com/s2/favicons?domain=caixabank.com&sz=128', country: 'EU' },
  { name: 'Banco Sabadell', logo: 'https://www.google.com/s2/favicons?domain=bancosabadell.com&sz=128', country: 'EU' },
  { name: 'Bankia', logo: 'https://www.google.com/s2/favicons?domain=bankia.com&sz=128', country: 'EU' },
  { name: 'La Banque Postale', logo: 'https://www.google.com/s2/favicons?domain=labanquepostale.fr&sz=128', country: 'EU' },
  { name: 'N26', logo: 'https://www.google.com/s2/favicons?domain=n26.com&sz=128', country: 'EU' },
  { name: 'Bunq', logo: 'https://www.google.com/s2/favicons?domain=bunq.com&sz=128', country: 'EU' },

  // India Banks
  { 
    name: 'State Bank of India', 
    logo: 'https://www.google.com/s2/favicons?domain=sbi.co.in&sz=128', 
    country: 'IN', 
    androidAppLink: 'https://play.google.com/store/apps/details?id=com.sbi.lotusintouch',
    iosAppLink: 'https://apps.apple.com/in/app/yono-sbi/id1206636728'
  },
  { 
    name: 'HDFC Bank', 
    logo: 'https://www.google.com/s2/favicons?domain=hdfcbank.com&sz=128', 
    country: 'IN', 
    androidAppLink: 'https://play.google.com/store/apps/details?id=com.snapwork.hdfc',
    iosAppLink: 'https://apps.apple.com/in/app/hdfcbank-mobilebankingapp/id430033626'
  },
  { 
    name: 'ICICI Bank', 
    logo: 'https://www.google.com/s2/favicons?domain=icicibank.com&sz=128', 
    country: 'IN', 
    androidAppLink: 'https://play.google.com/store/apps/details?id=com.csam.icici.bank.imobile',
    iosAppLink: 'https://apps.apple.com/in/app/imobile-pay-by-icici-bank/id1039140197'
  },
  { 
    name: 'Axis Bank', 
    logo: 'https://www.google.com/s2/favicons?domain=axisbank.com&sz=128', 
    country: 'IN', 
    androidAppLink: 'https://play.google.com/store/apps/details?id=com.axis.mobile',
    iosAppLink: 'https://apps.apple.com/in/app/axis-mobile/id1462266800'
  },
  { 
    name: 'Kotak Mahindra Bank', 
    logo: 'https://www.google.com/s2/favicons?domain=kotak.com&sz=128', 
    country: 'IN', 
    androidAppLink: 'https://play.google.com/store/apps/details?id=com.msf.kbank.mobile',
    iosAppLink: 'https://apps.apple.com/in/app/kotak-mobile-banking/id584518773'
  },
  { 
    name: 'Punjab National Bank', 
    logo: 'https://www.google.com/s2/favicons?domain=pnbindia.in&sz=128', 
    country: 'IN', 
    androidAppLink: 'https://play.google.com/store/apps/details?id=com.fss.pnbone',
    iosAppLink: 'https://apps.apple.com/in/app/pnb-one/id1455678874'
  },
  { 
    name: 'Bank of Baroda', 
    logo: 'https://www.google.com/s2/favicons?domain=bankofbaroda.in&sz=128', 
    country: 'IN', 
    androidAppLink: 'https://play.google.com/store/apps/details?id=com.bobibanking.bobworld',
    iosAppLink: 'https://apps.apple.com/in/app/bob-world/id1455440983'
  },
  { 
    name: 'Canara Bank', 
    logo: 'https://www.google.com/s2/favicons?domain=canarabank.com&sz=128', 
    country: 'IN', 
    androidAppLink: 'https://play.google.com/store/apps/details?id=com.canara.canaramobile',
    iosAppLink: 'https://apps.apple.com/in/app/canara-ai1-mobile-banking/id1462483812'
  },
  { 
    name: 'Union Bank of India', 
    logo: 'https://www.google.com/s2/favicons?domain=unionbankofindia.co.in&sz=128', 
    country: 'IN', 
    androidAppLink: 'https://play.google.com/store/apps/details?id=com.unionbank.ecommerce.mobile.android',
    iosAppLink: 'https://apps.apple.com/in/app/union-bank-mobile-banking/id1450073650'
  },
  { 
    name: 'Bank of India', 
    logo: 'https://www.google.com/s2/favicons?domain=bankofindia.co.in&sz=128', 
    country: 'IN', 
    androidAppLink: 'https://play.google.com/store/apps/details?id=com.boi.mobilebanking',
    iosAppLink: 'https://apps.apple.com/in/app/boi-mobile/id1462268992'
  },
  { 
    name: 'IndusInd Bank', 
    logo: 'https://www.google.com/s2/favicons?domain=indusind.com&sz=128', 
    country: 'IN', 
    androidAppLink: 'https://play.google.com/store/apps/details?id=com.indusind.mobile',
    iosAppLink: 'https://apps.apple.com/in/app/indusind-bank-mobile-banking/id1232225691'
  },
  { 
    name: 'Yes Bank', 
    logo: 'https://www.google.com/s2/favicons?domain=yesbank.in&sz=128', 
    country: 'IN', 
    androidAppLink: 'https://play.google.com/store/apps/details?id=com.yesbank.yesbankapp',
    iosAppLink: 'https://apps.apple.com/in/app/yes-mobile/id1462268992'
  },
  { 
    name: 'IDFC First Bank', 
    logo: 'https://www.google.com/s2/favicons?domain=idfcfirstbank.com&sz=128', 
    country: 'IN', 
    androidAppLink: 'https://play.google.com/store/apps/details?id=com.idfcfirstbank.optimus',
    iosAppLink: 'https://apps.apple.com/in/app/idfc-first-bank/id1448960242'
  },
  { name: 'Federal Bank', logo: 'https://www.google.com/s2/favicons?domain=federalbank.co.in&sz=128', country: 'IN' },
  { name: 'South Indian Bank', logo: 'https://www.google.com/s2/favicons?domain=southindianbank.com&sz=128', country: 'IN' },
  { name: 'Karnataka Bank', logo: 'https://www.google.com/s2/favicons?domain=ktkbank.com&sz=128', country: 'IN' },
  { name: 'RBL Bank', logo: 'https://www.google.com/s2/favicons?domain=rblbank.com&sz=128', country: 'IN' },
  { name: 'Bandhan Bank', logo: 'https://www.google.com/s2/favicons?domain=bandhanbank.com&sz=128', country: 'IN' },
  { name: 'IDBI Bank', logo: 'https://www.google.com/s2/favicons?domain=idbibank.in&sz=128', country: 'IN' },
  { name: 'Central Bank of India', logo: 'https://www.google.com/s2/favicons?domain=centralbankofindia.co.in&sz=128', country: 'IN' },
  { name: 'Indian Bank', logo: 'https://www.google.com/s2/favicons?domain=indianbank.in&sz=128', country: 'IN' },
  { name: 'UCO Bank', logo: 'https://www.google.com/s2/favicons?domain=ucobank.com&sz=128', country: 'IN' },
  { name: 'Indian Overseas Bank', logo: 'https://www.google.com/s2/favicons?domain=iob.in&sz=128', country: 'IN' },
  { name: 'Punjab & Sind Bank', logo: 'https://www.google.com/s2/favicons?domain=psbindia.com&sz=128', country: 'IN' },
  { name: 'Bank of Maharashtra', logo: 'https://www.google.com/s2/favicons?domain=bankofmaharashtra.in&sz=128', country: 'IN' },

  // Canada Banks
  { name: 'Royal Bank of Canada', logo: 'https://www.google.com/s2/favicons?domain=rbc.com&sz=128', country: 'CA' },
  { name: 'Toronto-Dominion Bank', logo: 'https://www.google.com/s2/favicons?domain=td.com&sz=128', country: 'CA' },
  { name: 'Bank of Nova Scotia', logo: 'https://www.google.com/s2/favicons?domain=scotiabank.com&sz=128', country: 'CA' },
  { name: 'Bank of Montreal', logo: 'https://www.google.com/s2/favicons?domain=bmo.com&sz=128', country: 'CA' },
  { name: 'Canadian Imperial Bank of Commerce', logo: 'https://www.google.com/s2/favicons?domain=cibc.com&sz=128', country: 'CA' },
  { name: 'National Bank of Canada', logo: 'https://www.google.com/s2/favicons?domain=nbc.ca&sz=128', country: 'CA' },
  { name: 'Desjardins Group', logo: 'https://www.google.com/s2/favicons?domain=desjardins.com&sz=128', country: 'CA' },
  { name: 'Laurentian Bank', logo: 'https://www.google.com/s2/favicons?domain=laurentianbank.ca&sz=128', country: 'CA' },
  { name: 'Canadian Western Bank', logo: 'https://www.google.com/s2/favicons?domain=cwbank.com&sz=128', country: 'CA' },
  { name: 'Tangerine Bank', logo: 'https://www.google.com/s2/favicons?domain=tangerine.ca&sz=128', country: 'CA' },

  // Australia Banks
  { name: 'Commonwealth Bank', logo: 'https://www.google.com/s2/favicons?domain=commbank.com.au&sz=128', country: 'AU' },
  { name: 'Westpac', logo: 'https://www.google.com/s2/favicons?domain=westpac.com.au&sz=128', country: 'AU' },
  { name: 'ANZ', logo: 'https://www.google.com/s2/favicons?domain=anz.com&sz=128', country: 'AU' },
  { name: 'National Australia Bank', logo: 'https://www.google.com/s2/favicons?domain=nab.com.au&sz=128', country: 'AU' },
  { name: 'Macquarie Bank', logo: 'https://www.google.com/s2/favicons?domain=macquarie.com&sz=128', country: 'AU' },
  { name: 'Bendigo Bank', logo: 'https://www.google.com/s2/favicons?domain=bendigobank.com.au&sz=128', country: 'AU' },
  { name: 'Bank of Queensland', logo: 'https://www.google.com/s2/favicons?domain=boq.com.au&sz=128', country: 'AU' },
  { name: 'Suncorp Bank', logo: 'https://www.google.com/s2/favicons?domain=suncorp.com.au&sz=128', country: 'AU' },
  { name: 'ING Australia', logo: 'https://www.google.com/s2/favicons?domain=ing.com.au&sz=128', country: 'AU' },
  { name: 'AMP Bank', logo: 'https://www.google.com/s2/favicons?domain=amp.com.au&sz=128', country: 'AU' },

  // Singapore Banks
  { name: 'DBS Bank', logo: 'https://www.google.com/s2/favicons?domain=dbs.com&sz=128', country: 'SG' },
  { name: 'OCBC Bank', logo: 'https://www.google.com/s2/favicons?domain=ocbc.com&sz=128', country: 'SG' },
  { name: 'United Overseas Bank', logo: 'https://www.google.com/s2/favicons?domain=uob.com.sg&sz=128', country: 'SG' },
  { name: 'Maybank Singapore', logo: 'https://www.google.com/s2/favicons?domain=maybank.com&sz=128', country: 'SG' },
  { name: 'Standard Chartered Singapore', logo: 'https://www.google.com/s2/favicons?domain=sc.com&sz=128', country: 'SG' },
  { name: 'Citibank Singapore', logo: 'https://www.google.com/s2/favicons?domain=citibank.com.sg&sz=128', country: 'SG' },
  { name: 'HSBC Singapore', logo: 'https://www.google.com/s2/favicons?domain=hsbc.com.sg&sz=128', country: 'SG' },

  // Hong Kong Banks
  { name: 'HSBC Hong Kong', logo: 'https://www.google.com/s2/favicons?domain=hsbc.com.hk&sz=128', country: 'HK' },
  { name: 'Hang Seng Bank', logo: 'https://www.google.com/s2/favicons?domain=hangseng.com&sz=128', country: 'HK' },
  { name: 'Bank of China (Hong Kong)', logo: 'https://www.google.com/s2/favicons?domain=bochk.com&sz=128', country: 'HK' },
  { name: 'Standard Chartered Hong Kong', logo: 'https://www.google.com/s2/favicons?domain=sc.com&sz=128', country: 'HK' },
  { name: 'DBS Bank (Hong Kong)', logo: 'https://www.google.com/s2/favicons?domain=dbs.com.hk&sz=128', country: 'HK' },
  { name: 'Bank of East Asia', logo: 'https://www.google.com/s2/favicons?domain=hkbea.com&sz=128', country: 'HK' },
  { name: 'Citibank Hong Kong', logo: 'https://www.google.com/s2/favicons?domain=citibank.com.hk&sz=128', country: 'HK' },

  // Switzerland Banks
  { name: 'UBS', logo: 'https://www.google.com/s2/favicons?domain=ubs.com&sz=128', country: 'CH' },
  { name: 'Credit Suisse', logo: 'https://www.google.com/s2/favicons?domain=credit-suisse.com&sz=128', country: 'CH' },
  { name: 'Julius Baer', logo: 'https://www.google.com/s2/favicons?domain=juliusbaer.com&sz=128', country: 'CH' },
  { name: 'Raiffeisen Switzerland', logo: 'https://www.google.com/s2/favicons?domain=raiffeisen.ch&sz=128', country: 'CH' },
  { name: 'PostFinance', logo: 'https://www.google.com/s2/favicons?domain=postfinance.ch&sz=128', country: 'CH' },
  { name: 'Zürcher Kantonalbank', logo: 'https://www.google.com/s2/favicons?domain=zkb.ch&sz=128', country: 'CH' },

  // Japan Banks
  { name: 'Mitsubishi UFJ Financial Group', logo: 'https://www.google.com/s2/favicons?domain=mufg.jp&sz=128', country: 'JP' },
  { name: 'Sumitomo Mitsui Financial Group', logo: 'https://www.google.com/s2/favicons?domain=smfg.co.jp&sz=128', country: 'JP' },
  { name: 'Mizuho Financial Group', logo: 'https://www.google.com/s2/favicons?domain=mizuhobank.com&sz=128', country: 'JP' },
  { name: 'Resona Holdings', logo: 'https://www.google.com/s2/favicons?domain=resona-gr.co.jp&sz=128', country: 'JP' },
  { name: 'Norinchukin Bank', logo: 'https://www.google.com/s2/favicons?domain=nochubank.or.jp&sz=128', country: 'JP' },
  { name: 'Shinsei Bank', logo: 'https://www.google.com/s2/favicons?domain=shinseibank.com&sz=128', country: 'JP' },
  { name: 'Japan Post Bank', logo: 'https://www.google.com/s2/favicons?domain=jp-bank.japanpost.jp&sz=128', country: 'JP' },

  // China Banks
  { name: 'Industrial and Commercial Bank of China', logo: 'https://www.google.com/s2/favicons?domain=icbc.com.cn&sz=128', country: 'CN' },
  { name: 'China Construction Bank', logo: 'https://www.google.com/s2/favicons?domain=ccb.com&sz=128', country: 'CN' },
  { name: 'Agricultural Bank of China', logo: 'https://www.google.com/s2/favicons?domain=abchina.com&sz=128', country: 'CN' },
  { name: 'Bank of China', logo: 'https://www.google.com/s2/favicons?domain=boc.cn&sz=128', country: 'CN' },
  { name: 'Bank of Communications', logo: 'https://www.google.com/s2/favicons?domain=bankcomm.com&sz=128', country: 'CN' },
  { name: 'China Merchants Bank', logo: 'https://www.google.com/s2/favicons?domain=cmbchina.com&sz=128', country: 'CN' },
  { name: 'Postal Savings Bank of China', logo: 'https://www.google.com/s2/favicons?domain=psbc.com&sz=128', country: 'CN' },
  { name: 'Industrial Bank', logo: 'https://www.google.com/s2/favicons?domain=cib.com.cn&sz=128', country: 'CN' },
  { name: 'China Minsheng Bank', logo: 'https://www.google.com/s2/favicons?domain=cmbc.com.cn&sz=128', country: 'CN' },
  { name: 'Shanghai Pudong Development Bank', logo: 'https://www.google.com/s2/favicons?domain=spdb.com.cn&sz=128', country: 'CN' },

  // Sweden Banks
  { name: 'Nordea Sweden', logo: 'https://www.google.com/s2/favicons?domain=nordea.se&sz=128', country: 'SE' },
  { name: 'Swedbank', logo: 'https://www.google.com/s2/favicons?domain=swedbank.se&sz=128', country: 'SE' },
  { name: 'SEB', logo: 'https://www.google.com/s2/favicons?domain=seb.se&sz=128', country: 'SE' },
  { name: 'Handelsbanken', logo: 'https://www.google.com/s2/favicons?domain=handelsbanken.se&sz=128', country: 'SE' },
  { name: 'Länsförsäkringar Bank', logo: 'https://www.google.com/s2/favicons?domain=lansforsakringar.se&sz=128', country: 'SE' },

  // Norway Banks
  { name: 'DNB', logo: 'https://www.google.com/s2/favicons?domain=dnb.no&sz=128', country: 'NO' },
  { name: 'Nordea Norway', logo: 'https://www.google.com/s2/favicons?domain=nordea.no&sz=128', country: 'NO' },
  { name: 'SpareBank 1', logo: 'https://www.google.com/s2/favicons?domain=sparebank1.no&sz=128', country: 'NO' },
  { name: 'Danske Bank Norway', logo: 'https://www.google.com/s2/favicons?domain=danskebank.no&sz=128', country: 'NO' },

  // Denmark Banks
  { name: 'Danske Bank', logo: 'https://www.google.com/s2/favicons?domain=danskebank.dk&sz=128', country: 'DK' },
  { name: 'Nordea Denmark', logo: 'https://www.google.com/s2/favicons?domain=nordea.dk&sz=128', country: 'DK' },
  { name: 'Jyske Bank', logo: 'https://www.google.com/s2/favicons?domain=jyskebank.dk&sz=128', country: 'DK' },
  { name: 'Sydbank', logo: 'https://www.google.com/s2/favicons?domain=sydbank.dk&sz=128', country: 'DK' },

  // New Zealand Banks
  { name: 'ANZ New Zealand', logo: 'https://www.google.com/s2/favicons?domain=anz.co.nz&sz=128', country: 'NZ' },
  { name: 'ASB Bank', logo: 'https://www.google.com/s2/favicons?domain=asb.co.nz&sz=128', country: 'NZ' },
  { name: 'Bank of New Zealand', logo: 'https://www.google.com/s2/favicons?domain=bnz.co.nz&sz=128', country: 'NZ' },
  { name: 'Westpac New Zealand', logo: 'https://www.google.com/s2/favicons?domain=westpac.co.nz&sz=128', country: 'NZ' },
  { name: 'Kiwibank', logo: 'https://www.google.com/s2/favicons?domain=kiwibank.co.nz&sz=128', country: 'NZ' },

  // Mexico Banks
  { name: 'BBVA México', logo: 'https://www.google.com/s2/favicons?domain=bbva.mx&sz=128', country: 'MX' },
  { name: 'Santander México', logo: 'https://www.google.com/s2/favicons?domain=santander.com.mx&sz=128', country: 'MX' },
  { name: 'Citibanamex', logo: 'https://www.google.com/s2/favicons?domain=banamex.com&sz=128', country: 'MX' },
  { name: 'Banorte', logo: 'https://www.google.com/s2/favicons?domain=banorte.com&sz=128', country: 'MX' },
  { name: 'HSBC México', logo: 'https://www.google.com/s2/favicons?domain=hsbc.com.mx&sz=128', country: 'MX' },
  { name: 'Scotiabank México', logo: 'https://www.google.com/s2/favicons?domain=scotiabank.com.mx&sz=128', country: 'MX' },
  { name: 'Inbursa', logo: 'https://www.google.com/s2/favicons?domain=inbursa.com&sz=128', country: 'MX' },

  // Brazil Banks
  { name: 'Banco do Brasil', logo: 'https://www.google.com/s2/favicons?domain=bb.com.br&sz=128', country: 'BR' },
  { name: 'Itaú Unibanco', logo: 'https://www.google.com/s2/favicons?domain=itau.com.br&sz=128', country: 'BR' },
  { name: 'Bradesco', logo: 'https://www.google.com/s2/favicons?domain=bradesco.com.br&sz=128', country: 'BR' },
  { name: 'Caixa Econômica Federal', logo: 'https://www.google.com/s2/favicons?domain=caixa.gov.br&sz=128', country: 'BR' },
  { name: 'Santander Brasil', logo: 'https://www.google.com/s2/favicons?domain=santander.com.br&sz=128', country: 'BR' },
  { name: 'Banco Safra', logo: 'https://www.google.com/s2/favicons?domain=safra.com.br&sz=128', country: 'BR' },
  { name: 'BTG Pactual', logo: 'https://www.google.com/s2/favicons?domain=btgpactual.com&sz=128', country: 'BR' },
  { name: 'Nubank', logo: 'https://www.google.com/s2/favicons?domain=nubank.com.br&sz=128', country: 'BR' },

  // South Africa Banks
  { name: 'Standard Bank', logo: 'https://www.google.com/s2/favicons?domain=standardbank.co.za&sz=128', country: 'ZA' },
  { name: 'FirstRand Bank', logo: 'https://www.google.com/s2/favicons?domain=firstrand.co.za&sz=128', country: 'ZA' },
  { name: 'Absa Group', logo: 'https://www.google.com/s2/favicons?domain=absa.co.za&sz=128', country: 'ZA' },
  { name: 'Nedbank', logo: 'https://www.google.com/s2/favicons?domain=nedbank.co.za&sz=128', country: 'ZA' },
  { name: 'Capitec Bank', logo: 'https://www.google.com/s2/favicons?domain=capitecbank.co.za&sz=128', country: 'ZA' },
  { name: 'Investec', logo: 'https://www.google.com/s2/favicons?domain=investec.com&sz=128', country: 'ZA' },

  // United Arab Emirates Banks
  { name: 'Emirates NBD', logo: 'https://www.google.com/s2/favicons?domain=emiratesnbd.com&sz=128', country: 'AE' },
  { name: 'First Abu Dhabi Bank', logo: 'https://www.google.com/s2/favicons?domain=fab.ae&sz=128', country: 'AE' },
  { name: 'Abu Dhabi Commercial Bank', logo: 'https://www.google.com/s2/favicons?domain=adcb.com&sz=128', country: 'AE' },
  { name: 'Dubai Islamic Bank', logo: 'https://www.google.com/s2/favicons?domain=dib.ae&sz=128', country: 'AE' },
  { name: 'Mashreq Bank', logo: 'https://www.google.com/s2/favicons?domain=mashreqbank.com&sz=128', country: 'AE' },
  { name: 'RAKBANK', logo: 'https://www.google.com/s2/favicons?domain=rakbank.ae&sz=128', country: 'AE' },
  { name: 'Commercial Bank of Dubai', logo: 'https://www.google.com/s2/favicons?domain=cbd.ae&sz=128', country: 'AE' },

  // Saudi Arabia Banks
  { name: 'Al Rajhi Bank', logo: 'https://www.google.com/s2/favicons?domain=alrajhibank.com.sa&sz=128', country: 'SA' },
  { name: 'National Commercial Bank', logo: 'https://www.google.com/s2/favicons?domain=alahli.com&sz=128', country: 'SA' },
  { name: 'Riyad Bank', logo: 'https://www.google.com/s2/favicons?domain=riyadbank.com&sz=128', country: 'SA' },
  { name: 'Samba Financial Group', logo: 'https://www.google.com/s2/favicons?domain=samba.com&sz=128', country: 'SA' },
  { name: 'Saudi British Bank', logo: 'https://www.google.com/s2/favicons?domain=sabb.com&sz=128', country: 'SA' },
  { name: 'Arab National Bank', logo: 'https://www.google.com/s2/favicons?domain=anb.com.sa&sz=128', country: 'SA' },
  { name: 'Banque Saudi Fransi', logo: 'https://www.google.com/s2/favicons?domain=alfransi.com.sa&sz=128', country: 'SA' },
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
  
  // Use Google's favicon service as fallback with higher resolution
  return `https://www.google.com/s2/favicons?domain=${cleanName}.com&sz=128`;
}

export function getDefaultBankLogo(): string {
  // Fallback icon for banks without logos
  return 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0OCIgaGVpZ2h0PSI0OCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiMxRTNBOEEiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMyAyMWgxOCIvPjxwYXRoIGQ9Ik0zIDEwaDE4Ii8+PHBhdGggZD0iTTUgNmgxNGwtNy03eiIvPjxwYXRoIGQ9Ik00IDEwdjExIi8+PHBhdGggZD0iTTggMTB2MTEiLz48cGF0aCBkPSJNMTIgMTB2MTEiLz48cGF0aCBkPSJNMTYgMTB2MTEiLz48cGF0aCBkPSJNMjAgMTB2MTEiLz48L3N2Zz4=';
}
