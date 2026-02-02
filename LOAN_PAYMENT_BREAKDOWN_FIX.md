# Loan Payment Breakdown Fix - Summary

## Issue
When editing a loan repayment transaction, the "Current Outstanding Principal" shown in the EMI breakdown was displaying the **current balance** (after the transaction), rather than the **balance at the time of payment** (before the transaction).

### Example
- Loan original amount: ₹100,000
- After Payment 1: ₹90,000 remaining
- After Payment 2: ₹80,000 remaining (current balance)

When editing Payment 2:
- **Wrong**: Showed ₹80,000 as principal (current balance)
- **Correct**: Should show ₹90,000 (the balance before Payment 2 was applied)

This caused incorrect interest calculations because interest should be calculated on the principal at the time of the payment, not the current principal.

## Solution

### For Creating New Transactions
- Uses current account balance (correct, since there are no prior payments yet)

### For Editing Existing Transactions  
- Fetches all transactions for the user
- Filters for only loan_payment transactions to the same account
- Excludes the transaction being edited
- Sorts transactions by date, then by creation time
- Recalculates balance by starting with `initial_balance` and subtracting all prior payments
- Uses this recalculated balance for EMI breakdown calculation

### Formula
```
Balance Before This Payment = Initial Balance - Sum of All Prior Payments
```

Or alternatively:
```
Balance Before This Payment = Current Balance + Original Amount of This Transaction
```

## Code Changes

### 1. Loan Breakdown Calculation (Lines 188-262)
- Made the calculation function async (to load transactions)
- Added logic to detect if editing vs creating
- When editing: Recalculates principal from all prior transactions
- Filters and sorts transactions correctly
- Added `formData.transaction_date` and `id` to dependencies

### 2. Display Label Update (Line 944)
- Changed from: "Current Outstanding Principal"
- Changed to: "Outstanding Principal Before This Payment"

### 3. Principal Amount Calculation (Lines 945-948)
- Added `+ (originalAmount || 0)` to account for the transaction being edited
- Ensures display shows balance as it was before this specific payment

## Impact

✅ **Correct Interest Calculation**
- Interest is now calculated on the actual principal at the time of payment
- Breakdown now mathematically accurate: Principal + Interest = Payment Amount

✅ **Clear Display**
- Label clearly indicates this is the principal **before** the payment
- Shows both before and after amounts

✅ **Works for Both Create and Edit**
- New transactions: Uses current balance (correct)
- Edited transactions: Recalculates balance from history (correct)

## Testing

To verify the fix:

1. **Create a loan** with principal ₹100,000
2. **Make payment 1** of ₹20,000 (updates balance to ₹80,000)
3. **Make payment 2** of ₹30,000 (updates balance to ₹50,000)
4. **Edit payment 2**:
   - Outstanding Principal Before should show: ₹80,000 (not ₹50,000)
   - After payment should show: ₹50,000
   - Interest calculated on ₹80,000 (correct)

## Files Modified
- `src/pages/TransactionForm.tsx`

## Commit
- Hash: 6bd7038
- Type: Bug Fix
- Lines Changed: 52 insertions, 8 deletions
