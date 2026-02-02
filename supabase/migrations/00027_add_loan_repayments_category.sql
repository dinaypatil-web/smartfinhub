/*
# Add Loan Repayments Expense Category

## Purpose
Add a new system expense category "Loan repayments" to track loan payment transactions.

## Changes
1. Insert new expense category with:
   - Name: "Loan repayments"
   - Icon: 🏦 (bank emoji)
   - Color: #0EA5E9 (sky blue)
   - System category: true

## Notes
- This category will be auto-selected when users create loan payment transactions
- All loan payment transactions will be treated as expenses
*/

INSERT INTO expense_categories (name, icon, color, is_system) 
VALUES ('Loan repayments', '🏦', '#0EA5E9', true);
