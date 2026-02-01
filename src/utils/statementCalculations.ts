import type { Transaction, EMITransaction } from '@/types/types';

/**
 * Get the statement period for a credit card
 * Returns the start and end dates for the current statement period
 */
export function getStatementPeriod(statementDay: number, referenceDate: Date = new Date()): {
  lastStatementDate: Date;
  currentStatementDate: Date;
  isAfterStatementDate: boolean;
} {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();
  const day = referenceDate.getDate();

  // Current month's statement date
  const currentStatementDate = new Date(year, month, statementDay);

  // Last month's statement date
  const lastStatementDate = new Date(year, month - 1, statementDay);

  // Check if we're after the current statement date
  const isAfterStatementDate = day >= statementDay;

  return {
    lastStatementDate,
    currentStatementDate,
    isAfterStatementDate
  };
}

/**
 * Calculate the statement amount for a credit card
 * 
 * IMPORTANT: This calculates the amount that is CURRENTLY DUE for payment,
 * which is based on the LAST COMPLETED statement period.
 * 
 * Credit Card Billing Cycle Logic:
 * - Statement Date (e.g., 13th): Bank generates statement for transactions from last statement to this date
 * - Due Date (e.g., 30th): Payment for the statement is due
 * - Transactions AFTER the statement date go into the NEXT billing cycle
 * 
 * Example with statement_day=13, due_day=30:
 * - Today is Dec 23 (after statement date)
 *   → Statement was generated on Dec 13
 *   → Shows transactions from Nov 13 to Dec 13
 *   → Due on Dec 30
 *   → Transaction on Dec 23 will be in NEXT statement (Jan 13) and due on Jan 30
 * 
 * - Today is Dec 10 (before statement date)
 *   → Statement will be generated on Dec 13
 *   → Shows transactions from Oct 13 to Nov 13 (previous statement)
 *   → Due on Nov 30
 * 
 * Includes:
 * - Transactions between last statement day and current statement day
 * - EMI installments due for this statement period
 * Excludes:
 * - Transactions that were converted to EMI
 */
