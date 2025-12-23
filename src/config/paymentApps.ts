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
      logoUrl: 'https://miaoda-conversation-file.s3cdn.medo.dev/user-7wr8a0fraxog/conv-7wraacwkpclc/20251223/file-8fdi9xr4k0lc.jpg',
      deepLink: 'gpay://',
      webUrl: 'https://pay.google.com',
      androidPackage: 'com.google.android.apps.nbu.paisa.user',
      iosScheme: 'gpay://',
      description: 'Send money, pay bills, recharge',
    },
    {
      name: 'PhonePe',
      icon: '📱',
      logoUrl: 'https://miaoda-conversation-file.s3cdn.medo.dev/user-7wr8a0fraxog/conv-7wraacwkpclc/20251223/file-8fdidvtcnytc.jpg',
      deepLink: 'phonepe://',
      webUrl: 'https://www.phonepe.com',
      androidPackage: 'com.phonepe.app',
      iosScheme: 'phonepe://',
      description: 'UPI payments and more',
    },
    {
      name: 'Paytm',
      icon: '💰',
      logoUrl: 'https://miaoda-conversation-file.s3cdn.medo.dev/user-7wr8a0fraxog/conv-7wraacwkpclc/20251223/file-8fdnv6wm5bls.jpg',
      deepLink: 'paytmmp://',
      webUrl: 'https://paytm.com',
      androidPackage: 'net.one97.paytm',
      iosScheme: 'paytmmp://',
      description: 'Payments, wallet, shopping',
    },
    {
      name: 'BHIM',
      icon: '🏦',
      logoUrl: 'https://miaoda-conversation-file.s3cdn.medo.dev/user-7wr8a0fraxog/conv-7wraacwkpclc/20251223/file-8fdijl0kd5a8.jpg',
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
      logoUrl: 'https://miaoda-site-img.s3cdn.medo.dev/images/e36c6a42-c276-4cde-ab9d-71051c364126.jpg',
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
      logoUrl: 'https://miaoda-site-img.s3cdn.medo.dev/images/7c0cfdd2-d0de-47db-8b09-42c50078c092.jpg',
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
  logoUrl?: string;
}

// Popular bank app URL schemes (examples - actual schemes may vary)
export const bankAppLinks: Record<string, BankAppLink> = {
  // India
  'State Bank of India': {
    urlScheme: 'sbi://',
    androidPackage: 'com.sbi.lotusintouch',
    iosScheme: 'sbi://',
    webUrl: 'https://www.onlinesbi.sbi',
    logoUrl: 'https://miaoda-site-img.s3cdn.medo.dev/images/68667f2f-dcaf-4f85-a9e6-36842cf8ce73.jpg',
  },
  'HDFC Bank': {
    urlScheme: 'hdfcbank://',
    androidPackage: 'com.snapwork.hdfc',
    iosScheme: 'hdfcbank://',
    webUrl: 'https://www.hdfcbank.com',
    logoUrl: 'https://miaoda-site-img.s3cdn.medo.dev/images/e1c7d8c4-9a49-4280-ad10-73dcb7e08c54.jpg',
  },
  'ICICI Bank': {
    urlScheme: 'icicibank://',
    androidPackage: 'com.csam.icici.bank.imobile',
    iosScheme: 'icicibank://',
    webUrl: 'https://www.icicibank.com',
    logoUrl: 'https://miaoda-site-img.s3cdn.medo.dev/images/6c3d5951-9293-451a-825f-8cd83791c23f.jpg',
  },
  'Axis Bank': {
    urlScheme: 'axisbank://',
    androidPackage: 'com.axis.mobile',
    iosScheme: 'axisbank://',
    webUrl: 'https://www.axisbank.com',
    logoUrl: 'https://miaoda-site-img.s3cdn.medo.dev/images/0773c564-23f7-4967-b8d8-af4de31f32d2.jpg',
  },
  // US
  'Chase': {
    urlScheme: 'chase://',
    androidPackage: 'com.chase.sig.android',
    iosScheme: 'chase://',
    webUrl: 'https://www.chase.com',
    logoUrl: 'https://miaoda-site-img.s3cdn.medo.dev/images/0d827186-32d7-4c1d-a6d9-98d719092964.jpg',
  },
  'Bank of America': {
    urlScheme: 'bankofamerica://',
    androidPackage: 'com.infonow.bofa',
    iosScheme: 'bankofamerica://',
    webUrl: 'https://www.bankofamerica.com',
    logoUrl: 'https://miaoda-site-img.s3cdn.medo.dev/images/6004dde2-ec96-454e-9472-ca8979f89bb6.jpg',
  },
  'Wells Fargo': {
    urlScheme: 'wellsfargo://',
    androidPackage: 'com.wf.wellsfargomobile',
    iosScheme: 'wellsfargo://',
    webUrl: 'https://www.wellsfargo.com',
    logoUrl: 'https://miaoda-site-img.s3cdn.medo.dev/images/e40de849-4359-4169-8213-a0d7fbadcb8a.jpg',
  },
  'Citi': {
    urlScheme: 'citi://',
    androidPackage: 'com.citi.citimobile',
    iosScheme: 'citi://',
    webUrl: 'https://www.citi.com',
    logoUrl: 'https://miaoda-site-img.s3cdn.medo.dev/images/b1e4a10d-b245-49f5-a89e-9b1d1f66f006.jpg',
  },
  // UK
  'Barclays': {
    urlScheme: 'barclays://',
    androidPackage: 'com.barclays.android.barclaysmobilebanking',
    iosScheme: 'barclays://',
    webUrl: 'https://www.barclays.co.uk',
    logoUrl: 'https://miaoda-site-img.s3cdn.medo.dev/images/4b8d7904-a733-409c-9fc8-3ed574ed35e8.jpg',
  },
  'HSBC': {
    urlScheme: 'hsbc://',
    androidPackage: 'uk.co.hsbc.hsbcukmobilebanking',
    iosScheme: 'hsbc://',
    webUrl: 'https://www.hsbc.co.uk',
    logoUrl: 'https://miaoda-site-img.s3cdn.medo.dev/images/0ebbf850-9d2c-4cdd-bf94-210714d7fe2f.jpg',
  },
  'Lloyds Bank': {
    urlScheme: 'lloydsbank://',
    androidPackage: 'com.grppl.android.shell.CMBlloydsTSB73',
    iosScheme: 'lloydsbank://',
    webUrl: 'https://www.lloydsbank.com',
    logoUrl: 'https://miaoda-site-img.s3cdn.medo.dev/images/a0ea9443-62f0-489a-88f9-ecd9ca358518.jpg',
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
