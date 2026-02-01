# Loan Payment Principal/Interest Bifurcation Feature

## Overview

SmartFinHub now includes an advanced loan accounting feature that automatically bifurcates (splits) loan EMI payments into **Principal** and **Interest** components. This provides accurate tracking of how much of each payment reduces the loan amount versus how much is charged as interest.

## Key Features

### 1. **Automatic Bifurcation During Payment Entry**
- When you enter a loan payment transaction, the app calculates the split automatically
- Uses sophisticated algorithms that consider:
  - Current loan principal balance
  - Interest rate
  - Payment date
  - Historical payment data

### 2. **Manual Adjustment Option**
- If the automatic calculation doesn't match your loan agreement, you can manually adjust
- Toggle "Manual Adjust" button to override the auto-calculated breakdown
- Input fields for both Principal and Interest amounts

### 3. **EMI Payment History Storage**
- Each loan payment is stored with its principal/interest breakdown in the `loan_emi_payments` table
- Records include:
  - `principal_component`: Amount going toward reducing principal
  - `interest_component`: Amount charged as interest
  - `emi_amount`: Total payment (principal + interest)
  - `outstanding_principal`: Remaining balance after payment
  - `payment_date`: When the payment was made

### 4. **Automatic Adjustment During Monthly Interest Posting**
- When you click "Post Monthly Interest" on the Dashboard, the system:
  1. Calculates actual accrued interest for the period
  2. Identifies all loan payments made in that month
  3. Adjusts the interest components in the EMI Payment History to match actuals
  4. Maintains the EMI amount (principal + interest = original EMI)
  5. Creates an interest charge transaction for the final calculated amount

## How It Works Step-by-Step

### Phase 1: Payment Entry

```
User enters loan payment for ₹10,000 on a loan account
                    ↓
App calculates:
  - Current Outstanding Principal: ₹50,000
  - Interest Rate: 10% p.a.
  - Days elapsed since last payment: 30 days
  - Interest due: ~₹411 (50,000 × 10% × 30/365)
                    ↓
Bifurcation result:
  - Principal Component: ₹9,589
  - Interest Component: ₹411
                    ↓
Stored in loan_emi_payments table:
  - principal_component: 9589
  - interest_component: 411
  - outstanding_principal: 40,411
                    ↓
Account balance updated:
  - Loan balance reduced by principal only (₹9,589)
  - Interest is posted separately during monthly interest posting
```

### Phase 2: Monthly Interest Posting

```
User clicks "Post Monthly Interest" button
                    ↓
System calculates actual interest for the period:
  - Daily balance calculation considering all transactions
  - Floating/Fixed rate consideration
  - Result: ₹425 actual interest (vs ₹411 estimated)
                    ↓
Adjusts EMI payments from that month:
  - If payment made on 10th: adjusts its interest component
  - If payment made on 20th: adjusts its interest component
  - Maintains individual EMI amounts (no change to what user paid)
  - Only the breakdown changes
                    ↓
Creates interest charge transaction:
  - Amount: ₹425 (actual calculated interest)
  - Posted to loan account
  - Updates account balance
                    ↓
EMI Payment History shows:
  - Adjusted principal/interest breakdown
  - Final outstanding principal after adjustment
```

## User Interface

### Transaction Form - Loan Payment Section

When creating a loan payment transaction:

```
┌─────────────────────────────────────────┐
│  EMI Breakdown                [Manual Adjust]
├─────────────────────────────────────────┤
│                                         │
│  ┌──────────┬──────────┬────────────┐  │
│  │Principal │Interest  │Total EMI   │  │
│  │₹9,589   │₹411     │₹10,000     │  │
│  │95.9%    │4.1%     │Paid to Loan│  │
│  └──────────┴──────────┴────────────┘  │
│                                         │
│  Current Outstanding Principal          │
│  ₹50,000 ────────→ ₹40,411             │
│                                         │
│  💡 This breakdown will be saved to     │
│  the Loan's EMI Payment History and     │
│  adjusted during monthly interest       │
│  posting.                               │
└─────────────────────────────────────────┘
```

### EMI Payment History Page

Access via `/loan-emi-history` or sidebar menu.

