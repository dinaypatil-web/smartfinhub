-- Create transaction_splits table to support splitting a single transaction within multiple expense categories
CREATE TABLE IF NOT EXISTS transaction_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  amount NUMERIC(15, 2) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE transaction_splits ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_transaction_splits_transaction_id ON transaction_splits(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transaction_splits_user_id ON transaction_splits(user_id);

-- RLS Policies
CREATE POLICY "Admins have full access to transaction_splits" ON transaction_splits
  FOR ALL TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY "Users can manage own transaction_splits" ON transaction_splits
  FOR ALL TO authenticated USING (user_id = auth.uid());
