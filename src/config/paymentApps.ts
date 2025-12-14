// Payment Apps Configuration by Country

export interface PaymentApp {
  name: string;
  icon: string; // URL or emoji
  logoUrl?: string; // Logo image URL
  deepLink: string; // Deep link for mobile apps
  webUrl: string; // Fallback web URL
  androidPackage?: string;
  iosScheme?: string;
  description: string;
}

export const paymentAppsByCountry: Record<string, PaymentApp[]> = {
  // India
  IN: [
    {
      name: 'Google Pay',
      icon: '💳',
      logoUrl: 'https://miaoda-site-img.s3cdn.medo.dev/images/b6546586-62f8-4d3a-b956-4b3c04dda498.jpg',
      deepLink: 'gpay://',
      webUrl: 'https://pay.google.com',
      androidPackage: 'com.google.android.apps.nbu.paisa.user',
      iosScheme: 'gpay://',
      description: 'Send money, pay bills, recharge',
    },
    {
      name: 'PhonePe',
      icon: '📱',
      logoUrl: 'https://miaoda-site-img.s3cdn.medo.dev/images/972548ef-8d14-43cb-a682-a25c9cb8eeda.jpg',
      deepLink: 'phonepe://',
      webUrl: 'https://www.phonepe.com',
      androidPackage: 'com.phonepe.app',
      iosScheme: 'phonepe://',
      description: 'UPI payments and more',
    },
    {
      name: 'Paytm',
      icon: '💰',
      logoUrl: 'https://miaoda-site-img.s3cdn.medo.dev/images/41557651-f500-42a4-8182-16124b46d8e3.jpg',
      deepLink: 'paytmmp://',
      webUrl: 'https://paytm.com',
      androidPackage: 'net.one97.paytm',
      iosScheme: 'paytmmp://',
      description: 'Payments, wallet, shopping',
    },
    {
      name: 'BHIM',
      icon: '🏦',
      logoUrl: 'https://miaoda-site-img.s3cdn.medo.dev/images/ff781539-daec-45ef-aa15-61feec37e01a.jpg',
      deepLink: 'bhim://',
      webUrl: 'https://www.npci.org.in/what-we-do/bhim/product-overview',
      androidPackage: 'in.org.npci.upiapp',
      iosScheme: 'bhim://',
      description: 'UPI by NPCI',
    },
  ],
  // United States
  US: [
    {
      name: 'PayPal',
      icon: '💙',
      logoUrl: 'https://miaoda-site-img.s3cdn.medo.dev/images/8604ca5d-7b51-48e9-8690-048b7dde87ce.jpg',
      deepLink: 'paypal://',
      webUrl: 'https://www.paypal.com',
      androidPackage: 'com.paypal.android.p2pmobile',
      iosScheme: 'paypal://',
      description: 'Send and receive money',
    },
    {
      name: 'Venmo',
      icon: '💸',
      logoUrl: 'https://miaoda-site-img.s3cdn.medo.dev/images/e95a9821-3dea-496a-97ed-8bb814dc131e.jpg',
      deepLink: 'venmo://',
      webUrl: 'https://venmo.com',
      androidPackage: 'com.venmo',
      iosScheme: 'venmo://',
      description: 'Social payments',
    },
    {
      name: 'Cash App',
      icon: '💵',
      logoUrl: 'https://miaoda-site-img.s3cdn.medo.dev/images/4b8fab20-6487-4496-a942-043e0591d584.jpg',
      deepLink: 'cashapp://',
      webUrl: 'https://cash.app',
      androidPackage: 'com.squareup.cash',
      iosScheme: 'cashapp://',
      description: 'Send, spend, save, invest',
    },
    {
      name: 'Zelle',
      icon: '⚡',
      logoUrl: 'https://miaoda-site-img.s3cdn.medo.dev/images/87313cec-fe8a-455e-8d7a-3265f5516250.jpg',
      deepLink: 'zelle://',
      webUrl: 'https://www.zellepay.com',
      androidPackage: 'com.zellepay.zelle',
      iosScheme: 'zelle://',
      description: 'Fast bank transfers',
    },
  ],
  // United Kingdom
  GB: [
    {
      name: 'PayPal',
      icon: '💙',
      logoUrl: 'https://miaoda-site-img.s3cdn.medo.dev/images/8604ca5d-7b51-48e9-8690-048b7dde87ce.jpg',
      deepLink: 'paypal://',
      webUrl: 'https://www.paypal.com',
      androidPackage: 'com.paypal.android.p2pmobile',
      iosScheme: 'paypal://',
      description: 'Send and receive money',
    },
    {
      name: 'Revolut',
      icon: '🔵',
      logoUrl: 'https://miaoda-site-img.s3cdn.medo.dev/images/2cf7a03e-44d9-4dac-8fa5-f5f3b83c8db7.jpg',
      deepLink: 'revolut://',
      webUrl: 'https://www.revolut.com',
      androidPackage: 'com.revolut.revolut',
      iosScheme: 'revolut://',
      description: 'Digital banking',
    },
    {
      name: 'Monzo',
      icon: '🔴',
      logoUrl: 'https://miaoda-site-img.s3cdn.medo.dev/images/32a547a3-acf5-44d0-93aa-034f3747c314.jpg',
      deepLink: 'monzo://',
      webUrl: 'https://monzo.com',
      androidPackage: 'co.uk.getmondo',
      iosScheme: 'monzo://',
      description: 'Mobile banking',
    },
  ],
  // China
  CN: [
    {
      name: 'Alipay',
      icon: '🔵',
      logoUrl: 'https://miaoda-site-img.s3cdn.medo.dev/images/a3fb3c1a-dbe0-4e78-9c9b-1fd467616bf5.jpg',
      deepLink: 'alipay://',
      webUrl: 'https://www.alipay.com',
      androidPackage: 'com.eg.android.AlipayGphone',
      iosScheme: 'alipay://',
      description: 'Digital wallet and payments',
    },
    {
      name: 'WeChat Pay',
      icon: '💚',
      logoUrl: 'https://miaoda-site-img.s3cdn.medo.dev/images/7154d3ba-8209-445e-a704-2331841059e1.jpg',
      deepLink: 'weixin://',
      webUrl: 'https://pay.weixin.qq.com',
      androidPackage: 'com.tencent.mm',
      iosScheme: 'weixin://',
      description: 'Integrated in WeChat',
    },
  ],
  // Singapore
  SG: [
    {
      name: 'PayNow',
      icon: '🇸🇬',
      deepLink: 'paynow://',
      webUrl: 'https://www.abs.org.sg/consumer-banking/pay-now',
      description: 'Instant bank transfers',
    },
    {
      name: 'GrabPay',
      icon: '🟢',
      logoUrl: 'https://miaoda-site-img.s3cdn.medo.dev/images/e0b13125-da42-4726-ae23-810fdab1c4f7.jpg',
      deepLink: 'grab://',
      webUrl: 'https://www.grab.com/sg/pay/',
      androidPackage: 'com.grabtaxi.passenger',
      iosScheme: 'grab://',
      description: 'Payments and rewards',
    },
  ],
  // Australia
  AU: [
    {
      name: 'PayPal',
      icon: '💙',
      logoUrl: 'https://miaoda-site-img.s3cdn.medo.dev/images/8604ca5d-7b51-48e9-8690-048b7dde87ce.jpg',
      deepLink: 'paypal://',
      webUrl: 'https://www.paypal.com',
      androidPackage: 'com.paypal.android.p2pmobile',
      iosScheme: 'paypal://',
      description: 'Send and receive money',
    },
    {
      name: 'CommBank',
      icon: '🟡',
      logoUrl: 'https://miaoda-site-img.s3cdn.medo.dev/images/0423864a-ce60-41b6-b7b2-57be0611ce4a.jpg',
      deepLink: 'commbank://',
      webUrl: 'https://www.commbank.com.au',
      androidPackage: 'com.commbank.netbank',
      iosScheme: 'commbank://',
      description: 'Commonwealth Bank app',
    },
  ],
  // Canada
  CA: [
    {
      name: 'PayPal',
      icon: '💙',
      logoUrl: 'https://miaoda-site-img.s3cdn.medo.dev/images/8604ca5d-7b51-48e9-8690-048b7dde87ce.jpg',
      deepLink: 'paypal://',
      webUrl: 'https://www.paypal.com',
      androidPackage: 'com.paypal.android.p2pmobile',
      iosScheme: 'paypal://',
      description: 'Send and receive money',
    },
    {
      name: 'Interac',
      icon: '🔴',
      deepLink: 'interac://',
      webUrl: 'https://www.interac.ca',
      description: 'e-Transfer and payments',
    },
  ],
  // Default/International
  DEFAULT: [
    {
      name: 'PayPal',
      icon: '💙',
      logoUrl: 'https://miaoda-site-img.s3cdn.medo.dev/images/8604ca5d-7b51-48e9-8690-048b7dde87ce.jpg',
      deepLink: 'paypal://',
      webUrl: 'https://www.paypal.com',
      androidPackage: 'com.paypal.android.p2pmobile',
      iosScheme: 'paypal://',
      description: 'Send and receive money',
    },
  ],
};

