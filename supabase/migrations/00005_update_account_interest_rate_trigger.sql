/*
# Update Account Interest Rate Trigger

## Purpose
Automatically update the account's current_interest_rate when a new rate is added to interest_rate_history.

## Changes
1. Create trigger function to update account's current_interest_rate
2. Create trigger on interest_rate_history table
3. Trigger fires after INSERT on interest_rate_history
4. Updates the associated account's current_interest_rate field

## Security
- Function uses SECURITY DEFINER to ensure it can update accounts table
- Only updates the specific account referenced in the interest_rate_history record

## Notes
- This ensures the account's current_interest_rate is always in sync with the latest rate in history
- The trigger automatically maintains data consistency
- No manual updates needed when adding new rates
*/

-- Create function to update account's current interest rate
CREATE OR REPLACE FUNCTION update_account_current_interest_rate()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update the account's current_interest_rate with the new rate
  UPDATE accounts
  SET current_interest_rate = NEW.interest_rate
  WHERE id = NEW.account_id;
  
  RETURN NEW;
END;
$$;

-- Create trigger on interest_rate_history
DROP TRIGGER IF EXISTS trigger_update_account_interest_rate ON interest_rate_history;

CREATE TRIGGER trigger_update_account_interest_rate
AFTER INSERT ON interest_rate_history
FOR EACH ROW
EXECUTE FUNCTION update_account_current_interest_rate();

-- Add comment
COMMENT ON FUNCTION update_account_current_interest_rate() IS 'Automatically updates account current_interest_rate when new rate is added to history';
