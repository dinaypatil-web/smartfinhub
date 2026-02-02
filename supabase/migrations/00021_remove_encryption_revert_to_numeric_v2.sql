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
    END;

ALTER TABLE transactions ALTER COLUMN amount SET NOT NULL;

-- Revert emi_transactions table (if it exists)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'emi_transactions'
  ) THEN
    -- Drop defaults first
    ALTER TABLE emi_transactions ALTER COLUMN bank_charges DROP DEFAULT;
    
    -- Convert columns
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
        END;
    
    ALTER TABLE emi_transactions ALTER COLUMN bank_charges SET DEFAULT 0;
    
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

-- Update column comments
COMMENT ON COLUMN accounts.balance IS 'Current account balance';
COMMENT ON COLUMN accounts.credit_limit IS 'Credit card limit';
COMMENT ON COLUMN accounts.loan_principal IS 'Original loan amount';
COMMENT ON COLUMN accounts.loan_tenure_months IS 'Loan duration in months';
COMMENT ON COLUMN accounts.current_interest_rate IS 'Current interest rate percentage';
COMMENT ON COLUMN transactions.amount IS 'Transaction amount';