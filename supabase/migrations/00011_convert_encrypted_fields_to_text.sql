/*
# Convert Encrypted Numeric Fields to Text

## Issue
Application encrypts sensitive numeric data (balances, amounts, etc.) into base64 strings.
These encrypted strings are being inserted into numeric/integer database columns.
PostgreSQL rejects these inserts with error: "invalid input syntax for type numeric"

## Root Cause
Database columns are defined as numeric/integer types, but encrypted data is text (base64).
The encryption layer converts numbers to encrypted strings, which cannot be stored in numeric columns.

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

### emi_transactions table
- purchase_amount: numeric(15,2) → text
- bank_charges: numeric(15,2) → text
- total_amount: numeric(15,2) → text
- emi_months: integer → text
- monthly_emi: numeric(15,2) → text
- remaining_installments: integer → text

## Data Migration
Since these columns may contain existing data, we need to:
1. Convert existing numeric values to text
2. Change column type to text
3. Existing encrypted data (if any) will remain as text

## Benefits
- Encrypted data can be stored without type conflicts
- Application handles all encryption/decryption
- Database stores encrypted strings safely
- No data loss during migration
*/

-- Drop CHECK constraints on emi_transactions before altering column types
ALTER TABLE emi_transactions 
  DROP CONSTRAINT IF EXISTS emi_transactions_emi_months_check,
  DROP CONSTRAINT IF EXISTS emi_transactions_remaining_installments_check;

-- Alter accounts table
ALTER TABLE accounts 
  ALTER COLUMN balance TYPE text USING balance::text,
  ALTER COLUMN credit_limit TYPE text USING credit_limit::text,
  ALTER COLUMN loan_principal TYPE text USING loan_principal::text,
  ALTER COLUMN loan_tenure_months TYPE text USING loan_tenure_months::text,
  ALTER COLUMN current_interest_rate TYPE text USING current_interest_rate::text;

-- Alter transactions table
ALTER TABLE transactions 
  ALTER COLUMN amount TYPE text USING amount::text;

-- Alter emi_transactions table
ALTER TABLE emi_transactions 
  ALTER COLUMN purchase_amount TYPE text USING purchase_amount::text,
  ALTER COLUMN bank_charges TYPE text USING bank_charges::text,
  ALTER COLUMN total_amount TYPE text USING total_amount::text,
  ALTER COLUMN emi_months TYPE text USING emi_months::text,
  ALTER COLUMN monthly_emi TYPE text USING monthly_emi::text,
  ALTER COLUMN remaining_installments TYPE text USING remaining_installments::text;

-- Update column comments to reflect encryption
COMMENT ON COLUMN accounts.balance IS 'Encrypted account balance (stored as base64 text)';
COMMENT ON COLUMN accounts.credit_limit IS 'Encrypted credit limit (stored as base64 text)';
COMMENT ON COLUMN accounts.loan_principal IS 'Encrypted loan principal amount (stored as base64 text)';
COMMENT ON COLUMN accounts.loan_tenure_months IS 'Encrypted loan tenure in months (stored as base64 text)';
COMMENT ON COLUMN accounts.current_interest_rate IS 'Encrypted current interest rate (stored as base64 text)';

COMMENT ON COLUMN transactions.amount IS 'Encrypted transaction amount (stored as base64 text)';

COMMENT ON COLUMN emi_transactions.purchase_amount IS 'Encrypted purchase amount (stored as base64 text)';
COMMENT ON COLUMN emi_transactions.bank_charges IS 'Encrypted bank charges (stored as base64 text)';
COMMENT ON COLUMN emi_transactions.total_amount IS 'Encrypted total amount (stored as base64 text)';
COMMENT ON COLUMN emi_transactions.emi_months IS 'Encrypted EMI months (stored as base64 text)';
COMMENT ON COLUMN emi_transactions.monthly_emi IS 'Encrypted monthly EMI amount (stored as base64 text)';
COMMENT ON COLUMN emi_transactions.remaining_installments IS 'Encrypted remaining installments (stored as base64 text)';
