# Interest Start Date Update

## Change Summary
Updated loan account creation to use **loan start date** as the interest rate effective date, instead of the account creation date.

## Problem
Previously, when creating a loan account, the initial interest rate history entry used the current date (account creation date) as the effective date. This caused inaccurate interest calculations for backdated loans.

## Solution
Modified `AccountForm.tsx` to use `loan_start_date` as the `effective_date` when creating the initial interest rate history entry.

### Code Change
**File**: `src/pages/AccountForm.tsx`

**Before**:
```typescript
await interestRateApi.addInterestRate({
  account_id: newAccount.id,
  interest_rate: parseFloat(formData.current_interest_rate),
  effective_date: new Date().toISOString().split('T')[0], // ❌ Uses today
});
```

**After**:
```typescript
await interestRateApi.addInterestRate({
  account_id: newAccount.id,
  interest_rate: parseFloat(formData.current_interest_rate),
  effective_date: formData.loan_start_date, // ✅ Uses loan start date
});
```

## Impact

### Example Scenario
- **Loan Start Date**: January 1, 2025
- **Account Created**: November 30, 2025
- **Interest Rate**: 5% APR
- **Principal**: $100,000

**Before Fix**:
- Interest effective date: November 30, 2025
- Interest calculated from: November 30, 2025
- Days: 0
- Accrued Interest: $0 ❌

**After Fix**:
- Interest effective date: January 1, 2025
- Interest calculated from: January 1, 2025
- Days: 334
- Accrued Interest: ~$4,575 ✅

## Benefits
1. ✅ Accurate interest calculation from loan inception
2. ✅ Supports backdated loan entries
3. ✅ Correct historical interest tracking
4. ✅ Aligns with real-world loan practices
5. ✅ Interest rate history table shows correct periods

## Testing
- ✅ Create new loan with past start date
- ✅ Verify interest rate history shows start date
- ✅ Check accrued interest calculation
- ✅ Confirm interest rate table displays correctly
- ✅ No linting errors

## Related Features
This change works in conjunction with:
- Interest Rate History Table (shows per-period interest)
- Accrued Interest Calculation (uses rate history)
- Loan Due Date Tracking (payment scheduling)

## Documentation
See `LOAN_ENHANCEMENTS.md` for complete documentation of all loan management features.
