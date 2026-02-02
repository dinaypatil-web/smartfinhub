/**
 * Billing Cycle and Due Amount Calculation Utilities
 * 
 * Handles credit card billing cycle calculations and due amount determinations
 */

import type { Transaction, EMITransaction } from '@/types/types';

/**
 * Get the last day of a given month
 */
function getLastDayOfMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/**
 * Safely get a day within a month (handles months with fewer days)
 */
function getSafeDayInMonth(year: number, month: number, day: number): number {
  const lastDay = getLastDayOfMonth(year, month);
  return Math.min(day, lastDay);
}

/**
 * Calculate the current billing cycle dates for a credit card
 * @param statementDay - Day of month when statement is generated (1-31)
 * @returns Object with cycle start and end dates
 */
export function getCurrentBillingCycle(statementDay: number): {
  cycleStart: Date;
  cycleEnd: Date;
  statementDate: Date;
} {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();
  const currentDay = today.getDate();

  // Determine if we're before or after the statement day this month
  const safeStatementDay = getSafeDayInMonth(currentYear, currentMonth, statementDay);
  
  let cycleStartYear: number;
  let cycleStartMonth: number;
  let cycleEndYear: number;
  let cycleEndMonth: number;

  if (currentDay < safeStatementDay) {
    // We're in the cycle that started last month
    cycleStartMonth = currentMonth - 1;
    cycleStartYear = currentYear;
    if (cycleStartMonth < 0) {
      cycleStartMonth = 11;
      cycleStartYear--;
    }
    cycleEndMonth = currentMonth;
    cycleEndYear = currentYear;
  } else {
    // We're in the cycle that started this month
    cycleStartMonth = currentMonth;
    cycleStartYear = currentYear;
    cycleEndMonth = currentMonth + 1;
    cycleEndYear = currentYear;
    if (cycleEndMonth > 11) {
      cycleEndMonth = 0;
      cycleEndYear++;
    }
  }

  const cycleStartDay = getSafeDayInMonth(cycleStartYear, cycleStartMonth, statementDay);
  const cycleEndDay = getSafeDayInMonth(cycleEndYear, cycleEndMonth, statementDay);

  // Cycle starts from NEXT DAY of statement date of last month
  const cycleStart = new Date(cycleStartYear, cycleStartMonth, cycleStartDay + 1, 0, 0, 0);
  // Cycle ends on statement date of this month (inclusive)
  const cycleEnd = new Date(cycleEndYear, cycleEndMonth, cycleEndDay, 23, 59, 59);
  const statementDate = new Date(cycleEndYear, cycleEndMonth, cycleEndDay, 23, 59, 59);

  return { cycleStart, cycleEnd, statementDate };
}

/**
 * Calculate the next payment due date
 * @param statementDay - Day of month when statement is generated
 * @param dueDay - Day of month when payment is due
 * @returns Next due date (current month if not passed, next month if passed)
 */
export function getNextDueDate(statementDay: number, dueDay: number): Date {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();
  const currentDay = today.getDate();

  // Get the safe due day for current month
  const safeDueDayThisMonth = getSafeDayInMonth(currentYear, currentMonth, dueDay);
  
  // Check if this month's due date has passed
  if (currentDay <= safeDueDayThisMonth) {
    // This month's due date hasn't passed yet, return this month's due date
    return new Date(currentYear, currentMonth, safeDueDayThisMonth, 23, 59, 59);
  } else {
    // This month's due date has passed, return next month's due date
    let nextMonth = currentMonth + 1;
    let nextYear = currentYear;
    if (nextMonth > 11) {
      nextMonth = 0;
      nextYear++;
    }
    const safeDueDayNextMonth = getSafeDayInMonth(nextYear, nextMonth, dueDay);
    return new Date(nextYear, nextMonth, safeDueDayNextMonth, 23, 59, 59);
  }
}

/**
 * Check if a transaction date falls within the current billing cycle
 * @param transactionDate - Date of the transaction
 * @param statementDay - Day of month when statement is generated
 * @returns True if transaction is in current cycle
 */
export function isTransactionInCurrentCycle(
  transactionDate: Date | string,
  statementDay: number
): boolean {
  const txDate = typeof transactionDate === 'string' ? new Date(transactionDate) : transactionDate;
  const { cycleStart, cycleEnd } = getCurrentBillingCycle(statementDay);
  
  return txDate >= cycleStart && txDate <= cycleEnd;
}

/**
 * Calculate due amount from regular transactions in current billing cycle
 * Excludes transactions where EMI payment option is selected
 * @param accountId - The credit card account ID
 * @param transactions - All transactions for the account
 * @param emis - All EMI transactions (to identify which transactions are converted to EMI)
 * @param statementDay - Day of month when statement is generated
 * @returns Total amount due from transactions
 */
