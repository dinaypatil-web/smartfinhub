# Credit Card Payment Management System

## Overview

This system implements comprehensive credit card payment tracking with statement-level management, transaction/EMI selection during repayment, and advance credit handling.

## Key Features

### 1. Statement Line Item Tracking
- Track all credit card transactions and EMIs per statement cycle
- Link transactions and EMIs to specific statement months
- Track payment status (pending, partial, paid) for each item
- Store paid amount for partial payments

### 2. Transaction/EMI Selection During Repayment
- Display all unpaid/due items when creating a credit card repayment
- User can select which transactions/EMIs to pay from the repayment amount
- Checkbox-based selection with real-time total calculation
- EMI details shown with expandable information (interest rate, remaining installments, next due date)

### 3. Payment Allocation
- When repayment is created, allocations link specific statement line items to the transaction
- Each allocation records:
  - Statement line ID (the transaction/charge being paid)
  - EMI ID (if it's an EMI)
  - Amount allocated
- Allocations stored in `credit_card_repayment_allocations` table

### 4. Advance Credit/Balance Management
- Any amount exceeding selected item totals recorded as advance credit
- Advance balance stored in `credit_card_advance_payments` table
- Advance balance automatically adjusted against future statement items
- Can be viewed and tracked separately

### 5. Statement Carryover
- Unpaid items automatically appear in next month's statement
- No manual intervention needed - system handles carryover
- Item status remains 'pending' until paid

## Database Schema

### credit_card_statement_lines
```
id: UUID
credit_card_id: UUID (Reference to accounts)
user_id: UUID (Reference to profiles)
transaction_id: UUID (Optional reference to transactions)
emi_id: UUID (Optional reference to emi_transactions)
description: TEXT
amount: NUMERIC
transaction_date: DATE
statement_month: VARCHAR(7) // Format: YYYY-MM
status: VARCHAR(20) // pending | paid | partial
paid_amount: NUMERIC
currency: VARCHAR(3)
```

### credit_card_advance_payments
```
id: UUID
user_id: UUID
credit_card_id: UUID
payment_amount: NUMERIC
payment_date: TIMESTAMP
remaining_balance: NUMERIC
currency: VARCHAR(3)
notes: TEXT (Optional)
```

### credit_card_repayment_allocations
```
id: UUID
repayment_id: UUID (Reference to transaction)
statement_line_id: UUID (Reference to statement line)
emi_id: UUID (Optional, for direct EMI payments)
allocated_amount: NUMERIC
```

## User Flow

### Creating a Credit Card Repayment

1. User navigates to "New Transaction" and selects Credit Card Repayment
2. Selects credit card account
3. **NEW:** System displays `CreditCardStatementSelector` component
4. Component shows:
   - List of unpaid statement items and EMIs
   - Current advance balance (if any)
   - Payment summary with running totals
5. User selects which items to pay from the repayment amount
6. System calculates:
   - Total of selected items
   - Advance amount (repayment - selected total)
7. User enters repayment amount and confirms
8. System creates:
   - Transaction record (type: credit_card_repayment)
   - Allocation records for each selected item
   - Advance payment record (if advance > 0)
   - Marks selected statement lines as 'paid'
   - **Calls `payEMIInstallment()`** if any selected items are EMIs

### Viewing Advance Balance

- User can see advance balance in the statement selector
- Balance persists across statements
- Is automatically used/adjusted against future charges

### Handling Excess Payments

Two scenarios:
1. **Partial payment**: User doesn't select enough items, excess becomes advance credit
2. **Early repayment**: User makes payment before statement due date, excess becomes advance credit

Both cases automatically recorded as advance payment.

## API Methods

### creditCardStatementApi

#### getStatementItems(creditCardId, statementMonth?)
Gets all transactions and EMIs for a credit card in a given month.
```typescript
const items = await creditCardStatementApi.getStatementItems('cc-id', '2024-01');
```

#### getUnpaidStatementLines(creditCardId)
Gets all unpaid/pending statement line items for a credit card.
```typescript
const unpaidItems = await creditCardStatementApi.getUnpaidStatementLines('cc-id');
```

#### updateStatementLineStatus(lineId, status, paidAmount)
Updates payment status of a statement line item.
```typescript
await creditCardStatementApi.updateStatementLineStatus(
  'line-id',
  'paid',
  500
);
```

#### getAdvanceBalance(creditCardId)
Retrieves current advance/credit balance for a card.
```typescript
const balance = await creditCardStatementApi.getAdvanceBalance('cc-id');
```

#### createAdvancePayment(userId, creditCardId, amount, currency, notes?)
Records an advance payment/credit balance.
```typescript
await creditCardStatementApi.createAdvancePayment(
  'user-id',
  'cc-id',
  500,
  'INR',
  'Excess from repayment on 2024-01-15'
);
```

#### updateAdvanceBalance(creditCardId, amount)
Updates advance balance (decreases when applied against future statement).
```typescript
await creditCardStatementApi.updateAdvanceBalance('cc-id', 250);
```

#### allocateRepayment(repaymentId, allocations)
Creates allocation records linking repayment to statement line items.
```typescript
await creditCardStatementApi.allocateRepayment('txn-id', [
  { line_id: 'line-1', amount: 100 },
  { line_id: 'line-2', amount: 200, emi_id: 'emi-1' }
]);
```

## Integration Points

### TransactionForm.tsx Changes

When user creates a credit card repayment transaction:

1. Import `CreditCardStatementSelector` component
2. If transaction type is 'credit_card_repayment', render selector:
   ```typescript
   {transactionType === 'credit_card_repayment' && (
     <CreditCardStatementSelector
       creditCardId={selectedAccount?.id!}
       repaymentAmount={amount}
       onAllocationsChange={setAllocations}
       onAdvanceAmountChange={setAdvanceAmount}
       currency={selectedAccount?.currency || 'INR'}
     />
   )}
   ```

3. When transaction is created, after inserting transaction:
   ```typescript
   // Create allocations
   if (allocations.length > 0) {
     await creditCardStatementApi.allocateRepayment(transaction.id, allocations);
   }

   // Record advance payment
   if (advanceAmount > 0) {
     await creditCardStatementApi.createAdvancePayment(
       userId,
       selectedAccount.id,
       advanceAmount,
       selectedAccount.currency
     );
   }

   // Mark selected items as paid
   for (const allocation of allocations) {
     await creditCardStatementApi.updateStatementLineStatus(
       allocation.statement_line_id,
       'paid',
       allocation.amount_paid
     );

     // Call payEMIInstallment if it's an EMI
     if (allocation.emi_id) {
       await emiApi.payEMIInstallment(
         allocation.emi_id,
         allocation.amount_paid
       );
     }
   }
   ```

### EMI Auto-Creation

When a transaction is created on a credit card with EMI:
- Check if account has any EMIs
- If yes, automatically create statement line item for upcoming EMI installments
- Link transaction to statement for its due date's month

### Statement Cycle Management

Statements should be monthly:
- Cycle starts from account's statement start date (default: 1st of month)
- Cycle ends on last day of month (or card's custom cycle date)
- New statement automatically created each cycle
- Unpaid items carry forward with updated statement_month

## Example User Scenarios

### Scenario 1: Selective Payment

User has:
- ₹500 Amazon charge (due)
- ₹1000 EMI installment (due)
- Total due: ₹1500

User makes ₹800 repayment and selects only Amazon charge (₹500).
- ₹500 allocated to Amazon, marked paid
- ₹300 becomes advance credit
- EMI (₹1000) remains unpaid, carries to next statement

### Scenario 2: Partial EMI Payment

User has:
- ₹1000 EMI due
- ₹200 transaction due

User makes ₹600 repayment, selects both items.
- System needs ₹1200 total
- ₹600 allocated: Proportionally split or
- User can adjust: Select ₹600 worth (e.g., partial EMI + transaction)
- Remainder carries forward

### Scenario 3: Advance Credit Usage

Previous month: User had advance balance of ₹500

Current month statement:
- ₹1000 in charges
- Advance balance applied automatically
- User only needs to pay ₹500 (₹1000 - ₹500 advance)

## Future Enhancements

1. **Automatic statement generation**: Auto-create statement items when transactions are added
2. **Statement PDF**: Generate and display statement PDFs
3. **Payment plans**: Allow splitting large charges into custom payment schedule
4. **Late fee handling**: Automatic late fee calculation and addition
5. **Minimum payment tracking**: Show minimum due vs full due
6. **Rewards tracking**: Track rewards/cashback per transaction
7. **Statement delivery**: Email/notification of monthly statements
8. **Smart allocation**: Suggest optimal payment allocation based on interest rates

## Migration

Run migration `00029_add_credit_card_statement_management.sql` to create tables and enable RLS policies.

```bash
supabase db push
```

This will create:
- `credit_card_statement_lines` table
- `credit_card_advance_payments` table  
- `credit_card_repayment_allocations` table
- All necessary indexes and RLS policies
