import { supabase } from './supabase';
import type {
  Profile,
  Account,
  LoanAccountWithCalculations,
  InterestRateHistory,
  Transaction,
  Budget,
  ExpenseCategory,
  EMITransaction,
  LoanEMIPayment,
  AccountWithInterestHistory,
  TransactionWithAccounts,
  FinancialSummary,
  BudgetAnalysis,
  CustomBankLink,
  IncomeCategoryKey,
  BankLink,
  UserCustomBankLink
} from '@/types/types';

export const profileApi = {
  async getProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    
    if (error) throw error;
    return data;
  },

  async updateProfile(userId: string, updates: Partial<Profile>): Promise<Profile> {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .maybeSingle();
    
    if (error) throw error;
    if (!data) throw new Error('Profile not found');
    return data;
  },

  async getProfileByPhone(phoneNumber: string): Promise<Profile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('phone', phoneNumber)
      .maybeSingle();
    
    if (error) throw error;
    return data;
  },

  async getAllProfiles(): Promise<Profile[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return Array.isArray(data) ? data : [];
  }
};

export const accountApi = {
  async getAccounts(userId: string): Promise<Account[]> {
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return Array.isArray(data) ? data : [];
  },

  async getAccountById(accountId: string): Promise<Account | null> {
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('id', accountId)
      .maybeSingle();
    
    if (error) throw error;
    return data;
  },

  async getAccountWithInterestHistory(accountId: string): Promise<AccountWithInterestHistory | null> {
    const { data: account, error: accountError } = await supabase
      .from('accounts')
      .select('*')
      .eq('id', accountId)
      .maybeSingle();
    
    if (accountError) throw accountError;
    if (!account) return null;

    const { data: history, error: historyError } = await supabase
      .from('interest_rate_history')
      .select('*')
      .eq('account_id', accountId)
      .order('effective_date', { ascending: false });
    
    if (historyError) throw historyError;

    return {
      ...account,
      interest_history: Array.isArray(history) ? history : []
    };
  },

  async createAccount(account: Omit<Account, 'id' | 'created_at' | 'updated_at'>): Promise<Account> {
    const accountData = {
      ...account,
      balance: account.balance || 0,
      currency: account.currency || 'INR'
    };
    
    const { data, error } = await supabase
      .from('accounts')
      .insert(accountData)
      .select()
      .maybeSingle();
    
    if (error) throw error;
    if (!data) throw new Error('Failed to create account');
    
    return data;
  },

  async updateAccount(accountId: string, updates: Partial<Account>): Promise<Account> {
    const updateData = {
      ...updates,
      updated_at: new Date().toISOString()
    };
    
    const { data, error } = await supabase
      .from('accounts')
      .update(updateData)
      .eq('id', accountId)
      .select()
      .maybeSingle();
    
    if (error) throw error;
    if (!data) throw new Error('Account not found');
    
    return data;
  },

  async deleteAccount(accountId: string): Promise<void> {
    const { error } = await supabase
      .from('accounts')
      .delete()
      .eq('id', accountId);
    
    if (error) throw error;
  },

  async getFinancialSummary(userId: string): Promise<FinancialSummary> {
    const accounts = await this.getAccounts(userId);
    
    const cashAccounts = accounts.filter(a => a.account_type === 'cash');
    const bankAccounts = accounts.filter(a => a.account_type === 'bank');
    const creditCards = accounts.filter(a => a.account_type === 'credit_card');
    const loanAccounts = accounts.filter(a => a.account_type === 'loan');
    
    const cash_total = cashAccounts.reduce((sum, acc) => sum + Number(acc.balance), 0);
    const bank_total = bankAccounts.reduce((sum, acc) => sum + Number(acc.balance), 0);
    const total_assets = cash_total + bank_total;
    
    // Credit card balances are negative (debt), so we need to negate them to get positive liability amount
    const total_liabilities = Math.abs(creditCards.reduce((sum, acc) => sum + Number(acc.balance), 0));
    
    const liquid_assets = total_assets;
    const working_capital = total_assets - total_liabilities;
    
    return {
      total_assets,
      total_liabilities,
      liquid_assets,
      working_capital,
      accounts_by_type: {
        cash: cashAccounts,
        bank: bankAccounts,
        credit_card: creditCards,
        loan: loanAccounts
      }
    };
  },

  async getLoanWithCalculations(accountId: string): Promise<any> {
    const { data, error } = await supabase
      .rpc('get_loan_details_with_calculations', { p_account_id: accountId });
    
    if (error) throw error;
    return Array.isArray(data) && data.length > 0 ? data[0] : null;
  },

  async calculateLoanEMI(principal: number, annualRate: number, tenureMonths: number): Promise<number> {
    const { data, error } = await supabase
      .rpc('calculate_loan_emi', {
        p_principal: principal,
        p_annual_rate: annualRate,
        p_tenure_months: tenureMonths
      });
    
    if (error) throw error;
    return data || 0;
  },

  async calculateLoanAccruedInterest(accountId: string): Promise<number> {
    const { data, error } = await supabase
      .rpc('calculate_loan_accrued_interest', { p_account_id: accountId });
    
    if (error) throw error;
    return data || 0;
  }
};

