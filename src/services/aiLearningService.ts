/**
 * AI Continuous Learning & Preference Memory Service
 * Learns merchant-to-category associations, preferred payment accounts,
 * frequent amounts, and user habits to enhance transaction conversion quality.
 */

export interface LearnedKeywordEntry {
  phrase: string;
  categories: Record<string, number>;
  fromAccounts: Record<string, number>;
  toAccounts: Record<string, number>;
  count: number;
  avgAmount?: number;
}

export interface LearnedCategoryEntry {
  name: string;
  fromAccounts: Record<string, number>;
  count: number;
}

export interface LearnedUserProfile {
  version: number;
  lastUpdated: string;
  keywords: Record<string, LearnedKeywordEntry>;
  categories: Record<string, LearnedCategoryEntry>;
}

const STORAGE_KEY = 'smartfin_ai_learned_profile_v1';

export function extractTokensAndPhrases(text: string): string[] {
  if (!text) return [];
  const clean = text
    .toLowerCase()
    .replace(/\b(?:at|from|to|in|for|the|a|an|on|of|with|and|&|my|our|paid|spent|bought|ordered|recharged|transferred|withdrew|received)\b/gi, ' ')
    .replace(/[,\-_;:~|/.]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const words = clean.split(' ').filter(w => w.length >= 3);
  const phrases: string[] = [];

  // Full clean phrase
  if (clean.length >= 3) phrases.push(clean);

  // 2-word n-grams
  for (let i = 0; i < words.length - 1; i++) {
    phrases.push(`${words[i]} ${words[i + 1]}`);
  }

  // Single words
  for (const w of words) {
    if (!phrases.includes(w)) phrases.push(w);
  }

  return phrases;
}

/**
 * Get stored learned profile from localStorage, or initialize a fresh one
 */
export function getStoredLearnedProfile(): LearnedUserProfile {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.version === 1) return parsed;
    }
  } catch (e) {
    console.warn('Failed to load learned AI profile from localStorage:', e);
  }

  return {
    version: 1,
    lastUpdated: new Date().toISOString(),
    keywords: {},
    categories: {}
  };
}

/**
 * Save learned profile into localStorage
 */
export function saveLearnedProfile(profile: LearnedUserProfile): void {
  try {
    if (typeof window !== 'undefined') {
      profile.lastUpdated = new Date().toISOString();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    }
  } catch (e) {
    console.warn('Failed to save learned AI profile to localStorage:', e);
  }
}

/**
 * Build and train profile from the user's historical transactions
 */
export function buildLearnedProfileFromHistory(
  transactions: any[],
  _accounts: any[] = [],
  _categories: any[] = []
): LearnedUserProfile {
  const profile = getStoredLearnedProfile();

  if (!Array.isArray(transactions) || transactions.length === 0) {
    return profile;
  }

  for (const tx of transactions) {
    if (!tx || !tx.description) continue;
    const phrases = extractTokensAndPhrases(tx.description);
    const cat = tx.category || null;
    const fromId = tx.from_account_id || null;
    const toId = tx.to_account_id || null;
    const amount = Number(tx.amount) || 0;

    for (const phrase of phrases) {
      if (!profile.keywords[phrase]) {
        profile.keywords[phrase] = {
          phrase,
          categories: {},
          fromAccounts: {},
          toAccounts: {},
          count: 0,
          avgAmount: 0
        };
      }
      const k = profile.keywords[phrase];
      k.count++;
      if (cat) k.categories[cat] = (k.categories[cat] || 0) + 1;
      if (fromId) k.fromAccounts[fromId] = (k.fromAccounts[fromId] || 0) + 1;
      if (toId) k.toAccounts[toId] = (k.toAccounts[toId] || 0) + 1;
      if (amount > 0) {
        k.avgAmount = k.avgAmount ? Math.round((k.avgAmount + amount) / 2) : amount;
      }
    }

    if (cat) {
      if (!profile.categories[cat]) {
        profile.categories[cat] = { name: cat, fromAccounts: {}, count: 0 };
      }
      profile.categories[cat].count++;
      if (fromId) {
        profile.categories[cat].fromAccounts[fromId] = (profile.categories[cat].fromAccounts[fromId] || 0) + 1;
      }
    }
  }

  saveLearnedProfile(profile);
  return profile;
}

/**
 * Record a new confirmed transaction into memory to learn instantly
 */
