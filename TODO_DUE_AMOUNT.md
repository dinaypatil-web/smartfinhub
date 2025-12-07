# Credit Card Due Amount Calculation Feature

## Plan

### Phase 1: Utility Functions ✅
- [x] Create billing cycle calculation functions
- [x] Create due amount calculation functions
- [x] Handle transaction date filtering
- [x] Handle EMI installment calculations

### Phase 2: API Updates ✅
- [x] Add function to get transactions by account

### Phase 3: Dashboard Updates ✅
- [x] Calculate due amount for each credit card
- [x] Display due amount prominently
- [x] Add visual indicators for upcoming due dates
- [x] Show days until due date

### Phase 4: Accounts Page Updates ✅
- [x] Calculate due amount for credit cards
- [x] Display due amount in credit card details
- [x] Show billing cycle information
- [x] Add overdue indicators

### Phase 5: Testing & Commit ✅
- [x] Test due amount calculations
- [x] Test edge cases (month-end dates)
- [x] Run linting
- [x] Commit changes

## Implementation Summary

### Files Created:
1. **src/utils/billingCycleCalculations.ts** - Comprehensive billing cycle and due amount calculation utilities
   - `getCurrentBillingCycle()` - Calculate current billing cycle dates
   - `getNextDueDate()` - Calculate next payment due date
   - `isTransactionInCurrentCycle()` - Check if transaction is in current cycle
   - `calculateTransactionsDueAmount()` - Calculate due from transactions
   - `calculateEMIDueAmount()` - Calculate due from EMI installments
   - `calculateTotalDueAmount()` - Calculate total due amount
   - `getDaysUntilDue()` - Calculate days until payment due
   - `isPaymentOverdue()` - Check if payment is overdue
   - `getBillingCycleInfo()` - Get formatted billing cycle information

### Files Modified:
1. **src/db/api.ts**
   - Added `getTransactionsByAccount()` function to query transactions by account ID

2. **src/pages/Dashboard.tsx**
   - Added state for account transactions
   - Updated `loadDashboardData()` to load transactions for credit cards
   - Added due amount calculation in credit card rendering
   - Added due amount display section with:
     - Days until due date
     - Due amount prominently displayed
     - Payment due date
     - Overdue indicators

3. **src/pages/Accounts.tsx**
   - Added state for account transactions
   - Updated `loadAccounts()` to load transactions for credit cards
   - Added due amount calculation in credit card rendering
   - Added comprehensive due amount section with:
     - Overdue/upcoming payment indicator
     - Days until/since due date
     - Amount due prominently displayed
     - Billing cycle information
     - Payment due date

## Features Implemented:

### Due Amount Calculation:
- ✅ Calculates due amount based on current billing cycle
- ✅ Includes regular transactions in current cycle
- ✅ Includes EMI installments due this month
- ✅ Handles edge cases (months with different days)
- ✅ Supports different statement and due dates

### Dashboard Display:
- ✅ Shows due amount for each credit card
- ✅ Displays days until due date
- ✅ Shows payment due date
- ✅ Visual indicators for overdue payments (red color)
- ✅ Visual indicators for upcoming payments (purple color)

### Accounts Page Display:
- ✅ Comprehensive due amount section
- ✅ Badge showing days until/since due date
- ✅ Overdue/upcoming payment status
- ✅ Billing cycle information
- ✅ Payment due date
- ✅ Color-coded amount (red for overdue, purple for upcoming)

## Testing Notes:
- ✅ TypeScript compilation successful
- ✅ Linting passed with no errors
- ✅ All imports resolved correctly
- ✅ Billing cycle calculations handle month-end edge cases
- ✅ Due amount includes both transactions and EMI installments

## Notes:
- Billing cycle: From statement_day to statement_day (next month)
- Due amount = Transactions in current cycle + EMI installments due
- Payment due on due_day of each month
- Edge cases handled: statement_day = 31 in months with fewer days
