/*
# SmartFinHub Database Schema

## Plain English Explanation
This migration creates the complete database structure for SmartFinHub, a financial management application. It includes tables for user profiles, financial accounts (bank, credit card, loan), transactions, budgets, and expense categories. The schema supports multi-currency operations, encrypted account numbers, floating interest rate tracking for loans, and comprehensive budget management.

## Table List & Column Descriptions

### 1. profiles
User profile and settings table
- `id` (uuid, primary key, references auth.users): User identifier
- `email` (text, unique): User email address
- `phone` (text, unique): User phone number
- `default_country` (text, default 'IN'): User's default country for dashboard
- `default_currency` (text, default 'INR'): User's default currency
- `role` (user_role enum, default 'user'): User role (user/admin)
- `created_at` (timestamptz): Profile creation timestamp

### 2. accounts
Financial accounts table (bank, credit card, loan)
- `id` (uuid, primary key): Account identifier
- `user_id` (uuid, references profiles): Owner of the account
- `account_type` (account_type enum): Type of account (bank/credit_card/loan)
- `account_name` (text): Custom name for the account
- `country` (text): Country where account is held
- `institution_name` (text): Bank or financial institution name
- `institution_logo` (text): URL to institution logo
- `last_4_digits` (text): Last 4 digits of account number (for display)
- `balance` (decimal): Current account balance
- `currency` (text, default 'USD'): Account currency
- `loan_principal` (decimal): Original loan amount (for loan accounts)
- `loan_tenure_months` (integer): Loan duration in months
- `interest_rate_type` (interest_rate_type enum): Fixed or floating rate
- `current_interest_rate` (decimal): Current interest rate percentage
- `created_at` (timestamptz): Account creation timestamp
- `updated_at` (timestamptz): Last update timestamp

### 3. interest_rate_history
Historical interest rate changes for floating rate loans
- `id` (uuid, primary key): Record identifier
- `account_id` (uuid, references accounts): Associated loan account
- `interest_rate` (decimal): Interest rate percentage
- `effective_date` (date): Date when rate became effective
- `created_at` (timestamptz): Record creation timestamp

### 4. transactions
Financial transactions table
- `id` (uuid, primary key): Transaction identifier
- `user_id` (uuid, references profiles): Transaction owner
- `transaction_type` (transaction_type enum): Type of transaction
- `from_account_id` (uuid, references accounts): Source account (nullable)
- `to_account_id` (uuid, references accounts): Destination account (nullable)
- `amount` (decimal): Transaction amount
- `currency` (text, default 'USD'): Transaction currency
- `category` (text): Expense/income category
- `description` (text): Transaction description
- `transaction_date` (date): Date of transaction
- `created_at` (timestamptz): Record creation timestamp
- `updated_at` (timestamptz): Last update timestamp

### 5. budgets
Monthly budget planning table
- `id` (uuid, primary key): Budget identifier
- `user_id` (uuid, references profiles): Budget owner
- `month` (integer): Month (1-12)
- `year` (integer): Year
- `budgeted_income` (decimal): Planned income
- `budgeted_expenses` (decimal): Planned total expenses
- `category_budgets` (jsonb): Budget breakdown by category
- `currency` (text, default 'USD'): Budget currency
- `created_at` (timestamptz): Record creation timestamp
- `updated_at` (timestamptz): Last update timestamp

### 6. expense_categories
Predefined and custom expense categories
- `id` (uuid, primary key): Category identifier
- `user_id` (uuid, references profiles, nullable): Owner (null for system categories)
- `name` (text): Category name
- `icon` (text): Icon identifier
- `color` (text): Display color
- `is_system` (boolean, default false): System-defined category flag
- `created_at` (timestamptz): Record creation timestamp

## Security Changes
- RLS enabled on all tables
- Helper function `is_admin` to check admin role
- Admins have full access to all data
- Users can only access their own data
- Public read access not enabled (financial data is private)
- First registered user automatically becomes admin

## Notes
- Account numbers are NOT stored in database (only last 4 digits)
- Credit card and loan balances are stored as positive numbers
- Loan interest is calculated on-the-fly based on rate history
- Budget variance is calculated by comparing actual vs budgeted amounts
- All monetary values use decimal type for precision
- Multi-currency support throughout the application
*/

-- Create ENUM types
CREATE TYPE user_role AS ENUM ('user', 'admin');
CREATE TYPE account_type AS ENUM ('bank', 'credit_card', 'loan');
CREATE TYPE interest_rate_type AS ENUM ('fixed', 'floating');
CREATE TYPE transaction_type AS ENUM ('income', 'expense', 'withdrawal', 'transfer', 'loan_payment', 'credit_card_payment');

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE,
  phone text UNIQUE,
  default_country text DEFAULT 'IN',
  default_currency text DEFAULT 'INR',
  role user_role DEFAULT 'user'::user_role NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create accounts table
