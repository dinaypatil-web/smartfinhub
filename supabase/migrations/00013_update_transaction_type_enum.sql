/*
# Add credit_card_repayment to transaction_type enum

## Changes
1. Add 'credit_card_repayment' to transaction_type enum

## Rationale
- New transaction type for paying off credit card debt
- Provides clearer tracking than using generic 'transfer' type
- Allows better reporting and analysis of credit card payments

## Notes
- This migration only adds the new enum value
- The old 'credit_card_payment' value remains for backward compatibility
*/

-- Add new enum value
ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'credit_card_repayment';
