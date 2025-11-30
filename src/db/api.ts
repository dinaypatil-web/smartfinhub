import { supabase } from './supabase';
import type {
  Profile,
  Account,
  LoanAccountWithCalculations,
  InterestRateHistory,
  Transaction,
  Budget,
  ExpenseCategory,
  AccountWithInterestHistory,
  TransactionWithAccounts,
  FinancialSummary,
  BudgetAnalysis
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
    const { data, error } = await supabase
      .from('accounts')
      .insert({
        ...account,
        balance: account.balance || 0,
        currency: account.currency || 'USD'
      })
      .select()
      .maybeSingle();
    
    if (error) throw error;
    if (!data) throw new Error('Failed to create account');
    return data;
  },

  async updateAccount(accountId: string, updates: Partial<Account>): Promise<Account> {
    const { data, error } = await supabase
      .from('accounts')
      .update({ ...updates, updated_at: new Date().toISOString() })
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
    const total_liabilities = creditCards.reduce((sum, acc) => sum + Number(acc.balance), 0);
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
    return Array.isArray(data) ? data : [];
  },

  async getTransactionsByCategory(userId: string, category: string): Promise<Transaction[]> {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .eq('category', category)
      .order('transaction_date', { ascending: false });
    
    if (error) throw error;
    return Array.isArray(data) ? data : [];
  },

  async createTransaction(transaction: Omit<Transaction, 'id' | 'created_at' | 'updated_at'>): Promise<Transaction> {
    const { data, error } = await supabase
      .from('transactions')
      .insert({
        ...transaction,
        currency: transaction.currency || 'USD'
      })
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

    const { data, error } = await supabase
      .from('transactions')
      .update({ ...updates, updated_at: new Date().toISOString() })
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
          await this.adjustBalance(transaction.from_account_id, -amount);
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
          await this.adjustBalance(transaction.from_account_id, -amount);
        }
        if (transaction.to_account_id) {
          await this.adjustBalance(transaction.to_account_id, amount);
        }
        break;
      
      case 'loan_payment':
      case 'credit_card_payment':
        if (transaction.from_account_id) {
          await this.adjustBalance(transaction.from_account_id, -amount);
        }
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
          await this.adjustBalance(transaction.from_account_id, amount);
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
          await this.adjustBalance(transaction.from_account_id, amount);
        }
        if (transaction.to_account_id) {
          await this.adjustBalance(transaction.to_account_id, -amount);
        }
        break;
      
      case 'loan_payment':
      case 'credit_card_payment':
        if (transaction.from_account_id) {
          await this.adjustBalance(transaction.from_account_id, amount);
        }
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
          currency: budget.currency || 'USD',
          budgeted_income: budget.budgeted_income || 0,
          budgeted_expenses: budget.budgeted_expenses || 0,
          category_budgets: budget.category_budgets || {}
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
      .filter(t => t.transaction_type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    // Fetch categories to map ID to name
    const categories = await categoryApi.getCategories(userId);
    const categoryMap = new Map(categories.map(c => [c.id, c.name]));

    const category_analysis: Record<string, { budgeted: number; actual: number; variance: number }> = {};
    
    for (const [categoryId, budgeted] of Object.entries(budget.category_budgets)) {
      const categoryName = categoryMap.get(categoryId);
      if (!categoryName) continue;
      
      const actual = transactions
        .filter(t => t.category === categoryName && t.transaction_type === 'expense')
        .reduce((sum, t) => sum + Number(t.amount), 0);
      
      category_analysis[categoryId] = {
        budgeted: Number(budgeted),
        actual,
        variance: Number(budgeted) - actual
      };
    }

    return {
      budget,
      actual_income,
      actual_expenses,
      income_variance: actual_income - Number(budget.budgeted_income),
      expense_variance: Number(budget.budgeted_expenses) - actual_expenses,
      category_analysis
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