// Bank App Deep Links - Common patterns
export interface BankAppLink {
  urlScheme?: string;
  androidPackage?: string;
  iosScheme?: string;
  webUrl?: string;
}

// Popular bank app URL schemes (examples - actual schemes may vary)
export const bankAppLinks: Record<string, BankAppLink> = {
  // India
  'State Bank of India': {
    urlScheme: 'sbi://',
    androidPackage: 'com.sbi.lotusintouch',
    iosScheme: 'sbi://',
    webUrl: 'https://www.onlinesbi.sbi',
  },
  'HDFC Bank': {
    urlScheme: 'hdfcbank://',
    androidPackage: 'com.snapwork.hdfc',
    iosScheme: 'hdfcbank://',
    webUrl: 'https://www.hdfcbank.com',
  },
  'ICICI Bank': {
    urlScheme: 'icicibank://',
    androidPackage: 'com.csam.icici.bank.imobile',
    iosScheme: 'icicibank://',
    webUrl: 'https://www.icicibank.com',
  },
  'Axis Bank': {
    urlScheme: 'axisbank://',
    androidPackage: 'com.axis.mobile',
    iosScheme: 'axisbank://',
    webUrl: 'https://www.axisbank.com',
  },
  // US
  'Chase': {
    urlScheme: 'chase://',
    androidPackage: 'com.chase.sig.android',
    iosScheme: 'chase://',
    webUrl: 'https://www.chase.com',
  },
  'Bank of America': {
    urlScheme: 'bankofamerica://',
    androidPackage: 'com.infonow.bofa',
    iosScheme: 'bankofamerica://',
    webUrl: 'https://www.bankofamerica.com',
  },
  'Wells Fargo': {
    urlScheme: 'wellsfargo://',
    androidPackage: 'com.wf.wellsfargomobile',
    iosScheme: 'wellsfargo://',
    webUrl: 'https://www.wellsfargo.com',
  },
  'Citi': {
    urlScheme: 'citi://',
    androidPackage: 'com.citi.citimobile',
    iosScheme: 'citi://',
    webUrl: 'https://www.citi.com',
  },
  // UK
  'Barclays': {
    urlScheme: 'barclays://',
    androidPackage: 'com.barclays.android.barclaysmobilebanking',
    iosScheme: 'barclays://',
    webUrl: 'https://www.barclays.co.uk',
  },
  'HSBC': {
    urlScheme: 'hsbc://',
    androidPackage: 'uk.co.hsbc.hsbcukmobilebanking',
    iosScheme: 'hsbc://',
    webUrl: 'https://www.hsbc.co.uk',
  },
  'Lloyds Bank': {
    urlScheme: 'lloydsbank://',
    androidPackage: 'com.grppl.android.shell.CMBlloydsTSB73',
    iosScheme: 'lloydsbank://',
    webUrl: 'https://www.lloydsbank.com',
  },
};

// Helper function to get payment apps for a country
export function getPaymentAppsForCountry(countryCode: string): PaymentApp[] {
  return paymentAppsByCountry[countryCode] || paymentAppsByCountry.DEFAULT;
}

// Helper function to get bank app link
export function getBankAppLink(bankName: string): BankAppLink | null {
  return bankAppLinks[bankName] || null;
}

// Helper function to open app with fallback
export function openApp(deepLink: string, webUrl: string) {
  // Try to open deep link
  const link = document.createElement('a');
  link.href = deepLink;
  link.click();

  // Fallback to web URL after a short delay if app doesn't open
  setTimeout(() => {
    window.open(webUrl, '_blank');
  }, 1500);
}
