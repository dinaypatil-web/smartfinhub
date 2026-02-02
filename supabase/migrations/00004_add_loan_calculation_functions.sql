/*
# Add Loan Calculation Functions

## Changes
1. RPC Functions
   - `calculate_loan_accrued_interest` - Calculate accrued interest based on rate history
   - `calculate_loan_emi` - Calculate EMI for a loan
   - `get_loan_details_with_calculations` - Get loan with all calculated fields

## Purpose
- Provide server-side calculation of loan metrics
- Ensure accurate interest calculations based on rate history
- Support real-time updates when rates change

## Notes
- Functions use SECURITY DEFINER for performance
- Calculations based on simple interest for accrued interest
- EMI calculation uses standard formula
*/

-- Function to calculate EMI
CREATE OR REPLACE FUNCTION calculate_loan_emi(
  p_principal numeric,
  p_annual_rate numeric,
  p_tenure_months integer
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_monthly_rate numeric;
  v_emi numeric;
BEGIN
  IF p_principal <= 0 OR p_annual_rate <= 0 OR p_tenure_months <= 0 THEN
    RETURN 0;
  END IF;

  v_monthly_rate := p_annual_rate / 12 / 100;
  v_emi := (p_principal * v_monthly_rate * POWER(1 + v_monthly_rate, p_tenure_months)) / 
           (POWER(1 + v_monthly_rate, p_tenure_months) - 1);

  RETURN ROUND(v_emi, 2);
END;
$$;

-- Function to calculate accrued interest with rate history
CREATE OR REPLACE FUNCTION calculate_loan_accrued_interest(
  p_account_id uuid
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_loan_start_date date;
  v_current_balance numeric;
  v_current_rate numeric;
  v_total_interest numeric := 0;
  v_period_start_date date;
  v_days integer;
  v_interest numeric;
  rate_record RECORD;
BEGIN
  -- Get loan details
  SELECT loan_start_date, balance, current_interest_rate
  INTO v_loan_start_date, v_current_balance, v_current_rate
  FROM accounts
  WHERE id = p_account_id AND account_type = 'loan';

  -- Validate inputs
  IF v_loan_start_date IS NULL OR v_current_balance <= 0 OR v_current_rate IS NULL THEN
    RETURN 0;
  END IF;

  -- If loan hasn't started yet
  IF v_loan_start_date > CURRENT_DATE THEN
    RETURN 0;
  END IF;

  v_period_start_date := v_loan_start_date;

  -- Calculate interest for each rate period
  FOR rate_record IN 
    SELECT interest_rate, effective_date
    FROM interest_rate_history
    WHERE account_id = p_account_id
      AND effective_date >= v_loan_start_date
      AND effective_date <= CURRENT_DATE
    ORDER BY effective_date ASC
  LOOP
    -- Calculate interest for period before this rate change
    IF rate_record.effective_date > v_period_start_date THEN
      v_days := rate_record.effective_date - v_period_start_date;
      v_interest := (v_current_balance * v_current_rate * v_days) / (365.0 * 100);
      v_total_interest := v_total_interest + v_interest;
    END IF;

    -- Update for next period
    v_period_start_date := rate_record.effective_date;
    v_current_rate := rate_record.interest_rate;
  END LOOP;

  -- Calculate interest from last rate change (or start) to today
  v_days := CURRENT_DATE - v_period_start_date;
  v_interest := (v_current_balance * v_current_rate * v_days) / (365.0 * 100);
  v_total_interest := v_total_interest + v_interest;

  RETURN ROUND(v_total_interest, 2);
END;
$$;

-- Function to get loan details with all calculations
CREATE OR REPLACE FUNCTION get_loan_details_with_calculations(p_account_id uuid)
RETURNS TABLE (
  id uuid,
  account_name text,
  institution_name text,
  institution_logo text,
  loan_principal numeric,
  loan_tenure_months integer,
  loan_start_date date,
  interest_rate_type text,
  current_interest_rate numeric,
  balance numeric,
  currency text,
  emi numeric,
  accrued_interest numeric,
  total_interest_payable numeric,
  remaining_tenure_months integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_emi numeric;
  v_accrued_interest numeric;
  v_total_interest numeric;
  v_remaining_tenure integer;
BEGIN
  -- Calculate EMI
  SELECT calculate_loan_emi(
    a.loan_principal,
    a.current_interest_rate,
    a.loan_tenure_months
  )
  INTO v_emi
  FROM accounts a
  WHERE a.id = p_account_id;

  -- Calculate accrued interest
  v_accrued_interest := calculate_loan_accrued_interest(p_account_id);

  -- Calculate total interest payable
  SELECT (v_emi * a.loan_tenure_months) - a.loan_principal
  INTO v_total_interest
  FROM accounts a
  WHERE a.id = p_account_id;

  -- Calculate remaining tenure
  SELECT GREATEST(0, a.loan_tenure_months - 
    FLOOR(a.loan_tenure_months * ((a.loan_principal - a.balance) / a.loan_principal)))
  INTO v_remaining_tenure
  FROM accounts a
  WHERE a.id = p_account_id;

  -- Return all details with calculations
  RETURN QUERY
  SELECT 
    a.id,
    a.account_name,
    a.institution_name,
    a.institution_logo,
    a.loan_principal,
    a.loan_tenure_months,
    a.loan_start_date,
    a.interest_rate_type::text,
    a.current_interest_rate,
    a.balance,
    a.currency,
    v_emi as emi,
    v_accrued_interest as accrued_interest,
    v_total_interest as total_interest_payable,
    v_remaining_tenure as remaining_tenure_months
  FROM accounts a
  WHERE a.id = p_account_id AND a.account_type = 'loan';
END;
$$;

COMMENT ON FUNCTION calculate_loan_emi IS 'Calculate EMI using standard formula';
COMMENT ON FUNCTION calculate_loan_accrued_interest IS 'Calculate accrued interest based on rate history';
COMMENT ON FUNCTION get_loan_details_with_calculations IS 'Get complete loan details with all calculated fields';
