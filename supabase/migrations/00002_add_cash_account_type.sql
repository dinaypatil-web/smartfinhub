/*
# Add Cash Account Type

## Plain English Explanation
This migration adds 'cash' as a new account type to support tracking physical cash alongside bank accounts, credit cards, and loans. Cash accounts will be treated similarly to bank accounts for transaction purposes and will be included in total assets and liquid assets calculations.

## Changes
1. Add 'cash' to the account_type enum
2. No other schema changes needed - cash accounts use the same structure as other accounts

## Notes
- Cash accounts don't require institution names or logos (optional)
- Cash accounts don't require account numbers
- Cash accounts are included in assets and liquid assets
- Cash accounts work like bank accounts for transactions
*/

-- Add 'cash' to the account_type enum
ALTER TYPE account_type ADD VALUE IF NOT EXISTS 'cash';