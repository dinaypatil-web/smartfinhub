/*
# Fix Default Values for Encrypted Text Fields

## Issue
After converting encrypted numeric fields to TEXT type, the default values remain as numeric (e.g., DEFAULT 0).
When inserting new records, PostgreSQL tries to use numeric default values for text columns, causing type mismatch errors.

## Root Cause
Migration 00011 converted column types from numeric to text, but did not update the DEFAULT constraints.
The columns still have DEFAULT 0 (numeric) instead of DEFAULT '0' (text).

## Solution
Update all DEFAULT constraints for encrypted text fields to use text values instead of numeric values.
This ensures new records can be created without type conflicts.

## Affected Columns

### accounts table
- balance: DEFAULT 0 → DEFAULT '0'
- credit_limit: DEFAULT 0 → DEFAULT '0'
- loan_principal: DEFAULT NULL (already correct)
- loan_tenure_months: DEFAULT NULL (already correct)
- current_interest_rate: DEFAULT NULL (already correct)

### transactions table
- amount: No default (already correct)

### emi_transactions table
- purchase_amount: No default (already correct)
- bank_charges: DEFAULT 0 → DEFAULT '0'
- total_amount: No default (already correct)
- emi_months: No default (already correct)
- monthly_emi: No default (already correct)
- remaining_installments: No default (already correct)

## Benefits
- New accounts can be created without type mismatch errors
- Encrypted data is properly stored as text
- Default values are compatible with text column types
- Maintains data integrity and encryption functionality
*/

-- Fix default values for accounts table
ALTER TABLE accounts 
  ALTER COLUMN balance SET DEFAULT '0';

-- Fix default values for emi_transactions table (if credit_limit exists)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'accounts' AND column_name = 'credit_limit'
  ) THEN
    ALTER TABLE accounts ALTER COLUMN credit_limit SET DEFAULT '0';
  END IF;
END $$;

-- Fix default values for emi_transactions table (if it exists)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'emi_transactions'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'emi_transactions' AND column_name = 'bank_charges'
    ) THEN
      ALTER TABLE emi_transactions ALTER COLUMN bank_charges SET DEFAULT '0';
    END IF;
  END IF;
END $$;

-- Update column comments
COMMENT ON COLUMN accounts.balance IS 'Encrypted account balance (stored as base64 text, default ''0'')';
