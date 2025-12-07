/*
# Add Credit Card Limit and EMI Transaction Tracking

## Plain English Explanation
This migration adds credit limit tracking for credit cards and creates a comprehensive EMI (Equated Monthly Installment) transaction system. Users can set their own credit limits and will be warned when approaching the limit. The EMI system allows users to convert purchases into monthly installments with bank charges, tracking each installment separately.

## Table Modifications

### accounts table
- `credit_limit` (decimal, nullable): Maximum credit limit set by user for credit card

### New Table: emi_transactions
- `id` (uuid, primary key): EMI transaction identifier
- `user_id` (uuid, references profiles): Owner of the EMI
- `account_id` (uuid, references accounts): Credit card account
- `transaction_id` (uuid, references transactions, nullable): Original purchase transaction
- `purchase_amount` (decimal): Original purchase amount
- `bank_charges` (decimal): Bank charges for EMI conversion
- `total_amount` (decimal): Purchase amount + bank charges
- `emi_months` (integer): Total number of EMI installments
- `monthly_emi` (decimal): Amount to be paid each month
- `remaining_installments` (integer): Number of installments remaining
- `start_date` (date): Date when EMI started
- `next_due_date` (date): Date when next installment is due
- `description` (text): Description of the purchase
- `status` (text): Status of EMI (active/completed/cancelled)
- `created_at` (timestamptz): Record creation timestamp
- `updated_at` (timestamptz): Last update timestamp

## Security Changes
- RLS enabled on emi_transactions table
- Users can only access their own EMI transactions
- Admins have full access to all EMI transactions

## Notes
- Credit limit is optional (user can choose not to set it)
- EMI calculation: monthly_emi = (purchase_amount + bank_charges) / emi_months
- Statement amount = current balance + sum of all monthly EMI amounts
- Available credit = credit_limit - current balance
- System will warn users when balance exceeds 80% of credit limit
*/

-- Add credit_limit column to accounts table
ALTER TABLE accounts 
ADD COLUMN IF NOT EXISTS credit_limit decimal(15, 2);

COMMENT ON COLUMN accounts.credit_limit IS 'Maximum credit limit for credit card (user-defined)';

-- Create emi_transactions table
CREATE TABLE IF NOT EXISTS emi_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  account_id uuid REFERENCES accounts(id) ON DELETE CASCADE NOT NULL,
  transaction_id uuid REFERENCES transactions(id) ON DELETE SET NULL,
  purchase_amount decimal(15, 2) NOT NULL,
  bank_charges decimal(15, 2) DEFAULT 0 NOT NULL,
  total_amount decimal(15, 2) NOT NULL,
  emi_months integer NOT NULL CHECK (emi_months > 0),
  monthly_emi decimal(15, 2) NOT NULL,
  remaining_installments integer NOT NULL CHECK (remaining_installments >= 0),
  start_date date NOT NULL,
  next_due_date date NOT NULL,
  description text,
  status text DEFAULT 'active' NOT NULL CHECK (status IN ('active', 'completed', 'cancelled')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_emi_transactions_user_id ON emi_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_emi_transactions_account_id ON emi_transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_emi_transactions_status ON emi_transactions(status);

-- Enable RLS on emi_transactions
ALTER TABLE emi_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for emi_transactions
CREATE POLICY "Admins have full access to EMI transactions" ON emi_transactions
  FOR ALL TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY "Users can view own EMI transactions" ON emi_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own EMI transactions" ON emi_transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own EMI transactions" ON emi_transactions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own EMI transactions" ON emi_transactions
  FOR DELETE USING (auth.uid() = user_id);

-- Function to calculate total statement amount for a credit card
CREATE OR REPLACE FUNCTION calculate_statement_amount(p_account_id uuid)
RETURNS decimal(15, 2) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_balance decimal(15, 2);
  v_total_emi decimal(15, 2);
BEGIN
  -- Get current balance
  SELECT balance INTO v_balance
  FROM accounts
  WHERE id = p_account_id;
  
  -- Get sum of all active monthly EMI amounts
  SELECT COALESCE(SUM(monthly_emi), 0) INTO v_total_emi
  FROM emi_transactions
  WHERE account_id = p_account_id AND status = 'active';
  
  RETURN v_balance + v_total_emi;
END;
$$;

-- Function to get credit utilization percentage
CREATE OR REPLACE FUNCTION get_credit_utilization(p_account_id uuid)
RETURNS decimal(5, 2) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_balance decimal(15, 2);
  v_credit_limit decimal(15, 2);
BEGIN
  SELECT balance, credit_limit INTO v_balance, v_credit_limit
  FROM accounts
  WHERE id = p_account_id;
  
  IF v_credit_limit IS NULL OR v_credit_limit = 0 THEN
    RETURN 0;
  END IF;
  
  RETURN (v_balance / v_credit_limit) * 100;
END;
$$;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_emi_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER emi_transactions_updated_at
  BEFORE UPDATE ON emi_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_emi_updated_at();