export function calculateCreditCardStatementAmount(
  accountId: string,
  statementDay: number,
  transactions: Transaction[],
  emis: EMITransaction[],
  referenceDate: Date = new Date(),
  currentBalance?: number,
  dueDay: number | null = null,
  advanceBalance: number = 0
): {
  statementAmount: number;
  transactionsAmount: number;
  emisAmount: number;
  dueDate: Date | null;
  netStatementAmount: number;
} {
  const { lastStatementDate, currentStatementDate, isAfterStatementDate } = getStatementPeriod(statementDay, referenceDate);

  // Calculate the statement period that is currently due for payment
  // The due amount always represents transactions from the LAST completed statement period
  let periodStart: Date;
  let periodEnd: Date;

  if (isAfterStatementDate) {
    // We're after the statement date, so the statement was already generated
    // Show the amount from the last completed period (which is now due for payment)
    // Example: Today is Dec 23, statement date is Dec 13
    // Period: Nov 13 to Dec 13 (due on Dec 30)
    periodStart = lastStatementDate;
    periodEnd = currentStatementDate;
  } else {
    // We're before the statement date, so we're still in the current billing cycle
    // Show the amount from the previous period (which is currently due)
    // Example: Today is Dec 10, statement date is Dec 13
    // Period: Oct 13 to Nov 13 (due on Nov 30)
    periodStart = new Date(lastStatementDate.getFullYear(), lastStatementDate.getMonth() - 1, statementDay);
    periodEnd = lastStatementDate;
  }

  // Get all transactions for this credit card in the statement period
  const accountTransactions = transactions.filter(t => {
    const transactionDate = new Date(t.transaction_date);
    return (
      (t.from_account_id === accountId || t.to_account_id === accountId) &&
      transactionDate >= periodStart &&
      transactionDate < periodEnd
    );
  });

  // Get transaction IDs that were converted to EMI
  const emiTransactionIds = new Set(
    emis
      .filter(emi => emi.transaction_id)
      .map(emi => emi.transaction_id)
  );

  // Calculate total from transactions (excluding those converted to EMI)
  const transactionsAmount = accountTransactions
    .filter(t => !emiTransactionIds.has(t.id))
    .reduce((sum, t) => {
      // For credit cards, expenses increase the balance (positive)
      // Payments (transfers or credit_card_repayment to credit card) decrease the balance (negative)
      if (t.from_account_id === accountId) {
        return sum + Math.abs(Number(t.amount));
      }
      if (t.to_account_id === accountId && (t.transaction_type === 'transfer' || t.transaction_type === 'credit_card_repayment')) {
        return sum - Math.abs(Number(t.amount));
      }
      return sum;
    }, 0);

  // Get EMIs that are due in this statement period
  const currentMonth = periodEnd.getMonth() + 1;
  const currentYear = periodEnd.getFullYear();

  const emisAmount = emis
    .filter(emi => {
      if (!emi.start_date) return false;

      const emiStartDate = new Date(emi.start_date);
      const emiStartMonth = emiStartDate.getMonth() + 1;
      const emiStartYear = emiStartDate.getFullYear();

      // Calculate which installment would be due in the current period
      const monthsDiff = (currentYear - emiStartYear) * 12 + (currentMonth - emiStartMonth);

      // Check if this EMI has an installment due in this period
      return monthsDiff >= 0 && monthsDiff < emi.emi_months && emi.remaining_installments > 0;
    })
    .reduce((sum, emi) => sum + Number(emi.monthly_emi), 0);

  let statementAmount = transactionsAmount + emisAmount;

  // IMPROVED LOGIC: If currentBalance is provided, use it to calculate accurate "Remaining Statement Due"
  // Remaining Due = Current Balance - (New Spending since Statement Date)
  // This correctly accounts for carry-over debt and partial payments.
  if (currentBalance !== undefined) {
    const statementDate = isAfterStatementDate ? currentStatementDate : lastStatementDate;

    // Calculate New Spending (transactions that increased balance AFTER statement date)
    // For Credit Cards (Liability), Expenses/Withdrawals are Positive (increase debt).
    // So we subtract them from Current Balance to find the balance at statement time (or remaining).
    // Wait, "Remaining Due" means we want to exclude "New Debt".
    // Current Balance = Old Debt + New Debt - Payments.
    // Remaining Due = Old Debt - Payments.
    // So Remaining Due = Current Balance - New Debt.

    const newSpending = transactions
      .filter(t => {
        const tDate = new Date(t.transaction_date);
        return (t.from_account_id === accountId || t.to_account_id === accountId) && tDate > statementDate;
      })
      .reduce((sum, t) => {
        // Identify transactions that INCREASE balance (Debt)
        let increase = 0;

        // Expense from this account
        if (t.from_account_id === accountId && (t.transaction_type === 'expense' || t.transaction_type === 'withdrawal' || t.transaction_type === 'transfer')) {
          increase = Number(t.amount);
        }

        // Income/Payment decreases balance, so we ignore it here (it's part of "Remaining Due")
        return sum + increase;
      }, 0);

    // If balance is tracked as negative for debt, abs() it first?
    // Based on api.ts, Credit Card balance is Positive for Debt.
    // But verify if input currentBalance might be negative.
    // Accounts.tsx uses Math.abs(balance).
    // Let's assume input currentBalance is the raw value from DB.
    // If DB stores Debt as Positive (likely based on api.ts), then logic holds.
    // If DB stores Debt as Negative, then Current = -Old - New + Pay.
    // We want -Old + Pay.
    // (-Old - New + Pay) + New = -Old + Pay.
    // So if negative, we ADD New Spending (magnitude).

    statementAmount = currentBalance - newSpending;

    // Ensure we don't return negative due if they overpaid? 
    // If they paid off everything, Current = 0. New = 0. Result 0.
    // If they have credit (negative debt), Current = -50. New = 0. Result -50.
    // statementAmount can be negative (credit).
  }

  const netStatementAmount = Math.max(0, statementAmount - advanceBalance);

  // Calculate due date (typically 20-25 days after statement date)
  // Using the due_day from account if available, otherwise null
  const dueDate = getStatementDueDate(statementDay, dueDay, referenceDate);

  return {
    statementAmount: Math.round(statementAmount * 100) / 100,
    transactionsAmount: Math.round(transactionsAmount * 100) / 100,
    emisAmount: Math.round(emisAmount * 100) / 100,
    dueDate,
    netStatementAmount: Math.round(netStatementAmount * 100) / 100
  };
}

/**
 * Get the due date for a credit card statement
 */
