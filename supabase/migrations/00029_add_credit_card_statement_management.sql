-- Credit Card Statement Lines Table
-- Tracks individual transactions/charges/EMIs in a credit card statement
CREATE TABLE IF NOT EXISTS credit_card_statement_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_card_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
  emi_id UUID REFERENCES emi_transactions(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  transaction_date DATE NOT NULL,
  statement_month VARCHAR(7) NOT NULL, -- Format: YYYY-MM
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'partial')),
  paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  currency VARCHAR(3) NOT NULL DEFAULT 'INR',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(transaction_id, statement_month),
  UNIQUE(emi_id, statement_month)
);

-- Credit Card Advance Payments Table
-- Tracks excess payments that become credit balance for future statements
CREATE TABLE IF NOT EXISTS credit_card_advance_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  credit_card_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  payment_amount NUMERIC(12, 2) NOT NULL,
  payment_date TIMESTAMP WITH TIME ZONE NOT NULL,
  remaining_balance NUMERIC(12, 2) NOT NULL DEFAULT 0,
  currency VARCHAR(3) NOT NULL DEFAULT 'INR',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Credit Card Repayment Allocations Table
-- Maps repayment transactions to specific statement line items and EMIs
CREATE TABLE IF NOT EXISTS credit_card_repayment_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repayment_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  statement_line_id UUID NOT NULL REFERENCES credit_card_statement_lines(id) ON DELETE CASCADE,
  emi_id UUID REFERENCES emi_transactions(id) ON DELETE SET NULL,
  allocated_amount NUMERIC(12, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_cc_statement_lines_credit_card_id ON credit_card_statement_lines(credit_card_id);
CREATE INDEX IF NOT EXISTS idx_cc_statement_lines_status ON credit_card_statement_lines(status);
CREATE INDEX IF NOT EXISTS idx_cc_statement_lines_statement_month ON credit_card_statement_lines(statement_month);
CREATE INDEX IF NOT EXISTS idx_cc_statement_lines_transaction_id ON credit_card_statement_lines(transaction_id);
CREATE INDEX IF NOT EXISTS idx_cc_statement_lines_emi_id ON credit_card_statement_lines(emi_id);
CREATE INDEX IF NOT EXISTS idx_cc_advance_payments_credit_card_id ON credit_card_advance_payments(credit_card_id);
CREATE INDEX IF NOT EXISTS idx_cc_repayment_allocations_repayment_id ON credit_card_repayment_allocations(repayment_id);
CREATE INDEX IF NOT EXISTS idx_cc_repayment_allocations_statement_line_id ON credit_card_repayment_allocations(statement_line_id);

-- Enable RLS (Row Level Security)
ALTER TABLE credit_card_statement_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_card_advance_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_card_repayment_allocations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for credit_card_statement_lines
CREATE POLICY "Users can view their own credit card statement lines"
  ON credit_card_statement_lines FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own credit card statement lines"
  ON credit_card_statement_lines FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own credit card statement lines"
  ON credit_card_statement_lines FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own credit card statement lines"
  ON credit_card_statement_lines FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for credit_card_advance_payments
CREATE POLICY "Users can view their own advance payments"
  ON credit_card_advance_payments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own advance payments"
  ON credit_card_advance_payments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own advance payments"
  ON credit_card_advance_payments FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own advance payments"
  ON credit_card_advance_payments FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for credit_card_repayment_allocations
CREATE POLICY "Users can view allocations for their repayments"
  ON credit_card_repayment_allocations FOR SELECT
  USING (
    repayment_id IN (
      SELECT id FROM transactions 
      WHERE (from_account_id IN (
        SELECT id FROM accounts WHERE user_id = auth.uid()
      ) OR to_account_id IN (
        SELECT id FROM accounts WHERE user_id = auth.uid()
      ))
    )
  );

CREATE POLICY "Users can insert allocations for their repayments"
  ON credit_card_repayment_allocations FOR INSERT
  WITH CHECK (
    repayment_id IN (
      SELECT id FROM transactions 
      WHERE (from_account_id IN (
        SELECT id FROM accounts WHERE user_id = auth.uid()
      ) OR to_account_id IN (
        SELECT id FROM accounts WHERE user_id = auth.uid()
      ))
    )
  );

CREATE POLICY "Users can delete allocations for their repayments"
  ON credit_card_repayment_allocations FOR DELETE
  USING (
    repayment_id IN (
      SELECT id FROM transactions 
      WHERE (from_account_id IN (
        SELECT id FROM accounts WHERE user_id = auth.uid()
      ) OR to_account_id IN (
        SELECT id FROM accounts WHERE user_id = auth.uid()
      ))
    )
  );
