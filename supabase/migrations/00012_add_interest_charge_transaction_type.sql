/*
# Add Interest Charge Transaction Type

## Purpose
Add 'interest_charge' to the transaction_type enum to support automatic monthly interest posting for loan accounts.

## Changes
1. Add 'interest_charge' value to transaction_type enum
2. This allows the system to record interest charges as transactions
3. Interest charges will be posted automatically on loan due dates

## Usage
When monthly interest is calculated for a loan account:
- A transaction of type 'interest_charge' is created
- The transaction increases the loan balance (to_account_id = loan account)
- The amount represents the interest accrued for the period
- This provides a clear audit trail of all interest charges

## Notes
- Interest is calculated based on daily balance and interest rate
- Considers any EMI payments or other transactions during the period
- Uses the interest rate history for floating rate loans
*/

-- Add 'interest_charge' to the transaction_type enum
ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'interest_charge';
