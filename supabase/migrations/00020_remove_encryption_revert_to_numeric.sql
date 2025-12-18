/*
# Remove Encryption - Revert Fields to Numeric Types

## Issue
Encryption/decryption is causing data handling issues and adding unnecessary complexity.
Users prefer simpler, direct numeric storage without encryption layer.

## Solution
Revert all encrypted text fields back to their original numeric/integer types.
Remove encryption_salt column from profiles table.
Store all financial data as plain numeric values.

## Changes

### accounts table
- balance: text → numeric(15,2) DEFAULT 0 NOT NULL
- credit_limit: text → numeric(15,2) DEFAULT 0
- loan_principal: text → numeric(15,2)
- loan_tenure_months: text → integer
- current_interest_rate: text → numeric(5,2)

### transactions table
- amount: text → numeric(15,2) NOT NULL

### emi_transactions table (if exists)
- purchase_amount: text → numeric(15,2)
- bank_charges: text → numeric(15,2) DEFAULT 0
- total_amount: text → numeric(15,2)
- emi_months: text → integer
- monthly_emi: text → numeric(15,2)
- remaining_installments: text → integer

### profiles table
- Remove encryption_salt column

## Data Migration Strategy
For existing encrypted data:
1. Try to convert text to numeric where possible
2. Use 0 as default for invalid/encrypted values
3. Clean conversion for new installations

## Benefits
- Simpler codebase without encryption complexity
- Direct numeric operations in database
- Faster performance without encryption overhead
- Easier debugging and data inspection
- No encryption key management needed
*/

-- Revert accounts table columns to numeric types
-- For encrypted data, we'll convert what we can and default to 0 for invalid values

-- Drop defaults first, then change types, then set new defaults
ALTER TABLE accounts ALTER COLUMN balance DROP DEFAULT;
ALTER TABLE accounts ALTER COLUMN credit_limit DROP DEFAULT;

-- Convert balance
ALTER TABLE accounts 
  ALTER COLUMN balance TYPE numeric(15,2) USING 
    CASE 
      WHEN balance ~ '^[0-9]+\.?[0-9]*$' THEN balance::numeric(15,2)
      ELSE 0
    END;

ALTER TABLE accounts ALTER COLUMN balance SET DEFAULT 0;
ALTER TABLE accounts ALTER COLUMN balance SET NOT NULL;

-- Convert credit_limit
ALTER TABLE accounts
  ALTER COLUMN credit_limit TYPE numeric(15,2) USING 
    CASE 
      WHEN credit_limit IS NULL THEN NULL
      WHEN credit_limit ~ '^[0-9]+\.?[0-9]*$' THEN credit_limit::numeric(15,2)
      ELSE 0
    END;

ALTER TABLE accounts ALTER COLUMN credit_limit SET DEFAULT 0;

-- Convert loan_principal
ALTER TABLE accounts
  ALTER COLUMN loan_principal TYPE numeric(15,2) USING 
    CASE 
      WHEN loan_principal IS NULL THEN NULL
      WHEN loan_principal ~ '^[0-9]+\.?[0-9]*$' THEN loan_principal::numeric(15,2)
      ELSE NULL
    END;

-- Convert loan_tenure_months
ALTER TABLE accounts
  ALTER COLUMN loan_tenure_months TYPE integer USING 
    CASE 
      WHEN loan_tenure_months IS NULL THEN NULL
      WHEN loan_tenure_months ~ '^[0-9]+$' THEN loan_tenure_months::integer
      ELSE NULL
    END;

-- Convert current_interest_rate
ALTER TABLE accounts
  ALTER COLUMN current_interest_rate TYPE numeric(5,2) USING 
    CASE 
      WHEN current_interest_rate IS NULL THEN NULL
      WHEN current_interest_rate ~ '^[0-9]+\.?[0-9]*$' THEN current_interest_rate::numeric(5,2)
      ELSE NULL
    END;

-- Revert transactions table
ALTER TABLE transactions 
  ALTER COLUMN amount TYPE numeric(15,2) USING 
    CASE 
      WHEN amount ~ '^[0-9]+\.?[0-9]*$' THEN amount::numeric(15,2)
      ELSE 0
    END,
  ALTER COLUMN amount SET NOT NULL;

-- Revert emi_transactions table (if it exists)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'emi_transactions'
  ) THEN
    -- Revert emi_transactions columns
    ALTER TABLE emi_transactions 
      ALTER COLUMN purchase_amount TYPE numeric(15,2) USING 
        CASE 
          WHEN purchase_amount ~ '^[0-9]+\.?[0-9]*$' THEN purchase_amount::numeric(15,2)
          ELSE 0
        END;
    
    ALTER TABLE emi_transactions 
      ALTER COLUMN bank_charges TYPE numeric(15,2) USING 
        CASE 
          WHEN bank_charges IS NULL THEN 0
          WHEN bank_charges ~ '^[0-9]+\.?[0-9]*$' THEN bank_charges::numeric(15,2)
          ELSE 0
        END,
      ALTER COLUMN bank_charges SET DEFAULT 0;
    
    ALTER TABLE emi_transactions 
      ALTER COLUMN total_amount TYPE numeric(15,2) USING 
        CASE 
          WHEN total_amount ~ '^[0-9]+\.?[0-9]*$' THEN total_amount::numeric(15,2)
          ELSE 0
        END;
    
    ALTER TABLE emi_transactions 
      ALTER COLUMN emi_months TYPE integer USING 
        CASE 
          WHEN emi_months ~ '^[0-9]+$' THEN emi_months::integer
          ELSE 0
        END;
    
    ALTER TABLE emi_transactions 
      ALTER COLUMN monthly_emi TYPE numeric(15,2) USING 
        CASE 
          WHEN monthly_emi ~ '^[0-9]+\.?[0-9]*$' THEN monthly_emi::numeric(15,2)
          ELSE 0
        END;
    
    ALTER TABLE emi_transactions 
      ALTER COLUMN remaining_installments TYPE integer USING 
        CASE 
          WHEN remaining_installments ~ '^[0-9]+$' THEN remaining_installments::integer
          ELSE 0
        END;
    
    -- Re-add CHECK constraints
    ALTER TABLE emi_transactions 
      ADD CONSTRAINT emi_transactions_emi_months_check CHECK (emi_months > 0),
      ADD CONSTRAINT emi_transactions_remaining_installments_check CHECK (remaining_installments >= 0);
  END IF;
END $$;

-- Remove encryption_salt column from profiles table
ALTER TABLE profiles DROP COLUMN IF EXISTS encryption_salt;

-- Update column comments to remove encryption references
COMMENT ON COLUMN accounts.balance IS 'Current account balance';
COMMENT ON COLUMN accounts.credit_limit IS 'Credit card limit';
COMMENT ON COLUMN accounts.loan_principal IS 'Original loan amount';
COMMENT ON COLUMN accounts.loan_tenure_months IS 'Loan duration in months';
COMMENT ON COLUMN accounts.current_interest_rate IS 'Current interest rate percentage';
COMMENT ON COLUMN transactions.amount IS 'Transaction amount';