export function calculateTransactionsDueAmount(
  accountId: string,
  transactions: Transaction[],
  emis: EMITransaction[],
  statementDay: number
): number {
  const { cycleStart, cycleEnd } = getCurrentBillingCycle(statementDay);
  
  // Get list of transaction IDs that are converted to EMI
  const emiTransactionIds = new Set(
    emis
      .filter(emi => emi.transaction_id !== null)
      .map(emi => emi.transaction_id as string)
  );
  
  return transactions
    .filter(tx => {
      const txDate = new Date(tx.transaction_date);
      // Include only transactions within billing cycle AND where EMI is NOT selected
      return txDate >= cycleStart && txDate <= cycleEnd && !emiTransactionIds.has(tx.id);
    })
    .reduce((sum, tx) => {
      // For credit cards, expenses and withdrawals increase the balance (amount owed)
      if (tx.transaction_type === 'expense' || tx.transaction_type === 'withdrawal') {
        return sum + tx.amount;
      }
      // Transfers or credit_card_repayment to credit card (payments) reduce the balance
      if ((tx.transaction_type === 'transfer' || tx.transaction_type === 'credit_card_repayment') && tx.to_account_id === accountId) {
        return sum - tx.amount;
      }
      return sum;
    }, 0);
}

/**
 * Calculate due amount from EMI installments created in current billing cycle
 * Only includes EMIs that were created between next day of last statement and current statement date
 * @param emis - All active EMI transactions for the account
 * @param statementDay - Day of month when statement is generated
 * @returns Total EMI amount due for current cycle
 */
export function calculateEMIDueAmount(emis: EMITransaction[], statementDay: number): number {
  const { cycleStart, cycleEnd } = getCurrentBillingCycle(statementDay);
  
  // Include only EMIs created within the current billing cycle
  return emis
    .filter(emi => {
      if (emi.status !== 'active' || emi.remaining_installments <= 0) {
        return false;
      }
      
      const emiCreatedDate = new Date(emi.created_at);
      return emiCreatedDate >= cycleStart && emiCreatedDate <= cycleEnd;
    })
    .reduce((sum, emi) => sum + emi.monthly_emi, 0);
}

/**
 * Calculate total due amount for a credit card
 * @param accountId - The credit card account ID
 * @param transactions - All transactions for the account
 * @param emis - All active EMI transactions for the account
 * @param statementDay - Day of month when statement is generated
 * @returns Total amount due (transactions + EMIs)
 */
export function calculateTotalDueAmount(
  accountId: string,
  transactions: Transaction[],
  emis: EMITransaction[],
  statementDay: number
): number {
  const transactionsDue = calculateTransactionsDueAmount(accountId, transactions, emis, statementDay);
  const emisDue = calculateEMIDueAmount(emis, statementDay);
  
  return transactionsDue + emisDue;
}

/**
 * Get days until payment due date
 * @param statementDay - Day of month when statement is generated
 * @param dueDay - Day of month when payment is due
 * @returns Number of days until due date
 */
export function getDaysUntilDue(statementDay: number, dueDay: number): number {
  const today = new Date();
  const dueDate = getNextDueDate(statementDay, dueDay);
  
  const diffTime = dueDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
}

/**
 * Check if payment is overdue
 * @param statementDay - Day of month when statement is generated
 * @param dueDay - Day of month when payment is due
 * @returns True if payment is overdue
 */
export function isPaymentOverdue(statementDay: number, dueDay: number): boolean {
  return getDaysUntilDue(statementDay, dueDay) < 0;
}

/**
 * Check if due date has passed (today is after the due date)
 * @param statementDay - Day of month when statement is generated
 * @param dueDay - Day of month when payment is due
 * @returns True if due date has passed
 */
export function isDueDatePassed(statementDay: number, dueDay: number): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset to start of day for accurate comparison
  
  const dueDate = getNextDueDate(statementDay, dueDay);
  dueDate.setHours(0, 0, 0, 0); // Reset to start of day
  
  return today > dueDate;
}

/**
 * Get billing cycle information as formatted strings
 * @param statementDay - Day of month when statement is generated
 * @param dueDay - Day of month when payment is due
 * @returns Formatted billing cycle information
 */
export function getBillingCycleInfo(statementDay: number, dueDay: number): {
  cycleStartStr: string;
  cycleEndStr: string;
  dueDateStr: string;
  daysUntilDue: number;
  isOverdue: boolean;
} {
  const { cycleStart, cycleEnd } = getCurrentBillingCycle(statementDay);
  const dueDate = getNextDueDate(statementDay, dueDay);
  const daysUntilDue = getDaysUntilDue(statementDay, dueDay);
  const isOverdue = daysUntilDue < 0;

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  return {
    cycleStartStr: formatDate(cycleStart),
    cycleEndStr: formatDate(cycleEnd),
    dueDateStr: formatDate(dueDate),
    daysUntilDue: Math.abs(daysUntilDue),
    isOverdue
  };
}
