/*
# Add Income Category to Transactions

## Overview
This migration adds income category tracking to transactions, allowing users to categorize
their income sources (Salaries, Allowances, Family Income, Others) when recording income transactions.

## Changes

1. **New Column**
   - `income_category` (text, nullable)
     - Stores the income category key for income transactions
     - Valid values: 'salaries', 'allowances', 'family_income', 'others'
     - Only applicable when transaction_type = 'income'
     - NULL for non-income transactions

2. **Benefits**
   - Accurate income category tracking instead of proportional distribution
   - Better budget analysis with real transaction data
   - Improved financial insights by income source

## Notes
- Existing transactions remain unchanged (income_category will be NULL)
- Users can optionally categorize income transactions going forward
- Budget analysis will use actual categories when available, fall back to proportional distribution for uncategorized income
*/

-- Add income_category column to transactions table
ALTER TABLE transactions 
ADD COLUMN income_category text;

-- Add comment for documentation
COMMENT ON COLUMN transactions.income_category IS 'Income category key (salaries, allowances, family_income, others). Only applicable for income transactions.';
