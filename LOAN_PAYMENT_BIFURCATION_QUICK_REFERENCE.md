# Loan Payment Bifurcation - Quick Reference

## What Is Bifurcation?

When you make a loan payment (EMI), the money is split into two parts:
- **Principal**: Reduces the loan amount owed
- **Interest**: Cost of borrowing

SmartFinHub automatically calculates this split for you.

## Quick Start

### 1. Make a Loan Payment
- Go to Transactions → Add Transaction
- Select "Loan Payment" as transaction type
- Enter amount and date
- The app automatically shows the breakdown

### See the Breakdown (Current Payment Only)
The breakdown shows ONLY the current payment being entered:
```
Amount: ₹10,000
├─ Principal: ₹9,589 (95.9%)  ← reduces loan balance
└─ Interest: ₹411 (4.1%)      ← charged as interest

Outstanding Before: ₹50,000
Outstanding After: ₹40,411
```
*Does NOT include data from past EMI payments*

### 3. Adjust if Needed
- Click "Manual Adjust" button
- Change principal/interest values
- Amounts must sum to total payment

### 4. View History
- Go to **Loan EMI History** page
- Select your loan account
- See all payments with breakdown

## Key Metrics

| Metric | What It Means |
|--------|--------------|
| **Principal Component** | Amount that reduces your loan balance |
| **Interest Component** | Interest charged by lender |
| **Interest %** | Interest as % of total payment (4-40%) |
| **Outstanding Principal** | Remaining loan balance after payment |

## Example Scenario

```
Loan Details:
- Total: ₹5,00,000
- Rate: 10% p.a.
- Payment: ₹10,000/month

First Payment (15th Jan):
- Outstanding: ₹5,00,000
- Interest due: ~₹4,109 (50L × 10% × 30/365)
- Principal: ₹5,891
- Breakdown: 59% principal, 41% interest

Second Payment (15th Feb):
- Outstanding: ₹4,94,109 (reduced by principal paid)
- Interest due: ~₹4,051 (reduced balance)
- Principal: ₹5,949 (more goes to principal)
- Breakdown: 59.5% principal, 40.5% interest
```

## Monthly Reconciliation

At month-end, when "Post Monthly Interest" runs:

```
Step 1: Calculate actual interest based on daily balance
Result: ₹12,400 (for all loans that month)

Step 2: For each loan's payments made that month:
- Adjust interest components to match actual
- Recalculate principal (maintain EMI amount)

Step 3: Update EMI Payment History
- Previous: Principal ₹5,891, Interest ₹4,109
- Adjusted: Principal ₹5,900, Interest ₹4,100
```

## Where to Find It

| Feature | Location | What You See |
|---------|----------|--------------|
| **Breakdown Display** | Transaction Form (Loan Payment) | Principal/Interest split with % |
| **Manual Adjust** | Transaction Form (Loan Payment) | Input fields to override |
| **Payment History** | Loan EMI History page | Table of all payments |
| **Summary Stats** | Loan EMI History page | Total principal/interest paid |

## Common Questions

### Q: Why does interest decrease with each payment?
**A:** As your principal balance decreases, interest on that lower balance also decreases. This is normal amortization.

### Q: What if my numbers don't match the bank statement?
**A:** Banks may use different calculation methods. You can manually adjust in the transaction form.

### Q: Does this affect my account balance?
**A:** Yes, only the principal component reduces your loan balance. Interest is posted separately.

### Q: Can I edit past payments?
**A:** Yes, but it's recommended to only adjust current month's payments before interest posting.

## Keyboard Shortcuts

- **In EMI History**: Select account → View full history
- **In Transaction Form**: Toggle "Manual Adjust" → Edit principal/interest

## Tips & Best Practices

1. **Verify After Payment**: Check the breakdown immediately after entering payment
2. **Update Interest Rate**: If rate changes, update loan account settings
3. **Review Monthly**: Check EMI History after interest posting to verify adjustments
4. **Keep Records**: Export history for tax/audit purposes (future feature)
5. **Track Trends**: Monitor interest % changes to catch errors early

## Troubleshooting

### Interest Component Too High?
- Check loan interest rate is correctly configured
- Verify it's the first payment of the month (higher interest)
- Compare with bank statement

### Interest Component Negative?
- This shouldn't happen - contact support
- Or manually adjust to correct values

### Payments Not Appearing in History?
- Check you're viewing the correct loan account
- Refresh the page (F5)
- Wait for sync (up to 5 seconds)

## Integration with Other Features

- **Reports**: Cash Flow Statement includes principal/interest breakdown
- **Dashboard**: Total interest posting shown in monthly summary
- **Budgets**: Interest can be tracked as separate category
- **Transactions**: Each EMI payment is a transaction with breakdown

## Technical Details

- **Storage**: Each payment stored in `loan_emi_payments` table
- **Calculation**: Based on daily outstanding balance method
- **Rate**: Considers fixed/floating rate history
- **Reconciliation**: Monthly adjustment to actual accrued interest

---

**Pro Tip**: Use the EMI History page monthly to track your interest savings potential. The "Interest %" column shows what % of each payment is going to interest - watch it decrease as you pay down principal!