export function getStatementDueDate(
  statementDay: number | null,
  dueDay: number | null,
  referenceDate: Date = new Date()
): Date | null {
  if (!statementDay || !dueDay) return null;

  const { currentStatementDate, isAfterStatementDate } = getStatementPeriod(statementDay, referenceDate);

  let statementDate: Date;

  if (isAfterStatementDate) {
    // We're after the statement date, so due date is in current month
    statementDate = currentStatementDate;
  } else {
    // We're before the statement date, so due date is based on last statement
    statementDate = new Date(currentStatementDate.getFullYear(), currentStatementDate.getMonth() - 1, statementDay);
  }

  // Due date is in the same month as statement date (or next month if due_day < statement_day)
  let dueDate: Date;
  if (dueDay >= statementDay) {
    // Due date is in the same month
    dueDate = new Date(statementDate.getFullYear(), statementDate.getMonth(), dueDay);
  } else {
    // Due date is in the next month
    dueDate = new Date(statementDate.getFullYear(), statementDate.getMonth() + 1, dueDay);
  }

  return dueDate;
}

/**
 * Check if the due date has passed
 */
export function isDueDatePassed(statementDay: number, dueDay: number, referenceDate: Date = new Date()): boolean {
  const dueDate = getStatementDueDate(statementDay, dueDay, referenceDate);
  if (!dueDate) return false;

  return referenceDate > dueDate;
}

/**
 * Check if we should display the due amount
 * Returns true after the statement date has passed (statement has been generated)
 * 
 * Example: If statement date is 13th
 * - On Dec 10: returns false (statement not yet generated)
 * - On Dec 13: returns true (statement generated, showing amount due on Dec 30)
 * - On Dec 23: returns true (statement generated, showing amount due on Dec 30)
 */
export function shouldDisplayDueAmount(statementDay: number, referenceDate: Date = new Date()): boolean {
  const { isAfterStatementDate } = getStatementPeriod(statementDay, referenceDate);
  return isAfterStatementDate;
}

/**
 * Get the statement date and due date for a transaction
 * This determines which statement the transaction will be included in
 * 
 * Logic:
 * - Transactions on or after statement_day of current month → included in NEXT month's statement
 * - Transactions before statement_day of current month → included in THIS month's statement
 * 
 * Example: statement_day = 13, due_day = 20
 * - Transaction on Jan 15 → Statement on Feb 13, Due on Feb 20
 * - Transaction on Jan 10 → Statement on Jan 13, Due on Jan 20
 */
export function getTransactionStatementInfo(
  statementDay: number,
  dueDay: number,
  transactionDate: Date
): {
  statementDate: Date;
  dueDate: Date;
} {
  const txYear = transactionDate.getFullYear();
  const txMonth = transactionDate.getMonth();
  const txDay = transactionDate.getDate();

  let statementDate: Date;

  // If transaction is on or after statement day, it goes to NEXT month's statement
  if (txDay >= statementDay) {
    statementDate = new Date(txYear, txMonth + 1, statementDay);
  } else {
    // If transaction is before statement day, it goes to THIS month's statement
    statementDate = new Date(txYear, txMonth, statementDay);
  }

  // Calculate due date based on statement date
  let dueDate: Date;
  if (dueDay >= statementDay) {
    // Due date is in the same month as statement
    dueDate = new Date(statementDate.getFullYear(), statementDate.getMonth(), dueDay);
  } else {
    // Due date is in the next month after statement
    dueDate = new Date(statementDate.getFullYear(), statementDate.getMonth() + 1, dueDay);
  }

  return {
    statementDate,
    dueDate
  };
}

/**
 * Calculate the minimum amount due for a credit card
 * Typically 5% of total outstanding or 500 (whichever is higher)
 * But limited to the total outstanding amount if less than 500
 */
export function calculateMinimumDue(totalDue: number, currency: string = 'INR'): number {
  if (totalDue <= 0) return 0;

  // Default logic: 5% of outstanding
  const percentageBased = totalDue * 0.05;

  // Minimum absolute amount (e.g., 500 INR)
  // We can adjust this based on currency if needed, but keeping it simple for now
  const minimumAbsolute = currency === 'USD' ? 25 : 500;

  if (totalDue < minimumAbsolute) {
    return totalDue;
  }

  return Math.max(percentageBased, minimumAbsolute);
}

/**
 * Check if the due date is approaching (within 5 days) or passed
 */
export function isPaymentDueSoon(dueDate: Date | null): 'overdue' | 'due_soon' | 'not_due' {
  if (!dueDate) return 'not_due';

  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset time part for accurate date comparison

  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);

  if (today > due) {
    return 'overdue';
  }

  // Calculate difference in days
  const diffTime = Math.abs(due.getTime() - today.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays <= 5) {
    return 'due_soon';
  }

  return 'not_due';
}