export function recordLearnedTransaction(tx: {
  description?: string | null;
  category?: string | null;
  income_category?: string | null;
  from_account_id?: string | null;
  to_account_id?: string | null;
  transaction_type?: string | null;
  amount?: number | string | null;
  transaction_date?: string | null;
}): void {
  const profile = getStoredLearnedProfile();
  const desc = tx.description || tx.category || '';
  const phrases = extractTokensAndPhrases(desc);
  const cat = tx.category || null;
  const fromId = tx.from_account_id || null;
  const toId = tx.to_account_id || null;
  const amount = Number(tx.amount) || 0;

  for (const phrase of phrases) {
    if (!profile.keywords[phrase]) {
      profile.keywords[phrase] = {
        phrase,
        categories: {},
        fromAccounts: {},
        toAccounts: {},
        count: 0
      };
    }
    const k = profile.keywords[phrase];
    k.count++;
    if (cat) k.categories[cat] = (k.categories[cat] || 0) + 1;
    if (fromId) k.fromAccounts[fromId] = (k.fromAccounts[fromId] || 0) + 1;
    if (toId) k.toAccounts[toId] = (k.toAccounts[toId] || 0) + 1;
    if (amount > 0) {
      k.avgAmount = k.avgAmount ? Math.round((k.avgAmount + amount) / 2) : amount;
    }
  }

  if (cat) {
    if (!profile.categories[cat]) {
      profile.categories[cat] = { name: cat, fromAccounts: {}, count: 0 };
    }
    profile.categories[cat].count++;
    if (fromId) {
      profile.categories[cat].fromAccounts[fromId] = (profile.categories[cat].fromAccounts[fromId] || 0) + 1;
    }
  }

  saveLearnedProfile(profile);
}

/**
 * Predict category, account, and likely details from learned profile
 */
export function predictFromLearning(
  text: string,
  accounts: any[] = [],
  categories: any[] = [],
  transactions: any[] = []
): {
  matchedPhrase: string | null;
  predictedCategory: string | null;
  predictedFromAccountId: string | null;
  predictedToAccountId: string | null;
  confidence: number;
  avgAmount?: number;
} {
  const profile = buildLearnedProfileFromHistory(transactions, accounts, categories);
  const t = text.toLowerCase();

  let bestMatch: LearnedKeywordEntry | null = null;
  let highestScore = 0;

  for (const phrase of Object.keys(profile.keywords)) {
    if (t.includes(phrase)) {
      const entry = profile.keywords[phrase];
      // Score = phrase length * log2(occurrences + 1)
      const score = phrase.length * Math.log2(entry.count + 1);
      if (score > highestScore) {
        highestScore = score;
        bestMatch = entry;
      }
    }
  }

  let predictedCategory: string | null = null;
  let predictedFromAccountId: string | null = null;
  let predictedToAccountId: string | null = null;
  let confidence = 0;

  if (bestMatch) {
    // Top learned category
    const topCat = Object.entries(bestMatch.categories).sort((a, b) => b[1] - a[1])[0];
    if (topCat && categories.some(c => c.name.toLowerCase() === topCat[0].toLowerCase())) {
      const matched = categories.find(c => c.name.toLowerCase() === topCat[0].toLowerCase());
      predictedCategory = matched ? matched.name : topCat[0];
    }

    // Top learned paying account
    const topFrom = Object.entries(bestMatch.fromAccounts).sort((a, b) => b[1] - a[1])[0];
    if (topFrom && accounts.some(a => a.id === topFrom[0])) {
      predictedFromAccountId = topFrom[0];
      confidence = Math.min(1, topFrom[1] / bestMatch.count);
    }

    // Top learned receiving account
    const topTo = Object.entries(bestMatch.toAccounts).sort((a, b) => b[1] - a[1])[0];
    if (topTo && accounts.some(a => a.id === topTo[0])) {
      predictedToAccountId = topTo[0];
    }
  }

  // Fallback to Category-level account preference if specific merchant account is not known
  if (predictedCategory && !predictedFromAccountId && profile.categories[predictedCategory]) {
    const catEntry = profile.categories[predictedCategory];
    const topCatAcc = Object.entries(catEntry.fromAccounts).sort((a, b) => b[1] - a[1])[0];
    if (topCatAcc && accounts.some(a => a.id === topCatAcc[0])) {
      predictedFromAccountId = topCatAcc[0];
      confidence = Math.max(confidence, 0.6);
    }
  }

  return {
    matchedPhrase: bestMatch ? bestMatch.phrase : null,
    predictedCategory,
    predictedFromAccountId,
    predictedToAccountId,
    confidence,
    avgAmount: bestMatch?.avgAmount
  };
}

export interface MissingOptionItem {
  label: string;
  value: any;
  icon?: string;
  sublabel?: string;
}

export interface MissingOptionsConfig {
  field: string;
  label: string;
  fieldLabel?: string;
  options: MissingOptionItem[];
  allowCustomInput?: boolean;
}