export const interestRateApi = {
  async getInterestRates(userId?: string): Promise<InterestRateHistory[]> {
    let query = supabase
      .from('interest_rate_history')
      .select('*, accounts!inner(user_id)')
      .order('effective_date', { ascending: false });
    
    if (userId) {
      query = query.eq('accounts.user_id', userId);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    return Array.isArray(data) ? data : [];
  },

  async getInterestRateHistory(accountId: string): Promise<InterestRateHistory[]> {
    const { data, error } = await supabase
      .from('interest_rate_history')
      .select('*')
      .eq('account_id', accountId)
      .order('effective_date', { ascending: false });
    
    if (error) throw error;
    return Array.isArray(data) ? data : [];
  },

  async addInterestRate(rate: Omit<InterestRateHistory, 'id' | 'created_at'>): Promise<InterestRateHistory> {
    const { data, error } = await supabase
      .from('interest_rate_history')
      .insert(rate)
      .select()
      .maybeSingle();
    
    if (error) throw error;
    if (!data) throw new Error('Failed to add interest rate');
    return data;
  },

  async createInterestRate(rate: Omit<InterestRateHistory, 'id' | 'created_at'>): Promise<InterestRateHistory> {
    return interestRateApi.addInterestRate(rate);
  },

  async deleteInterestRate(rateId: string): Promise<void> {
    const { error } = await supabase
      .from('interest_rate_history')
      .delete()
      .eq('id', rateId);
    
    if (error) throw error;
  }
};

export const transactionApi = {
  async getTransactions(userId: string, limit?: number): Promise<Transaction[]> {
    let query = supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false });
    
    if (limit) {
      query = query.limit(limit);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    return Array.isArray(data) ? data : [];
  },

  async getTransactionsByDateRange(userId: string, startDate: string, endDate: string): Promise<Transaction[]> {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .gte('transaction_date', startDate)
      .lte('transaction_date', endDate)
      .order('transaction_date', { ascending: false });
    
    if (error) throw error;
    const transactions = Array.isArray(data) ? data : [];
    
    return transactions;
  },

  async getTransactionsByCategory(userId: string, category: string): Promise<Transaction[]> {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .eq('category', category)
      .order('transaction_date', { ascending: false });
    
    if (error) throw error;
    const transactions = Array.isArray(data) ? data : [];
    
    return transactions;
  },

  async getTransactionsByAccount(userId: string, accountId: string): Promise<Transaction[]> {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .eq('account_id', accountId)
      .order('transaction_date', { ascending: false });
    
    if (error) throw error;
    const transactions = Array.isArray(data) ? data : [];
    
    return transactions;
  },

  async createTransaction(transaction: Omit<Transaction, 'id' | 'created_at' | 'updated_at'>): Promise<Transaction> {
    const transactionData = {
      ...transaction,
      currency: transaction.currency || 'INR'
    };
    
    const { data, error } = await supabase
      .from('transactions')
      .insert(transactionData)
      .select()
      .maybeSingle();
    
    if (error) throw error;
    if (!data) throw new Error('Failed to create transaction');

    await this.updateAccountBalances(transaction);
    
    return data;
  },

  async updateTransaction(transactionId: string, updates: Partial<Transaction>): Promise<Transaction> {
    const { data: oldTransaction } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', transactionId)
      .maybeSingle();
    
    const updateData = {
      ...updates,
      updated_at: new Date().toISOString()
    };
    
    const { data, error } = await supabase
      .from('transactions')
      .update(updateData)
      .eq('id', transactionId)
      .select()
      .maybeSingle();
    
    if (error) throw error;
    if (!data) throw new Error('Transaction not found');

    if (oldTransaction) {
      await this.reverseAccountBalances(oldTransaction);
      await this.updateAccountBalances(data);
    }
    
    return data;
  },

  async deleteTransaction(transactionId: string): Promise<void> {
    const { data: transaction } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', transactionId)
      .maybeSingle();

    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', transactionId);
    
    if (error) throw error;

    if (transaction) {
      await this.reverseAccountBalances(transaction);
    }
  },

  async updateAccountBalances(transaction: Transaction | Omit<Transaction, 'id' | 'created_at' | 'updated_at'>): Promise<void> {
    const amount = Number(transaction.amount);

    switch (transaction.transaction_type) {
      case 'income':
        if (transaction.to_account_id) {
          await this.adjustBalance(transaction.to_account_id, amount);
        }
        break;
      
      case 'expense':
        if (transaction.from_account_id) {
          const account = await accountApi.getAccountById(transaction.from_account_id);
          if (account?.account_type === 'credit_card') {
            // Credit card: expense increases balance (debt)
            await this.adjustBalance(transaction.from_account_id, amount);
          } else {
            // Bank/Cash account: expense decreases balance
            await this.adjustBalance(transaction.from_account_id, -amount);
          }
        }
        break;
      
      case 'withdrawal':
        // Deduct from source account (bank/credit card)
        if (transaction.from_account_id) {
          const account = await accountApi.getAccountById(transaction.from_account_id);
          if (account?.account_type === 'credit_card') {
            // Credit card: withdrawal increases balance (debt)
            await this.adjustBalance(transaction.from_account_id, amount);
          } else {
            // Bank account: withdrawal decreases balance
            await this.adjustBalance(transaction.from_account_id, -amount);
          }
        }
        // Add to destination cash account
        if (transaction.to_account_id) {
          await this.adjustBalance(transaction.to_account_id, amount);
        }
        break;
      
      case 'transfer':
        if (transaction.from_account_id) {
          const fromAccount = await accountApi.getAccountById(transaction.from_account_id);
          if (fromAccount?.account_type === 'credit_card') {
            // Credit card: transfer from credit card increases balance (cash advance/debt)
            await this.adjustBalance(transaction.from_account_id, amount);
          } else {
            // Bank/Cash account: transfer decreases balance
            await this.adjustBalance(transaction.from_account_id, -amount);
          }
        }
        if (transaction.to_account_id) {
          const toAccount = await accountApi.getAccountById(transaction.to_account_id);
          if (toAccount?.account_type === 'credit_card') {
            // Credit card: transfer to credit card decreases balance (payment/reduces debt)
            await this.adjustBalance(transaction.to_account_id, -amount);
          } else {
            // Bank/Cash account: transfer increases balance
            await this.adjustBalance(transaction.to_account_id, amount);
          }
        }
        break;
      
      case 'loan_payment':
        if (transaction.from_account_id) {
          await this.adjustBalance(transaction.from_account_id, -amount);
        }
        if (transaction.to_account_id) {
          await this.adjustBalance(transaction.to_account_id, -amount);
        }
        break;
      
      case 'credit_card_repayment':
        // FROM account (bank/cash): decrease balance
        if (transaction.from_account_id) {
          await this.adjustBalance(transaction.from_account_id, -amount);
        }
        // TO account (credit card): decrease balance (reduce liability)
        if (transaction.to_account_id) {
          await this.adjustBalance(transaction.to_account_id, -amount);
        }
        break;
    }
  },

  async reverseAccountBalances(transaction: Transaction): Promise<void> {
    const amount = Number(transaction.amount);

    switch (transaction.transaction_type) {
      case 'income':
        if (transaction.to_account_id) {
          await this.adjustBalance(transaction.to_account_id, -amount);
        }
        break;
      
      case 'expense':
        if (transaction.from_account_id) {
          const account = await accountApi.getAccountById(transaction.from_account_id);
          if (account?.account_type === 'credit_card') {
            // Credit card: reverse expense decreases balance (debt)
            await this.adjustBalance(transaction.from_account_id, -amount);
          } else {
            // Bank/Cash account: reverse expense increases balance
            await this.adjustBalance(transaction.from_account_id, amount);
          }
        }
        break;
      
      case 'withdrawal':
        // Reverse: Add back to source account (bank/credit card)
        if (transaction.from_account_id) {
          const account = await accountApi.getAccountById(transaction.from_account_id);
          if (account?.account_type === 'credit_card') {
            // Credit card: reverse withdrawal decreases balance (debt)
            await this.adjustBalance(transaction.from_account_id, -amount);
          } else {
            // Bank account: reverse withdrawal increases balance
            await this.adjustBalance(transaction.from_account_id, amount);
          }
        }
        // Reverse: Deduct from destination cash account
        if (transaction.to_account_id) {
          await this.adjustBalance(transaction.to_account_id, -amount);
        }
        break;
      
      case 'transfer':
        if (transaction.from_account_id) {
          const fromAccount = await accountApi.getAccountById(transaction.from_account_id);
          if (fromAccount?.account_type === 'credit_card') {
            // Credit card: reverse transfer from credit card decreases balance (reverse cash advance)
            await this.adjustBalance(transaction.from_account_id, -amount);
          } else {
            // Bank/Cash account: reverse transfer increases balance
            await this.adjustBalance(transaction.from_account_id, amount);
          }
        }
        if (transaction.to_account_id) {
          const toAccount = await accountApi.getAccountById(transaction.to_account_id);
          if (toAccount?.account_type === 'credit_card') {
            // Credit card: reverse transfer to credit card increases balance (reverse payment)
            await this.adjustBalance(transaction.to_account_id, amount);
          } else {
            // Bank/Cash account: reverse transfer decreases balance
            await this.adjustBalance(transaction.to_account_id, -amount);
          }
        }
        break;
      
      case 'loan_payment':
        if (transaction.from_account_id) {
          await this.adjustBalance(transaction.from_account_id, amount);
        }
        if (transaction.to_account_id) {
          await this.adjustBalance(transaction.to_account_id, amount);
        }
        break;
      
      case 'credit_card_repayment':
        // Reverse: FROM account (bank/cash): increase balance
        if (transaction.from_account_id) {
          await this.adjustBalance(transaction.from_account_id, amount);
        }
        // Reverse: TO account (credit card): increase balance (restore liability)
        if (transaction.to_account_id) {
          await this.adjustBalance(transaction.to_account_id, amount);
        }
        break;
    }
  },

  async adjustBalance(accountId: string, adjustment: number): Promise<void> {
    const account = await accountApi.getAccountById(accountId);
    if (!account) return;

    const newBalance = Number(account.balance) + adjustment;
    await accountApi.updateAccount(accountId, { balance: newBalance });
  }
};

