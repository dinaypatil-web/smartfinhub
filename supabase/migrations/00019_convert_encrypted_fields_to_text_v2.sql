/*
# Convert Encrypted Numeric Fields to Text (v2)

## Issue
Application encrypts sensitive numeric data (balances, amounts, etc.) into base64 strings.
These encrypted strings are being inserted into numeric/integer database columns.
PostgreSQL rejects these inserts with error: "invalid input syntax for type numeric"

## Solution
Convert all encrypted numeric fields to TEXT type to store base64-encoded encrypted data.
The application will handle encryption/decryption and type conversion in the client.

## Affected Tables and Columns

### accounts table
- balance: numeric(15,2) → text
- credit_limit: numeric(15,2) → text
- loan_principal: numeric(15,2) → text
- loan_tenure_months: integer → text
- current_interest_rate: numeric(5,2) → text

### transactions table
- amount: numeric(15,2) → text

### emi_transactions table (if exists)
- purchase_amount: numeric(15,2) → text
- bank_charges: numeric(15,2) → text
- total_amount: numeric(15,2) → text
- emi_months: integer → text
- monthly_emi: numeric(15,2) → text
- remaining_installments: integer → text
*/

-- Alter accounts table
ALTER TABLE accounts 
  ALTER COLUMN balance TYPE text USING balance::text,
  ALTER COLUMN balance SET DEFAULT '0';

ALTER TABLE accounts
  ALTER COLUMN credit_limit TYPE text USING credit_limit::text,
  ALTER COLUMN credit_limit SET DEFAULT '0';

ALTER TABLE accounts
  ALTER COLUMN loan_principal TYPE text USING loan_principal::text;

ALTER TABLE accounts
  ALTER COLUMN loan_tenure_months TYPE text USING loan_tenure_months::text;

ALTER TABLE accounts
  ALTER COLUMN current_interest_rate TYPE text USING current_interest_rate::text;

-- Alter transactions table
ALTER TABLE transactions 
  ALTER COLUMN amount TYPE text USING amount::text;

-- Alter emi_transactions table (if it exists)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'emi_transactions'
  ) THEN
    -- Drop CHECK constraints first
    ALTER TABLE emi_transactions 
      DROP CONSTRAINT IF EXISTS emi_transactions_emi_months_check,
      DROP CONSTRAINT IF EXISTS emi_transactions_remaining_installments_check;
    
    -- Convert columns to text
    ALTER TABLE emi_transactions 
      ALTER COLUMN purchase_amount TYPE text USING purchase_amount::text,
      ALTER COLUMN bank_charges TYPE text USING bank_charges::text,
      ALTER COLUMN total_amount TYPE text USING total_amount::text,
      ALTER COLUMN emi_months TYPE text USING emi_months::text,
      ALTER COLUMN monthly_emi TYPE text USING monthly_emi::text,
      ALTER COLUMN remaining_installments TYPE text USING remaining_installments::text;
    
    -- Set default for bank_charges
    ALTER TABLE emi_transactions 
      ALTER COLUMN bank_charges SET DEFAULT '0';
  END IF;
END $$;

-- Update column comments
COMMENT ON COLUMN accounts.balance IS 'Encrypted account balance (stored as base64 text, default ''0'')';
COMMENT ON COLUMN accounts.credit_limit IS 'Encrypted credit limit (stored as base64 text, default ''0'')';
COMMENT ON COLUMN accounts.loan_principal IS 'Encrypted loan principal amount (stored as base64 text)';
COMMENT ON COLUMN accounts.loan_tenure_months IS 'Encrypted loan tenure in months (stored as base64 text)';
COMMENT ON COLUMN accounts.current_interest_rate IS 'Encrypted current interest rate (stored as base64 text)';
COMMENT ON COLUMN transactions.amount IS 'Encrypted transaction amount (stored as base64 text)';