/*
# Remove Admin Policies and Enhance User Data Privacy

## Overview
This migration removes all admin-level access policies to ensure complete user data privacy.
After this migration, ONLY the authenticated user can access their own data through the application.
No other user, regardless of role, can view or modify another user's financial information.

## Security Enhancement
- **Before**: Users with role='admin' could access all users' data
- **After**: Each user can ONLY access their own data, regardless of role
- **Benefit**: Complete data isolation and privacy protection

## Changes

### 1. Profiles Table
- ❌ DROP: "Admins have full access to profiles"
- ✅ KEEP: "Users can view own profile"
- ✅ KEEP: "Users can update own profile"

### 2. Accounts Table
- ❌ DROP: "Admins have full access to accounts"
- ✅ KEEP: "Users can manage own accounts"

### 3. Interest Rate History Table
- ❌ DROP: "Admins have full access to interest_rate_history"
- ✅ KEEP: "Users can manage own interest rate history"

### 4. Transactions Table
- ❌ DROP: "Admins have full access to transactions"
- ✅ KEEP: "Users can manage own transactions"

### 5. Budgets Table
- ❌ DROP: "Admins have full access to budgets"
- ✅ KEEP: "Users can manage own budgets"

### 6. Expense Categories Table
- ❌ DROP: "Admins have full access to categories"
- ✅ KEEP: "Everyone can view categories" (system categories)
- ✅ KEEP: "Users can manage own custom categories"

### 7. Loan EMI Payments Table
- ❌ DROP: "Admins have full access to loan EMI payments"
- ✅ KEEP: "Users can view own loan EMI payments"
- ✅ KEEP: "Users can create own loan EMI payments"
- ✅ KEEP: "Users can update own loan EMI payments"
- ✅ KEEP: "Users can delete own loan EMI payments"

## Impact
- ✅ No disruption to app functionality (no admin features exist)
- ✅ Enhanced privacy and data protection
- ✅ Compliance with data privacy best practices
- ✅ Follows principle of least privilege
- ✅ Users maintain full access to their own data

## Security Benefits
1. **Complete Data Isolation**: Each user's data is completely isolated
2. **No Privileged Access**: No role can access other users' data
3. **Privacy Protection**: Financial data remains private to the owner
4. **Audit Compliance**: Meets strict data privacy requirements
5. **Zero Trust Model**: Access is granted only to data owner

## Notes
- RLS (Row Level Security) remains enabled on all tables
- User-specific policies continue to function normally
- Application functionality is unaffected
- This is a security enhancement with no breaking changes
*/

-- Drop admin policies from profiles table
DROP POLICY IF EXISTS "Admins have full access to profiles" ON profiles;

-- Drop admin policies from accounts table
DROP POLICY IF EXISTS "Admins have full access to accounts" ON accounts;

-- Drop admin policies from interest_rate_history table
DROP POLICY IF EXISTS "Admins have full access to interest_rate_history" ON interest_rate_history;

-- Drop admin policies from transactions table
DROP POLICY IF EXISTS "Admins have full access to transactions" ON transactions;

-- Drop admin policies from budgets table
DROP POLICY IF EXISTS "Admins have full access to budgets" ON budgets;

-- Drop admin policies from expense_categories table
DROP POLICY IF EXISTS "Admins have full access to categories" ON expense_categories;

-- Drop admin policies from loan_emi_payments table
DROP POLICY IF EXISTS "Admins have full access to loan EMI payments" ON loan_emi_payments;

-- Add comment documenting the security enhancement
COMMENT ON TABLE profiles IS 'User profiles with complete data isolation - each user can only access their own profile';
COMMENT ON TABLE accounts IS 'Financial accounts with complete data isolation - each user can only access their own accounts';
COMMENT ON TABLE transactions IS 'Financial transactions with complete data isolation - each user can only access their own transactions';
COMMENT ON TABLE budgets IS 'Budget records with complete data isolation - each user can only access their own budgets';
COMMENT ON TABLE interest_rate_history IS 'Interest rate history with complete data isolation - accessible only through owned accounts';
COMMENT ON TABLE loan_emi_payments IS 'Loan EMI payment records with complete data isolation - each user can only access their own payments';
