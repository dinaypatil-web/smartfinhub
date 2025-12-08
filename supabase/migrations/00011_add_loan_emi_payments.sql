/*
# Add Loan EMI Payment Tracking

## Plain English Explanation
This migration creates a comprehensive system for tracking individual EMI (Equated Monthly Installment) payments for loan accounts. When users add a loan account, they can record each EMI payment with its date and amount. The system automatically calculates the principal and interest components of each payment based on the reducing balance method, enabling accurate loan statements and accrued interest calculations.

## New Table: loan_emi_payments

### Columns
- `id` (uuid, primary key): Unique identifier for each EMI payment
- `user_id` (uuid, references profiles): Owner of the loan account
- `account_id` (uuid, references accounts): Loan account this payment belongs to
- `payment_date` (date, not null): Date when the EMI was paid
- `emi_amount` (decimal, not null): Total EMI amount paid
- `principal_component` (decimal, not null): Principal portion of the EMI
- `interest_component` (decimal, not null): Interest portion of the EMI
- `outstanding_principal` (decimal, not null): Remaining principal after this payment
- `interest_rate` (decimal, not null): Interest rate applicable at time of payment (for floating rate loans)
- `payment_number` (integer, not null): Sequential payment number (1, 2, 3, etc.)
- `notes` (text, nullable): Optional notes about the payment
- `created_at` (timestamptz): Record creation timestamp
- `updated_at` (timestamptz): Last update timestamp

## Security Changes
- RLS enabled on loan_emi_payments table
- Users can only access their own loan EMI payments
- Admins have full access to all loan EMI payments

## Indexes
- Index on user_id for faster user-specific queries
- Index on account_id for faster account-specific queries
- Index on payment_date for chronological queries

## Notes
- Principal and interest components are calculated using the reducing balance method
- For floating rate loans, the interest rate at the time of payment is stored
- Outstanding principal is tracked after each payment for accurate balance calculation
- Payment numbers help maintain the sequence of payments
- This data enables generation of detailed loan account statements
- Accrued interest calculations use actual payment history
*/

-- Create loan_emi_payments table
CREATE TABLE IF NOT EXISTS loan_emi_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  account_id uuid REFERENCES accounts(id) ON DELETE CASCADE NOT NULL,
  payment_date date NOT NULL,
  emi_amount decimal(15, 2) NOT NULL CHECK (emi_amount > 0),
  principal_component decimal(15, 2) NOT NULL CHECK (principal_component >= 0),
  interest_component decimal(15, 2) NOT NULL CHECK (interest_component >= 0),
  outstanding_principal decimal(15, 2) NOT NULL CHECK (outstanding_principal >= 0),
  interest_rate decimal(5, 2) NOT NULL CHECK (interest_rate >= 0),
  payment_number integer NOT NULL CHECK (payment_number > 0),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_loan_emi_payments_user_id ON loan_emi_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_loan_emi_payments_account_id ON loan_emi_payments(account_id);
CREATE INDEX IF NOT EXISTS idx_loan_emi_payments_payment_date ON loan_emi_payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_loan_emi_payments_account_payment_number ON loan_emi_payments(account_id, payment_number);

-- Enable RLS on loan_emi_payments
ALTER TABLE loan_emi_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for loan_emi_payments
CREATE POLICY "Admins have full access to loan EMI payments" ON loan_emi_payments
  FOR ALL TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY "Users can view own loan EMI payments" ON loan_emi_payments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own loan EMI payments" ON loan_emi_payments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own loan EMI payments" ON loan_emi_payments
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own loan EMI payments" ON loan_emi_payments
  FOR DELETE USING (auth.uid() = user_id);

-- Trigger to update updated_at timestamp
CREATE TRIGGER loan_emi_payments_updated_at
  BEFORE UPDATE ON loan_emi_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_emi_updated_at();

-- Function to get total principal paid for a loan account
CREATE OR REPLACE FUNCTION get_total_principal_paid(p_account_id uuid)
RETURNS decimal(15, 2) LANGUAGE sql SECURITY DEFINER AS $$
  SELECT COALESCE(SUM(principal_component), 0)
  FROM loan_emi_payments
  WHERE account_id = p_account_id;
$$;

-- Function to get total interest paid for a loan account
CREATE OR REPLACE FUNCTION get_total_interest_paid(p_account_id uuid)
RETURNS decimal(15, 2) LANGUAGE sql SECURITY DEFINER AS $$
  SELECT COALESCE(SUM(interest_component), 0)
  FROM loan_emi_payments
  WHERE account_id = p_account_id;
$$;

-- Function to get latest outstanding principal for a loan account
CREATE OR REPLACE FUNCTION get_latest_outstanding_principal(p_account_id uuid)
RETURNS decimal(15, 2) LANGUAGE sql SECURITY DEFINER AS $$
  SELECT COALESCE(
    (SELECT outstanding_principal 
     FROM loan_emi_payments 
     WHERE account_id = p_account_id 
     ORDER BY payment_number DESC 
     LIMIT 1),
    (SELECT balance FROM accounts WHERE id = p_account_id)
  );
$$;

-- Function to get next payment number for a loan account
CREATE OR REPLACE FUNCTION get_next_payment_number(p_account_id uuid)
RETURNS integer LANGUAGE sql SECURITY DEFINER AS $$
  SELECT COALESCE(MAX(payment_number), 0) + 1
  FROM loan_emi_payments
  WHERE account_id = p_account_id;
$$;
