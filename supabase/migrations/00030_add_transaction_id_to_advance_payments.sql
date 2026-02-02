-- Add transaction_id to credit_card_advance_payments table
ALTER TABLE credit_card_advance_payments 
ADD COLUMN IF NOT EXISTS transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_cc_advance_payments_transaction_id ON credit_card_advance_payments(transaction_id);
