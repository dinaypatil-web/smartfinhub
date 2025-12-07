/*
# Add Credit Card Statement and Due Date Fields

## Plain English Explanation
This migration adds two new fields to the accounts table to support credit card statement and payment due date reminders. These fields store the day of the month (1-31) when the statement is generated and when payment is due.

## Table Modifications

### accounts table
- `statement_day` (integer, nullable): Day of month (1-31) when credit card statement is generated
- `due_day` (integer, nullable): Day of month (1-31) when credit card payment is due

## Security Changes
- No RLS changes required (inherits existing policies)
- Fields are nullable (only applicable to credit card accounts)

## Notes
- These fields only apply to credit card accounts
- Values must be between 1 and 31
- Used to display payment reminders on dashboard and accounts page
- Helps users track statement generation and payment due dates
*/

-- Add statement_day column for credit card statement date
ALTER TABLE accounts 
ADD COLUMN IF NOT EXISTS statement_day integer CHECK (statement_day >= 1 AND statement_day <= 31);

-- Add due_day column for credit card payment due date
ALTER TABLE accounts 
ADD COLUMN IF NOT EXISTS due_day integer CHECK (due_day >= 1 AND due_day <= 31);

-- Add comment to columns
COMMENT ON COLUMN accounts.statement_day IS 'Day of month (1-31) when credit card statement is generated';
COMMENT ON COLUMN accounts.due_day IS 'Day of month (1-31) when credit card payment is due';