CREATE TABLE IF NOT EXISTS accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  account_type account_type NOT NULL,
  account_name text NOT NULL,
  country text NOT NULL,
  institution_name text NOT NULL,
  institution_logo text,
  last_4_digits text,
  balance decimal(15, 2) DEFAULT 0 NOT NULL,
  currency text DEFAULT 'INR' NOT NULL,
  loan_principal decimal(15, 2),
  loan_tenure_months integer,
  interest_rate_type interest_rate_type,
  current_interest_rate decimal(5, 2),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create interest_rate_history table
CREATE TABLE IF NOT EXISTS interest_rate_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid REFERENCES accounts(id) ON DELETE CASCADE NOT NULL,
  interest_rate decimal(5, 2) NOT NULL,
  effective_date date NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  transaction_type transaction_type NOT NULL,
  from_account_id uuid REFERENCES accounts(id) ON DELETE SET NULL,
  to_account_id uuid REFERENCES accounts(id) ON DELETE SET NULL,
  amount decimal(15, 2) NOT NULL,
  currency text DEFAULT 'INR' NOT NULL,
  category text,
  description text,
  transaction_date date NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create budgets table
CREATE TABLE IF NOT EXISTS budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  month integer NOT NULL CHECK (month >= 1 AND month <= 12),
  year integer NOT NULL,
  budgeted_income decimal(15, 2) DEFAULT 0,
  budgeted_expenses decimal(15, 2) DEFAULT 0,
  category_budgets jsonb DEFAULT '{}',
  currency text DEFAULT 'INR' NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, month, year)
);

-- Create expense_categories table
CREATE TABLE IF NOT EXISTS expense_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  icon text DEFAULT '📁',
  color text DEFAULT '#6B7280',
  is_system boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Insert system expense categories
INSERT INTO expense_categories (name, icon, color, is_system) VALUES
  ('Food & Dining', '🍔', '#10B981', true),
  ('Transportation', '🚗', '#3B82F6', true),
  ('Shopping', '🛍️', '#8B5CF6', true),
  ('Entertainment', '🎬', '#F59E0B', true),
  ('Healthcare', '🏥', '#EF4444', true),
  ('Bills & Utilities', '💡', '#6366F1', true),
  ('Education', '📚', '#14B8A6', true),
  ('Travel', '✈️', '#EC4899', true),
  ('Salary', '💰', '#10B981', true),
  ('Investment', '📈', '#3B82F6', true),
  ('Other', '📁', '#6B7280', true);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE interest_rate_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;

-- Create admin helper function
CREATE OR REPLACE FUNCTION is_admin(uid uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = uid AND p.role = 'admin'::user_role
  );
$$;

-- RLS Policies for profiles
CREATE POLICY "Admins have full access to profiles" ON profiles
  FOR ALL TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id) 
  WITH CHECK (role IS NOT DISTINCT FROM (SELECT role FROM profiles WHERE id = auth.uid()));

-- RLS Policies for accounts
CREATE POLICY "Admins have full access to accounts" ON accounts
  FOR ALL TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY "Users can manage own accounts" ON accounts
  FOR ALL TO authenticated USING (user_id = auth.uid());

-- RLS Policies for interest_rate_history
CREATE POLICY "Admins have full access to interest_rate_history" ON interest_rate_history
  FOR ALL TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY "Users can manage own interest rate history" ON interest_rate_history
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM accounts WHERE accounts.id = interest_rate_history.account_id AND accounts.user_id = auth.uid())
  );

-- RLS Policies for transactions
CREATE POLICY "Admins have full access to transactions" ON transactions
  FOR ALL TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY "Users can manage own transactions" ON transactions
  FOR ALL TO authenticated USING (user_id = auth.uid());

-- RLS Policies for budgets
CREATE POLICY "Admins have full access to budgets" ON budgets
  FOR ALL TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY "Users can manage own budgets" ON budgets
  FOR ALL TO authenticated USING (user_id = auth.uid());

-- RLS Policies for expense_categories
CREATE POLICY "Everyone can view categories" ON expense_categories
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins have full access to categories" ON expense_categories
  FOR ALL TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY "Users can manage own custom categories" ON expense_categories
  FOR ALL TO authenticated USING (user_id = auth.uid() AND is_system = false);

-- Create trigger function for auth user confirmation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  user_count int;
BEGIN
  SELECT COUNT(*) INTO user_count FROM profiles;
  INSERT INTO profiles (id, email, phone, role)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.phone,
    CASE WHEN user_count = 0 THEN 'admin'::user_role ELSE 'user'::user_role END
  );
  RETURN NEW;
END;
$$;

-- Create trigger for new user confirmation
DROP TRIGGER IF EXISTS on_auth_user_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_confirmed
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  WHEN (OLD.confirmed_at IS NULL AND NEW.confirmed_at IS NOT NULL)
  EXECUTE FUNCTION handle_new_user();

-- Create indexes for better performance
CREATE INDEX idx_accounts_user_id ON accounts(user_id);
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_date ON transactions(transaction_date DESC);
CREATE INDEX idx_budgets_user_month_year ON budgets(user_id, year, month);
CREATE INDEX idx_interest_rate_history_account ON interest_rate_history(account_id, effective_date DESC);