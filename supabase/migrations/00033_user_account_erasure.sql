-- Migration: 00033_user_account_erasure.sql
-- Description: Adds atomic stored procedure to completely erase all user personal data in compliance with India's DPDP Act 2023 (Right to Erasure)

CREATE OR REPLACE FUNCTION delete_user_account_data(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verify calling user matches p_user_id or caller is service role
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Unauthorized: Cannot erase another user''s account data';
  END IF;

  -- 1. Delete transaction splits
  DELETE FROM transaction_splits 
  WHERE transaction_id IN (SELECT id FROM transactions WHERE user_id = p_user_id);

  -- 2. Delete credit card repayment allocations, advance payments, and statement lines
  DELETE FROM credit_card_repayment_allocations WHERE user_id = p_user_id;
  DELETE FROM credit_card_advance_payments WHERE user_id = p_user_id;
  DELETE FROM credit_card_statement_lines WHERE user_id = p_user_id;

  -- 3. Delete loan EMI payments and EMI transactions
  DELETE FROM loan_emi_payments WHERE user_id = p_user_id;
  DELETE FROM emi_transactions WHERE user_id = p_user_id;

  -- 4. Delete transactions
  DELETE FROM transactions WHERE user_id = p_user_id;

  -- 5. Delete budgets
  DELETE FROM budgets WHERE user_id = p_user_id;

  -- 6. Delete interest rate history for user accounts
  DELETE FROM interest_rate_history 
  WHERE account_id IN (SELECT id FROM accounts WHERE user_id = p_user_id);

  -- 7. Delete custom bank links
  DELETE FROM user_custom_bank_links WHERE user_id = p_user_id;

  -- 8. Delete user custom expense categories
  DELETE FROM expense_categories WHERE user_id = p_user_id;

  -- 9. Delete accounts
  DELETE FROM accounts WHERE user_id = p_user_id;

  -- 10. Delete profile
  DELETE FROM profiles WHERE id = p_user_id;

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION delete_user_account_data(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_user_account_data(UUID) TO service_role;
