# Credit Card Logic in SmartFinHub

## Overview
This document explains how credit cards are handled in SmartFinHub, including balance storage, transaction processing, and display logic.

## Balance Storage Model

### Core Principle
**Credit card balances are stored as POSITIVE numbers representing debt.**

- Balance of `$100` = You owe $100 to the credit card company
- Balance of `$0` = No debt, card is paid off
- Balance of `$500` = You owe $500 to the credit card company

This is different from traditional accounting where liabilities are negative. We use positive numbers for better user understanding.

## Transaction Processing

### 1. Expenses from Credit Card
When you make a purchase using your credit card:
```typescript
// Code: src/db/api.ts, line 365-367
if (account?.account_type === 'credit_card') {
  await this.adjustBalance(transaction.from_account_id, amount); // balance += amount
}
```

**Example:**
- Starting balance: $100 (owe $100)
- Make $50 expense
- New balance: $150 (owe $150)
- **Debt increased by $50**

### 2. Cash Withdrawals from Credit Card
When you withdraw cash using your credit card (cash advance):
```typescript
// Code: src/db/api.ts, line 379-381
if (account?.account_type === 'credit_card') {
  await this.adjustBalance(transaction.from_account_id, amount); // balance += amount
}
```

**Example:**
- Starting balance: $200 (owe $200)
- Withdraw $100 cash
- New balance: $300 (owe $300)
- **Debt increased by $100**

### 3. Payments to Credit Card
When you pay your credit card bill:
```typescript
// Code: src/db/api.ts, line 431-432
// TO account (credit card): decrease balance (reduce liability)
await this.adjustBalance(transaction.to_account_id, -amount); // balance -= amount
```

**Example:**
- Starting balance: $500 (owe $500)
- Make $200 payment
- New balance: $300 (owe $300)
- **Debt decreased by $200**

### 4. Transfers from Credit Card
When you transfer money from your credit card to another account:
```typescript
// Code: src/db/api.ts, line 397-398
if (fromAccount?.account_type === 'credit_card') {
  await this.adjustBalance(transaction.from_account_id, amount); // balance += amount
}
```

**Example:**
- Starting balance: $100 (owe $100)
- Transfer $50 to bank account
- New balance: $150 (owe $150)
- **Debt increased by $50**

## Dashboard Display

### Current Liabilities
```typescript
// Code: src/db/api.ts, line 152
const total_liabilities = Math.abs(creditCards.reduce((sum, acc) => sum + Number(acc.balance), 0));
```

The `Math.abs()` is used for consistency, but since balances are already positive, it doesn't change the value.

**Display:**
- Shows total of all credit card balances
- Represents total debt across all credit cards

### Credit Card Balance Display
```typescript
// Code: src/pages/Dashboard.tsx, line 758
{formatCurrency(Number(account.balance), account.currency)}
```

**Display:**
- Shows balance as positive number
- Represents current debt on the card

### Credit Utilization
```typescript
// Code: src/utils/emiCalculations.ts, line 59-64
export function calculateCreditUtilization(
  currentBalance: number,
  creditLimit: number | null
): number {
  if (!creditLimit || creditLimit === 0) return 0;
  return (currentBalance / creditLimit) * 100;
}
```

**Formula:** `(Current Balance / Credit Limit) × 100`

**Example:**
- Credit limit: $1,000
- Current balance: $300 (owe $300)
- Utilization: 30%

**Warning Levels:**
- **Safe** (< 80%): Green indicator
- **Warning** (80-99%): Amber indicator
- **Danger** (≥ 100%): Red indicator (over limit)

### Available Credit
```typescript
// Code: src/utils/emiCalculations.ts, line 47-52
export function calculateAvailableCredit(
  currentBalance: number,
  creditLimit: number | null
): number {
  if (!creditLimit) return 0;
  return Math.max(0, creditLimit - currentBalance);
}
```

**Formula:** `Credit Limit - Current Balance`

**Example:**
- Credit limit: $1,000
- Current balance: $300 (owe $300)
- Available credit: $700

## Payment Transaction Types

### 1. credit_card_payment (Deprecated)
Old transaction type, kept for backward compatibility.

### 2. credit_card_repayment (Current)
Proper transaction type for paying credit card bills.

