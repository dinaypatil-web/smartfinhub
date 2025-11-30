export type UserRole = 'user' | 'admin';
export type AccountType = 'cash' | 'bank' | 'credit_card' | 'loan';
export type InterestRateType = 'fixed' | 'floating';
export type TransactionType = 'income' | 'expense' | 'withdrawal' | 'transfer' | 'loan_payment' | 'credit_card_payment';

export interface Profile {
  id: string;
  email: string | null;
  phone: string | null;
  default_country: string;
  default_currency: string;
  role: UserRole;
  created_at: string;
}

export interface Account {
  id: string;
  user_id: string;
  account_type: AccountType;
  account_name: string;
  country: string;
  institution_name: string;
  institution_logo: string | null;
  last_4_digits: string | null;
  balance: number;
  currency: string;
  loan_principal: number | null;
  loan_tenure_months: number | null;
  interest_rate_type: InterestRateType | null;
  current_interest_rate: number | null;
  created_at: string;
  updated_at: string;
}

export interface InterestRateHistory {
  id: string;
  account_id: string;
  interest_rate: number;
  effective_date: string;
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  transaction_type: TransactionType;
  from_account_id: string | null;
  to_account_id: string | null;
  amount: number;
  currency: string;
  category: string | null;
  description: string | null;
  transaction_date: string;
  created_at: string;
  updated_at: string;
}

export interface Budget {
  id: string;
  user_id: string;
  month: number;
  year: number;
  budgeted_income: number;
  budgeted_expenses: number;
  category_budgets: Record<string, number>;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface ExpenseCategory {
  id: string;
  user_id: string | null;
  name: string;
  icon: string;
  color: string;
  is_system: boolean;
  created_at: string;
}

export interface AccountWithInterestHistory extends Account {
  interest_history?: InterestRateHistory[];
}

export interface TransactionWithAccounts extends Transaction {
  from_account?: Account;
  to_account?: Account;
}

export interface BudgetAnalysis {
  budget: Budget;
  actual_income: number;
  actual_expenses: number;
  income_variance: number;
  expense_variance: number;
  category_analysis: Record<string, {
    budgeted: number;
    actual: number;
    variance: number;
  }>;
}

export interface FinancialSummary {
  total_assets: number;
  total_liabilities: number;
  liquid_assets: number;
  net_worth: number;
  accounts_by_type: {
    cash: Account[];
    bank: Account[];
    credit_card: Account[];
    loan: Account[];
  };
}

export interface CountryOption {
  code: string;
  name: string;
  currency: string;
}

export interface BankOption {
  name: string;
  logo: string;
  country: string;
}
