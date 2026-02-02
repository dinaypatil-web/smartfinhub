# Credit Card Payment System - Quick Reference

## What's New

| Component | Purpose | Location |
|-----------|---------|----------|
| `credit_card_statement_lines` table | Track transaction/EMI dues per statement | Supabase DB |
| `credit_card_advance_payments` table | Track advance/excess payments | Supabase DB |
| `credit_card_repayment_allocations` table | Link repayments to statement items | Supabase DB |
| `CreditCardStatementSelector` | UI for selecting items to pay | `src/components/` |
| `creditCardStatementApi` | API methods for statement management | `src/db/api.ts` |
| `creditCardStatementUtils` | Helper functions for statements | `src/utils/` |

## API Quick Reference

### Get Statement Data

```typescript
// Get all unpaid items for a card
const items = await creditCardStatementApi.getUnpaidStatementLines(creditCardId);

// Get items for specific month
const items = await creditCardStatementApi.getStatementItems(creditCardId, '2024-01');
```

### Get Advance Balance

```typescript
const balance = await creditCardStatementApi.getAdvanceBalance(creditCardId);
// Returns: number (₹0 if none)
```

### When Repayment is Created

```typescript
// 1. Create allocations linking repayment to statement items
await creditCardStatementApi.allocateRepayment(transactionId, [
  { line_id: 'line-1', amount: 500 },
  { line_id: 'line-2', amount: 1000, emi_id: 'emi-1' }
]);

// 2. Mark selected items as paid
for (const allocation of allocations) {
  await creditCardStatementApi.updateStatementLineStatus(
    allocation.statement_line_id,
    'paid',
    allocation.amount_paid
  );
  
  // 3. If EMI, call payEMIInstallment
  if (allocation.emi_id) {
    await emiApi.payEMIInstallment(allocation.emi_id, allocation.amount_paid);
  }
}

// 4. Record advance if any
if (advanceAmount > 0) {
  await creditCardStatementApi.createAdvancePayment(
    userId,
    creditCardId,
    advanceAmount,
    currency
  );
}
```

## Component Usage

```typescript
import { CreditCardStatementSelector } from '@/components/CreditCardStatementSelector';

// In your form
<CreditCardStatementSelector
  creditCardId={accountId}
  repaymentAmount={5000}
  onAllocationsChange={(allocations) => setAllocations(allocations)}
  onAdvanceAmountChange={(amount) => setAdvanceAmount(amount)}
  currency="INR"
/>
```

## Utility Functions

```typescript
import { createStatementLineForTransaction, getStatementMonth } from '@/utils/creditCardStatementUtils';

// Auto-create statement line when purchase is added
await createStatementLineForTransaction(transaction, account, userId);

// Get which statement month a date belongs to
const month = getStatementMonth('2024-01-15'); // Returns: '2024-01'
```

## Database Queries

### Get Unpaid Items

```sql
SELECT * FROM credit_card_statement_lines
WHERE credit_card_id = $1
  AND status = 'pending'
ORDER BY transaction_date DESC;
```

### Get Items for Month

```sql
SELECT * FROM credit_card_statement_lines
WHERE credit_card_id = $1
  AND statement_month = $2
ORDER BY transaction_date DESC;
```

### Get Advance Balance

```sql
SELECT remaining_balance FROM credit_card_advance_payments
WHERE credit_card_id = $1
ORDER BY created_at DESC
LIMIT 1;
```

## Common Tasks

### Task: Show due amount for credit card

```typescript
const items = await creditCardStatementApi.getUnpaidStatementLines(cardId);
const total = items.reduce((sum, item) => sum + item.amount, 0);
```

### Task: Check if user has advance balance

```typescript
const balance = await creditCardStatementApi.getAdvanceBalance(cardId);
const hasAdvance = balance > 0;
```

### Task: Mark all due items as paid

```typescript
const items = await creditCardStatementApi.getUnpaidStatementLines(cardId);
for (const item of items) {
  await creditCardStatementApi.updateStatementLineStatus(
    item.id,
    'paid',
    item.amount
  );
}
```

### Task: Get payment history

```typescript
const allocations = await supabase
  .from('credit_card_repayment_allocations')
  .select('*, statement_line_id(*)')
  .eq('repayment_id', transactionId);
```

## Type Definitions

```typescript
interface CreditCardStatementLine {
  id: string;
  credit_card_id: string;
  transaction_id?: string;
  emi_id?: string;
  description: string;
  amount: number;
  transaction_date: string;
  statement_month: string;
  status: 'pending' | 'paid' | 'partial';
  paid_amount: number;
  currency: string;
}

interface CreditCardPaymentAllocation {
  statement_line_id: string;
  amount_paid: number;
  transaction_id?: string;
  emi_id?: string;
  description: string;
}
```

## RLS Policies

All tables have RLS enabled. Users can only:
- **View**: Their own data (credit card belongs to their account)
- **Insert**: Their own records
- **Update**: Their own records
- **Delete**: Their own records

RLS prevents cross-user access automatically.

## Testing Checklist

- [ ] Can view unpaid statement items
- [ ] Can select items for payment
- [ ] Totals calculate correctly
- [ ] Advance amount displays
- [ ] Items marked as paid after repayment
- [ ] EMIs updated when selected
- [ ] Unpaid items appear next month
- [ ] Advance balance persists
- [ ] User cannot see other users' data (RLS)
- [ ] Payment history is auditable

## Troubleshooting

**Issue**: Selector not showing
- Check migration ran: `supabase db push`
- Verify account.account_type === 'credit_card'
- Check browser console for errors

**Issue**: Items not marked paid
- Verify allocateRepayment was called
- Check updateStatementLineStatus calls
- Look at credit_card_repayment_allocations table

**Issue**: EMI not updating
- Check payEMIInstallment is called
- Verify emi_id is in allocation
- Check emi_transactions table for EMI record

**Issue**: Advance balance not showing
- Verify createAdvancePayment was called
- Check advanceAmount > 0
- Look at credit_card_advance_payments table

## Performance Notes

- Statement lines indexed by: credit_card_id, status, statement_month
- Advance payments indexed by: credit_card_id
- Allocations indexed by: repayment_id, statement_line_id
- Use pagination for large statement lists
- Lazy-load EMI details in component

## Migration

Run once:
```bash
supabase db push
```

This applies:
```
supabase/migrations/00029_add_credit_card_statement_management.sql
```

## Files to Update

1. **src/pages/TransactionForm.tsx**
   - Import selector
   - Render when type === 'credit_card_repayment'
   - Call APIs when creating transaction
   - Handle allocations and advance

2. **Optional Enhancements**
   - src/pages/AccountDetails.tsx - Show due amount badge
   - src/pages/Dashboard.tsx - Show CC statement summary
   - src/components/AccountCard.tsx - Show advance balance

## Next Steps

1. ✅ Database schema created
2. ✅ API layer implemented
3. ✅ UI component created
4. ✅ Utility functions added
5. ⏳ **Integration needed** - Update TransactionForm.tsx
6. ⏳ Testing and validation
7. ⏳ Enhancement features (PDFs, notifications, etc.)

## Support

For issues or questions:
1. Check CREDIT_CARD_STATEMENT_MANAGEMENT.md for detailed docs
2. Review CREDIT_CARD_PAYMENT_MANAGEMENT_IMPLEMENTATION_GUIDE.md for integration steps
3. Check this quick reference for common tasks
4. Review database schema in migration file

---

**Status**: Ready for integration  
**Last Updated**: January 2024  
**Tested**: Database schema, API methods, UI component