**Processing:**
```typescript
// Code: src/db/api.ts, line 425-434
case 'credit_card_repayment':
  // FROM account (bank/cash): decrease balance
  if (transaction.from_account_id) {
    await this.adjustBalance(transaction.from_account_id, -amount);
  }
  // TO account (credit card): decrease balance (reduce liability)
  if (transaction.to_account_id) {
    await this.adjustBalance(transaction.to_account_id, -amount);
  }
  break;
```

**Example:**
- Bank account: $1,000
- Credit card balance: $500 (owe $500)
- Make $200 payment
- Bank account: $800 (decreased by $200)
- Credit card balance: $300 (decreased by $200, owe $300)

## Complete Example Flow

### Scenario: Monthly Credit Card Usage

**Starting State:**
- Credit card balance: $0 (no debt)
- Credit limit: $2,000
- Bank account: $5,000

**Day 1: Grocery Shopping**
- Expense: $150
- Credit card balance: $150 (owe $150)
- Available credit: $1,850
- Utilization: 7.5%

**Day 5: Gas Station**
- Expense: $60
- Credit card balance: $210 (owe $210)
- Available credit: $1,790
- Utilization: 10.5%

**Day 10: Online Shopping**
- Expense: $300
- Credit card balance: $510 (owe $510)
- Available credit: $1,490
- Utilization: 25.5%

**Day 15: Cash Advance**
- Withdrawal: $200
- Credit card balance: $710 (owe $710)
- Available credit: $1,290
- Utilization: 35.5%

**Day 20: Payment**
- Payment: $500
- Credit card balance: $210 (owe $210)
- Bank account: $4,500
- Available credit: $1,790
- Utilization: 10.5%

**Day 25: Restaurant**
- Expense: $80
- Credit card balance: $290 (owe $290)
- Available credit: $1,710
- Utilization: 14.5%

**End of Month: Full Payment**
- Payment: $290
- Credit card balance: $0 (no debt)
- Bank account: $4,210
- Available credit: $2,000
- Utilization: 0%

## Key Points

1. **Positive Balances = Debt**: Credit card balances are always positive numbers representing how much you owe.

2. **Spending Increases Balance**: Any expense, withdrawal, or transfer FROM a credit card increases the balance (increases debt).

3. **Payments Decrease Balance**: Payments TO a credit card decrease the balance (decreases debt).

4. **Credit Utilization**: Calculated as (Balance / Credit Limit) × 100. Keep below 80% for healthy credit usage.

5. **Available Credit**: The amount you can still spend, calculated as Credit Limit - Current Balance.

6. **Statement Amount**: Includes current balance plus any EMI installments due for the billing cycle.

7. **Due Amount**: The total amount that must be paid by the due date to avoid interest charges.

## Database Schema

### Accounts Table
```sql
CREATE TABLE accounts (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  account_type text NOT NULL, -- 'credit_card'
  account_name text NOT NULL,
  balance numeric DEFAULT 0, -- Positive = debt
  credit_limit numeric, -- Maximum credit available
  statement_day integer, -- Day of month for statement generation
  due_day integer, -- Day of month for payment due
  ...
);
```

### Transactions Table
```sql
CREATE TABLE transactions (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  transaction_type text NOT NULL, -- 'expense', 'credit_card_repayment', etc.
  from_account_id uuid REFERENCES accounts(id),
  to_account_id uuid REFERENCES accounts(id),
  amount numeric NOT NULL,
  ...
);
```

## Reverse Operations

When a transaction is deleted or edited, the balance changes are reversed:

### Reverse Expense
```typescript
// Code: src/db/api.ts, line 451-453
if (account?.account_type === 'credit_card') {
  await this.adjustBalance(transaction.from_account_id, -amount); // balance -= amount
}
```

### Reverse Payment
```typescript
// Code: src/db/api.ts, line 517-518
if (transaction.to_account_id) {
  await this.adjustBalance(transaction.to_account_id, amount); // balance += amount
}
```

## Summary

The credit card logic in SmartFinHub is designed to be intuitive for users:
- **Positive balances** represent debt (what you owe)
- **Spending** increases the balance (increases debt)
- **Payments** decrease the balance (decreases debt)
- **Credit utilization** and **available credit** are calculated automatically
- **Warning indicators** help users manage their credit responsibly

This model aligns with how users think about credit cards in everyday life: "I owe $X on my credit card" rather than "My credit card has a balance of -$X."
