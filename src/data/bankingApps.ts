export interface BankingApp {
  id: string;
  name: string;
  description: string;
  logo: string;
  deepLink: string;
  webUrl: string;
  category: 'upi' | 'wallet' | 'banking' | 'payment';
}

export const bankingApps: BankingApp[] = [
  // UPI Apps
  {
    id: 'google-pay',
    name: 'Google Pay',
    description: 'UPI payments and money transfers',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/f/f2/Google_Pay_Logo.svg',
    deepLink: 'gpay://',
    webUrl: 'https://pay.google.com',
    category: 'upi'
  },
  {
    id: 'phonepe',
    name: 'PhonePe',
    description: 'UPI payments and recharges',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/1/14/PhonePe_Logo.svg',
    deepLink: 'phonepe://',
    webUrl: 'https://www.phonepe.com',
    category: 'upi'
  },
  {
    id: 'paytm',
    name: 'Paytm',
    description: 'Digital wallet and UPI payments',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/2/24/Paytm_Logo_%28standalone%29.svg',
    deepLink: 'paytmmp://',
    webUrl: 'https://paytm.com',
    category: 'wallet'
  },
  {
    id: 'bhim',
    name: 'BHIM',
    description: 'Government UPI app',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/1/1c/BHIM_SVG_Logo.svg',
    deepLink: 'bhim://',
    webUrl: 'https://www.npci.org.in/what-we-do/bhim/product-overview',
    category: 'upi'
  },
  {
    id: 'amazon-pay',
    name: 'Amazon Pay',
    description: 'Digital wallet and UPI',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/b/bc/Amazon-icon.svg',
    deepLink: 'amazonpay://',
    webUrl: 'https://www.amazon.in/amazonpay',
    category: 'wallet'
  },
  
  // Banking Apps
  {
    id: 'sbi-yono',
    name: 'YONO SBI',
    description: 'State Bank of India mobile banking',
    logo: 'https://www.logo.wine/a/logo/State_Bank_of_India/State_Bank_of_India-Logo.wine.svg',
    deepLink: 'yonosbi://',
    webUrl: 'https://www.onlinesbi.sbi',
    category: 'banking'
  },
  {
    id: 'hdfc-mobile',
    name: 'HDFC Bank Mobile',
    description: 'HDFC Bank mobile banking',
    logo: 'https://www.logo.wine/a/logo/HDFC_Bank/HDFC_Bank-Logo.wine.svg',
    deepLink: 'hdfcbank://',
    webUrl: 'https://www.hdfcbank.com',
    category: 'banking'
  },
  {
    id: 'icici-imobile',
    name: 'iMobile Pay',
    description: 'ICICI Bank mobile banking',
    logo: 'https://www.logo.wine/a/logo/ICICI_Bank/ICICI_Bank-Logo.wine.svg',
    deepLink: 'imobile://',
    webUrl: 'https://www.icicibank.com',
    category: 'banking'
  },
  {
    id: 'axis-mobile',
    name: 'Axis Mobile',
    description: 'Axis Bank mobile banking',
    logo: 'https://www.logo.wine/a/logo/Axis_Bank/Axis_Bank-Logo.wine.svg',
    deepLink: 'axismobile://',
    webUrl: 'https://www.axisbank.com',
    category: 'banking'
  },
  {
    id: 'kotak-mobile',
    name: 'Kotak Mobile Banking',
    description: 'Kotak Mahindra Bank mobile app',
    logo: 'https://www.logo.wine/a/logo/Kotak_Mahindra_Bank/Kotak_Mahindra_Bank-Logo.wine.svg',
    deepLink: 'kotakmobile://',
    webUrl: 'https://www.kotak.com',
    category: 'banking'
  },
  
  // International Payment Apps
  {
    id: 'paypal',
    name: 'PayPal',
    description: 'International payments and transfers',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg',
    deepLink: 'paypal://',
    webUrl: 'https://www.paypal.com',
    category: 'payment'
  },
  {
    id: 'venmo',
    name: 'Venmo',
    description: 'Social payments app',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/3/3f/Venmo_logo.svg',
    deepLink: 'venmo://',
    webUrl: 'https://venmo.com',
    category: 'payment'
  },
  {
    id: 'cash-app',
    name: 'Cash App',
    description: 'Mobile payment service',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/c/c5/Square_Cash_app_logo.svg',
    deepLink: 'cashapp://',
    webUrl: 'https://cash.app',
    category: 'payment'
  },
  {
    id: 'zelle',
    name: 'Zelle',
    description: 'Bank-to-bank transfers',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/8/80/Zelle_logo.svg',
    deepLink: 'zelle://',
    webUrl: 'https://www.zellepay.com',
    category: 'payment'
  },
  {
    id: 'apple-pay',
    name: 'Apple Pay',
    description: 'Apple mobile payment service',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/b/b0/Apple_Pay_logo.svg',
    deepLink: 'applepay://',
    webUrl: 'https://www.apple.com/apple-pay',
    category: 'payment'
  },
  {
    id: 'samsung-pay',
    name: 'Samsung Pay',
    description: 'Samsung mobile payment service',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/b/b8/Samsung_Pay_logo.svg',
    deepLink: 'samsungpay://',
    webUrl: 'https://www.samsung.com/samsung-pay',
    category: 'payment'
  },
  
  // Other Popular Apps
  {
    id: 'mobikwik',
    name: 'MobiKwik',
    description: 'Digital wallet and payments',
    logo: 'https://www.logo.wine/a/logo/MobiKwik/MobiKwik-Logo.wine.svg',
    deepLink: 'mobikwik://',
    webUrl: 'https://www.mobikwik.com',
    category: 'wallet'
  },
  {
    id: 'freecharge',
    name: 'Freecharge',
    description: 'Recharges and bill payments',
    logo: 'https://www.logo.wine/a/logo/Freecharge/Freecharge-Logo.wine.svg',
    deepLink: 'freecharge://',
    webUrl: 'https://www.freecharge.in',
    category: 'wallet'
  }
];

export const getBankingAppsByCategory = (category: BankingApp['category']) => {
  return bankingApps.filter(app => app.category === category);
};

export const getBankingAppById = (id: string) => {
  return bankingApps.find(app => app.id === id);
};

export const searchBankingApps = (query: string) => {
  const lowerQuery = query.toLowerCase();
  return bankingApps.filter(app => 
    app.name.toLowerCase().includes(lowerQuery) ||
    app.description.toLowerCase().includes(lowerQuery)
  );
};
