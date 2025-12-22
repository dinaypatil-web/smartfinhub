/*
# Add Categorized Budget System

## Overview
This migration enhances the budget system to support categorized income and expense budgets.
Users can now set budgets for specific income categories (Salaries, Allowances, Family Income, Others)
and additional expense categories (Loan Repayments, Credit Card Repayment).

## Changes

### 1. Budgets Table Enhancement
- Add `income_category_budgets` JSONB field for categorized income budgets
- Keep existing `category_budgets` for expense budgets
- Both fields default to empty JSON object

### 2. New Expense Categories
Add system categories for:
- Loan Repayments (for tracking loan payment budgets)
- Credit Card Repayment (for tracking credit card payment budgets)

### 3. Income Categories
Income categories are predefined and stored in the income_category_budgets JSONB:
- salaries: Salary income
- allowances: Allowances and benefits
- family_income: Family income sources
- others: Other income sources

## Structure

### Income Category Budgets (JSONB)
```json
{
  "salaries": 50000,
  "allowances": 5000,
  "family_income": 10000,
  "others": 2000
}
```

### Expense Category Budgets (JSONB)
Existing structure with new categories:
```json
{
  "category_id_1": 5000,
  "category_id_2": 3000,
  "loan_repayments_category_id": 15000,
  "credit_card_repayment_category_id": 8000
}
```

## Benefits
- More granular budget tracking
- Separate income and expense categorization
- Better budget analysis and variance reporting
- Support for loan and credit card payment budgets

## Notes
- Existing budgets remain unchanged
- New field defaults to empty object
- Backward compatible with existing budget functionality
*/

-- Add income_category_budgets field to budgets table
ALTER TABLE budgets 
ADD COLUMN IF NOT EXISTS income_category_budgets jsonb DEFAULT '{}';

-- Add comment to document the new field
COMMENT ON COLUMN budgets.income_category_budgets IS 'Categorized income budgets with keys: salaries, allowances, family_income, others';
COMMENT ON COLUMN budgets.category_budgets IS 'Categorized expense budgets with expense category IDs as keys';

-- Insert new system expense categories for Loan Repayments and Credit Card Repayment
-- Only insert if they don't already exist
INSERT INTO expense_categories (name, icon, color, is_system, user_id)
SELECT 'Loan Repayments', '🏦', '#8B4513', true, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM expense_categories 
  WHERE name = 'Loan Repayments' AND is_system = true
);

INSERT INTO expense_categories (name, icon, color, is_system, user_id)
SELECT 'Credit Card Repayment', '💳', '#4169E1', true, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM expense_categories 
  WHERE name = 'Credit Card Repayment' AND is_system = true
);

-- Update the budgets table comment to reflect the enhanced functionality
COMMENT ON TABLE budgets IS 'Monthly budgets with categorized income and expense tracking - each user can only access their own budgets';