Features:
- **Account Selection**: Filter EMI history by loan account
- **Summary Cards**: Show outstanding principal, total principal/interest paid
- **Payment Table**: Detailed breakdown of each payment
  - Payment Date
  - EMI Amount
  - Principal Component
  - Interest Component
  - Interest Percentage
  - Outstanding Principal
  - Status

Example table row:
```
Date        EMI          Principal    Interest    Interest%  Outstanding
10/15/2024  ₹10,000     ₹9,589       ₹411       4.1%       ₹40,411
```

## Technical Implementation

### 1. **Backend API Changes**

#### New Table: `loan_emi_payments`
```sql
CREATE TABLE loan_emi_payments (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  account_id UUID REFERENCES accounts,
  payment_date DATE NOT NULL,
  emi_amount DECIMAL(12, 2),
  principal_component DECIMAL(12, 2),  -- NEW
  interest_component DECIMAL(12, 2),   -- NEW
  outstanding_principal DECIMAL(12, 2),
  interest_rate DECIMAL(5, 2),
  payment_number INTEGER,
  notes TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

#### API Endpoints
- `loanEMIPaymentApi.createPayment(payment)` - Create new EMI payment record
- `loanEMIPaymentApi.getPaymentsByAccount(accountId)` - Get all payments for loan
- `loanEMIPaymentApi.updatePayment(id, updates)` - Update payment (used during interest posting adjustment)

### 2. **Frontend Changes**

#### TransactionForm.tsx
- **Loan Breakdown State**: `loanBreakdown` state tracks principal/interest split
- **Auto-Calculation**: `useEffect` on line 189-229 automatically calculates breakdown
- **Manual Toggle**: `isManualBreakdown` flag enables manual adjustment
- **UI Section**: New breakdown display card showing:
  - Principal amount and percentage
  - Interest amount and percentage
  - Total EMI
  - Outstanding principal before/after
  - Manual adjustment inputs (conditional)

#### LoanEMIHistory.tsx (New Page)
- Displays complete EMI payment history for selected loan
- Shows principal/interest breakdown for each payment
- Calculates statistics (total paid, average interest %, etc.)
- Responsive design with dark mode support

### 3. **Calculation Logic**

#### Function: `calculateEMIBreakdownWithHistory()`
Location: `src/utils/loanCalculations.ts`

This function calculates the principal/interest split for a loan payment:

```typescript
function calculateEMIBreakdownWithHistory(
  emiAmount: number,
  outstandingPrincipal: number,
  interestRate: number,
  paymentDate: Date,
  previousPaymentDate: Date
): { principalComponent: number; interestComponent: number }
```

Steps:
1. Calculate days elapsed since last payment
2. Calculate interest accrued: `P × r × t / 365 / 100`
3. Principal component = EMI amount - interest
4. Return both components

#### Function: `postMonthlyInterest()` Enhancement
Location: `src/utils/loanInterestPosting.ts` (lines 240-310)

Added logic to adjust EMI payment records:
1. Get all EMI payments in the current period
2. Calculate actual interest using daily balance method
3. Update each EMI payment's interest component proportionally
4. Maintain EMI amount (principal + interest = original amount)
5. Create interest charge transaction with final calculated amount

## Use Cases

### Use Case 1: Individual with Personal Loan
```
Scenario: Person has a ₹5,00,000 personal loan at 10% p.a.

Action: Pays ₹10,000 EMI on 15th of each month

Result:
- 1st payment: Principal ₹9,589, Interest ₹411
- 2nd payment: Principal ₹9,599, Interest ₹401 (slight difference due to balance change)
- At month-end interest posting: Adjustment made based on actual daily balance
- EMI History shows complete breakdown for each payment
- Can track how much principal reduction in each payment
```

### Use Case 2: Business Owner with Multiple Loans
```
Scenario: Owner has 2 loans (equipment: 12%, working capital: 11%)

Action: Multiple EMI payments throughout month

Result:
- Each loan's EMI history maintained separately
- Interest components differ based on rate and balance
- Can compare interest cost across loans
- Monthly reconciliation ensures accuracy
```

### Use Case 3: Loan Refinancing Decision
```
Scenario: Owner considering refinancing to lower rate

Action: Reviews EMI Payment History for both loans

