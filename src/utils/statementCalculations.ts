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
  referenceDate: Date = new Date()
): {
  statementAmount: number;
  transactionsAmount: number;
  emisAmount: number;
  dueDate: Date | null;
} {
  const { lastStatementDate, currentStatementDate, isAfterStatementDate } = getStatementPeriod(statementDay, referenceDate);

  // If we haven't reached the statement date yet, use previous period
  let periodStart: Date;
  let periodEnd: Date;
  
  if (isAfterStatementDate) {
    // We're after the statement date, so calculate for current period
    periodStart = currentStatementDate;
    periodEnd = new Date(currentStatementDate.getFullYear(), currentStatementDate.getMonth() + 1, statementDay);
  } else {
    // We're before the statement date, so use last period
    periodStart = lastStatementDate;
    periodEnd = currentStatementDate;
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
      // Payments decrease the balance (negative)
      if (t.from_account_id === accountId) {
        return sum + Math.abs(Number(t.amount));
      }
      if (t.to_account_id === accountId && t.transaction_type === 'credit_card_payment') {
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

  const statementAmount = transactionsAmount + emisAmount;

  // Calculate due date (typically 20-25 days after statement date)
  // Using the due_day from account if available, otherwise null
  const dueDate = null; // Will be calculated separately using account.due_day

  return {
    statementAmount: Math.round(statementAmount * 100) / 100,
    transactionsAmount: Math.round(transactionsAmount * 100) / 100,
    emisAmount: Math.round(emisAmount * 100) / 100,
    dueDate
  };
}

/**
 * Get the due date for a credit card statement
 */
export function getStatementDueDate(statementDay: number, dueDay: number, referenceDate: Date = new Date()): Date | null {
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
 * Check if we should display the due amount (only after statement date)
 */
export function shouldDisplayDueAmount(statementDay: number, referenceDate: Date = new Date()): boolean {
  const { isAfterStatementDate } = getStatementPeriod(statementDay, referenceDate);
  return isAfterStatementDate;
}