export const budgetApi = {
  async getBudget(userId: string, month: number, year: number): Promise<Budget | null> {
    const { data, error } = await supabase
      .from('budgets')
      .select('*')
      .eq('user_id', userId)
      .eq('month', month)
      .eq('year', year)
      .maybeSingle();
    
    if (error) throw error;
    return data;
  },

  async getBudgets(userId: string): Promise<Budget[]> {
    const { data, error } = await supabase
      .from('budgets')
      .select('*')
      .eq('user_id', userId)
      .order('year', { ascending: false })
      .order('month', { ascending: false });
    
    if (error) throw error;
    return Array.isArray(data) ? data : [];
  },

  async createOrUpdateBudget(budget: Omit<Budget, 'id' | 'created_at' | 'updated_at'>): Promise<Budget> {
    const existing = await this.getBudget(budget.user_id, budget.month, budget.year);

    if (existing) {
      const { data, error } = await supabase
        .from('budgets')
        .update({ ...budget, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
        .select()
        .maybeSingle();
      
      if (error) throw error;
      if (!data) throw new Error('Failed to update budget');
      return data;
    } else {
      const { data, error } = await supabase
        .from('budgets')
        .insert({
          ...budget,
          currency: budget.currency || 'INR',
          budgeted_income: budget.budgeted_income || 0,
          budgeted_expenses: budget.budgeted_expenses || 0,
          category_budgets: budget.category_budgets || {},
          income_category_budgets: budget.income_category_budgets || {}
        })
        .select()
        .maybeSingle();
      
      if (error) throw error;
      if (!data) throw new Error('Failed to create budget');
      return data;
    }
  },

  async deleteBudget(budgetId: string): Promise<void> {
    const { error } = await supabase
      .from('budgets')
      .delete()
      .eq('id', budgetId);
    
    if (error) throw error;
  },

  async getBudgetAnalysis(userId: string, month: number, year: number): Promise<BudgetAnalysis | null> {
    const budget = await this.getBudget(userId, month, year);
    if (!budget) return null;

    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const transactions = await transactionApi.getTransactionsByDateRange(userId, startDate, endDate);

    const actual_income = transactions
      .filter(t => t.transaction_type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const actual_expenses = transactions
      .filter(t => t.transaction_type === 'expense' || t.transaction_type === 'loan_payment')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    // Fetch categories to map ID to name
    const categories = await categoryApi.getCategories(userId);
    const categoryMap = new Map(categories.map(c => [c.id, c.name]));

    const category_analysis: Record<string, { budgeted: number; actual: number; variance: number }> = {};
    
    for (const [categoryId, budgeted] of Object.entries(budget.category_budgets)) {
      const categoryName = categoryMap.get(categoryId);
      if (!categoryName) continue;
      
      const actual = transactions
        .filter(t => t.category === categoryName && (t.transaction_type === 'expense' || t.transaction_type === 'loan_payment'))
        .reduce((sum, t) => sum + Number(t.amount), 0);
      
      category_analysis[categoryId] = {
        budgeted: Number(budgeted),
        actual,
        variance: Number(budgeted) - actual
      };
    }

    // Income category analysis
    const income_category_analysis: Record<IncomeCategoryKey, { budgeted: number; actual: number; variance: number }> = {
      salaries: { budgeted: 0, actual: 0, variance: 0 },
      allowances: { budgeted: 0, actual: 0, variance: 0 },
      family_income: { budgeted: 0, actual: 0, variance: 0 },
      others: { budgeted: 0, actual: 0, variance: 0 }
    };

    // Calculate actual income by category from transactions
    const incomeTransactions = transactions.filter(t => t.transaction_type === 'income');
    const actualIncomeByCategory: Record<string, number> = {};
    
    for (const transaction of incomeTransactions) {
      if (transaction.income_category) {
        actualIncomeByCategory[transaction.income_category] = 
          (actualIncomeByCategory[transaction.income_category] || 0) + Number(transaction.amount);
      }
    }

    // Calculate uncategorized income (for proportional distribution)
    const categorizedIncome = Object.values(actualIncomeByCategory).reduce((sum, val) => sum + val, 0);
    const uncategorizedIncome = actual_income - categorizedIncome;

    // Process income category budgets
    if (budget.income_category_budgets) {
      const incomeBudgets = budget.income_category_budgets as Record<IncomeCategoryKey, number>;
      const totalBudgetedIncome = Object.values(incomeBudgets).reduce((sum: number, val) => sum + Number(val), 0);
      
      for (const [categoryKey, budgeted] of Object.entries(incomeBudgets)) {
        if (categoryKey in income_category_analysis) {
          const key = categoryKey as IncomeCategoryKey;
          const budgetedAmount = Number(budgeted);
          
          // Use actual categorized income if available
          let actual = actualIncomeByCategory[key] || 0;
          
          // Distribute uncategorized income proportionally if there's any
          if (uncategorizedIncome > 0 && totalBudgetedIncome > 0) {
            const proportion = budgetedAmount / totalBudgetedIncome;
            actual += uncategorizedIncome * proportion;
          }
          
          income_category_analysis[key] = {
            budgeted: budgetedAmount,
            actual,
            variance: actual - budgetedAmount
          };
        }
      }
    }

    return {
      budget,
      actual_income,
      actual_expenses,
      income_variance: actual_income - Number(budget.budgeted_income),
      expense_variance: Number(budget.budgeted_expenses) - actual_expenses,
      category_analysis,
      income_category_analysis
    };
  },

  async getCategoryBudgetInfo(userId: string, categoryName: string, month: number, year: number): Promise<{ budgeted: number; spent: number; remaining: number } | null> {
    const budget = await this.getBudget(userId, month, year);
    if (!budget) return null;

    // Find category ID by name
    const categories = await categoryApi.getCategories(userId);
    const category = categories.find(c => c.name === categoryName);
    if (!category) return null;

    const budgeted = Number(budget.category_budgets[category.id] || 0);
    if (budgeted === 0) return null;

    // Calculate spent amount for this category in the current month
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const transactions = await transactionApi.getTransactionsByDateRange(userId, startDate, endDate);
    const spent = transactions
      .filter(t => t.category === categoryName && (t.transaction_type === 'expense' || t.transaction_type === 'loan_payment'))
      .reduce((sum, t) => sum + Number(t.amount), 0);

    return {
      budgeted,
      spent,
      remaining: budgeted - spent
    };
  }
};

export const categoryApi = {
  async getCategories(userId?: string): Promise<ExpenseCategory[]> {
    let query = supabase
      .from('expense_categories')
      .select('*')
      .order('is_system', { ascending: false })
      .order('name', { ascending: true });

    if (userId) {
      query = query.or(`is_system.eq.true,user_id.eq.${userId}`);
    } else {
      query = query.eq('is_system', true);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    return Array.isArray(data) ? data : [];
  },

  async createCategory(category: Omit<ExpenseCategory, 'id' | 'created_at'>): Promise<ExpenseCategory> {
    const { data, error } = await supabase
      .from('expense_categories')
      .insert({
        ...category,
        icon: category.icon || '📁',
        color: category.color || '#6B7280',
        is_system: false
      })
      .select()
      .maybeSingle();
    
    if (error) throw error;
    if (!data) throw new Error('Failed to create category');
    return data;
  },

  async deleteCategory(categoryId: string): Promise<void> {
    const { error } = await supabase
      .from('expense_categories')
      .delete()
      .eq('id', categoryId);
    
    if (error) throw error;
  }
};

export const emiApi = {
  async getEMIsByAccount(accountId: string): Promise<EMITransaction[]> {
    const { data, error } = await supabase
      .from('emi_transactions')
      .select('*')
      .eq('account_id', accountId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return Array.isArray(data) ? data : [];
  },

  async getActiveEMIsByAccount(accountId: string): Promise<EMITransaction[]> {
    const { data, error } = await supabase
      .from('emi_transactions')
      .select('*')
      .eq('account_id', accountId)
      .eq('status', 'active')
      .order('next_due_date', { ascending: true });
    
    if (error) throw error;
    return Array.isArray(data) ? data : [];
  },

  async getEMIsByUser(userId: string): Promise<EMITransaction[]> {
    const { data, error } = await supabase
      .from('emi_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return Array.isArray(data) ? data : [];
  },

  async createEMI(emi: Omit<EMITransaction, 'id' | 'created_at' | 'updated_at'>): Promise<EMITransaction> {
    const { data, error } = await supabase
      .from('emi_transactions')
      .insert(emi)
      .select()
      .maybeSingle();
    
    if (error) throw error;
    if (!data) throw new Error('Failed to create EMI transaction');
    return data;
  },

  async updateEMI(id: string, updates: Partial<EMITransaction>): Promise<EMITransaction> {
    const { data, error } = await supabase
      .from('emi_transactions')
      .update(updates)
      .eq('id', id)
      .select()
      .maybeSingle();
    
    if (error) throw error;
    if (!data) throw new Error('Failed to update EMI transaction');
    return data;
  },

  async deleteEMI(id: string): Promise<void> {
    const { error } = await supabase
      .from('emi_transactions')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  async payEMIInstallment(emiId: string): Promise<EMITransaction> {
    const { data: emi, error: fetchError } = await supabase
      .from('emi_transactions')
      .select('*')
      .eq('id', emiId)
      .maybeSingle();
    
    if (fetchError) throw fetchError;
    if (!emi) throw new Error('EMI transaction not found');
    
    const remainingInstallments = emi.remaining_installments - 1;
    const status = remainingInstallments === 0 ? 'completed' : 'active';
    const nextDueDate = remainingInstallments > 0 
      ? new Date(new Date(emi.next_due_date).setMonth(new Date(emi.next_due_date).getMonth() + 1)).toISOString().split('T')[0]
      : emi.next_due_date;
    
    const { data, error } = await supabase
      .from('emi_transactions')
      .update({
        remaining_installments: remainingInstallments,
        next_due_date: nextDueDate,
        status
      })
      .eq('id', emiId)
      .select()
      .maybeSingle();
    
    if (error) throw error;
    if (!data) throw new Error('Failed to update EMI installment');
    return data;
  },

  async cancelEMI(emiId: string): Promise<EMITransaction> {
    return this.updateEMI(emiId, { status: 'cancelled' });
  }
};

export const loanEMIPaymentApi = {
  async getLoanEMIPayments(userId?: string): Promise<LoanEMIPayment[]> {
    let query = supabase
      .from('loan_emi_payments')
      .select('*')
      .order('payment_date', { ascending: false });
    
    if (userId) {
      query = query.eq('user_id', userId);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    return Array.isArray(data) ? data : [];
  },

  async getPaymentsByAccount(accountId: string): Promise<LoanEMIPayment[]> {
    const { data, error } = await supabase
      .from('loan_emi_payments')
      .select('*')
      .eq('account_id', accountId)
      .order('payment_number', { ascending: true });
    
    if (error) throw error;
    return Array.isArray(data) ? data : [];
  },

  async getPaymentsByUser(userId: string): Promise<LoanEMIPayment[]> {
    const { data, error } = await supabase
      .from('loan_emi_payments')
      .select('*')
      .eq('user_id', userId)
      .order('payment_date', { ascending: false });
    
    if (error) throw error;
    return Array.isArray(data) ? data : [];
  },

  async createPayment(payment: Omit<LoanEMIPayment, 'id' | 'created_at' | 'updated_at'>): Promise<LoanEMIPayment> {
    const { data, error } = await supabase
      .from('loan_emi_payments')
      .insert(payment)
      .select()
      .maybeSingle();
    
    if (error) throw error;
    if (!data) throw new Error('Failed to create loan EMI payment');
    return data;
  },

  async createLoanEMIPayment(payment: Omit<LoanEMIPayment, 'id' | 'created_at' | 'updated_at'>): Promise<LoanEMIPayment> {
    return loanEMIPaymentApi.createPayment(payment);
  },

  async createBulkPayments(payments: Omit<LoanEMIPayment, 'id' | 'created_at' | 'updated_at'>[]): Promise<LoanEMIPayment[]> {
    const { data, error } = await supabase
      .from('loan_emi_payments')
      .insert(payments)
      .select();
    
    if (error) throw error;
    return Array.isArray(data) ? data : [];
  },

  async updatePayment(id: string, updates: Partial<LoanEMIPayment>): Promise<LoanEMIPayment> {
    const { data, error } = await supabase
      .from('loan_emi_payments')
      .update(updates)
      .eq('id', id)
      .select()
      .maybeSingle();
    
    if (error) throw error;
    if (!data) throw new Error('Failed to update loan EMI payment');
    return data;
  },

  async deletePayment(id: string): Promise<void> {
    const { error } = await supabase
      .from('loan_emi_payments')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  async deletePaymentsByAccount(accountId: string): Promise<void> {
    const { error } = await supabase
      .from('loan_emi_payments')
      .delete()
      .eq('account_id', accountId);
    
    if (error) throw error;
  },

  async getTotalPrincipalPaid(accountId: string): Promise<number> {
    const { data, error } = await supabase
      .rpc('get_total_principal_paid', { p_account_id: accountId });
    
    if (error) throw error;
    return data || 0;
  },

  async getTotalInterestPaid(accountId: string): Promise<number> {
    const { data, error } = await supabase
      .rpc('get_total_interest_paid', { p_account_id: accountId });
    
    if (error) throw error;
    return data || 0;
  },

  async getLatestOutstandingPrincipal(accountId: string): Promise<number> {
    const { data, error } = await supabase
      .rpc('get_latest_outstanding_principal', { p_account_id: accountId });
    
    if (error) throw error;
    return data || 0;
  },

  async getNextPaymentNumber(accountId: string): Promise<number> {
    const { data, error } = await supabase
      .rpc('get_next_payment_number', { p_account_id: accountId });
    
    if (error) throw error;
    return data || 1;
  }
};

// Custom Bank Links API
export const customBankLinkApi = {
  async getCustomLink(userId: string, accountId: string) {
    const { data, error } = await supabase
      .from('custom_bank_links')
      .select('*')
      .eq('user_id', userId)
      .eq('account_id', accountId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async getAllCustomLinks(userId: string) {
    const { data, error } = await supabase
      .from('custom_bank_links')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return Array.isArray(data) ? data : [];
  },

  async createCustomLink(customLink: {
    user_id: string;
    account_id: string;
    institution_name: string;
    app_name: string;
    app_url: string;
  }) {
    const { data, error } = await supabase
      .from('custom_bank_links')
      .insert(customLink)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateCustomLink(id: string, updates: {
    app_name?: string;
    app_url?: string;
  }) {
    const { data, error } = await supabase
      .from('custom_bank_links')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteCustomLink(id: string) {
    const { error } = await supabase
      .from('custom_bank_links')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};

export const bankLinksApi = {
  async getAllBankLinks(): Promise<BankLink[]> {
    const { data, error } = await supabase
      .from('bank_links')
      .select('*')
      .eq('is_active', true)
      .order('country', { ascending: true })
      .order('bank_name', { ascending: true });
    
    if (error) throw error;
    return Array.isArray(data) ? data : [];
  },

  async getBankLinksByCountry(country: string): Promise<BankLink[]> {
    const { data, error } = await supabase
      .from('bank_links')
      .select('*')
      .eq('country', country)
      .eq('is_active', true)
      .order('bank_name', { ascending: true });
    
    if (error) throw error;
    return Array.isArray(data) ? data : [];
  },

  async searchBankLinks(searchTerm: string): Promise<BankLink[]> {
    const { data, error } = await supabase
      .from('bank_links')
      .select('*')
      .ilike('bank_name', `%${searchTerm}%`)
      .eq('is_active', true)
      .order('bank_name', { ascending: true });
    
    if (error) throw error;
    return Array.isArray(data) ? data : [];
  },

  async getBankLinkByName(bankName: string, country?: string): Promise<BankLink | null> {
    let query = supabase
      .from('bank_links')
      .select('*')
      .eq('bank_name', bankName)
      .eq('is_active', true);
    
    if (country) {
      query = query.eq('country', country);
    }
    
    const { data, error } = await query.maybeSingle();
    
    if (error) throw error;
    return data;
  },

  async createBankLink(bankLink: Omit<BankLink, 'id' | 'created_at' | 'updated_at'>): Promise<BankLink> {
    const { data, error } = await supabase
      .from('bank_links')
      .insert(bankLink)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateBankLink(id: string, updates: Partial<BankLink>): Promise<BankLink> {
    const { data, error } = await supabase
      .from('bank_links')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async deleteBankLink(id: string) {
    const { error } = await supabase
      .from('bank_links')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
};

export const userCustomBankLinksApi = {
  async getUserCustomBankLinks(userId: string): Promise<UserCustomBankLink[]> {
    const { data, error } = await supabase
      .from('user_custom_bank_links')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return Array.isArray(data) ? data : [];
  },

  async getCustomBankLinksByAccount(accountId: string): Promise<UserCustomBankLink[]> {
    const { data, error } = await supabase
      .from('user_custom_bank_links')
      .select('*')
      .eq('account_id', accountId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return Array.isArray(data) ? data : [];
  },

  async createCustomBankLink(link: Omit<UserCustomBankLink, 'id' | 'created_at'>): Promise<UserCustomBankLink> {
    const { data, error } = await supabase
      .from('user_custom_bank_links')
      .insert(link)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateCustomBankLink(id: string, updates: Partial<UserCustomBankLink>): Promise<UserCustomBankLink> {
    const { data, error } = await supabase
      .from('user_custom_bank_links')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async deleteCustomBankLink(id: string) {
    const { error } = await supabase
      .from('user_custom_bank_links')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
};