Result:
- Sees actual interest paid monthly
- Can calculate total interest over loan tenure
- Makes informed refinancing decision
- Tracks actual vs. projected interest
```

## Data Reconciliation

### Balance Verification Formula
```
Outstanding Principal After Payment = 
  Current Balance - Principal Component

Example:
- Current Balance: ₹50,000
- Principal Component: ₹9,589
- Outstanding = 50,000 - 9,589 = ₹40,411
```

### Account Balance Adjustment
```
When EMI payment is saved:

1. Total payment (₹10,000) is initially deducted from account
   Balance: ₹50,000 → ₹40,000

2. Interest component (₹411) is added back
   Balance: ₹40,000 → ₹40,411

Result: Only principal (₹9,589) reduced loan balance
```

### Monthly Reconciliation
```
For all payments in month:
- Sum of principal components = Principal paid that month
- Sum of interest components = Interest that month
- During interest posting: Adjust interest components to actual
```

## Error Handling

### Validation Rules

1. **Principal Cannot Be Negative**
   - Error shown if calculation results in negative principal
   - User prompted to check outstanding balance

2. **Principal + Interest Must Equal EMI**
   - During manual adjustment, both fields must sum to EMI amount
   - Real-time validation feedback

3. **Interest Amount Reasonableness**
   - Warning if calculated interest > 50% of payment
   - Suggests reviewing interest rate

### Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| High interest % on early payments | Correct behavior - more interest on higher balance | Review loan terms |
| Interest % decreases over payments | Correct behavior - balance decreasing | Normal amortization |
| Manual adjustment rejected | Principal + Interest ≠ EMI | Adjust to match total |

## Configuration & Settings

### Loan Configuration
- **Interest Type**: Fixed or Floating
- **Interest Rate**: Annual percentage rate
- **Payment Frequency**: Monthly, Quarterly, etc.
- **Due Date**: Loan payment due date

### Display Options
- **Currency**: Automatically uses account currency
- **Date Format**: Localized to user's region (India: DD/MM/YYYY)
- **Decimal Places**: 2 decimal places for all currency values

## Performance Considerations

### Database Queries
- EMI payment queries filtered by account_id for performance
- Index on `account_id` and `payment_date` recommended
- History growth: ~12 records/year per loan account

### Calculation Complexity
- Principal/interest calculation: O(1) per payment
- Monthly interest posting: O(n) where n = payments in month
- Typical processing: < 100ms per loan

## Future Enhancements

1. **EMI Projection Calculator**
   - Visual timeline showing projected principal/interest for remaining tenure
   - Impact of additional/prepayments on total interest

2. **Loan Comparison Report**
   - Compare interest costs across multiple loans
   - Identify refinancing opportunities

3. **Smart Payment Suggestions**
   - Based on interest rate, suggest optimal payment dates
   - Recommendation to make additional principal payments

4. **Tax Deduction Reporting**
   - Generate tax deduction report (India: Section 24 for home loans)
   - Separate interest paid for tax filing

5. **Bulk EMI Entry**
   - Import EMI history from statements
   - Bulk update outstanding principal

## Support & Troubleshooting

### FAQ

**Q: Why is my interest component different from loan statement?**
A: Our calculation is based on daily balance method. Your bank may use a different method. You can manually adjust if needed.

**Q: Can I change a past EMI payment breakdown?**
A: Yes, use manual adjustment during payment entry, or edit via EMI History page (future enhancement).

**Q: How is monthly interest adjustment calculated?**
A: We recalculate based on daily outstanding balance for each day in the period, considering rate changes if applicable.

**Q: What if I have a floating rate loan?**
A: The system tracks rate history and applies correct rate for each period during interest calculation.

### Common Commands

**View EMI History**: Navigate to `/loan-emi-history`

**Edit Loan Payment**: Go to Transactions, find loan payment, edit transaction form

**Post Monthly Interest**: Dashboard → Click "Post Monthly Interest" button on relevant loan card

## Related Documentation

- [Loan Calculations](./LOAN_CALCULATIONS_USER_GUIDE.md)
- [Account Management](./ACCOUNT_FORM_LOGO_PREVIEW.md)
- [Transaction Management](./BANK_APP_IMPLEMENTATION.md)

---

**Last Updated**: 2024
**Feature Status**: Released
**Compatibility**: All loan account types