/**
 * Generate rich, clickable option pills for any missing field
 */
export function generateMissingFieldOptions(
  field: string,
  arg2: any,
  arg3: any,
  arg4?: any
): MissingOptionsConfig | null {
  let accounts: any[] = [];
  let categories: any[] = [];
  let draft: any = {};

  if (Array.isArray(arg2)) {
    // Called as (field, accounts, categories, draft)
    accounts = arg2;
    categories = Array.isArray(arg3) ? arg3 : [];
    draft = arg4 || {};
  } else {
    // Called as (field, draft, accounts, categories)
    draft = arg2 || {};
    accounts = Array.isArray(arg3) ? arg3 : [];
    categories = Array.isArray(arg4) ? arg4 : [];
  }

  const txType = draft?.transaction_type || 'expense';

  if (field === 'amount') {
    return {
      field: 'amount',
      label: 'Select or enter amount:',
      fieldLabel: 'Amount',
      allowCustomInput: true,
      options: [
        { label: '₹100', value: 100, icon: '💵' },
        { label: '₹250', value: 250, icon: '💵' },
        { label: '₹500', value: 500, icon: '💵' },
        { label: '₹1,000', value: 1000, icon: '💵' },
        { label: '₹2,000', value: 2000, icon: '💵' },
        { label: '₹5,000', value: 5000, icon: '💵' }
      ]
    };
  }

  if (field === 'from_account_id') {
    const filtered = accounts.filter(a => {
      if (txType === 'expense') {
        return ['cash', 'bank', 'credit_card'].includes(a.account_type);
      }
      if (txType === 'credit_card_repayment') {
        return ['bank', 'cash'].includes(a.account_type);
      }
      if (txType === 'withdrawal') {
        return ['bank'].includes(a.account_type);
      }
      return a.account_type !== 'loan';
    });

    return {
      field: 'from_account_id',
      label: txType === 'withdrawal' ? 'Select bank to withdraw from:' : 'Select paying account:',
      fieldLabel: 'Paying Account',
      options: filtered.map(acc => ({
        label: acc.account_name,
        value: acc.id,
        icon: acc.account_type === 'credit_card' ? '💳' : acc.account_type === 'cash' ? '💵' : '🏦',
        sublabel: `₹${Number(acc.balance || 0).toLocaleString('en-IN')}`
      }))
    };
  }

  if (field === 'to_account_id') {
    const filtered = accounts.filter(a => {
      if (txType === 'income') {
        return ['bank', 'cash'].includes(a.account_type);
      }
      if (txType === 'withdrawal') {
        return ['cash'].includes(a.account_type);
      }
      if (txType === 'loan_payment') {
        return a.account_type === 'loan';
      }
      if (txType === 'credit_card_repayment') {
        return a.account_type === 'credit_card';
      }
      return true;
    });

    return {
      field: 'to_account_id',
      label: txType === 'withdrawal' ? 'Select cash wallet to deposit to:' : 'Select receiving account:',
      fieldLabel: 'Receiving Account',
      options: filtered.map(acc => ({
        label: acc.account_name,
        value: acc.id,
        icon: acc.account_type === 'credit_card' ? '💳' : acc.account_type === 'loan' ? '📈' : acc.account_type === 'cash' ? '💵' : '🏦',
        sublabel: `₹${Number(acc.balance || 0).toLocaleString('en-IN')}`
      }))
    };
  }

  if (field === 'category') {
    return {
      field: 'category',
      label: 'Select expense category:',
      fieldLabel: 'Category',
      options: categories.slice(0, 10).map(cat => ({
        label: cat.name,
        value: cat.name,
        icon: cat.icon || '📁'
      }))
    };
  }

  if (field === 'income_category') {
    return {
      field: 'income_category',
      label: 'Select income category:',
      fieldLabel: 'Income Category',
      options: [
        { label: 'Salaries', value: 'salaries', icon: '💼' },
        { label: 'Allowances', value: 'allowances', icon: '💵' },
        { label: 'Family Income', value: 'family_income', icon: '👨‍👩‍👦' },
        { label: 'Others', value: 'others', icon: '📁' }
      ]
    };
  }

  if (field === 'transaction_type') {
    return {
      field: 'transaction_type',
      label: 'Select transaction type:',
      fieldLabel: 'Transaction Type',
      options: [
        { label: 'Expense', value: 'expense', icon: '📤' },
        { label: 'Income', value: 'income', icon: '📥' },
        { label: 'Withdrawal', value: 'withdrawal', icon: '🪙' },
        { label: 'Transfer', value: 'transfer', icon: '🔄' }
      ]
    };
  }

  return null;
}
