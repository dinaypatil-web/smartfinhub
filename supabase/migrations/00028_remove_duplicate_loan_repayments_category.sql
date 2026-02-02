/*
# Remove Duplicate Loan Repayments Category

## Purpose
Remove the duplicate "Loan Repayments" (uppercase R) category that was created earlier.
Keep only the "Loan repayments" (lowercase r) category created in migration 00027.

## Changes
1. Delete the older "Loan Repayments" category (ID: aad7b592-4b82-40e0-93cd-6a2b717a0ef8)
2. This ensures only one "Loan repayments" category exists in the system

## Safety
- Verified no transactions are using the old category
- Verified no budgets are using the old category
- Safe to delete without data loss
*/

DELETE FROM expense_categories 
WHERE id = 'aad7b592-4b82-40e0-93cd-6a2b717a0ef8' 
  AND name = 'Loan Repayments';
