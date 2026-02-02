/*
# Add Loan Start Date Field

## Changes
1. New Column
   - `loan_start_date` (date) - The date when the loan was started/disbursed
   - Required for loan accounts to track loan duration and interest calculations

## Notes
- This field is only relevant for loan type accounts
- Existing loan accounts will need to have this field updated
*/

ALTER TABLE accounts
ADD COLUMN loan_start_date date;

COMMENT ON COLUMN accounts.loan_start_date IS 'The date when the loan was started/disbursed (required for loan accounts)';
