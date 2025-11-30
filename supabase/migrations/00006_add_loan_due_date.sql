/*
# Add Loan Due Date Field

## Purpose
Add a due_date field to loan accounts to track the monthly payment due date.

## Changes
1. Add `due_date` column to accounts table
   - Type: integer (1-31 representing day of month)
   - Nullable: true (only required for loan accounts)
   - Constraint: Value must be between 1 and 31

## Usage
- For loan accounts, store the day of month when payment is due
- Example: 15 means payment due on 15th of every month
- On due date, interest for the month should be calculated and posted

## Notes
- Only applicable to loan accounts
- Other account types can leave this field null
- Used for automatic interest calculation and posting
*/

-- Add due_date column to accounts table
ALTER TABLE accounts
ADD COLUMN IF NOT EXISTS due_date integer;

-- Add check constraint to ensure due_date is between 1 and 31
ALTER TABLE accounts
ADD CONSTRAINT check_due_date_range
CHECK (due_date IS NULL OR (due_date >= 1 AND due_date <= 31));

-- Add comment
COMMENT ON COLUMN accounts.due_date IS 'Day of month when loan payment is due (1-31). Only applicable for loan accounts.';
