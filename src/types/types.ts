export type UserRole = 'user' | 'admin';
export type AccountType = 'cash' | 'bank' | 'credit_card' | 'loan';
export type InterestRateType = 'fixed' | 'floating';
export type TransactionType = 'income' | 'expense' | 'withdrawal' | 'transfer' | 'loan_payment' | 'credit_card_repayment' | 'interest_charge';

export interface Profile {
  id: string;
  email: string | null;
  phone: string | null;
  default_country: string;
  default_currency: string;
  role: UserRole;
  created_at: string;
  encryption_salt: string | null;
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
  loan_start_date: string | null;
  interest_rate_type: InterestRateType | null;
  current_interest_rate: number | null;
  due_date: number | null;
  statement_day: number | null;
  due_day: number | null;
  credit_limit: number | null;
  created_at: string;
  updated_at: string;
}

export interface LoanAccountWithCalculations extends Account {
  emi: number;
  accrued_interest: number;
  total_interest_payable: number;
  remaining_tenure_months: number;
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
  income_category: IncomeCategoryKey | null;
  description: string | null;
  transaction_date: string;
  created_at: string;
  updated_at: string;
}

export type IncomeCategoryKey = 'salaries' | 'allowances' | 'family_income' | 'others';

export interface IncomeCategory {
  key: IncomeCategoryKey;
  name: string;
  icon: string;
  color: string;
}

export interface Budget {
  id: string;
  user_id: string;
  month: number;
  year: number;
  budgeted_income: number;
  budgeted_expenses: number;
  category_budgets: Record<string, number>;
  income_category_budgets: Record<IncomeCategoryKey, number>;
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

export interface CustomBankLink {
  id: string;
  user_id: string;
  account_id: string;
  institution_name: string;
  app_name: string;
  app_url: string;
  created_at: string;
  updated_at: string;
}

export interface BankLink {
  id: string;
  bank_name: string;
  country: string;
  web_url: string | null;
  ios_app_url: string | null;
  android_app_url: string | null;
  deep_link_ios: string | null;
  deep_link_android: string | null;
  logo_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserCustomBankLink {
  id: string;
  user_id: string;
  account_id: string | null;
  bank_name: string;
  web_url: string | null;
  ios_app_url: string | null;
  android_app_url: string | null;
  notes: string | null;
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
  income_category_analysis: Record<IncomeCategoryKey, {
    budgeted: number;
    actual: number;
    variance: number;
  }>;
}

export interface FinancialSummary {
  total_assets: number;
  total_liabilities: number;
  liquid_assets: number;
  working_capital: number;
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
  appLink?: string; // Optional mobile banking app link (deprecated - use androidAppLink/iosAppLink)
  androidAppLink?: string; // Google Play Store link
  iosAppLink?: string; // Apple App Store link
}

export type EMIStatus = 'active' | 'completed' | 'cancelled';

export interface EMITransaction {
  id: string;
  user_id: string;
  account_id: string;
  transaction_id: string | null;
  purchase_amount: number;
  bank_charges: number;
  total_amount: number;
  emi_months: number;
  monthly_emi: number;
  remaining_installments: number;
  start_date: string;
  next_due_date: string;
  description: string | null;
  status: EMIStatus;
  created_at: string;
  updated_at: string;
}

export interface AccountWithEMI extends Account {
  active_emis?: EMITransaction[];
  total_emi_amount?: number;
  statement_amount?: number;
  credit_utilization?: number;
  available_credit?: number;
}

export interface LoanEMIPayment {
  id: string;
  user_id: string;
  account_id: string;
  payment_date: string;
  emi_amount: number;
  principal_component: number;
  interest_component: number;
  outstanding_principal: number;
  interest_rate: number;
  payment_number: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface LoanAccountWithPayments extends LoanAccountWithCalculations {
  emi_payments?: LoanEMIPayment[];
  total_principal_paid?: number;
  total_interest_paid?: number;
  remaining_principal?: number;
}
