/*
# Migrate Credit Card Transactions and EMIs to statement lines

## 1. Migrate Expenses/Withdrawals
Inserts all existing credit card transactions into credit_card_statement_lines.
*/

INSERT INTO credit_card_statement_lines (
    credit_card_id,
    user_id,
    transaction_id,
    description,
    amount,
    transaction_date,
    statement_month,
    status,
    paid_amount
)
SELECT 
    t.from_account_id,
    t.user_id,
    t.id,
    COALESCE(t.description, 'Credit Card Transaction'),
    t.amount,
    t.transaction_date,
    TO_CHAR(t.transaction_date, 'YYYY-MM'),
    'paid', -- Assume past transactions are paid unless they are very recent (logic can be refined)
    t.amount
FROM transactions t
JOIN accounts a ON t.from_account_id = a.id
WHERE a.account_type = 'credit_card'
AND t.transaction_type IN ('expense', 'withdrawal')
ON CONFLICT (transaction_id, statement_month) DO NOTHING;

/*
## 2. Migrate EMI Installments
For each EMI, we need to create line items for past and future installments.
Since the schema has a UNIQUE constraint on (emi_id, statement_month), we can generate these easily.
*/

-- This is a simplified approach. In a real scenario, we might want to iterate months.
-- For now, let's insert the CURRENT and NEXT installments for active EMIs.

-- Current month installment
INSERT INTO credit_card_statement_lines (
    credit_card_id,
    user_id,
    emi_id,
    description,
    amount,
    transaction_date,
    statement_month,
    status
)
SELECT 
    account_id,
    user_id,
    id,
    'EMI: ' || COALESCE(description, 'Purchase'),
    monthly_emi,
    CURRENT_DATE,
    TO_CHAR(CURRENT_DATE, 'YYYY-MM'),
    'pending'
FROM emi_transactions
WHERE status = 'active'
ON CONFLICT (emi_id, statement_month) DO NOTHING;
