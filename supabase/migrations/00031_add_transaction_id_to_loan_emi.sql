-- Migration to add transaction_id to loan_emi_payments
-- Links loan payments back to the original transaction for better tracking

ALTER TABLE loan_emi_payments 
ADD COLUMN IF NOT EXISTS transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL;

-- Create index for faster lookups by transaction
CREATE INDEX IF NOT EXISTS idx_loan_emi_payments_transaction_id ON loan_emi_payments(transaction_id);

-- Update RLS policies to ensure user can see their own payments (should already be fine, but good to ensure)
-- Most of this is already covered by existing policies in 00011.
